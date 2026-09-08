import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[A-Z0-9_-]+$/,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: { type: Number, required: true, min: 1, max: 100_000_000 },
    minimumSubtotal: { type: Number, min: 0, default: 0 },
    maximumDiscount: { type: Number, min: 0, default: 0 },
    startsAt: Date,
    endsAt: Date,
    usageLimit: { type: Number, min: 0, default: 0 },
    usedCount: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

promotionSchema.pre("validate", function validatePromotion() {
  if (this.type === "percentage" && this.value > 100) {
    this.invalidate("value", "Percentage discounts cannot exceed 100%.");
  }
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) {
    this.invalidate("endsAt", "The end date must be after the start date.");
  }
});

promotionSchema.index({ active: 1, endsAt: 1 });

export const Promotion = mongoose.model("Promotion", promotionSchema);
