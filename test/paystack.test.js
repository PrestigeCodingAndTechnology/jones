import test from "node:test";
import assert from "node:assert/strict";
import { assertVerifiedPayment } from "../src/services/paystack.js";

const order = {
  total: 82_500,
  currency: "NGN",
  payment: { reference: "JK-PAYMENT-123" },
};

test("accepts a Paystack transaction only when status, amount, currency and reference match", () => {
  assert.doesNotThrow(() =>
    assertVerifiedPayment(order, {
      status: "success",
      amount: 8_250_000,
      currency: "NGN",
      reference: "JK-PAYMENT-123",
    }),
  );
});

test("rejects mismatched Paystack transaction data", () => {
  assert.throws(
    () =>
      assertVerifiedPayment(order, {
        status: "success",
        amount: 8_249_900,
        currency: "NGN",
        reference: "JK-PAYMENT-123",
      }),
    /could not be matched/i,
  );
});
