import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePromotionDiscount,
  normalizePromotionCode,
  publicPromotion,
} from "../src/services/promotionService.js";

const activePromotion = {
  _id: "507f1f77bcf86cd799439099",
  code: "STEP10",
  type: "percentage",
  value: 10,
  minimumSubtotal: 20_000,
  maximumDiscount: 6_000,
  usageLimit: 100,
  usedCount: 2,
  active: true,
};

test("normalizes customer promo codes and rejects unsafe values", () => {
  assert.equal(normalizePromotionCode("  step_10  "), "STEP_10");
  assert.throws(() => normalizePromotionCode("bad code!"), /valid promo code/i);
});

test("calculates percentage discounts with a configured maximum", () => {
  assert.equal(calculatePromotionDiscount(100_000, activePromotion), 6_000);
  assert.equal(
    publicPromotion(activePromotion, 6_000).discount,
    6_000,
  );
});

test("calculates fixed promotions without discounting delivery", () => {
  const promotion = {
    ...activePromotion,
    type: "fixed",
    value: 25_000,
    maximumDiscount: 0,
    minimumSubtotal: 0,
  };
  assert.equal(calculatePromotionDiscount(15_000, promotion), 15_000);
});

test("enforces promotion dates, minimum spend and usage limits", () => {
  const now = new Date("2026-09-07T12:00:00Z");
  assert.throws(
    () =>
      calculatePromotionDiscount(
        100_000,
        { ...activePromotion, startsAt: "2026-09-08T00:00:00Z" },
        now,
      ),
    /not active yet/i,
  );
  assert.throws(
    () => calculatePromotionDiscount(10_000, activePromotion, now),
    /requires a product subtotal/i,
  );
  assert.throws(
    () =>
      calculatePromotionDiscount(
        100_000,
        { ...activePromotion, usedCount: 100 },
        now,
      ),
    /usage limit/i,
  );
});
