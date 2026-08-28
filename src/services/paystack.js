import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

const endpoint = "https://api.paystack.co";

async function paystackRequest(path, options = {}) {
  if (!env.paystackSecretKey) {
    throw new HttpError(503, "Online payment is not configured yet.");
  }
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.status) {
    throw new HttpError(
      502,
      payload.message || "The payment provider could not complete the request.",
    );
  }
  return payload.data;
}

export async function initializePaystackTransaction(order) {
  return paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: order.customer.email,
      amount: order.total * 100,
      currency: order.currency,
      reference: order.payment.reference,
      callback_url: env.paystackCallbackUrl,
      metadata: {
        order_reference: order.reference,
        customer_name: order.customer.fullName,
        cancel_action: `${env.appUrl}/#/checkout`,
      },
    }),
  });
}

export async function verifyPaystackTransaction(reference) {
  return paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
    },
  );
}

export function assertVerifiedPayment(order, transaction) {
  const expectedAmount = order.total * 100;
  if (
    transaction.status !== "success" ||
    Number(transaction.amount) !== expectedAmount ||
    transaction.currency !== order.currency ||
    transaction.reference !== order.payment.reference
  ) {
    throw new HttpError(409, "The payment could not be matched to this order.");
  }
}
