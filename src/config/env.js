const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true" || value === "1";
};

const cleanUrl = (value, fallback) => {
  const raw = String(value || fallback || "").trim().replace(/\/$/, "");
  try {
    return new URL(raw).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid URL configuration: ${raw || "(empty)"}`);
  }
};

const keyEnvironment = (key, type) => {
  const value = String(key || "").trim();
  if (!value) return "";
  if (/replace|example|placeholder|x{5,}/i.test(value)) return "invalid";
  const pattern = new RegExp(`^${type}_(live|test)_[A-Za-z0-9]+$`);
  const match = pattern.exec(value);
  return match ? match[1] : "invalid";
};

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";
const sessionSecret =
  process.env.SESSION_SECRET || "development-only-change-this-session-secret";
const appUrl = cleanUrl(process.env.APP_URL, "http://localhost:5000");
const paystackPublicKey = String(process.env.PAYSTACK_PUBLIC_KEY || "").trim();
const paystackSecretKey = String(process.env.PAYSTACK_SECRET_KEY || "").trim();
const publicKeyEnvironment = keyEnvironment(paystackPublicKey, "pk");
const secretKeyEnvironment = keyEnvironment(paystackSecretKey, "sk");
const paystackConfigured = Boolean(paystackPublicKey && paystackSecretKey);
const paystackEnvironment = paystackConfigured ? publicKeyEnvironment : "unconfigured";
const paystackCallbackUrl = cleanUrl(
  process.env.PAYSTACK_CALLBACK_URL,
  `${appUrl}/payment/callback`,
);

if (Boolean(paystackPublicKey) !== Boolean(paystackSecretKey)) {
  throw new Error(
    "PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY must be configured together.",
  );
}

if (paystackConfigured) {
  if (publicKeyEnvironment === "invalid") {
    throw new Error("PAYSTACK_PUBLIC_KEY must be a valid pk_test_ or pk_live_ key.");
  }
  if (secretKeyEnvironment === "invalid") {
    throw new Error("PAYSTACK_SECRET_KEY must be a valid sk_test_ or sk_live_ key.");
  }
  if (publicKeyEnvironment !== secretKeyEnvironment) {
    throw new Error("Paystack public and secret keys must belong to the same environment.");
  }
}

if (isProduction) {
  const requiredProductionValues = [
    "MONGODB_URI",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "ORDER_NOTIFICATION_EMAIL",
  ];
  const missingProductionValue = requiredProductionValues.find(
    (name) => !String(process.env[name] || "").trim(),
  );
  if (missingProductionValue) {
    throw new Error(`${missingProductionValue} is required in production.`);
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
      String(process.env.ORDER_NOTIFICATION_EMAIL || ""),
    )
  ) {
    throw new Error("ORDER_NOTIFICATION_EMAIL must be a valid email address.");
  }
  if (
    sessionSecret.length < 32 ||
    sessionSecret === "development-only-change-this-session-secret" ||
    /replace|change[-_ ]?this|example|placeholder/i.test(sessionSecret)
  ) {
    throw new Error(
      "SESSION_SECRET must be a unique random value of at least 32 characters in production.",
    );
  }
  if (!paystackConfigured) {
    throw new Error(
      "Both PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY are required in production.",
    );
  }
  if (paystackEnvironment !== "live" || secretKeyEnvironment !== "live") {
    throw new Error(
      "Production requires genuine Paystack live keys (pk_live_... and sk_live_...).",
    );
  }
  if (!appUrl.startsWith("https://")) {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  if (/^https:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(appUrl)) {
    throw new Error("APP_URL must be the real public production domain.");
  }
  if (!paystackCallbackUrl.startsWith("https://")) {
    throw new Error("PAYSTACK_CALLBACK_URL must use HTTPS in production.");
  }
  const appOrigin = new URL(appUrl).origin;
  const callback = new URL(paystackCallbackUrl);
  if (callback.origin !== appOrigin || callback.pathname !== "/payment/callback") {
    throw new Error(
      "PAYSTACK_CALLBACK_URL must be the /payment/callback route on APP_URL.",
    );
  }
}

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  isTest,
  port: asNumber(process.env.PORT, 5000),
  appUrl,
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jones_kicks",
  sessionSecret,
  sessionTtlHours: asNumber(process.env.SESSION_TTL_HOURS, 24),
  trustProxy: asNumber(process.env.TRUST_PROXY, 0),
  maxUploadBytes: asNumber(process.env.MAX_UPLOAD_BYTES, 1_572_864),
  paystackConfigured,
  paystackEnvironment,
  paystackPublicKey,
  paystackSecretKey,
  paystackCallbackUrl,
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: asNumber(process.env.SMTP_PORT, 587),
    secure: asBoolean(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Jones Kicks <orders@joneskick.com>",
    orderNotificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || "",
  },
  smtpConfigured: Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  ),
});
