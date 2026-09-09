import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import {
  assertVerifiedPayment,
  isPaystackCheckoutUrl,
} from "../src/services/paystack.js";

function order() {
  return {
    total: 58_500,
    currency: "NGN",
    customer: { email: "buyer@example.com" },
    payment: { reference: "JK-VERIFY-123" },
  };
}

function transaction(overrides = {}) {
  const configuredDomain = env.paystackEnvironment === "live" ? "live" : "test";
  return {
    status: "success",
    amount: 5_850_000,
    currency: "NGN",
    reference: "JK-VERIFY-123",
    domain: configuredDomain,
    customer: { email: "buyer@example.com" },
    ...overrides,
  };
}

test("accepts a Paystack transaction only when amount, currency, reference and customer match", () => {
  assert.doesNotThrow(() => assertVerifiedPayment(order(), transaction()));
  assert.throws(
    () => assertVerifiedPayment(order(), transaction({ amount: 100 })),
    /could not be matched/i,
  );
  assert.throws(
    () =>
      assertVerifiedPayment(
        order(),
        transaction({ customer: { email: "other@example.com" } }),
      ),
    /could not be matched/i,
  );
});

test("rejects a transaction from the wrong Paystack environment", () => {
  const wrongDomain = env.paystackEnvironment === "live" ? "test" : "live";
  assert.throws(
    () => assertVerifiedPayment(order(), transaction({ domain: wrongDomain })),
    /environment did not match/i,
  );
});

test("accepts redirects only to Paystack's HTTPS checkout origin", () => {
  assert.equal(
    isPaystackCheckoutUrl("https://checkout.paystack.com/abc123"),
    true,
  );
  assert.equal(
    isPaystackCheckoutUrl("https://checkout.paystack.com.evil.example/abc"),
    false,
  );
  assert.equal(
    isPaystackCheckoutUrl("http://checkout.paystack.com/abc123"),
    false,
  );
});
