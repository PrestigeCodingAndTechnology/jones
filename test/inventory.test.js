import test from "node:test";
import assert from "node:assert/strict";
import { Product } from "../src/models/Product.js";
import {
  inventoryFields,
  inventoryStockForSize,
  legacySizeInventory,
  normalizeSizeInventory,
} from "../src/services/inventory.js";
import { publicProduct } from "../src/utils/http.js";

test("normalizes selected sizes and derives total stock", () => {
  const fields = inventoryFields([
    { size: 45, stock: 0 },
    { size: 40, stock: 3 },
    { size: 43, stock: 2 },
  ]);

  assert.deepEqual(fields.sizes, [40, 43, 45]);
  assert.equal(fields.stock, 5);
  assert.deepEqual(fields.sizeInventory, [
    { size: 40, stock: 3 },
    { size: 43, stock: 2 },
    { size: 45, stock: 0 },
  ]);
});

test("rejects missing, duplicate and invalid size inventory", () => {
  assert.throws(() => normalizeSizeInventory([]), /at least one/i);
  assert.throws(
    () =>
      normalizeSizeInventory([
        { size: 42, stock: 1 },
        { size: 42, stock: 2 },
      ]),
    /more than once/i,
  );
  assert.throws(
    () => normalizeSizeInventory([{ size: 39, stock: 1 }]),
    /40 to 45/i,
  );
  assert.throws(
    () => normalizeSizeInventory([{ size: 44, stock: -1 }]),
    /whole number/i,
  );
});

test("legacy stock migrates without changing the total", () => {
  const inventory = legacySizeInventory([40, 41, 42, 43, 44, 45], 8);
  assert.equal(
    inventory.reduce((total, entry) => total + entry.stock, 0),
    8,
  );
  assert.deepEqual(
    inventory.map((entry) => entry.stock),
    [2, 2, 1, 1, 1, 1],
  );
});

test("product validation persists selected sizes and derived stock", async () => {
  const product = new Product({
    name: "Inventory Runner",
    slug: "inventory-runner",
    category: "Lifestyle",
    price: 50_000,
    deliveryFee: 3_500,
    image: "/assets/images/pics1.jpeg",
    description: "A test sneaker with size-specific inventory.",
    sizeInventory: [
      { size: 41, stock: 0 },
      { size: 44, stock: 4 },
    ],
  });

  await product.validate();
  assert.deepEqual(product.sizes, [41, 44]);
  assert.equal(product.stock, 4);
  assert.equal(inventoryStockForSize(product, 41), 0);
  assert.equal(inventoryStockForSize(product, 44), 4);

  const serialized = publicProduct(product);
  assert.deepEqual(serialized.sizeInventory, [
    { size: 41, stock: 0 },
    { size: 44, stock: 4 },
  ]);
  assert.equal(serialized.stock, 4);
});
