import { env } from "../config/env.js";
import { AdminSession } from "../models/AdminSession.js";
import { randomToken, sha256, sign, verifySignature } from "../utils/crypto.js";
import { HttpError } from "../utils/http.js";

const ADMIN_COOKIE = "jk_admin_session";
const CSRF_COOKIE = "jk_csrf";

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 1) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
    return cookies;
  }, {});
}

function signedValue(value) {
  return `${value}.${sign(value, env.sessionSecret)}`;
}

function readSignedCookie(req, name) {
  const encoded = parseCookies(req.headers.cookie)[name];
  if (!encoded) return "";
  const index = encoded.lastIndexOf(".");
  if (index < 1) return "";
  const value = encoded.slice(0, index);
  const signature = encoded.slice(index + 1);
  return verifySignature(value, signature, env.sessionSecret) ? value : "";
}

function cookieOptions({ httpOnly = true, maxAge } = {}) {
  return {
    httpOnly,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function ensureCsrfCookie(req, res) {
  let token = readSignedCookie(req, CSRF_COOKIE);
  if (!token) {
    token = randomToken(24);
    res.cookie(
      CSRF_COOKIE,
      signedValue(token),
      cookieOptions({ maxAge: env.sessionTtlHours * 60 * 60 * 1000 }),
    );
  }
  req.csrfToken = token;
  return token;
}

export async function sessionMiddleware(req, res, next) {
  try {
    ensureCsrfCookie(req, res);
    const token = readSignedCookie(req, ADMIN_COOKIE);
    if (!token) return next();

    const session = await AdminSession.findOne({
      tokenHash: sha256(token),
      expiresAt: { $gt: new Date() },
    }).populate("admin");

    if (!session?.admin?.active) {
      res.clearCookie(ADMIN_COOKIE, cookieOptions());
      return next();
    }

    req.adminSession = session;
    req.admin = session.admin;
    const now = Date.now();
    if (now - session.lastSeenAt.getTime() > 5 * 60_000) {
      session.lastSeenAt = new Date(now);
      session.save().catch(() => {});
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function verifyCsrf(req, res, next) {
  const supplied = req.get("x-csrf-token") || req.body?._csrf;
  const expected = readSignedCookie(req, CSRF_COOKIE);
  if (!expected || !supplied || expected !== supplied) {
    return next(
      new HttpError(
        403,
        "Your session has expired. Refresh the page and try again.",
      ),
    );
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.admin)
    return next(new HttpError(401, "Administrator sign-in is required."));
  next();
}

export async function createAdminSession(req, res, admin) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);
  const session = await AdminSession.create({
    admin: admin._id,
    tokenHash: sha256(token),
    csrfToken: req.csrfToken,
    userAgentHash: sha256(req.get("user-agent") || ""),
    ipHash: sha256(`${req.ip || ""}:${env.sessionSecret}`),
    expiresAt,
  });
  res.cookie(
    ADMIN_COOKIE,
    signedValue(token),
    cookieOptions({ maxAge: env.sessionTtlHours * 60 * 60 * 1000 }),
  );
  return session;
}

export async function destroyAdminSession(req, res) {
  if (req.adminSession) await req.adminSession.deleteOne();
  res.clearCookie(ADMIN_COOKIE, cookieOptions());
}
