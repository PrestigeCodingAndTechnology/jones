import { Router } from "express";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { VisitorDay } from "../models/VisitorDay.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { Subscriber } from "../models/Subscriber.js";
import { env } from "../config/env.js";
import { sha256 } from "../utils/crypto.js";
import {
  asyncHandler,
  cleanEmail,
  cleanText,
  HttpError,
  publicOrder,
  publicProduct,
  normalizePhoneForMatch,
} from "../utils/http.js";
import {
  createOrderAccessToken,
  createPendingOrder,
  quoteCart,
  verifyOrderAccessToken,
} from "../services/orderService.js";
import {
  assertPaystackConfigured,
  initializePaystackTransaction,
} from "../services/paystack.js";
import { sendContactNotification } from "../services/email.js";

export const publicRouter = Router();

publicRouter.get(
  "/session",
  asyncHandler(async (req, res) => {
    const settings = await StoreSettings.findOneAndUpdate(
      { key: "primary" },
      { $setOnInsert: { key: "primary" } },
      { upsert: true, new: true },
    ).lean();
    res.json({
      csrfToken: req.csrfToken,
      adminAuthenticated: Boolean(req.admin),
      admin: req.admin
        ? {
            id: String(req.admin._id),
            name: req.admin.name,
            email: req.admin.email,
          }
        : null,
      paymentConfigured: env.paystackConfigured,
      paymentEnvironment: env.paystackEnvironment,
      paystackPublicKey: env.paystackConfigured ? env.paystackPublicKey : "",
      settings: {
        storeName: settings.storeName,
        phone: settings.phone,
        notificationEmail: req.admin ? settings.notificationEmail : "",
        orderAlerts: req.admin ? settings.orderAlerts : undefined,
        viewTracking: settings.viewTracking,
      },
    });
  }),
);

publicRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const filter = { active: true };
    if (req.query.category && req.query.category !== "All") {
      filter.category = cleanText(req.query.category, {
        name: "Category",
        max: 80,
      });
    }
    if (req.query.search) {
      filter.$text = {
        $search: cleanText(req.query.search, { name: "Search", max: 100 }),
      };
    }
    const sort =
      req.query.sort === "low"
        ? { price: 1 }
        : req.query.sort === "high"
          ? { price: -1 }
          : req.query.sort === "new"
            ? { createdAt: -1 }
            : { featured: -1, createdAt: -1 };
    const products = await Product.find(filter).sort(sort).limit(100).lean();
    res.json({ products: products.map(publicProduct) });
  }),
);

publicRouter.get(
  "/products/:identifier",
  asyncHandler(async (req, res) => {
    const identifier = cleanText(req.params.identifier, {
      name: "Product",
      min: 1,
      max: 100,
    });
    const query = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : { slug: identifier };
    const product = await Product.findOneAndUpdate(
      { ...query, active: true },
      { $inc: { views: 1 } },
      { new: true },
    ).lean();
    if (!product) throw new HttpError(404, "Sneaker not found.");
    res.json({ product: publicProduct(product) });
  }),
);

publicRouter.post(
  "/orders/quote",
  asyncHandler(async (req, res) => {
    const quote = await quoteCart(req.body.items, req.body.promoCode);
    res.json({
      items: quote.items.map((item) => ({
        productId: String(item.product),
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitDeliveryFee: item.unitDeliveryFee,
        lineSubtotal: item.lineSubtotal,
        lineDeliveryFee: item.lineDeliveryFee,
      })),
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFee,
      discount: quote.discount || 0,
      promoCode: quote.promotion?.code || "",
      total: quote.total,
      currency: quote.currency,
    });
  }),
);

publicRouter.post(
  "/orders",
  asyncHandler(async (req, res) => {
    assertPaystackConfigured();
    const order = await createPendingOrder({
      customer: req.body.customer,
      cartItems: req.body.items,
      paymentMethod: req.body.paymentMethod,
      promoCode: req.body.promoCode,
    });
    const orderToken = createOrderAccessToken(order);

    try {
      const transaction = await initializePaystackTransaction(order);
      order.payment.accessCode = transaction.access_code;
      await order.save();
      return res.status(201).json({
        order: publicOrder(order),
        orderToken,
        payment: {
          mode: "paystack",
          environment: env.paystackEnvironment,
          authorizationUrl: transaction.authorization_url,
          accessCode: transaction.access_code,
        },
      });
    } catch (error) {
      order.payment.status = "failed";
      order.payment.processingAt = undefined;
      order.statusHistory.push({
        status: "Payment initialization failed",
        changedBy: "system",
      });
      await order.save().catch((saveError) => {
        console.error("Unable to record failed payment initialization:", saveError);
      });
      throw error;
    }
  }),
);

publicRouter.get(
  "/orders/:reference",
  asyncHandler(async (req, res) => {
    if (!verifyOrderAccessToken(req.query.token, req.params.reference)) {
      throw new HttpError(403, "The order link is invalid or incomplete.");
    }
    const order = await Order.findOne({ reference: req.params.reference }).lean();
    if (!order) throw new HttpError(404, "Order not found.");
    res.json({ order: publicOrder(order) });
  }),
);

publicRouter.post(
  "/orders/lookup",
  asyncHandler(async (req, res) => {
    const reference = cleanText(req.body.reference, {
      name: "Order reference",
      min: 8,
      max: 60,
    }).toUpperCase();
    const email = cleanEmail(req.body.email);
    const phone = cleanText(req.body.phone, {
      name: "Phone number",
      min: 7,
      max: 40,
    });
    const order = await Order.findOne({
      reference,
      "customer.email": email,
    }).lean();
    if (
      !order ||
      normalizePhoneForMatch(order.customer.phone) !== normalizePhoneForMatch(phone)
    ) {
      throw new HttpError(
        404,
        "We could not match an order with those details.",
      );
    }
    res.json({ order: publicOrder(order) });
  }),
);

publicRouter.post(
  "/analytics/visit",
  asyncHandler(async (req, res) => {
    const settings = await StoreSettings.findOne({ key: "primary" }).lean();
    if (settings?.viewTracking === false) return res.status(204).end();
    const visitorId = cleanText(req.body.visitorId, {
      name: "Visitor",
      min: 12,
      max: 100,
    });
    const path = cleanText(req.body.path || "/", {
      name: "Path",
      min: 1,
      max: 180,
    });
    const referrer = String(req.body.referrer || "").slice(0, 500);
    let referrerHost = "";
    try {
      referrerHost = referrer ? new URL(referrer).host.slice(0, 180) : "";
    } catch {}
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = sha256(`${visitorId}:${env.sessionSecret}`);
    await VisitorDay.updateOne(
      { day, visitorHash },
      {
        $inc: { pageViews: 1 },
        $addToSet: { paths: path },
        $set: { lastSeenAt: new Date() },
        $setOnInsert: { firstSeenAt: new Date(), referrerHost },
      },
      { upsert: true },
    );
    res.status(204).end();
  }),
);

publicRouter.post(
  "/contact",
  asyncHandler(async (req, res) => {
    const message = await ContactMessage.create({
      name: cleanText(req.body.name, { name: "Name", min: 2, max: 120 }),
      phone: cleanText(req.body.phone, {
        name: "Phone number",
        min: 7,
        max: 40,
      }),
      message: cleanText(req.body.message, {
        name: "Message",
        min: 5,
        max: 2_000,
      }),
    });
    void sendContactNotification(message).catch((error) => {
      console.error("Contact notification failed:", error);
    });
    res.status(201).json({
      id: String(message._id),
      message: "Your enquiry has been received.",
    });
  }),
);

publicRouter.post(
  "/subscribers",
  asyncHandler(async (req, res) => {
    const phone = cleanText(req.body.phone, {
      name: "WhatsApp number",
      min: 7,
      max: 40,
    });
    await Subscriber.findOneAndUpdate(
      { phone },
      { $set: { active: true, source: "storefront" }, $setOnInsert: { phone } },
      { upsert: true, new: true },
    );
    res.status(201).json({ message: "You are on the Jones Kicks drop list." });
  }),
);
