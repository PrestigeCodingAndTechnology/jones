import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { paymentCallback, paymentsRouter } from "./routes/payments.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import {
  requestContext,
  rateLimit,
  securityHeaders,
} from "./middleware/security.js";
import { sessionMiddleware, verifyCsrf } from "./middleware/session.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);
  app.set("view engine", "ejs");
  app.set("views", join(root, "views"));

  app.use(requestContext);
  app.use(securityHeaders);

  // Paystack requires the untouched request bytes for HMAC verification.
  app.use(
    "/api/payments",
    express.raw({ type: "application/json", limit: "256kb" }),
    paymentsRouter,
  );

  app.use(express.json({ limit: "3mb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));
  app.use(sessionMiddleware);

  app.use(
    "/assets",
    express.static(join(root, "assets"), {
      maxAge: env.isProduction ? "7d" : 0,
    }),
  );
  app.use(
    "/uploads",
    express.static(join(root, "public", "uploads"), {
      maxAge: env.isProduction ? "7d" : 0,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "jones-kicks",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/payment/callback", paymentCallback);

  const apiLimiter = rateLimit({ windowMs: 15 * 60_000, max: 250, key: "api" });
  app.use("/api", apiLimiter, (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    return verifyCsrf(req, res, next);
  });
  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);
  app.use("/api", notFound);

  app.get("*splat", (req, res) => {
    res.render("store", { apiEnabled: true });
  });

  app.use(errorHandler);
  return app;
}
