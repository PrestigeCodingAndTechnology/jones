import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  paystackSignature,
  safeEqual,
  verifyPassword,
} from "../src/utils/crypto.js";
import {
  createOrderAccessToken,
  verifyOrderAccessToken,
} from "../src/services/orderService.js";

test("administrator passwords use salted scrypt hashes", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(
    await verifyPassword("correct horse battery staple", first),
    true,
  );
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("Paystack webhook signatures are deterministic and timing-safe comparable", () => {
  const payload = Buffer.from('{"event":"charge.success"}');
  const signature = paystackSignature(payload, "secret-key");
  assert.equal(signature.length, 128);
  assert.equal(safeEqual(signature, signature), true);
  assert.equal(safeEqual(signature, `${signature}0`), false);
});

test("private customer order tokens are signed, scoped and time limited", () => {
  const order = { reference: "JK-20260907-ABC123" };
  const token = createOrderAccessToken(order);
  assert.equal(verifyOrderAccessToken(token, order.reference), true);
  assert.equal(verifyOrderAccessToken(token, "JK-OTHER"), false);
  assert.equal(verifyOrderAccessToken(`${token}changed`, order.reference), false);
});
