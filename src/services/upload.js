import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

const root = fileURLToPath(new URL("../../public/uploads/", import.meta.url));
const allowed = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export function matchesImageSignature(buffer, mimeType) {
  if (mimeType === "image/jpeg") {
    return (
      buffer.length > 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (mimeType === "image/png") {
    return (
      buffer.length > 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length > 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

export async function saveProductImage(dataUrl) {
  if (!dataUrl) return "";
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
      String(dataUrl),
    );
  if (!match || !allowed.has(match[1]))
    throw new HttpError(400, "Upload a JPG, PNG or WebP image.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > env.maxUploadBytes) {
    throw new HttpError(
      400,
      `Product images must be smaller than ${Math.round((env.maxUploadBytes / 1_048_576) * 10) / 10} MB.`,
    );
  }
  if (!matchesImageSignature(buffer, match[1])) {
    throw new HttpError(400, "The uploaded file does not match its image type.");
  }
  await mkdir(root, { recursive: true });
  const extension = allowed.get(match[1]) || extname("image.jpg");
  const filename = `product-${Date.now()}-${randomBytes(5).toString("hex")}${extension}`;
  await writeFile(join(root, filename), buffer, { flag: "wx" });
  return `/uploads/${filename}`;
}
