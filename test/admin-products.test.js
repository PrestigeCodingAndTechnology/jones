import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { adminRouter } from "../src/routes/admin.js";
import { errorHandler } from "../src/middleware/errors.js";
import { Product } from "../src/models/Product.js";

function productRecord(values = {}) {
  return {
    _id: "507f1f77bcf86cd799439011",
    name: "CRUD Runner",
    slug: "crud-runner",
    category: "Lifestyle",
    tag: "New",
    price: 50_000,
    comparePrice: 58_000,
    deliveryFee: 3_500,
    sizeInventory: [
      { size: 40, stock: 2 },
      { size: 43, stock: 0 },
    ],
    sizes: [40, 43],
    stock: 2,
    image: "/assets/images/pics1.jpeg",
    fallbackImage: "/assets/images/pics1.jpeg",
    description: "A sneaker used to verify administrator catalogue CRUD.",
    featured: true,
    active: true,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...values,
  };
}

test("administrator product routes create, edit and remove size inventory", async (context) => {
  const originals = {
    create: Product.create,
    exists: Product.exists,
    find: Product.find,
    findById: Product.findById,
    findByIdAndUpdate: Product.findByIdAndUpdate,
  };
  context.after(() => Object.assign(Product, originals));

  let savedPayload;
  Product.exists = async () => false;
  Product.find = () => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    async lean() {
      return [productRecord()];
    },
  });
  Product.create = async (payload) => {
    savedPayload = payload;
    return productRecord(payload);
  };

  const editable = productRecord();
  editable.save = async () => editable;
  Product.findById = async () => editable;
  Product.findByIdAndUpdate = async (_id, update) =>
    productRecord({ active: update.active ?? update.$set?.active ?? false });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.admin = { email: "admin@joneskick.com" };
    next();
  });
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const readResponse = await fetch(`${origin}/api/admin/products`);
  assert.equal(readResponse.status, 200);
  const catalogue = await readResponse.json();
  assert.equal(catalogue.products.length, 1);
  assert.deepEqual(catalogue.products[0].sizes, [40, 43]);

  const createResponse = await fetch(`${origin}/api/admin/products`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "CRUD Runner",
      category: "Lifestyle",
      tag: "New",
      price: 50_000,
      comparePrice: 58_000,
      deliveryFee: 3_500,
      sizeInventory: [
        { size: 40, stock: 3 },
        { size: 43, stock: 0 },
      ],
      image: "/assets/images/pics1.jpeg",
      description: "A sneaker used to verify administrator catalogue CRUD.",
      featured: true,
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.deepEqual(created.product.sizes, [40, 43]);
  assert.equal(created.product.stock, 3);
  assert.deepEqual(savedPayload.sizeInventory, [
    { size: 40, stock: 3 },
    { size: 43, stock: 0 },
  ]);

  const editResponse = await fetch(
    `${origin}/api/admin/products/507f1f77bcf86cd799439011`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "CRUD Runner Updated",
        category: "Lifestyle",
        tag: "Restock",
        price: 52_000,
        comparePrice: 60_000,
        deliveryFee: 4_000,
        sizeInventory: [
          { size: 41, stock: 1 },
          { size: 44, stock: 4 },
        ],
        image: "/assets/images/pics1.jpeg",
        description: "Updated catalogue data with a different set of sizes.",
        featured: false,
      }),
    },
  );
  assert.equal(editResponse.status, 200);
  const edited = await editResponse.json();
  assert.deepEqual(edited.product.sizes, [41, 44]);
  assert.equal(edited.product.stock, 5);
  assert.equal(edited.product.deliveryFee, 4_000);

  const invalidResponse = await fetch(`${origin}/api/admin/products`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "No Sizes",
      sizeInventory: [],
    }),
  });
  assert.equal(invalidResponse.status, 400);
  assert.match((await invalidResponse.json()).error, /at least one/i);

  const deleteResponse = await fetch(
    `${origin}/api/admin/products/507f1f77bcf86cd799439011`,
    { method: "DELETE" },
  );
  assert.equal(deleteResponse.status, 204);
});
