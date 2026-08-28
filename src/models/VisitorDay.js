import mongoose from "mongoose";

const visitorDaySchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    visitorHash: { type: String, required: true },
    pageViews: { type: Number, min: 1, default: 1 },
    paths: { type: [String], default: [] },
    referrerHost: { type: String, default: "", maxlength: 180 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

visitorDaySchema.index({ day: 1, visitorHash: 1 }, { unique: true });
visitorDaySchema.index({ day: 1 });

export const VisitorDay = mongoose.model("VisitorDay", visitorDaySchema);
