import test from "node:test";
import assert from "node:assert/strict";
import { Product } from "../src/models/Product.js";
import {
  commitOrderInventory,
  restockOrderInventory,
} from "../src/services/orderService.js";

const orderItem = {
  product: "507f1f77bcf86cd799439011",
  name: "Atomic Runner",
  size: 46.5,
  quantity: 2,
};

test("inventory commits atomically against the ordered size", async (context) => {
  const original = Product.updateOne;
  context.after(() => {
    Product.updateOne = original;
  });

  const calls = [];
  Product.updateOne = async (...args) => {
    calls.push(args);
    return { modifiedCount: 1 };
  };
  const order = { items: [orderItem] };

  assert.equal(await commitOrderInventory(order), true);
  assert.ok(order.inventoryCommittedAt instanceof Date);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0].sizeInventory, {
    $elemMatch: { size: 46.5, stock: { $gte: 2 } },
  });
  assert.deepEqual(calls[0][1].$inc, {
    "sizeInventory.$[selectedSize].stock": -2,
    stock: -2,
    __v: 1,
  });
  assert.deepEqual(calls[0][2].arrayFilters, [
    { "selectedSize.size": 46.5 },
  ]);
});

test("cancellation restores the exact size and total stock", async (context) => {
  const original = Product.updateOne;
  context.after(() => {
    Product.updateOne = original;
  });

  const calls = [];
  Product.updateOne = async (...args) => {
    calls.push(args);
    return { modifiedCount: 1 };
  };
  const order = {
    items: [orderItem],
    inventoryCommittedAt: new Date(),
  };

  assert.equal(await restockOrderInventory(order), true);
  assert.ok(order.inventoryRestockedAt instanceof Date);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1].$inc, {
    "sizeInventory.$[selectedSize].stock": 2,
    stock: 2,
    __v: 1,
  });
});

test("restock safely reintroduces a size removed after an order", async (context) => {
  const original = Product.updateOne;
  context.after(() => {
    Product.updateOne = original;
  });

  const calls = [];
  Product.updateOne = async (...args) => {
    calls.push(args);
    return { modifiedCount: calls.length === 1 ? 0 : 1 };
  };
  const order = {
    items: [orderItem],
    inventoryCommittedAt: new Date(),
  };

  assert.equal(await restockOrderInventory(order), true);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[1][1].$push.sizeInventory.$each, [
    { size: 46.5, stock: 2 },
  ]);
  assert.deepEqual(calls[2][1].$addToSet, { sizes: 46.5 });
});
