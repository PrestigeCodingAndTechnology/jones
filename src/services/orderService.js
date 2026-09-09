import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Coupon, normalizeCouponCode } from "../models/Coupon.js";
import { env } from "../config/env.js";
import { sign, verifySignature } from "../utils/crypto.js";
import { cleanEmail, cleanText, HttpError } from "../utils/http.js";
import { calculateQuote, applyCouponToQuote } from "./quote.js";
import { statusAfterVerifiedPayment } from "./orderWorkflow.js";

export { calculateQuote, applyCouponToQuote } from "./quote.js";

export async function quoteCart(cartItems, promoCode = "") {
  if (!Array.isArray(cartItems)) {
    throw new HttpError(400, "Your shopping bag is invalid.");
  }
  const ids = Array.from(
    new Set(cartItems.map((item) => String(item?.productId || ""))),
  );
  if (!ids.length || ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new HttpError(400, "Your bag contains an invalid product.");
  }
  const products = await Product.find({ _id: { $in: ids }, active: true });
  let quote = calculateQuote(cartItems, products);
  const code = normalizeCouponCode(promoCode);
  if (code) {
    const coupon = await Coupon.findOne({ code });
    if (!coupon) throw new HttpError(400, "That promo code is not valid.");
    quote = applyCouponToQuote(quote, coupon);
  }
  if (quote.total < 1) {
    throw new HttpError(400, "The order total must be greater than zero.");
  }
  return quote;
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
  promoCode = "",
}) {
  if (!env.paystackConfigured || !["test", "live"].includes(env.paystackEnvironment)) {
    throw new HttpError(503, "Secure online payment is not configured yet.");
  }
  const quote = await quoteCart(cartItems, promoCode);
  const orderReference = reference();
  const paymentReference = `${orderReference}-${randomBytes(3).toString("hex")}`;
  return Order.create({
    reference: orderReference,
    customer: cleanCustomer(customer),
    items: quote.items,
    subtotal: quote.subtotal,
    deliveryFee: quote.deliveryFee,
    discount: quote.discount,
    promotion: quote.promotion || undefined,
    total: quote.total,
    currency: quote.currency,
    payment: {
      provider: "paystack",
      environment: env.paystackEnvironment,
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

async function restoreItemInventory(item) {
  const existingSize = await Product.updateOne(
    { _id: item.product, "sizeInventory.size": item.size },
    {
      $inc: {
        "sizeInventory.$[selectedSize].stock": item.quantity,
        stock: item.quantity,
        __v: 1,
      },
    },
    { arrayFilters: [{ "selectedSize.size": item.size }] },
  );
  if (existingSize.modifiedCount === 1) return;

  const restoredSize = await Product.updateOne(
    { _id: item.product, "sizeInventory.size": { $ne: item.size } },
    {
      $push: {
        sizeInventory: {
          $each: [{ size: item.size, stock: item.quantity }],
          $sort: { size: 1 },
        },
      },
      $inc: { stock: item.quantity, __v: 1 },
    },
  );
  if (restoredSize.modifiedCount !== 1) {
    throw new HttpError(
      409,
      `Could not restore ${item.name} size ${item.size} inventory.`,
    );
  }
  await Product.updateOne(
    { _id: item.product },
    { $addToSet: { sizes: item.size }, $inc: { __v: 1 } },
  );
}

export async function commitOrderInventory(order) {
  if (order.inventoryCommittedAt && !order.inventoryRestockedAt) return true;
  const committed = [];
  for (const item of order.items) {
    const result = await Product.updateOne(
      {
        _id: item.product,
        active: true,
        sizeInventory: {
          $elemMatch: { size: item.size, stock: { $gte: item.quantity } },
        },
      },
      {
        $inc: {
          "sizeInventory.$[selectedSize].stock": -item.quantity,
          stock: -item.quantity,
          __v: 1,
        },
      },
      { arrayFilters: [{ "selectedSize.size": item.size }] },
    );
    if (result.modifiedCount !== 1) {
      await Promise.all(committed.map(restoreItemInventory));
      return false;
    }
    committed.push(item);
  }
  order.inventoryCommittedAt = new Date();
  order.inventoryRestockedAt = undefined;
  return true;
}

export async function restockOrderInventory(order) {
  if (!order.inventoryCommittedAt || order.inventoryRestockedAt) return false;
  await Promise.all(order.items.map(restoreItemInventory));
  order.inventoryRestockedAt = new Date();
  return true;
}

export async function finalizePaidOrder(order, providerData = {}) {
  if (["paid", "refunded"].includes(order.payment.status)) {
    return { order, alreadyPaid: true, finalized: false };
  }

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
    { returnDocument: "after" },
  ).select("+payment.providerResponse +payment.authorizationCode");

  if (!claimed) {
    const current = await Order.findById(order._id);
    return {
      order: current || order,
      alreadyPaid: ["paid", "refunded"].includes(current?.payment?.status),
      finalized: false,
      inProgress: current?.payment?.status === "processing",
    };
  }
  order = claimed;

  const wasCancelledBeforePayment = order.status === "Cancelled";
  const inventoryOk = wasCancelledBeforePayment
    ? false
    : await commitOrderInventory(order);

  order.payment.status = "paid";
  order.payment.environment = String(providerData.domain || order.payment.environment);
  order.payment.transactionId = providerData.id ? String(providerData.id) : "";
  order.payment.channel = String(providerData.channel || "");
  order.payment.authorizationCode =
    providerData.authorization?.authorization_code || "";
  order.payment.paidAt = providerData.paid_at
    ? new Date(providerData.paid_at)
    : new Date();
  order.payment.providerResponse = providerData;
  order.payment.processingAt = undefined;
  order.status = statusAfterVerifiedPayment({
    wasCancelled: wasCancelledBeforePayment,
    inventoryOk,
  });
  order.statusHistory.push({ status: order.status, changedBy: "payment" });
  await order.save();

  if (order.promotion?.coupon) {
    await Coupon.updateOne(
      { _id: order.promotion.coupon },
      { $inc: { usedCount: 1 } },
    ).catch((error) => {
      console.error("Unable to increment coupon usage:", error);
    });
  }

  return { order, alreadyPaid: false, finalized: true };
}
