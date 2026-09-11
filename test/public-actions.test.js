import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { publicRouter } from "../src/routes/public.js";
import { errorHandler } from "../src/middleware/errors.js";
import { Product } from "../src/models/Product.js";
import { ContactMessage } from "../src/models/ContactMessage.js";
import { Subscriber } from "../src/models/Subscriber.js";

const productId = "507f1f77bcf86cd799439031";

function leanResult(value) {
  return {
    async lean() {
      return structuredClone(value);
    },
  };
}

test("product detail, contact and subscriber controls reach their public API persistence paths", async (context) => {
  const originals = {
    productView: Product.findOneAndUpdate,
    contactCreate: ContactMessage.create,
    subscriberUpsert: Subscriber.findOneAndUpdate,
  };
  context.after(() => {
    Product.findOneAndUpdate = originals.productView;
    ContactMessage.create = originals.contactCreate;
    Subscriber.findOneAndUpdate = originals.subscriberUpsert;
  });

  const calls = [];
  Product.findOneAndUpdate = (filter, update, options) => {
    calls.push(["product-view", filter, update, options]);
    return leanResult({
      _id: productId,
      __v: 4,
      name: "Viewed Runner",
      slug: "viewed-runner",
      category: "Lifestyle",
      tag: "New",
      price: 50_000,
      comparePrice: 58_000,
      deliveryFee: 3_500,
      sizeInventory: [
        { size: 40, stock: 2 },
        { size: 46.5, stock: 0 },
      ],
      image: "/assets/images/pics1.jpeg",
      fallbackImage: "/assets/images/pics1.jpeg",
      description: "A product detail view route regression record.",
      featured: true,
      active: true,
      views: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };
  ContactMessage.create = async (payload) => {
    calls.push(["contact", payload]);
    return { _id: "507f1f77bcf86cd799439032", ...payload };
  };
  Subscriber.findOneAndUpdate = async (filter, update, options) => {
    calls.push(["subscriber", filter, update, options]);
    return { _id: "507f1f77bcf86cd799439033", phone: filter.phone };
  };

  const app = express();
  app.use(express.json());
  app.use("/api", publicRouter);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const detailResponse = await fetch(`${origin}/api/products/${productId}`);
  assert.equal(detailResponse.status, 200);
  const detail = await detailResponse.json();
  assert.equal(detail.product.views, 8);
  assert.equal(detail.product.version, 4);
  assert.deepEqual(detail.product.sizes, [40, 46.5]);

  const contactResponse = await fetch(`${origin}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Customer Name",
      phone: "08012345678",
      message: "Please help me choose the correct size.",
    }),
  });
  assert.equal(contactResponse.status, 201);
  assert.match((await contactResponse.json()).message, /received/i);

  const subscriberResponse = await fetch(`${origin}/api/subscribers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "08012345678" }),
  });
  assert.equal(subscriberResponse.status, 201);
  assert.match((await subscriberResponse.json()).message, /drop list/i);

  assert.equal(calls[0][0], "product-view");
  assert.deepEqual(calls[0][2], { $inc: { views: 1 } });
  assert.deepEqual(calls.map((entry) => entry[0]), [
    "product-view",
    "contact",
    "subscriber",
  ]);
});
