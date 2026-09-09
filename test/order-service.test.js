import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuote, applyCouponToQuote } from "../src/services/quote.js";

const products = [
  {
    _id: "507f1f77bcf86cd799439011",
    name: "Test Runner",
    slug: "test-runner",
    image: "/assets/images/pics1.jpeg",
    price: 50_000,
    deliveryFee: 3_500,
    sizes: [39.5, 40, 41, 42, 43, 44, 45],
    sizeInventory: [
      { size: 39.5, stock: 2 },
      { size: 40, stock: 3 },
      { size: 41, stock: 0 },
      { size: 42, stock: 4 },
      { size: 43, stock: 2 },
      { size: 44, stock: 1 },
      { size: 45, stock: 2 },
    ],
    stock: 14,
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
    sizeInventory: [
      { size: 40, stock: 1 },
      { size: 41, stock: 1 },
      { size: 42, stock: 1 },
      { size: 43, stock: 3 },
      { size: 44, stock: 3 },
      { size: 45, stock: 0 },
    ],
    stock: 9,
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

test("quotes a custom decimal sneaker size", () => {
  const quote = calculateQuote(
    [{ productId: String(products[0]._id), size: 39.5, qty: 2 }],
    products,
  );
  assert.equal(quote.items[0].size, 39.5);
  assert.equal(quote.items[0].quantity, 2);
  assert.equal(quote.total, 107_000);
});

test("rejects malformed custom sneaker sizes", () => {
  assert.throws(
    () =>
      calculateQuote(
        [{ productId: String(products[0]._id), size: 39.555, qty: 1 }],
        products,
      ),
    /two decimal places/i,
  );
});

test("rejects a cart quantity that exceeds real inventory", () => {
  assert.throws(
    () =>
      calculateQuote(
        [{ productId: String(products[1]._id), size: 43, qty: 4 }],
        products,
      ),
    /Only 3 Second Pair pair\(s\) remain in size 43/,
  );
});

test("rejects a sold-out size even when another size has stock", () => {
  assert.throws(
    () =>
      calculateQuote(
        [{ productId: String(products[0]._id), size: 41, qty: 1 }],
        products,
      ),
    /sold out in size 41/,
  );
});


test("applies percentage promotions only to product subtotal", () => {
  const quote = calculateQuote(
    [{ productId: String(products[0]._id), size: 42, qty: 2 }],
    products,
  );
  const discounted = applyCouponToQuote(quote, {
    _id: "507f1f77bcf86cd799439099",
    code: "SAVE10",
    type: "percentage",
    value: 10,
    minSubtotal: 0,
    maxDiscount: 0,
    usageLimit: 0,
    usedCount: 0,
    active: true,
  });
  assert.equal(discounted.discount, 10_000);
  assert.equal(discounted.deliveryFee, 7_000);
  assert.equal(discounted.total, 97_000);
  assert.equal(discounted.promotion.code, "SAVE10");
});

test("honours fixed-promo caps and minimum spend", () => {
  const quote = calculateQuote(
    [{ productId: String(products[1]._id), size: 44, qty: 1 }],
    products,
  );
  const discounted = applyCouponToQuote(quote, {
    code: "DROP",
    type: "fixed",
    value: 20_000,
    minSubtotal: 50_000,
    maxDiscount: 12_000,
    usageLimit: 10,
    usedCount: 2,
    active: true,
  });
  assert.equal(discounted.discount, 12_000);
  assert.equal(discounted.total, 63_000);

  assert.throws(
    () => applyCouponToQuote({ ...quote, subtotal: 40_000 }, {
      code: "MINIMUM",
      type: "fixed",
      value: 5_000,
      minSubtotal: 50_000,
      maxDiscount: 0,
      usageLimit: 0,
      usedCount: 0,
      active: true,
    }),
    /requires at least/,
  );
});
