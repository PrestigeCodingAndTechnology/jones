import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifySignature(value, signature, secret) {
  if (!signature) return false;
  const expected = Buffer.from(sign(value, secret));
  const received = Buffer.from(String(signature));
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, salt, hash] = String(encoded || "").split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const derivedKey = Buffer.from(await scrypt(String(password), salt, 64));
  const expected = Buffer.from(hash, "hex");
  return (
    expected.length === derivedKey.length &&
    timingSafeEqual(expected, derivedKey)
  );
}

export function paystackSignature(rawBody, secret) {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}
