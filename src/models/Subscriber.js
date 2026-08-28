import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 40,
    },
    active: { type: Boolean, default: true },
    source: { type: String, default: "storefront", maxlength: 60 },
  },
  { timestamps: true },
);

export const Subscriber = mongoose.model("Subscriber", subscriberSchema);
