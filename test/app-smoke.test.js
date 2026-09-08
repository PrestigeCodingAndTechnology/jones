import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

test("serves health checks, the EJS storefront and local stylesheet", async (context) => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const [health, readiness, storefront, stylesheet] = await Promise.all([
    fetch(`${origin}/health`),
    fetch(`${origin}/ready`),
    fetch(`${origin}/`),
    fetch(`${origin}/assets/css/styles.css`),
  ]);

  assert.equal(health.status, 200);
  assert.equal(readiness.status, 503);
  assert.equal(storefront.status, 200);
  assert.equal(stylesheet.status, 200);
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  assert.match(health.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(await storefront.text(), /name="jk-api" content="enabled"/);
});

test("rejects state-changing API requests without a CSRF token", async (context) => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${origin}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test User", phone: "08012345678", message: "Hello there" }),
  });
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /session has expired/i);
});
