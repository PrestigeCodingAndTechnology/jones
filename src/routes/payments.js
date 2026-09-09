import { Router } from "express";
import { env } from "../config/env.js";
import { Order } from "../models/Order.js";
import { paystackSignature, safeEqual } from "../utils/crypto.js";
import { finalizePaidOrder } from "../services/orderService.js";
import {
  assertPaystackEnvironment,
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
  if (result.finalized) {
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

  if (event.event === "charge.success" && event.data?.reference) {
    try {
      const transaction = await verifyPaystackTransaction(event.data.reference);
      await processSuccessfulPayment(event.data.reference, transaction);
    } catch (error) {
      console.error("Paystack webhook processing failed:", error);
      return res.sendStatus(500);
    }
  }

  if (
    [
      "refund.pending",
      "refund.processing",
      "refund.needs-attention",
      "refund.failed",
      "refund.processed",
    ].includes(event.event) &&
    event.data?.transaction_reference
  ) {
    try {
      const order = await Order.findOne({
        "payment.reference": event.data.transaction_reference,
      }).select("+payment.refund.providerResponse");
      if (order) {
        if (event.data.domain) assertPaystackEnvironment(event.data.domain);
        const amount = Number(event.data.amount);
        if (
          (Number.isFinite(amount) && amount !== Math.round(order.total * 100)) ||
          (event.data.currency && event.data.currency !== order.currency)
        ) {
          console.error("Refund webhook amount/currency mismatch", {
            order: order.reference,
            amount: event.data.amount,
            currency: event.data.currency,
          });
          return res.sendStatus(409);
        }
        const refundStatus = String(event.data.status || event.event.slice(7));
        if (order.payment.refund?.status === "processed" && refundStatus !== "processed") {
          return res.sendStatus(200);
        }
        order.payment.refund.status = refundStatus;
        order.payment.refund.reference = String(
          event.data.refund_reference || order.payment.refund.reference || "",
        );
        order.payment.refund.amount = Number.isFinite(amount)
          ? Math.round(amount / 100)
          : order.total;
        order.payment.refund.updatedAt = new Date();
        order.payment.refund.providerResponse = event.data;
        if (refundStatus === "processed") {
          order.payment.status = "refunded";
          order.payment.refund.refundedAt = new Date();
        } else if (refundStatus === "failed") {
          order.payment.status = "paid";
        }
        await order.save();
      }
    } catch (error) {
      console.error("Paystack refund webhook processing failed:", error);
      return res.sendStatus(500);
    }
  }
  return res.sendStatus(200);
});

export async function paymentCallback(req, res) {
  const reference = String(req.query.reference || req.query.trxref || "").trim();
  if (!reference || reference.length > 120) {
    return res.redirect("/checkout?payment=missing-reference");
  }
  try {
    const transaction = await verifyPaystackTransaction(reference);
    const order = await processSuccessfulPayment(reference, transaction);
    if (!order) return res.redirect("/checkout?payment=order-not-found");
    return res.redirect(
      `/order-success?order=${encodeURIComponent(order.reference)}`,
    );
  } catch (error) {
    console.error("Payment callback verification failed:", error);
    return res.redirect("/checkout?payment=verification-failed");
  }
}
