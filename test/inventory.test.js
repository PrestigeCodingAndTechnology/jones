import test from "node:test";
import assert from "node:assert/strict";
import { Product } from "../src/models/Product.js";
import { Order } from "../src/models/Order.js";
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
    { size: 39.5, stock: 3 },
    { size: 43, stock: 2 },
    { size: 47, stock: 1 },
  ]);

  assert.deepEqual(fields.sizes, [39.5, 43, 45, 47]);
  assert.equal(fields.stock, 6);
  assert.deepEqual(fields.sizeInventory, [
    { size: 39.5, stock: 3 },
    { size: 43, stock: 2 },
    { size: 45, stock: 0 },
    { size: 47, stock: 1 },
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
    () => normalizeSizeInventory([{ size: 0, stock: 1 }]),
    /1 to 100/i,
  );
  assert.throws(
    () => normalizeSizeInventory([{ size: 46.125, stock: 1 }]),
    /two decimal places/i,
  );
  assert.throws(
    () => normalizeSizeInventory([{ size: 44, stock: -1 }]),
    /whole number/i,
  );
  assert.throws(
    () =>
      normalizeSizeInventory(
        Array.from({ length: 31 }, (_entry, index) => ({
          size: index + 1,
          stock: 1,
        })),
      ),
    /at most 30/i,
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
      { size: 39.5, stock: 0 },
      { size: 47, stock: 4 },
    ],
  });

  await product.validate();
  assert.deepEqual(product.sizes, [39.5, 47]);
  assert.equal(product.stock, 4);
  assert.equal(inventoryStockForSize(product, 39.5), 0);
  assert.equal(inventoryStockForSize(product, 47), 4);

  const serialized = publicProduct(product);
  assert.deepEqual(serialized.sizeInventory, [
    { size: 39.5, stock: 0 },
    { size: 47, stock: 4 },
  ]);
  assert.equal(serialized.stock, 4);
});

test("order validation preserves a custom decimal size", async () => {
  const order = new Order({
    reference: "JK-CUSTOM-SIZE-TEST",
    customer: {
      fullName: "Size Test Customer",
      email: "size@example.com",
      phone: "08000000000",
      address: "1 Test Street",
      city: "Umuahia",
      region: "Abia",
    },
    items: [
      {
        product: "507f1f77bcf86cd799439011",
        name: "Custom Size Runner",
        slug: "custom-size-runner",
        image: "/assets/images/pics1.jpeg",
        size: 46.5,
        quantity: 1,
        unitPrice: 50_000,
        unitDeliveryFee: 3_500,
        lineSubtotal: 50_000,
        lineDeliveryFee: 3_500,
      },
    ],
    subtotal: 50_000,
    deliveryFee: 3_500,
    total: 53_500,
    payment: {
      provider: "paystack",
      environment: "test",
      reference: "JK-CUSTOM-SIZE-TEST-PAYMENT",
    },
  });

  await order.validate();
  assert.equal(order.items[0].size, 46.5);
});
