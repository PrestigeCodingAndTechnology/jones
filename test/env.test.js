import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

// Build non-secret fixtures at runtime so repository secret scanners do not
// mistake test-only values for credentials.
const livePublicKey = ["pk", "live", "publickey1234567890"].join("_");
const liveSecretKey = ["sk", "live", "secretkey1234567890"].join("_");
const testPublicKey = ["pk", "test", "publickey1234567890"].join("_");
const testSecretKey = ["sk", "test", "secretkey1234567890"].join("_");

const productionEnv = {
  ...process.env,
  NODE_ENV: "production",
  SESSION_SECRET: "secure-session-secret-with-more-than-thirty-two-characters",
  APP_URL: "https://shop.example.com",
  MONGODB_URI: "mongodb://127.0.0.1:27017/jones_kicks_test",
  PAYSTACK_PUBLIC_KEY: livePublicKey,
  PAYSTACK_SECRET_KEY: liveSecretKey,
  PAYSTACK_CALLBACK_URL: "https://shop.example.com/payment/callback",
  SMTP_HOST: "smtp.example.com",
  SMTP_USER: "smtp-user",
  SMTP_PASS: "smtp-password",
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
  assert.match(result.stderr, /APP_URL must use HTTPS/i);
});

test("rejects production startup when email delivery is missing", () => {
  const result = loadEnvironment({ SMTP_PASS: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SMTP_PASS is required in production/i);
});

test("rejects test Paystack keys in production", () => {
  const result = loadEnvironment({
    PAYSTACK_PUBLIC_KEY: testPublicKey,
    PAYSTACK_SECRET_KEY: testSecretKey,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /production requires genuine Paystack live keys/i);
});

test("rejects mismatched Paystack key environments", () => {
  const result = loadEnvironment({
    PAYSTACK_PUBLIC_KEY: livePublicKey,
    PAYSTACK_SECRET_KEY: testSecretKey,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /same environment/i);
});

test("rejects a callback outside the application origin", () => {
  const result = loadEnvironment({
    PAYSTACK_CALLBACK_URL: "https://other.example.com/payment/callback",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /callback.*on APP_URL/i);
});
