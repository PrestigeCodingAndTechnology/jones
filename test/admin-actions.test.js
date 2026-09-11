import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { adminRouter } from "../src/routes/admin.js";
import { errorHandler } from "../src/middleware/errors.js";
import { StoreSettings } from "../src/models/StoreSettings.js";
import { ContactMessage } from "../src/models/ContactMessage.js";
import { Subscriber } from "../src/models/Subscriber.js";
import { Coupon } from "../src/models/Coupon.js";

const ids = {
  message: "507f1f77bcf86cd799439021",
  subscriber: "507f1f77bcf86cd799439022",
  coupon: "507f1f77bcf86cd799439023",
};

function leanResult(value) {
  return {
    async lean() {
      return structuredClone(value);
    },
  };
}

async function json(response) {
  return response.status === 204 ? {} : response.json();
}

test("admin settings, inbox, subscriber and promotion mutations reach their database operations", async (context) => {
  const originals = {
    settingsUpdate: StoreSettings.findOneAndUpdate,
    messageUpdate: ContactMessage.findByIdAndUpdate,
    messageDelete: ContactMessage.findByIdAndDelete,
    subscriberUpdate: Subscriber.findByIdAndUpdate,
    subscriberDelete: Subscriber.findByIdAndDelete,
    couponCreate: Coupon.create,
    couponFindById: Coupon.findById,
    couponDisable: Coupon.findByIdAndUpdate,
  };
  context.after(() => {
    StoreSettings.findOneAndUpdate = originals.settingsUpdate;
    ContactMessage.findByIdAndUpdate = originals.messageUpdate;
    ContactMessage.findByIdAndDelete = originals.messageDelete;
    Subscriber.findByIdAndUpdate = originals.subscriberUpdate;
    Subscriber.findByIdAndDelete = originals.subscriberDelete;
    Coupon.create = originals.couponCreate;
    Coupon.findById = originals.couponFindById;
    Coupon.findByIdAndUpdate = originals.couponDisable;
  });

  const calls = [];
  StoreSettings.findOneAndUpdate = async (_filter, update) => {
    calls.push(["settings", structuredClone(update.$set)]);
    return { key: "primary", ...update.$set };
  };
  ContactMessage.findByIdAndUpdate = (_id, update) => {
    calls.push(["message-status", update.status]);
    return leanResult({ _id: ids.message, status: update.status });
  };
  ContactMessage.findByIdAndDelete = async (id) => {
    calls.push(["message-delete", String(id)]);
    return { _id: id };
  };
  Subscriber.findByIdAndUpdate = (_id, update) => {
    calls.push(["subscriber-status", update.active]);
    return leanResult({ _id: ids.subscriber, phone: "08012345678", ...update });
  };
  Subscriber.findByIdAndDelete = async (id) => {
    calls.push(["subscriber-delete", String(id)]);
    return { _id: id };
  };
  Coupon.create = async (payload) => {
    calls.push(["coupon-create", payload.code]);
    return { _id: ids.coupon, usedCount: 0, ...payload };
  };
  const couponDocument = {
    _id: ids.coupon,
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    active: true,
    async save() {
      calls.push(["coupon-save", this.code]);
    },
  };
  Coupon.findById = async () => couponDocument;
  Coupon.findByIdAndUpdate = async (id, update) => {
    calls.push(["coupon-disable", String(id), update.active]);
    return { _id: id, active: false };
  };

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.admin = { _id: "507f1f77bcf86cd799439099", email: "owner@joneskick.com" };
    next();
  });
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method, body) =>
    fetch(`${origin}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body == null ? undefined : JSON.stringify(body),
    });

  const settingsResponse = await request("/api/admin/settings", "PUT", {
    storeName: "Jones Kicks",
    phone: "08012345678",
    notificationEmail: "orders@joneskick.com",
    orderAlerts: true,
    viewTracking: true,
  });
  assert.equal(settingsResponse.status, 200);
  assert.equal((await json(settingsResponse)).settings.phone, "08012345678");

  const messageResponse = await request(
    `/api/admin/messages/${ids.message}/status`,
    "PATCH",
    { status: "Read" },
  );
  assert.equal(messageResponse.status, 200);
  assert.equal((await json(messageResponse)).message.status, "Read");
  assert.equal(
    (await request(`/api/admin/messages/${ids.message}`, "DELETE")).status,
    204,
  );

  const subscriberResponse = await request(
    `/api/admin/subscribers/${ids.subscriber}`,
    "PATCH",
    { active: false },
  );
  assert.equal(subscriberResponse.status, 200);
  assert.equal((await json(subscriberResponse)).subscriber.active, false);
  assert.equal(
    (await request(`/api/admin/subscribers/${ids.subscriber}`, "DELETE")).status,
    204,
  );

  const couponBody = {
    code: "welcome10",
    type: "percentage",
    value: 10,
    minSubtotal: 0,
    maxDiscount: 0,
    usageLimit: 0,
    startsAt: "",
    endsAt: "",
    description: "Welcome offer",
    active: true,
  };
  const createCouponResponse = await request(
    "/api/admin/coupons",
    "POST",
    couponBody,
  );
  assert.equal(createCouponResponse.status, 201);
  assert.equal((await json(createCouponResponse)).coupon.code, "WELCOME10");

  const editCouponResponse = await request(
    `/api/admin/coupons/${ids.coupon}`,
    "PATCH",
    { ...couponBody, value: 15 },
  );
  assert.equal(editCouponResponse.status, 200);
  assert.equal((await json(editCouponResponse)).coupon.value, 15);
  assert.equal(
    (await request(`/api/admin/coupons/${ids.coupon}`, "DELETE")).status,
    204,
  );

  assert.deepEqual(
    calls.map((entry) => entry[0]),
    [
      "settings",
      "message-status",
      "message-delete",
      "subscriber-status",
      "subscriber-delete",
      "coupon-create",
      "coupon-save",
      "coupon-disable",
    ],
  );
});
