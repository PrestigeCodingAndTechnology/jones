import { Router } from "express";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { AdminSession } from "../models/AdminSession.js";
import { Product, slugifyProduct } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { VisitorDay } from "../models/VisitorDay.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { Subscriber } from "../models/Subscriber.js";
import { Coupon, normalizeCouponCode } from "../models/Coupon.js";
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
import { sendOrderStatusNotification } from "../services/email.js";
import { commitOrderInventory, restockOrderInventory } from "../services/orderService.js";
import { validateOrderStatusChange } from "../services/orderWorkflow.js";
import { createPaystackRefund } from "../services/paystack.js";
import { inventoryFields } from "../services/inventory.js";

export const adminRouter = Router();

const regexEscape = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      lowStockCount,
      newMessageCount,
      activeSubscribers,
      activeCoupons,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      Product.countDocuments({ active: true }),
      Order.countDocuments(),
      Order.countDocuments({ "payment.status": "paid" }),
      Order.countDocuments({ status: "New" }),
      Order.aggregate([
        { $match: { "payment.status": "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      VisitorDay.distinct("visitorHash").then((items) => items.length),
      VisitorDay.countDocuments({ day: today }),
      Product.countDocuments({
        active: true,
        sizeInventory: { $elemMatch: { stock: { $lte: 1 } } },
      }),
      ContactMessage.countDocuments({ status: "New" }),
      Subscriber.countDocuments({ active: true }),
      Coupon.countDocuments({ active: true }),
      Order.find().sort({ createdAt: -1 }).limit(8).lean(),
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
        lowStock: lowStockCount,
        newMessages: newMessageCount,
        subscribers: activeSubscribers,
        coupons: activeCoupons,
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
      const safe = regexEscape(term);
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { category: { $regex: safe, $options: "i" } },
      ];
    }
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.json({ products: products.map(publicProduct) });
  }),
);

function imageUrl(value) {
  const image = cleanText(value, { name: "Product image", min: 1, max: 2_200 });
  if (
    !/^https?:\/\//i.test(image) &&
    !/^\/(?:assets|uploads)\/[-a-zA-Z0-9_./]+$/.test(image)
  ) {
    throw new HttpError(
      400,
      "Enter a valid product image URL or upload an image.",
    );
  }
  return image;
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
  const inventory = inventoryFields(body.sizeInventory);
  const category = cleanText(body.category, {
    name: "Category",
    min: 2,
    max: 80,
  });
  const tag = cleanText(body.tag || "New", { name: "Badge", max: 40 });
  const price = cleanMoney(body.price, "Selling price");
  const comparePrice = cleanMoney(
    body.comparePrice || body.price,
    "Previous price",
  );
  const deliveryFee = cleanMoney(
    body.deliveryFee === "" || body.deliveryFee == null
      ? (existing?.deliveryFee ?? 0)
      : body.deliveryFee,
    "Delivery fee",
  );
  const description = cleanText(body.description, {
    name: "Description",
    min: 5,
    max: 2_000,
  });
  const uploadedImage = body.imageData
    ? await saveProductImage(body.imageData)
    : "";
  const selectedImage = uploadedImage || body.image || existing?.image;
  return {
    name,
    slug: await uniqueSlug(name, existing?._id),
    category,
    tag,
    price,
    comparePrice,
    deliveryFee,
    ...inventory,
    image: imageUrl(selectedImage),
    fallbackImage: existing?.fallbackImage || imageUrl(selectedImage),
    description,
    featured:
      body.featured == null ? (existing?.featured ?? true) : Boolean(body.featured),
    active: existing?.active ?? true,
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid product.");
    }
    const existing = await Product.findById(req.params.id).lean();
    if (!existing) throw new HttpError(404, "Product not found.");
    const storedVersion = Number.isInteger(existing.__v) ? existing.__v : 0;
    const expectedVersion =
      req.body.version == null || req.body.version === ""
        ? storedVersion
        : cleanInteger(req.body.version, "Product version", {
            min: 0,
            max: 1_000_000_000,
          });
    if (expectedVersion !== storedVersion) {
      throw new HttpError(
        409,
        "This sneaker changed while the edit form was open. Reload it and apply your changes again.",
      );
    }
    const payload = await productPayload(req.body, existing);
    const versionFilter = Number.isInteger(existing.__v)
      ? { _id: req.params.id, __v: expectedVersion }
      : {
          _id: req.params.id,
          $or: [{ __v: { $exists: false } }, { __v: null }],
        };
    const writeResult = await Product.updateOne(
      versionFilter,
      { $set: payload, $inc: { __v: 1 } },
      { runValidators: true },
    );
    if (!writeResult.acknowledged || writeResult.matchedCount !== 1) {
      throw new HttpError(
        409,
        "The sneaker could not be saved. Reload it and try again.",
      );
    }

    // Do not report success from the submitted payload. Read the stored record
    // back from MongoDB so the response proves the edit actually persisted.
    const product = await Product.findById(req.params.id).lean();
    if (!product) throw new HttpError(404, "Product not found.");
    res.json({ product: publicProduct(product), persisted: true });
  }),
);

adminRouter.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid product.");
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { returnDocument: "after" },
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
        max: 30,
      });
    }
    if (req.query.search) {
      const term = regexEscape(
        cleanText(req.query.search, { name: "Search", max: 100 }),
      );
      filter.$or = [
        { reference: { $regex: term, $options: "i" } },
        { "customer.fullName": { $regex: term, $options: "i" } },
        { "customer.phone": { $regex: term, $options: "i" } },
        { "customer.email": { $regex: term, $options: "i" } },
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
    const status = cleanText(req.body.status, {
      name: "Status",
      min: 2,
      max: 40,
    });
    const order = await Order.findOne({ reference: req.params.reference });
    if (!order) throw new HttpError(404, "Order not found.");
    const transition = validateOrderStatusChange(order, status);
    if (transition.changed) {
      if (transition.shouldClaimInventory) {
        const inventoryOk = await commitOrderInventory(order);
        if (!inventoryOk) {
          throw new HttpError(
            409,
            "This order still cannot be fulfilled because one or more products do not have enough stock.",
          );
        }
      }
      if (transition.shouldRestock) {
        await restockOrderInventory(order);
      }
      order.status = status;
      order.statusHistory.push({ status, changedBy: req.admin.email });
      await order.save();
      void sendOrderStatusNotification(order)
        .then(async (sent) => {
          if (sent) {
            order.notification.statusSentAt = new Date();
            await order.save();
          }
        })
        .catch((error) => console.error("Status email failed:", error));
    }
    res.json({ order: publicOrder(order, { includeCustomer: true }) });
  }),
);

adminRouter.post(
  "/orders/:reference/refund",
  asyncHandler(async (req, res) => {
    const reason = cleanText(req.body.reason, {
      name: "Refund reason",
      min: 3,
      max: 300,
    });
    const order = await Order.findOne({ reference: req.params.reference }).select(
      "+payment.refund.providerResponse",
    );
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.status !== "Cancelled") {
      throw new HttpError(409, "Cancel the order before issuing a refund.");
    }
    if (order.payment.status === "refunded") {
      throw new HttpError(409, "This order has already been refunded.");
    }
    if (order.payment.status !== "paid") {
      throw new HttpError(409, "Only a successfully paid order can be refunded.");
    }
    const currentRefund = String(order.payment.refund?.status || "");
    if (["pending", "processing", "needs-attention", "processed"].includes(currentRefund)) {
      throw new HttpError(409, `A refund is already ${currentRefund}.`);
    }
    if (currentRefund === "failed") {
      throw new HttpError(
        409,
        "The previous refund failed. Resolve or retry it from the Paystack dashboard before taking another action here.",
      );
    }

    const providerRefund = await createPaystackRefund(order, reason);

    // A refund webhook can arrive before the provider API call returns. Re-read
    // the order so an already-advanced webhook state is never overwritten.
    const latestOrder = await Order.findById(order._id).select(
      "+payment.refund.providerResponse",
    );
    if (!latestOrder) throw new HttpError(404, "Order not found.");
    const providerStatus = String(providerRefund.status || "pending");
    const webhookStatus = String(latestOrder.payment.refund?.status || "");
    const refundStatus = webhookStatus || providerStatus;
    latestOrder.payment.refund.status = refundStatus;
    latestOrder.payment.refund.providerId = String(
      providerRefund.id || latestOrder.payment.refund.providerId || "",
    );
    latestOrder.payment.refund.reference = String(
      latestOrder.payment.refund.reference || providerRefund.refund_reference || "",
    );
    latestOrder.payment.refund.amount = Number.isFinite(Number(providerRefund.amount))
      ? Math.round(Number(providerRefund.amount) / 100)
      : latestOrder.total;
    latestOrder.payment.refund.reason = reason;
    latestOrder.payment.refund.initiatedAt ||= new Date();
    latestOrder.payment.refund.updatedAt = new Date();
    latestOrder.payment.refund.initiatedBy = req.admin.email;
    if (!webhookStatus) latestOrder.payment.refund.providerResponse = providerRefund;
    if (refundStatus === "processed") {
      latestOrder.payment.status = "refunded";
      latestOrder.payment.refund.refundedAt ||= new Date();
    }
    await latestOrder.save();
    res.json({ order: publicOrder(latestOrder, { includeCustomer: true }) });
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
    const startDate = new Date(`${startDay}T00:00:00.000Z`);
    const [
      daily,
      totalVisitors,
      pageViews,
      topPaths,
      referrers,
      salesDaily,
      paidSummary,
      totalOrders,
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
        { $group: { _id: null, views: { $sum: "$pageViews" } } },
      ]),
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
      Order.aggregate([
        { $match: { "payment.status": "paid", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { "payment.status": "paid", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            paidOrders: { $sum: 1 },
            revenue: { $sum: "$total" },
            discounts: { $sum: "$discount" },
          },
        },
      ]),
      Order.countDocuments({ createdAt: { $gte: startDate } }),
    ]);
    const paid = paidSummary[0] || { paidOrders: 0, revenue: 0, discounts: 0 };
    res.json({
      days,
      totalVisitors,
      pageViews: pageViews[0]?.views || 0,
      totalOrders,
      paidOrders: paid.paidOrders,
      revenue: paid.revenue,
      discounts: paid.discounts,
      averageOrderValue: paid.paidOrders
        ? Math.round(paid.revenue / paid.paidOrders)
        : 0,
      conversionRate: totalVisitors
        ? Math.round((paid.paidOrders / totalVisitors) * 10_000) / 100
        : 0,
      daily,
      salesDaily,
      topPaths,
      referrers,
    });
  }),
);

adminRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const settings = await StoreSettings.findOneAndUpdate(
      { key: "primary" },
      { $setOnInsert: { key: "primary" } },
      { upsert: true, returnDocument: "after" },
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
          notificationEmail: cleanEmail(req.body.notificationEmail, false),
          orderAlerts: Boolean(req.body.orderAlerts),
          viewTracking: Boolean(req.body.viewTracking),
        },
        $setOnInsert: { key: "primary" },
      },
      { upsert: true, returnDocument: "after" },
    );
    res.json({ settings });
  }),
);

adminRouter.patch(
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
    const admin = await Admin.findById(req.admin._id).select("+passwordHash");
    if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      throw new HttpError(401, "The current password is incorrect.");
    }
    if (await verifyPassword(newPassword, admin.passwordHash)) {
      throw new HttpError(400, "Choose a new password that is different from the current password.");
    }
    admin.passwordHash = await hashPassword(newPassword);
    await admin.save();
    await AdminSession.deleteMany({
      admin: admin._id,
      _id: { $ne: req.adminSession?._id },
    });
    res.json({
      message: "Administrator password updated. Other admin sessions were signed out.",
    });
  }),
);

adminRouter.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(200)
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
    const allowed = ["New", "Read", "Closed"];
    const status = cleanText(req.body.status, { name: "Status", max: 20 });
    if (!allowed.includes(status)) {
      throw new HttpError(400, "Choose a valid message status.");
    }
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after" },
    ).lean();
    if (!message) throw new HttpError(404, "Message not found.");
    res.json({ message });
  }),
);

adminRouter.delete(
  "/messages/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid message.");
    }
    const result = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!result) throw new HttpError(404, "Message not found.");
    res.status(204).end();
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
      { active: Boolean(req.body.active) },
      { returnDocument: "after" },
    ).lean();
    if (!subscriber) throw new HttpError(404, "Subscriber not found.");
    res.json({ subscriber });
  }),
);

adminRouter.delete(
  "/subscribers/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid subscriber.");
    }
    const result = await Subscriber.findByIdAndDelete(req.params.id);
    if (!result) throw new HttpError(404, "Subscriber not found.");
    res.status(204).end();
  }),
);

function optionalDate(value, name) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${name} is invalid.`);
  return date;
}

function couponPayload(body, existing) {
  const type = String(body.type || existing?.type || "percentage");
  if (!["percentage", "fixed"].includes(type)) {
    throw new HttpError(400, "Choose percentage or fixed discount.");
  }
  const code = normalizeCouponCode(body.code || existing?.code);
  if (!code) throw new HttpError(400, "Coupon code is required.");
  const value = cleanMoney(body.value, "Discount value", { min: 1, max: 100_000_000 });
  if (type === "percentage" && value > 100) {
    throw new HttpError(400, "Percentage discounts cannot exceed 100%.");
  }
  return {
    code,
    description: cleanText(body.description || "", {
      name: "Description",
      max: 180,
    }),
    type,
    value,
    minSubtotal: cleanMoney(body.minSubtotal || 0, "Minimum subtotal"),
    maxDiscount: cleanMoney(body.maxDiscount || 0, "Maximum discount"),
    usageLimit: cleanInteger(body.usageLimit || 0, "Usage limit", {
      min: 0,
      max: 1_000_000,
    }),
    startsAt: optionalDate(body.startsAt, "Start date"),
    endsAt: optionalDate(body.endsAt, "End date"),
    active: body.active == null ? (existing?.active ?? true) : Boolean(body.active),
  };
}

adminRouter.get(
  "/coupons",
  asyncHandler(async (_req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ coupons });
  }),
);

adminRouter.post(
  "/coupons",
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.create(couponPayload(req.body));
    res.status(201).json({ coupon });
  }),
);

adminRouter.patch(
  "/coupons/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid coupon.");
    }
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new HttpError(404, "Coupon not found.");
    Object.assign(coupon, couponPayload(req.body, coupon));
    await coupon.save();
    res.json({ coupon });
  }),
);

adminRouter.delete(
  "/coupons/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new HttpError(400, "Invalid coupon.");
    }
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { returnDocument: "after" },
    );
    if (!coupon) throw new HttpError(404, "Coupon not found.");
    res.status(204).end();
  }),
);
