import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Promotion } from "../models/Promotion.js";
import { env } from "../config/env.js";
import { sign, verifySignature } from "../utils/crypto.js";
import {
  publicPromotion,
  resolvePromotion,
} from "./promotionService.js";
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

  const requestedByProduct = new Map();
  for (const entry of combined.values()) {
    requestedByProduct.set(
      entry.productId,
      (requestedByProduct.get(entry.productId) || 0) + entry.quantity,
    );
  }
  for (const [productId, requested] of requestedByProduct) {
    const product = productMap.get(productId);
    if (!product || !product.active) {
      throw new HttpError(409, "A product in your bag is no longer available.");
    }
    if (product.stock < requested) {
      throw new HttpError(
        409,
        `Only ${product.stock} ${product.name} pair(s) remain across your selected sizes.`,
      );
    }
  }

  const items = [];
  for (const entry of combined.values()) {
    if (entry.quantity > 10)
      throw new HttpError(400, "A maximum of 10 pairs is allowed per size.");
    const product = productMap.get(entry.productId);
    if (!product.sizes.includes(entry.size))
      throw new HttpError(
        409,
        `${product.name} is unavailable in size ${entry.size}.`,
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

export function inventoryRequirements(items) {
  const requirements = new Map();
  for (const item of items || []) {
    const productId = String(item.product?._id || item.product || "");
    requirements.set(
      productId,
      (requirements.get(productId) || 0) + Number(item.quantity || 0),
    );
  }
  return Array.from(requirements, ([product, quantity]) => ({
    product,
    quantity,
  }));
}

async function commitInventory(items, session) {
  const committed = [];
  for (const item of inventoryRequirements(items)) {
    const result = await Product.updateOne(
      { _id: item.product, active: true, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      session ? { session } : undefined,
    );
    if (result.modifiedCount !== 1) {
      for (const entry of committed) {
        await Product.updateOne(
          { _id: entry.product },
          { $inc: { stock: entry.quantity } },
          session ? { session } : undefined,
        );
      }
      return false;
    }
    committed.push(item);
  }
  return true;
}

async function runAtomic(work) {
  if (!env.mongodbTransactions) return work(null);
  return mongoose.connection.transaction(work, {
    readPreference: "primary",
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
  });
}

export async function quoteCart(cartItems, promotionCode = "") {
  if (!Array.isArray(cartItems) || cartItems.length < 1 || cartItems.length > 20) {
    return calculateQuote(cartItems, []);
  }
  const ids = Array.from(
    new Set(cartItems.map((item) => String(item.productId || ""))),
  );
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new HttpError(400, "Your bag contains an invalid product.");
  }
  const products = await Product.find({ _id: { $in: ids }, active: true });
  const quote = calculateQuote(cartItems, products);
  const resolved = await resolvePromotion(promotionCode, quote.subtotal);
  if (!resolved) return { ...quote, discount: 0, promotion: null };
  return {
    ...quote,
    discount: resolved.discount,
    total: quote.total - resolved.discount,
    promotion: publicPromotion(resolved.promotion, resolved.discount),
  };
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
  promotionCode = "",
}) {
  const quote = await quoteCart(cartItems, promotionCode);
  const orderReference = reference();
  const paymentReference = `${orderReference}-${randomBytes(3).toString("hex")}`;
  return Order.create({
    reference: orderReference,
    customer: cleanCustomer(customer),
    items: quote.items,
    subtotal: quote.subtotal,
    discount: quote.discount,
    deliveryFee: quote.deliveryFee,
    total: quote.total,
    currency: quote.currency,
    promotion: quote.promotion
      ? {
          promotion: quote.promotion.id,
          code: quote.promotion.code,
          type: quote.promotion.type,
          value: quote.promotion.value,
        }
      : undefined,
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
  const issuedAt = Math.floor(Date.now() / 1_000);
  const payload = `order:${order.reference}:${issuedAt}`;
  return `${order.reference}.${issuedAt}.${sign(payload, env.sessionSecret)}`;
}

export function verifyOrderAccessToken(token, reference) {
  const value = String(token || "");
  const signatureIndex = value.lastIndexOf(".");
  const issuedAtIndex = value.lastIndexOf(".", signatureIndex - 1);
  if (issuedAtIndex < 1 || signatureIndex <= issuedAtIndex) return false;
  if (value.slice(0, issuedAtIndex) !== reference) return false;
  const issuedAt = Number(value.slice(issuedAtIndex + 1, signatureIndex));
  const now = Math.floor(Date.now() / 1_000);
  const maxAge = env.orderAccessTtlHours * 60 * 60;
  if (!Number.isInteger(issuedAt) || issuedAt > now + 300 || now - issuedAt > maxAge) {
    return false;
  }
  return verifySignature(
    `order:${reference}:${issuedAt}`,
    value.slice(signatureIndex + 1),
    env.sessionSecret,
  );
}

export async function finalizePaidOrder(inputOrder, providerData = {}) {
  if (inputOrder.payment.status === "paid") {
    return { order: inputOrder, alreadyPaid: true };
  }

  const result = await runAtomic(async (session) => {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    const claimed = await Order.findOneAndUpdate(
      {
        _id: inputOrder._id,
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
      { new: true, ...(session ? { session } : {}) },
    ).select("+payment.providerResponse +payment.authorizationCode");

    if (!claimed) {
      const currentQuery = Order.findById(inputOrder._id);
      if (session) currentQuery.session(session);
      const current = await currentQuery;
      return { order: current || inputOrder, alreadyPaid: true };
    }

    const inventoryOk = await commitInventory(claimed.items, session);
    claimed.payment.status = "paid";
    claimed.payment.channel =
      providerData.channel || (env.paymentMode === "demo" ? "demo" : "");
    claimed.payment.authorizationCode =
      providerData.authorization?.authorization_code || "";
    claimed.payment.paidAt = providerData.paid_at
      ? new Date(providerData.paid_at)
      : new Date();
    claimed.payment.providerResponse = providerData;
    claimed.payment.processingAt = undefined;
    claimed.status = inventoryOk ? "New" : "Needs review";
    claimed.statusHistory.push({ status: claimed.status, changedBy: "payment" });
    if (inventoryOk) claimed.inventoryCommittedAt = new Date();
    if (claimed.promotion?.promotion && !claimed.promotionCommittedAt) {
      await Promotion.updateOne(
        { _id: claimed.promotion.promotion },
        { $inc: { usedCount: 1 } },
        session ? { session } : undefined,
      );
      claimed.promotionCommittedAt = new Date();
    }
    await claimed.save(session ? { session } : undefined);
    return { order: claimed, alreadyPaid: false };
  });
  result.order?.$session?.(null);
  return result;
}

export async function updateFulfilmentStatus(inputOrder, status, changedBy) {
  const updated = await runAtomic(async (session) => {
    let order = inputOrder;
    if (session) {
      order = await Order.findById(inputOrder._id).session(session);
      if (!order) throw new HttpError(404, "Order not found.");
    }
    if (order.status === status) return order;
    if (order.status === "Cancelled") {
      throw new HttpError(409, "A cancelled order cannot be reopened.");
    }
    if (
      order.payment.status !== "paid" &&
      !["Awaiting payment", "Cancelled", "Needs review"].includes(status)
    ) {
      throw new HttpError(
        409,
        "Payment must be confirmed before fulfilment begins.",
      );
    }
    if (order.payment.status === "paid" && status === "Awaiting payment") {
      throw new HttpError(409, "A paid order cannot return to awaiting payment.");
    }

    if (
      order.payment.status === "paid" &&
      !order.inventoryCommittedAt &&
      !["Cancelled", "Needs review"].includes(status)
    ) {
      const inventoryOk = await commitInventory(order.items, session);
      if (!inventoryOk) {
        throw new HttpError(
          409,
          "Stock is still unavailable. Restock the affected product or cancel the order.",
        );
      }
      order.inventoryCommittedAt = new Date();
    }

    if (
      status === "Cancelled" &&
      order.inventoryCommittedAt &&
      !order.inventoryReleasedAt
    ) {
      const claimed = await Order.findOneAndUpdate(
        {
          _id: order._id,
          inventoryCommittedAt: { $exists: true },
          inventoryReleasedAt: { $exists: false },
        },
        { $set: { inventoryReleasedAt: new Date() } },
        { new: true, ...(session ? { session } : {}) },
      );
      if (claimed) {
        for (const item of inventoryRequirements(claimed.items)) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            session ? { session } : undefined,
          );
        }
        order.inventoryReleasedAt = claimed.inventoryReleasedAt;
      }
    }

    order.status = status;
    order.statusHistory.push({ status, changedBy });
    await order.save(session ? { session } : undefined);
    return order;
  });
  updated?.$session?.(null);
  return updated;
}
