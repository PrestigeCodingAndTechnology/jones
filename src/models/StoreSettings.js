import mongoose from "mongoose";

const storeSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "primary" },
    storeName: {
      type: String,
      default: "Jones Kicks",
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      default: "0905 857 9374",
      trim: true,
      maxlength: 40,
    },
    notificationEmail: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },
    orderAlerts: { type: Boolean, default: true },
    viewTracking: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const StoreSettings = mongoose.model(
  "StoreSettings",
  storeSettingsSchema,
);
