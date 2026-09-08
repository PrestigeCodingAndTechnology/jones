import { Promotion } from "../models/Promotion.js";
import { HttpError } from "../utils/http.js";

export function normalizePromotionCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (!code) return "";
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    throw new HttpError(400, "Enter a valid promo code.");
  }
  return code;
}

export function calculatePromotionDiscount(subtotal, promotion, now = new Date()) {
  const amount = Math.max(0, Math.round(Number(subtotal) || 0));
  if (!promotion?.active) throw new HttpError(409, "This promo code is inactive.");
  if (promotion.startsAt && new Date(promotion.startsAt) > now) {
    throw new HttpError(409, "This promo code is not active yet.");
  }
  if (promotion.endsAt && new Date(promotion.endsAt) < now) {
    throw new HttpError(409, "This promo code has expired.");
  }
  if (
    Number(promotion.usageLimit || 0) > 0 &&
    Number(promotion.usedCount || 0) >= Number(promotion.usageLimit)
  ) {
    throw new HttpError(409, "This promo code has reached its usage limit.");
  }
  if (amount < Number(promotion.minimumSubtotal || 0)) {
    throw new HttpError(
      409,
      `This promo code requires a product subtotal of at least ₦${Number(
        promotion.minimumSubtotal,
      ).toLocaleString("en-NG")}.`,
    );
  }

  let discount =
    promotion.type === "percentage"
      ? Math.floor((amount * Number(promotion.value)) / 100)
      : Math.round(Number(promotion.value));
  if (Number(promotion.maximumDiscount || 0) > 0) {
    discount = Math.min(discount, Number(promotion.maximumDiscount));
  }
  return Math.max(0, Math.min(amount, discount));
}

export async function resolvePromotion(codeValue, subtotal) {
  const code = normalizePromotionCode(codeValue);
  if (!code) return null;
  const promotion = await Promotion.findOne({ code });
  if (!promotion) throw new HttpError(404, "Promo code not found.");
  const discount = calculatePromotionDiscount(subtotal, promotion);
  return { promotion, discount };
}

export function publicPromotion(promotion, discount) {
  return {
    id: String(promotion._id),
    code: promotion.code,
    type: promotion.type,
    value: promotion.value,
    minimumSubtotal: promotion.minimumSubtotal,
    maximumDiscount: promotion.maximumDiscount,
    startsAt: promotion.startsAt || null,
    endsAt: promotion.endsAt || null,
    usageLimit: promotion.usageLimit,
    usedCount: promotion.usedCount,
    active: promotion.active,
    ...(discount == null ? {} : { discount }),
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt,
  };
}
