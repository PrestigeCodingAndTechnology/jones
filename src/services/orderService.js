import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { env } from "../config/env.js";
import { sign, verifySignature } from "../utils/crypto.js";
import {
  cleanEmail,
  cleanInteger,
  cleanText,
  HttpError,
} from "../utils/http.js";

export function calculateQuote(cartItems, products) {
  if (
    !Array.isArray(cartItems) ||
    cartItems.length < 1 ||
    cartItems.length > 20
  ) {
    throw new HttpError(
      400,
      "Your bag must contain between 1 and 20 product lines.",
    );
  }
  const productMap = new Map(
    products.map((product) => [String(product._id || product.id), product]),
  );
  const combined = new Map();

  for (const entry of cartItems) {
    const productId = String(entry.productId || "");
    const size = cleanInteger(entry.size, "Size", { min: 40, max: 45 });
    const quantity = cleanInteger(entry.qty ?? entry.quantity, "Quantity", {
      min: 1,
      max: 10,
    });
    const key = `${productId}:${size}`;
    combined.set(key, {
      productId,
      size,
      quantity: (combined.get(key)?.quantity || 0) + quantity,
    });
  }

  const items = [];
  for (const entry of combined.values()) {
    if (entry.quantity > 10)
      throw new HttpError(400, "A maximum of 10 pairs is allowed per size.");
    const product = productMap.get(entry.productId);
    if (!product || !product.active)
      throw new HttpError(409, "A product in your bag is no longer available.");
    if (!product.sizes.includes(entry.size))
      throw new HttpError(
        409,
        `${product.name} is unavailable in size ${entry.size}.`,
      );
    if (product.stock < entry.quantity)
      throw new HttpError(
        409,
        `Only ${product.stock} ${product.name} pair(s) remain.`,
      );
    const lineSubtotal = Math.round(product.price) * entry.quantity;
    const lineDeliveryFee =
      Math.round(product.deliveryFee || 0) * entry.quantity;
    items.push({
      product: product._id || product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      size: entry.size,
      quantity: entry.quantity,
      unitPrice: Math.round(product.price),
      unitDeliveryFee: Math.round(product.deliveryFee || 0),
      lineSubtotal,
      lineDeliveryFee,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const deliveryFee = items.reduce(
    (sum, item) => sum + item.lineDeliveryFee,
    0,
  );
  return {
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    currency: "NGN",
  };
}

export async function quoteCart(cartItems) {
  const ids = Array.from(
    new Set(cartItems.map((item) => String(item.productId || ""))),
  );
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new HttpError(400, "Your bag contains an invalid product.");
  }
  const products = await Product.find({ _id: { $in: ids }, active: true });
  return calculateQuote(cartItems, products);
}

function reference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `JK-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function cleanCustomer(input = {}) {
  return {
    fullName: cleanText(input.fullName, {
      name: "Full name",
      min: 2,
      max: 120,
    }),
    email: cleanEmail(input.email),
    phone: cleanText(input.phone, { name: "Phone number", min: 7, max: 40 }),
    address: cleanText(input.address, {
      name: "Delivery address",
      min: 5,
      max: 240,
    }),
    city: cleanText(input.city, { name: "City", min: 2, max: 100 }),
    region: cleanText(input.region, { name: "State", min: 2, max: 100 }),
    notes: cleanText(input.notes, { name: "Delivery note", max: 500 }),
  };
}

export async function createPendingOrder({
  customer,
  cartItems,
  paymentMethod = "online",
}) {
  const quote = await quoteCart(cartItems);
  const orderReference = reference();
  const paymentReference = `${orderReference}-${randomBytes(3).toString("hex")}`;
  return Order.create({
    reference: orderReference,
    customer: cleanCustomer(customer),
    items: quote.items,
    subtotal: quote.subtotal,
    deliveryFee: quote.deliveryFee,
    total: quote.total,
    currency: quote.currency,
    payment: {
      provider: env.paymentMode,
      method: cleanText(paymentMethod, {
        name: "Payment method",
        min: 2,
        max: 40,
      }),
      status: "pending",
      reference: paymentReference,
    },
    status: "Awaiting payment",
    statusHistory: [{ status: "Awaiting payment", changedBy: "customer" }],
  });
}

export function createDemoPaymentToken(order) {
  return `${order.payment.reference}.${sign(order.payment.reference, env.sessionSecret)}`;
}

export function verifyDemoPaymentToken(token, reference) {
  const value = String(token || "");
  const index = value.lastIndexOf(".");
  if (index < 1) return false;
  return (
    value.slice(0, index) === reference &&
    verifySignature(reference, value.slice(index + 1), env.sessionSecret)
  );
}

export function createOrderAccessToken(order) {
  return `${order.reference}.${sign(`order:${order.reference}`, env.sessionSecret)}`;
}

export function verifyOrderAccessToken(token, reference) {
  const value = String(token || "");
  const index = value.lastIndexOf(".");
  if (index < 1 || value.slice(0, index) !== reference) return false;
  return verifySignature(
    `order:${reference}`,
    value.slice(index + 1),
    env.sessionSecret,
  );
}

export async function finalizePaidOrder(order, providerData = {}) {
  if (order.payment.status === "paid") return { order, alreadyPaid: true };

  const staleBefore = new Date(Date.now() - 5 * 60_000);
  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      $or: [
        { "payment.status": { $in: ["pending", "failed"] } },
        {
          "payment.status": "processing",
          "payment.processingAt": { $lt: staleBefore },
        },
      ],
    },
    {
      $set: {
        "payment.status": "processing",
        "payment.processingAt": new Date(),
      },
    },
    { new: true },
  ).select("+payment.providerResponse +payment.authorizationCode");

  if (!claimed) {
    const current = await Order.findById(order._id);
    return { order: current || order, alreadyPaid: true };
  }
  order = claimed;

  const committed = [];
  let inventoryOk = true;
  for (const item of order.items) {
    const result = await Product.updateOne(
      { _id: item.product, active: true, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
    );
    if (result.modifiedCount !== 1) {
      inventoryOk = false;
      break;
    }
    committed.push(item);
  }

  if (!inventoryOk) {
    await Promise.all(
      committed.map((item) =>
        Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
        ),
      ),
    );
  }

  order.payment.status = "paid";
  order.payment.channel =
    providerData.channel || (env.paymentMode === "demo" ? "demo" : "");
  order.payment.authorizationCode =
    providerData.authorization?.authorization_code || "";
  order.payment.paidAt = providerData.paid_at
    ? new Date(providerData.paid_at)
    : new Date();
  order.payment.providerResponse = providerData;
  order.payment.processingAt = undefined;
  order.status = inventoryOk ? "New" : "Needs review";
  order.statusHistory.push({ status: order.status, changedBy: "payment" });
  if (inventoryOk) order.inventoryCommittedAt = new Date();
  await order.save();
  return { order, alreadyPaid: false };
}
