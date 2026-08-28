import { Router } from "express";
import { env } from "../config/env.js";
import { Order } from "../models/Order.js";
import { paystackSignature, safeEqual } from "../utils/crypto.js";
import { finalizePaidOrder } from "../services/orderService.js";
import {
  assertVerifiedPayment,
  verifyPaystackTransaction,
} from "../services/paystack.js";
import {
  recordNotificationResult,
  sendOrderNotifications,
} from "../services/email.js";

export const paymentsRouter = Router();

async function processSuccessfulPayment(reference, transaction) {
  const order = await Order.findOne({ "payment.reference": reference }).select(
    "+payment.providerResponse +payment.authorizationCode",
  );
  if (!order) return null;
  assertVerifiedPayment(order, transaction);
  const result = await finalizePaidOrder(order, transaction);
  if (!result.alreadyPaid) {
    void recordNotificationResult(
      result.order,
      sendOrderNotifications(result.order),
    );
  }
  return result.order;
}

paymentsRouter.post("/webhook", async (req, res) => {
  if (!env.paystackSecretKey || !Buffer.isBuffer(req.body))
    return res.sendStatus(400);
  const signature = req.get("x-paystack-signature") || "";
  const expected = paystackSignature(req.body, env.paystackSecretKey);
  if (!safeEqual(signature, expected)) return res.sendStatus(401);

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }

  res.sendStatus(200);
  if (event.event === "charge.success" && event.data?.reference) {
    void processSuccessfulPayment(event.data.reference, event.data).catch(
      (error) => {
        console.error("Paystack webhook processing failed:", error);
      },
    );
  }
});

export async function paymentCallback(req, res) {
  const reference = String(req.query.reference || req.query.trxref || "");
  if (!reference) return res.redirect("/#/checkout?payment=missing-reference");
  try {
    const transaction = await verifyPaystackTransaction(reference);
    const order = await processSuccessfulPayment(reference, transaction);
    if (!order) return res.redirect("/#/checkout?payment=order-not-found");
    return res.redirect(
      `/#/order-success?order=${encodeURIComponent(order.reference)}`,
    );
  } catch (error) {
    console.error("Payment callback verification failed:", error);
    return res.redirect("/#/checkout?payment=verification-failed");
  }
}
