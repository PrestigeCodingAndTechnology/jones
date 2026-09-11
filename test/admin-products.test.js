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
      { size: 46.5, stock: 0 },
    ],
    sizes: [40, 46.5],
    stock: 2,
    image: "/assets/images/pics1.jpeg",
    fallbackImage: "/assets/images/pics1.jpeg",
    description: "A sneaker used to verify administrator catalogue CRUD.",
    featured: true,
    active: true,
    views: 0,
    __v: 3,
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
    updateOne: Product.updateOne,
  };
  context.after(() => Object.assign(Product, originals));

  let savedPayload;
  let updateFilter;
  let updatePayload;
  let updateOptions;
  // Reproduce a catalogue row created before per-product delivery fees existed.
  let storedProduct = productRecord({ deliveryFee: undefined });
  Product.exists = async () => false;
  Product.find = () => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    async lean() {
      return [structuredClone(storedProduct)];
    },
  });
  Product.create = async (payload) => {
    savedPayload = payload;
    return productRecord(payload);
  };

  Product.findById = () => ({
    async lean() {
      return storedProduct ? structuredClone(storedProduct) : null;
    },
  });
  Product.updateOne = async (_filter, update, options) => {
    updateFilter = _filter;
    updatePayload = update;
    updateOptions = options;
    storedProduct = productRecord({
      ...storedProduct,
      ...update.$set,
      __v: Number(storedProduct.__v || 0) + Number(update.$inc?.__v || 0),
    });
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };
  Product.findByIdAndUpdate = async (_id, update, options) => {
    if (update.$set) return productRecord(update.$set);
    return productRecord({ active: update.active ?? false });
  };

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
  assert.deepEqual(catalogue.products[0].sizes, [40, 46.5]);
  assert.equal(catalogue.products[0].deliveryFee, 0);

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
        { size: 39.5, stock: 3 },
        { size: 46, stock: 0 },
      ],
      image: "/assets/images/pics1.jpeg",
      description: "A sneaker used to verify administrator catalogue CRUD.",
      featured: true,
    }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.deepEqual(created.product.sizes, [39.5, 46]);
  assert.equal(created.product.stock, 3);
  assert.deepEqual(savedPayload.sizeInventory, [
    { size: 39.5, stock: 3 },
    { size: 46, stock: 0 },
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
          { size: 47.5, stock: 4 },
        ],
        image: "/assets/images/pics1.jpeg",
        description: "Updated catalogue data with a different set of sizes.",
        featured: false,
        version: 3,
      }),
    },
  );
  assert.equal(editResponse.status, 200);
  const edited = await editResponse.json();
  assert.equal(edited.persisted, true);
  assert.deepEqual(edited.product.sizes, [41, 47.5]);
  assert.equal(edited.product.stock, 5);
  assert.equal(edited.product.deliveryFee, 4_000);
  assert.equal(edited.product.version, 4);
  assert.deepEqual(updateOptions, { runValidators: true });
  assert.deepEqual(updateFilter, {
    _id: "507f1f77bcf86cd799439011",
    __v: 3,
  });
  assert.deepEqual(updatePayload.$set.sizeInventory, [
    { size: 41, stock: 1 },
    { size: 47.5, stock: 4 },
  ]);
  assert.deepEqual(updatePayload.$inc, { __v: 1 });

  const persistedResponse = await fetch(`${origin}/api/admin/products`);
  assert.equal(persistedResponse.status, 200);
  const persisted = await persistedResponse.json();
  assert.equal(persisted.products[0].name, "CRUD Runner Updated");
  assert.equal(persisted.products[0].deliveryFee, 4_000);
  assert.deepEqual(persisted.products[0].sizes, [41, 47.5]);

  let staleWriteAttempted = false;
  Product.updateOne = async () => {
    staleWriteAttempted = true;
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };
  const staleResponse = await fetch(
    `${origin}/api/admin/products/507f1f77bcf86cd799439011`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Stale Catalogue Edit",
        category: "Lifestyle",
        tag: "Restock",
        price: 52_000,
        comparePrice: 60_000,
        deliveryFee: 4_000,
        sizeInventory: [{ size: 41, stock: 9 }],
        image: "/assets/images/pics1.jpeg",
        description: "An edit opened before the current product version.",
        featured: false,
        version: 3,
      }),
    },
  );
  assert.equal(staleResponse.status, 409);
  assert.match((await staleResponse.json()).error, /form was open/i);
  assert.equal(staleWriteAttempted, false);

  Product.updateOne = async () => ({
    acknowledged: true,
    matchedCount: 0,
    modifiedCount: 0,
  });
  const conflictResponse = await fetch(
    `${origin}/api/admin/products/507f1f77bcf86cd799439011`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Stale Catalogue Edit",
        category: "Lifestyle",
        tag: "Restock",
        price: 52_000,
        comparePrice: 60_000,
        deliveryFee: 4_000,
        sizeInventory: [{ size: 41, stock: 9 }],
        image: "/assets/images/pics1.jpeg",
        description: "A stale edit must not overwrite newer inventory changes.",
        featured: false,
      }),
    },
  );
  assert.equal(conflictResponse.status, 409);
  assert.match((await conflictResponse.json()).error, /could not be saved/i);

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
