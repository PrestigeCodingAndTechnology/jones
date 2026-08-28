const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true" || value === "1";
};

const nodeEnv = process.env.NODE_ENV || "development";
const sessionSecret =
  process.env.SESSION_SECRET || "development-only-change-this-session-secret";
const paymentMode =
  process.env.PAYMENT_MODE === "paystack" ? "paystack" : "demo";

if (nodeEnv === "production" && sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET must contain at least 32 characters in production.",
  );
}
if (nodeEnv === "production" && paymentMode !== "paystack") {
  throw new Error("PAYMENT_MODE must be paystack in production.");
}
if (nodeEnv === "production" && !process.env.PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is required in production.");
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: asNumber(process.env.PORT, 5000),
  appUrl: (process.env.APP_URL || "http://localhost:5000").replace(/\/$/, ""),
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jones_kicks",
  sessionSecret,
  sessionTtlHours: asNumber(process.env.SESSION_TTL_HOURS, 24),
  trustProxy: asNumber(process.env.TRUST_PROXY, 0),
  maxUploadBytes: asNumber(process.env.MAX_UPLOAD_BYTES, 1_572_864),
  paymentMode,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
  paystackCallbackUrl:
    process.env.PAYSTACK_CALLBACK_URL ||
    `${(process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "")}/payment/callback`,
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: asNumber(process.env.SMTP_PORT, 587),
    secure: asBoolean(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Jones Kicks <orders@joneskick.com>",
    orderNotificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || "",
  },
});
