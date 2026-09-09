import mongoose from "mongoose";

export function normalizeCouponCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 32);
}

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 180, default: "" },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    value: { type: Number, required: true, min: 1 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

couponSchema.pre("validate", function normalizeCode() {
  this.code = normalizeCouponCode(this.code);
  if (!this.code) this.invalidate("code", "Coupon code is required.");
  if (this.type === "percentage" && this.value > 100) {
    this.invalidate("value", "Percentage discounts cannot exceed 100%.");
  }
  if (this.endsAt && this.startsAt && this.endsAt <= this.startsAt) {
    this.invalidate("endsAt", "Coupon end date must be after its start date.");
  }
});

export const Coupon = mongoose.model("Coupon", couponSchema);
