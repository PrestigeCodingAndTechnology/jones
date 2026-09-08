import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const productionEnv = {
  ...process.env,
  NODE_ENV: "production",
  SESSION_SECRET: "test-only-session-secret-with-more-than-32-characters",
  PAYMENT_MODE: "paystack",
  PAYSTACK_SECRET_KEY: "sk_test_dummy",
  APP_URL: "https://shop.example.com",
  PAYSTACK_CALLBACK_URL: "https://shop.example.com/payment/callback",
  SMTP_HOST: "smtp.example.com",
  SMTP_USER: "test-user",
  SMTP_PASS: "test-password",
  ORDER_NOTIFICATION_EMAIL: "owner@example.com",
};

function loadEnvironment(overrides = {}) {
  return spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", "import('./src/config/env.js')"],
    {
      cwd: process.cwd(),
      env: { ...productionEnv, ...overrides },
      encoding: "utf8",
    },
  );
}

test("accepts a complete HTTPS production configuration", () => {
  assert.equal(loadEnvironment().status, 0);
});

test("rejects insecure production URLs", () => {
  const result = loadEnvironment({ APP_URL: "http://shop.example.com" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /APP_URL must be a public HTTPS URL/);
});

test("rejects production startup when required email delivery is missing", () => {
  const result = loadEnvironment({ SMTP_PASS: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SMTP_PASS is required in production/);
});
