import test from "node:test";
import assert from "node:assert/strict";
import { matchesImageSignature } from "../src/services/upload.js";

test("accepts supported image signatures", () => {
  assert.equal(
    matchesImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"),
    true,
  );
  assert.equal(
    matchesImageSignature(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
      "image/png",
    ),
    true,
  );
  assert.equal(
    matchesImageSignature(Buffer.from("RIFF1234WEBP0"), "image/webp"),
    true,
  );
});

test("rejects a file whose bytes do not match its claimed image type", () => {
  assert.equal(
    matchesImageSignature(Buffer.from("<script>alert(1)</script>"), "image/png"),
    false,
  );
});
