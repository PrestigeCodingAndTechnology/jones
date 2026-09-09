import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

const endpoint = "https://api.paystack.co";
const checkoutOrigin = "https://checkout.paystack.com";

function configuredError() {
  return new HttpError(
    503,
    "Secure online payment is temporarily unavailable. Please contact Jones Kicks support.",
  );
}

export function assertPaystackConfigured() {
  if (!env.paystackConfigured || !env.paystackSecretKey) throw configuredError();
}

export function expectedPaystackDomain() {
  return env.paystackEnvironment === "live" ? "live" : "test";
}

export function isPaystackCheckoutUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.origin === checkoutOrigin && url.protocol === "https:";
  } catch {
    return false;
  }
}

export function assertPaystackEnvironment(domain) {
  const expected = expectedPaystackDomain();
  if (String(domain || "") !== expected) {
    throw new HttpError(
      409,
      "The payment environment did not match this store configuration.",
    );
  }
}

async function paystackRequest(path, options = {}) {
  assertPaystackConfigured();
  let response;
  try {
    response = await fetch(`${endpoint}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${env.paystackSecretKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Paystack network request failed:", error);
    throw new HttpError(502, "The payment provider is temporarily unreachable.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.status) {
    console.error("Paystack API request failed:", {
      path,
      status: response.status,
      message: payload.message || "Unknown Paystack error",
    });
    throw new HttpError(
      502,
      payload.message || "The payment provider could not complete the request.",
    );
  }
  return payload.data;
}

export async function initializePaystackTransaction(order) {
  const data = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: order.customer.email,
      amount: Math.round(order.total * 100),
      currency: order.currency,
      reference: order.payment.reference,
      callback_url: env.paystackCallbackUrl,
      metadata: {
        order_reference: order.reference,
        customer_name: order.customer.fullName,
        customer_phone: order.customer.phone,
        cancel_action: `${env.appUrl}/checkout`,
      },
    }),
  });

  if (
    !isPaystackCheckoutUrl(data?.authorization_url) ||
    !data?.access_code ||
    data.reference !== order.payment.reference
  ) {
    throw new HttpError(502, "Paystack returned an incomplete checkout response.");
  }
  return data;
}

export async function verifyPaystackTransaction(reference) {
  return paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
}

export async function verifyPaystackCredentials() {
  return paystackRequest("/transaction/totals", { method: "GET" });
}

export async function createPaystackRefund(order, reason = "") {
  const data = await paystackRequest("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: order.payment.reference,
      amount: Math.round(order.total * 100),
      currency: order.currency,
      customer_note: reason || `Refund for order ${order.reference}`,
      merchant_note: `Jones Kicks full refund for order ${order.reference}`,
    }),
  });
  if (data?.domain) assertPaystackEnvironment(data.domain);
  return data;
}

export function assertVerifiedPayment(order, transaction) {
  const expectedAmount = Math.round(order.total * 100);
  const transactionEmail = String(transaction?.customer?.email || "")
    .trim()
    .toLowerCase();
  const orderEmail = String(order.customer.email || "").trim().toLowerCase();

  assertPaystackEnvironment(transaction?.domain);

  if (
    transaction?.status !== "success" ||
    Number(transaction?.amount) !== expectedAmount ||
    transaction?.currency !== order.currency ||
    transaction?.reference !== order.payment.reference ||
    (transactionEmail && transactionEmail !== orderEmail)
  ) {
    throw new HttpError(409, "The payment could not be matched to this order.");
  }
}
