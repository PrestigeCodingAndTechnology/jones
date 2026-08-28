import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuote } from "../src/services/orderService.js";

const products = [
  {
    _id: "507f1f77bcf86cd799439011",
    name: "Test Runner",
    slug: "test-runner",
    image: "/assets/images/pics1.jpeg",
    price: 50_000,
    deliveryFee: 3_500,
    sizes: [40, 41, 42, 43, 44, 45],
    stock: 6,
    active: true,
  },
  {
    _id: "507f1f77bcf86cd799439012",
    name: "Second Pair",
    slug: "second-pair",
    image: "/assets/images/pics2.jpeg",
    price: 70_000,
    deliveryFee: 5_000,
    sizes: [40, 41, 42, 43, 44, 45],
    stock: 3,
    active: true,
  },
];

test("calculates each product's configured delivery fee per pair", () => {
  const quote = calculateQuote(
    [
      { productId: String(products[0]._id), size: 42, qty: 2, price: 1 },
      { productId: String(products[1]._id), size: 44, qty: 1, deliveryFee: 0 },
    ],
    products,
  );

  assert.equal(quote.subtotal, 170_000);
  assert.equal(quote.deliveryFee, 12_000);
  assert.equal(quote.total, 182_000);
  assert.equal(quote.items[0].unitDeliveryFee, 3_500);
  assert.equal(quote.items[0].lineDeliveryFee, 7_000);
});

test("merges duplicate cart lines before validating stock", () => {
  const quote = calculateQuote(
    [
      { productId: String(products[0]._id), size: 40, qty: 1 },
      { productId: String(products[0]._id), size: 40, qty: 2 },
    ],
    products,
  );
  assert.equal(quote.items.length, 1);
  assert.equal(quote.items[0].quantity, 3);
});

test("rejects a cart quantity that exceeds real inventory", () => {
  assert.throws(
    () =>
      calculateQuote(
        [{ productId: String(products[1]._id), size: 43, qty: 4 }],
        products,
      ),
    /Only 3 Second Pair pair\(s\) remain/,
  );
});
