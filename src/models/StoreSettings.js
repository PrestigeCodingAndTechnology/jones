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
    whatsappUrl: {
      type: String,
      default: "https://wa.me/message/6BIGK72XFX23L1",
      trim: true,
      maxlength: 500,
    },
    instagramUrl: {
      type: String,
      default: "https://www.instagram.com/teejonesonly",
      trim: true,
      maxlength: 500,
    },
    instagramHandle: {
      type: String,
      default: "@teejonesonly",
      trim: true,
      maxlength: 100,
    },
    tiktokUrl: {
      type: String,
      default: "https://www.tiktok.com/@tee_jones247",
      trim: true,
      maxlength: 500,
    },
    tiktokHandle: {
      type: String,
      default: "@tee_jones247",
      trim: true,
      maxlength: 100,
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
