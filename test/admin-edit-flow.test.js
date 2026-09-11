import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { Admin } from "../src/models/Admin.js";
import { AdminSession } from "../src/models/AdminSession.js";
import { Product } from "../src/models/Product.js";
import { StoreSettings } from "../src/models/StoreSettings.js";
import { hashPassword } from "../src/utils/crypto.js";

const productId = "507f1f77bcf86cd799439011";

function cookie(response, name) {
  const values = response.headers.getSetCookie?.() || [
    response.headers.get("set-cookie"),
  ];
  for (const value of values.filter(Boolean)) {
    const match = new RegExp(`(?:^|,\\s*)${name}=([^;]+)`).exec(value);
    if (match) return `${name}=${match[1]}`;
  }
  return "";
}

function queryResult(value) {
  return {
    async lean() {
      return structuredClone(value);
    },
  };
}

test("authenticated CSRF edit flow persists and reads back a legacy product", async (context) => {
  const originals = {
    adminFindOne: Admin.findOne,
    adminSessionCreate: AdminSession.create,
    adminSessionFindOne: AdminSession.findOne,
    productExists: Product.exists,
    productFind: Product.find,
    productFindById: Product.findById,
    productUpdateOne: Product.updateOne,
    settingsFindOneAndUpdate: StoreSettings.findOneAndUpdate,
  };
  context.after(() => {
    Admin.findOne = originals.adminFindOne;
    AdminSession.create = originals.adminSessionCreate;
    AdminSession.findOne = originals.adminSessionFindOne;
    Product.exists = originals.productExists;
    Product.find = originals.productFind;
    Product.findById = originals.productFindById;
    Product.updateOne = originals.productUpdateOne;
    StoreSettings.findOneAndUpdate = originals.settingsFindOneAndUpdate;
  });

  const password = "LocalRegressionPass123!";
  const admin = {
    _id: "507f1f77bcf86cd799439012",
    name: "Jones Kicks Admin",
    email: "admin@joneskick.com",
    active: true,
    passwordHash: await hashPassword(password),
    async save() {},
  };
  let activeSession;
  let storedProduct = {
    _id: productId,
    name: "Legacy Runner",
    slug: "legacy-runner",
    category: "Lifestyle",
    tag: "New",
    price: 50_000,
    comparePrice: 58_000,
    // deliveryFee intentionally absent: this was the edit-form failure case.
    sizeInventory: [
      { size: 40, stock: 2 },
      { size: 46.5, stock: 0 },
    ],
    sizes: [40, 46.5],
    stock: 2,
    image: "/assets/images/pics1.jpeg",
    fallbackImage: "/assets/images/pics1.jpeg",
    description: "Legacy product used for the complete authenticated edit flow.",
    featured: true,
    active: true,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  Admin.findOne = () => ({
    async select() {
      return admin;
    },
  });
  AdminSession.create = async (payload) => {
    activeSession = {
      ...payload,
      admin,
      lastSeenAt: new Date(),
      async save() {},
      async deleteOne() {},
    };
    return activeSession;
  };
  AdminSession.findOne = () => ({
    async populate() {
      return activeSession;
    },
  });
  StoreSettings.findOneAndUpdate = () =>
    queryResult({
      storeName: "Jones Kicks",
      phone: "0905 857 9374",
      notificationEmail: "",
      orderAlerts: true,
      viewTracking: true,
    });
  Product.exists = async () => false;
  Product.findById = () => queryResult(storedProduct);
  Product.updateOne = async (_filter, update) => {
    storedProduct = {
      ...storedProduct,
      ...structuredClone(update.$set),
      __v: Number(storedProduct.__v || 0) + Number(update.$inc?.__v || 0),
    };
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  };
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

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const commonHeaders = { "user-agent": "jones-kicks-regression-test" };

  const sessionResponse = await fetch(`${origin}/api/session`, {
    headers: commonHeaders,
  });
  assert.equal(sessionResponse.status, 200);
  assert.match(sessionResponse.headers.get("cache-control") || "", /no-store/);
  const session = await sessionResponse.json();
  const csrfCookie = cookie(sessionResponse, "jk_csrf");
  assert.ok(csrfCookie);
  assert.ok(session.csrfToken);

  const loginResponse = await fetch(`${origin}/api/admin/login`, {
    method: "POST",
    headers: {
      ...commonHeaders,
      cookie: csrfCookie,
      "content-type": "application/json",
      "x-csrf-token": session.csrfToken,
    },
    body: JSON.stringify({ email: admin.email, password }),
  });
  assert.equal(loginResponse.status, 200);
  const adminCookie = cookie(loginResponse, "jk_admin_session");
  assert.ok(adminCookie);

  const editResponse = await fetch(`${origin}/api/admin/products/${productId}`, {
    method: "PATCH",
    headers: {
      ...commonHeaders,
      cookie: `${csrfCookie}; ${adminCookie}`,
      "content-type": "application/json",
      "x-csrf-token": session.csrfToken,
    },
    body: JSON.stringify({
      name: "Legacy Runner Saved",
      category: "Lifestyle",
      tag: "Restock",
      price: 52_000,
      comparePrice: 60_000,
      deliveryFee: 4_500,
      sizeInventory: [
        { size: 41, stock: 3 },
        { size: 47.5, stock: 0 },
      ],
      image: "/assets/images/pics1.jpeg",
      description: "The edit has been written and read back through the API.",
      featured: false,
      version: 0,
    }),
  });
  assert.equal(editResponse.status, 200);
  const edited = await editResponse.json();
  assert.equal(edited.persisted, true);
  assert.equal(edited.product.name, "Legacy Runner Saved");
  assert.equal(edited.product.deliveryFee, 4_500);
  assert.equal(edited.product.version, 1);
  assert.deepEqual(edited.product.sizeInventory, [
    { size: 41, stock: 3 },
    { size: 47.5, stock: 0 },
  ]);

  const catalogueResponse = await fetch(`${origin}/api/admin/products`, {
    headers: { ...commonHeaders, cookie: `${csrfCookie}; ${adminCookie}` },
  });
  assert.equal(catalogueResponse.status, 200);
  const catalogue = await catalogueResponse.json();
  assert.equal(catalogue.products[0].name, "Legacy Runner Saved");
  assert.equal(catalogue.products[0].deliveryFee, 4_500);
  assert.deepEqual(catalogue.products[0].sizes, [41, 47.5]);
});
