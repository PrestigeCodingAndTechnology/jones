import { Router } from "express";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { Product, slugifyProduct } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { VisitorDay } from "../models/VisitorDay.js";
import { ContactMessage } from "../models/ContactMessage.js";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdmin,
} from "../middleware/session.js";
import { rateLimit } from "../middleware/security.js";
import { verifyPassword } from "../utils/crypto.js";
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

export const adminRouter = Router();

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
      revenue,
      totalVisitors,
      todayVisitors,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      Product.countDocuments({ active: true }),
      Order.countDocuments(),
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
        revenue: revenue[0]?.total || 0,
        totalVisitors,
        todayVisitors,
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
        : Boolean(body.featured),
    active:
      body.active == null ? (existing?.active ?? true) : Boolean(body.active),
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
    const filter = req.query.status
      ? { status: cleanText(req.query.status, { name: "Status", max: 40 }) }
      : {};
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
    order.status = status;
    order.statusHistory.push({ status, changedBy: req.admin.email });
    await order.save();
    res.json({ order: publicOrder(order, { includeCustomer: true }) });
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
    const [daily, totalVisitors, topPaths, referrers] = await Promise.all([
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
    ]);
    res.json({ days, totalVisitors, daily, topPaths, referrers });
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
          notificationEmail: cleanEmail(req.body.notificationEmail, false),
          orderAlerts: Boolean(req.body.orderAlerts),
          viewTracking: Boolean(req.body.viewTracking),
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
