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
  await mkdir(root, { recursive: true });
  const extension = allowed.get(match[1]) || extname("image.jpg");
  const filename = `product-${Date.now()}-${randomBytes(5).toString("hex")}${extension}`;
  await writeFile(join(root, filename), buffer, { flag: "wx" });
  return `/uploads/${filename}`;
}
