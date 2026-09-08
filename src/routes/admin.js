import { Router } from "express";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { AdminSession } from "../models/AdminSession.js";
import { Product, slugifyProduct } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Promotion } from "../models/Promotion.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { VisitorDay } from "../models/VisitorDay.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { Subscriber } from "../models/Subscriber.js";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdmin,
} from "../middleware/session.js";
import { rateLimit } from "../middleware/security.js";
import { hashPassword, verifyPassword } from "../utils/crypto.js";
import {
  asyncHandler,
  cleanEmail,
  cleanInteger,
  cleanMoney,
  cleanText,
  HttpError,
  publicOrder,
  publicProduct,
} from "../utils/http.js";
import { saveProductImage } from "../services/upload.js";
import { updateFulfilmentStatus } from "../services/orderService.js";
import {
  recordNotificationResult,
  recordStatusNotificationResult,
  sendOrderNotifications,
  sendOrderStatusNotification,
} from "../services/email.js";
import {
  normalizePromotionCode,
  publicPromotion,
} from "../services/promotionService.js";

export const adminRouter = Router();
const customerStatusNotifications = new Set([
  "Confirmed",
  "Processing",
  "Dispatched",
  "Completed",
  "Cancelled",
  "Needs review",
]);

const asBoolean = (value, fallback = false) => {
  if (value == null) return fallback;
  return value === true || value === 1 || String(value).toLowerCase() === "true";
};

function externalUrl(value, name) {
  const text = cleanText(value, { name, min: 8, max: 500 });
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new HttpError(400, `${name} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:") {
    throw new HttpError(400, `${name} must be a valid HTTPS URL.`);
  }
  return url.toString();
}

function optionalDate(value, name) {
  if (value == null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${name} must be a valid date.`);
  }
  return date;
}

adminRouter.post(
  "/login",
  rateLimit({ windowMs: 15 * 60_000, max: 8, key: "admin-login" }),
  asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body.email);
    const password = cleanText(req.body.password, {
      name: "Password",
      min: 8,
      max: 200,
    });
    const admin = await Admin.findOne({ email, active: true }).select(
      "+passwordHash",
    );
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw new HttpError(401, "The email or password is incorrect.");
    }
    await createAdminSession(req, res, admin);
    admin.lastLoginAt = new Date();
    await admin.save();
    res.json({
      admin: { id: String(admin._id), name: admin.name, email: admin.email },
    });
  }),
);

adminRouter.post(
  "/logout",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await destroyAdminSession(req, res);
    res.status(204).end();
  }),
);

adminRouter.use(requireAdmin);

adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startDay = start.toISOString().slice(0, 10);
    const [
      productCount,
      orderCount,
      paidOrderCount,
      newOrderCount,
      revenue,
      totalVisitors,
      todayVisitors,
      recentOrders,
      topProducts,
      lowStock,
      unreadMessages,
      activeSubscribers,
      activePromotions,
    ] = await Promise.all([
      Product.countDocuments({ active: true }),
      Order.countDocuments(),
      Order.countDocuments({ "payment.status": "paid" }),
      Order.countDocuments({ "payment.status": "paid", status: "New" }),
      Order.aggregate([
        { $match: { "payment.status": "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      VisitorDay.distinct("visitorHash").then((items) => items.length),
      VisitorDay.countDocuments({ day: today }),
      Order.find().sort({ createdAt: -1 }).limit(6).lean(),
      Order.aggregate([
        { $match: { "payment.status": "paid" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            image: { $first: "$items.image" },
            sales: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineSubtotal" },
          },
        },
        { $sort: { sales: -1 } },
        { $limit: 5 },
      ]),
      Product.countDocuments({ active: true, stock: { $lte: 4 } }),
      ContactMessage.countDocuments({ status: "New" }),
      Subscriber.countDocuments({ active: true }),
      Promotion.countDocuments({ active: true }),
    ]);
    const daily = await VisitorDay.aggregate([
      { $match: { day: { $gte: startDay } } },
      {
        $group: {
          _id: "$day",
          visitors: { $sum: 1 },
          views: { $sum: "$pageViews" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({
      metrics: {
        products: productCount,
        orders: orderCount,
        paidOrders: paidOrderCount,
        newOrders: newOrderCount,
        revenue: revenue[0]?.total || 0,
        totalVisitors,
        todayVisitors,
        lowStock,
        unreadMessages,
        activeSubscribers,
        activePromotions,
      },
      daily,
      recentOrders: recentOrders.map((order) =>
        publicOrder(order, { includeCustomer: true }),
      ),
      topProducts,
    });
  }),
);

adminRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const filter = { active: true };
    if (req.query.search) {
      const term = cleanText(req.query.search, { name: "Search", max: 100 });
      filter.$or = [
        {
          name: {
            $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
        {
          category: {
            $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
      ];
    }
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ products: products.map(publicProduct) });
  }),
);

function imageUrl(value) {
  const image = cleanText(value, { name: "Product image", min: 1, max: 2_200 });
  const localImage = /^\/(?:assets|uploads)\/[-a-zA-Z0-9_./]+$/.test(image);
  if (localImage && !image.includes("..")) return image;
  let remoteImage;
  try {
    remoteImage = new URL(image);
  } catch {
    throw new HttpError(
      400,
      "Enter a valid HTTPS product image URL or upload an image.",
    );
  }
  if (remoteImage.protocol !== "https:") {
    throw new HttpError(
      400,
      "Enter a valid HTTPS product image URL or upload an image.",
    );
  }
  return remoteImage.toString();
}

async function uniqueSlug(name, excludeId) {
  const base = slugifyProduct(name) || "sneaker";
  let candidate = base;
  let suffix = 2;
  while (
    await Product.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

async function productPayload(body, existing) {
  const name = cleanText(body.name, { name: "Product name", min: 2, max: 140 });
  const uploadedImage = body.imageData
    ? await saveProductImage(body.imageData)
    : "";
  const selectedImage = uploadedImage || body.image || existing?.image;
  return {
    name,
    slug: await uniqueSlug(name, existing?._id),
    category: cleanText(body.category, { name: "Category", min: 2, max: 80 }),
    tag: cleanText(body.tag || "New", { name: "Badge", max: 40 }),
    price: cleanMoney(body.price, "Selling price"),
    comparePrice: cleanMoney(body.comparePrice || body.price, "Previous price"),
    deliveryFee: cleanMoney(body.deliveryFee, "Delivery fee"),
    stock: cleanInteger(body.stock, "Stock", { min: 0, max: 100_000 }),
    sizes: [40, 41, 42, 43, 44, 45],
    image: imageUrl(selectedImage),
    fallbackImage: existing?.fallbackImage || imageUrl(selectedImage),
    description: cleanText(body.description, {
      name: "Description",
      min: 5,
      max: 2_000,
    }),
    featured:
      body.featured == null
        ? (existing?.featured ?? true)
        : asBoolean(body.featured),
    active:
      body.active == null ? (existing?.active ?? true) : asBoolean(body.active),
  };
}

adminRouter.post(
  "/products",
  asyncHandler(async (req, res) => {
    const product = await Product.create(await productPayload(req.body));
    res.status(201).json({ product: publicProduct(product) });
  }),
);

adminRouter.patch(
  "/products/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      throw new HttpError(400, "Invalid product.");
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, "Product not found.");
    Object.assign(product, await productPayload(req.body, product));
    await product.save();
    res.json({ product: publicProduct(product) });
  }),
);

adminRouter.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      throw new HttpError(400, "Invalid product.");
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );
    if (!product) throw new HttpError(404, "Product not found.");
    res.status(204).end();
  }),
);

adminRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const page = cleanInteger(req.query.page || 1, "Page", {
      min: 1,
      max: 10_000,
    });
    const limit = 50;
    const filter = {};
    if (req.query.status) {
      filter.status = cleanText(req.query.status, { name: "Status", max: 40 });
    }
    if (req.query.paymentStatus) {
      filter["payment.status"] = cleanText(req.query.paymentStatus, {
        name: "Payment status",
        max: 40,
      });
    }
    if (req.query.search) {
      const term = cleanText(req.query.search, { name: "Search", max: 100 });
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { reference: { $regex: escaped, $options: "i" } },
        { "customer.fullName": { $regex: escaped, $options: "i" } },
        { "customer.email": { $regex: escaped, $options: "i" } },
        { "customer.phone": { $regex: escaped, $options: "i" } },
      ];
    }
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({
      orders: orders.map((order) =>
        publicOrder(order, { includeCustomer: true }),
      ),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }),
);

adminRouter.patch(
  "/orders/:reference/status",
  asyncHandler(async (req, res) => {
    const allowed = [
      "Awaiting payment",
      "New",
      "Confirmed",
      "Processing",
      "Dispatched",
      "Completed",
      "Cancelled",
      "Needs review",
    ];
    const status = cleanText(req.body.status, {
      name: "Status",
      min: 2,
      max: 40,
    });
    if (!allowed.includes(status))
      throw new HttpError(400, "Choose a valid order status.");
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) throw new HttpError(404, "Order not found.");
    const changed = order.status !== status;
    const updated = await updateFulfilmentStatus(order, status, req.admin.email);
    if (
      changed &&
      updated.payment.status === "paid" &&
      customerStatusNotifications.has(updated.status)
    ) {
      void recordStatusNotificationResult(
        updated,
        sendOrderStatusNotification(updated),
      );
    }
    res.json({ order: publicOrder(updated, { includeCustomer: true }) });
  }),
);

adminRouter.post(
  "/orders/:reference/resend-notification",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.payment.status !== "paid") {
      throw new HttpError(409, "Payment must be confirmed before sending a receipt.");
    }
    await recordNotificationResult(order, sendOrderNotifications(order));
    if (order.notification.lastError) {
      throw new HttpError(502, order.notification.lastError);
    }
    res.json({
      message: "The order email was sent successfully.",
      order: publicOrder(order, { includeCustomer: true }),
    });
  }),
);

adminRouter.post(
  "/orders/:reference/resend-status-notification",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) throw new HttpError(404, "Order not found.");
    if (
      order.payment.status !== "paid" ||
      !customerStatusNotifications.has(order.status)
    ) {
      throw new HttpError(
        409,
        "This order does not currently have a customer status update to send.",
      );
    }
    await recordStatusNotificationResult(
      order,
      sendOrderStatusNotification(order),
    );
    if (order.notification.statusLastError) {
      throw new HttpError(502, order.notification.statusLastError);
    }
    res.json({
      message: "The customer status email was sent successfully.",
      order: publicOrder(order, { includeCustomer: true }),
    });
  }),
);

adminRouter.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const days = cleanInteger(req.query.days || 30, "Days", {
      min: 7,
      max: 365,
    });
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const startDay = start.toISOString().slice(0, 10);
    const [
      daily,
      totalVisitors,
      topPaths,
      referrers,
      pageViews,
      topViewedProducts,
    ] = await Promise.all([
      VisitorDay.aggregate([
        { $match: { day: { $gte: startDay } } },
        {
          $group: {
            _id: "$day",
            visitors: { $sum: 1 },
            views: { $sum: "$pageViews" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      VisitorDay.distinct("visitorHash", { day: { $gte: startDay } }).then(
        (items) => items.length,
      ),
      VisitorDay.aggregate([
        { $match: { day: { $gte: startDay } } },
        { $unwind: "$paths" },
        { $group: { _id: "$paths", visitors: { $sum: 1 } } },
        { $sort: { visitors: -1 } },
        { $limit: 10 },
      ]),
      VisitorDay.aggregate([
        { $match: { day: { $gte: startDay }, referrerHost: { $ne: "" } } },
        { $group: { _id: "$referrerHost", visitors: { $sum: 1 } } },
        { $sort: { visitors: -1 } },
        { $limit: 10 },
      ]),
      VisitorDay.aggregate([
        { $match: { day: { $gte: startDay } } },
        { $group: { _id: null, total: { $sum: "$pageViews" } } },
      ]),
      Product.find({ active: true })
        .sort({ views: -1 })
        .limit(5)
        .select("name image views")
        .lean(),
    ]);
    res.json({
      days,
      totalVisitors,
      totalPageViews: pageViews[0]?.total || 0,
      daily,
      topPaths,
      referrers,
      topViewedProducts,
    });
  }),
);

adminRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const settings = await StoreSettings.findOneAndUpdate(
      { key: "primary" },
      { $setOnInsert: { key: "primary" } },
      { upsert: true, new: true },
    ).lean();
    res.json({ settings });
  }),
);

adminRouter.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const settings = await StoreSettings.findOneAndUpdate(
      { key: "primary" },
      {
        $set: {
          storeName: cleanText(req.body.storeName, {
            name: "Store name",
            min: 2,
            max: 100,
          }),
          phone: cleanText(req.body.phone, { name: "Phone", min: 7, max: 40 }),
          whatsappUrl: externalUrl(req.body.whatsappUrl, "WhatsApp URL"),
          instagramUrl: externalUrl(req.body.instagramUrl, "Instagram URL"),
          instagramHandle: cleanText(req.body.instagramHandle, {
            name: "Instagram handle",
            min: 2,
            max: 100,
          }),
          tiktokUrl: externalUrl(req.body.tiktokUrl, "TikTok URL"),
          tiktokHandle: cleanText(req.body.tiktokHandle, {
            name: "TikTok handle",
            min: 2,
            max: 100,
          }),
          notificationEmail: cleanEmail(req.body.notificationEmail, false),
          orderAlerts: asBoolean(req.body.orderAlerts),
          viewTracking: asBoolean(req.body.viewTracking),
        },
        $setOnInsert: { key: "primary" },
      },
      { upsert: true, new: true },
    );
    res.json({ settings });
  }),
);

adminRouter.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ messages });
  }),
);

adminRouter.patch(
  "/messages/:id/status",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid message.");
    }
    const status = cleanText(req.body.status, {
      name: "Status",
      min: 3,
      max: 20,
    });
    if (!["New", "Read", "Closed"].includes(status)) {
      throw new HttpError(400, "Choose a valid message status.");
    }
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    ).lean();
    if (!message) throw new HttpError(404, "Message not found.");
    res.json({ message });
  }),
);

adminRouter.get(
  "/subscribers",
  asyncHandler(async (_req, res) => {
    const subscribers = await Subscriber.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.json({ subscribers });
  }),
);

adminRouter.patch(
  "/subscribers/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid subscriber.");
    }
    const subscriber = await Subscriber.findByIdAndUpdate(
      req.params.id,
      { active: asBoolean(req.body.active) },
      { new: true, runValidators: true },
    ).lean();
    if (!subscriber) throw new HttpError(404, "Subscriber not found.");
    res.json({ subscriber });
  }),
);

function promotionPayload(body, existing) {
  const type = cleanText(body.type, {
    name: "Discount type",
    min: 4,
    max: 20,
  });
  if (!["percentage", "fixed"].includes(type)) {
    throw new HttpError(400, "Choose percentage or fixed discount.");
  }
  const value = cleanMoney(body.value, "Discount value", {
    min: 1,
    max: type === "percentage" ? 100 : 100_000_000,
  });
  const startsAt = optionalDate(body.startsAt, "Start date");
  const endsAt = optionalDate(body.endsAt, "End date");
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new HttpError(400, "The end date must be after the start date.");
  }
  return {
    code: normalizePromotionCode(body.code),
    type,
    value,
    minimumSubtotal: cleanMoney(
      body.minimumSubtotal || 0,
      "Minimum subtotal",
    ),
    maximumDiscount: cleanMoney(
      body.maximumDiscount || 0,
      "Maximum discount",
    ),
    usageLimit: cleanInteger(body.usageLimit || 0, "Usage limit", {
      min: 0,
      max: 10_000_000,
    }),
    startsAt,
    endsAt,
    active:
      body.active == null ? (existing?.active ?? true) : asBoolean(body.active),
  };
}

adminRouter.get(
  "/promotions",
  asyncHandler(async (_req, res) => {
    const promotions = await Promotion.find().sort({ createdAt: -1 }).lean();
    res.json({ promotions: promotions.map((item) => publicPromotion(item)) });
  }),
);

adminRouter.post(
  "/promotions",
  asyncHandler(async (req, res) => {
    const promotion = await Promotion.create(promotionPayload(req.body));
    res.status(201).json({ promotion: publicPromotion(promotion) });
  }),
);

adminRouter.patch(
  "/promotions/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid promotion.");
    }
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) throw new HttpError(404, "Promotion not found.");
    Object.assign(promotion, promotionPayload(req.body, promotion));
    await promotion.save();
    res.json({ promotion: publicPromotion(promotion) });
  }),
);

adminRouter.delete(
  "/promotions/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid promotion.");
    }
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );
    if (!promotion) throw new HttpError(404, "Promotion not found.");
    res.status(204).end();
  }),
);

adminRouter.post(
  "/account/password",
  asyncHandler(async (req, res) => {
    const currentPassword = cleanText(req.body.currentPassword, {
      name: "Current password",
      min: 8,
      max: 200,
    });
    const newPassword = cleanText(req.body.newPassword, {
      name: "New password",
      min: 12,
      max: 200,
    });
    if (currentPassword === newPassword) {
      throw new HttpError(400, "Choose a different new password.");
    }
    const admin = await Admin.findById(req.admin._id).select("+passwordHash");
    if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      throw new HttpError(401, "The current password is incorrect.");
    }
    admin.passwordHash = await hashPassword(newPassword);
    await admin.save();
    await AdminSession.deleteMany({
      admin: admin._id,
      _id: { $ne: req.adminSession._id },
    });
    res.json({ message: "Password updated. Other admin sessions were signed out." });
  }),
);
