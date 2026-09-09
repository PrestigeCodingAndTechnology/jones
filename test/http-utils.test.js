import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhoneForMatch } from "../src/utils/http.js";

test("order tracking tolerates common phone formatting differences", () => {
  assert.equal(normalizePhoneForMatch("0801 234 5678"), "8012345678");
  assert.equal(normalizePhoneForMatch("+234 801 234 5678"), "8012345678");
  assert.equal(normalizePhoneForMatch("0801-234-5678"), "8012345678");
});
