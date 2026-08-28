import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

test("serves the health endpoint, EJS storefront and local stylesheet", async (context) => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const [health, storefront, stylesheet] = await Promise.all([
    fetch(`${origin}/health`),
    fetch(`${origin}/`),
    fetch(`${origin}/assets/css/styles.css`),
  ]);

  assert.equal(health.status, 200);
  assert.equal(storefront.status, 200);
  assert.equal(stylesheet.status, 200);
  assert.match(await storefront.text(), /name="jk-api" content="enabled"/);
});
