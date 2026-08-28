import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    message: { type: String, required: true, trim: true, maxlength: 2_000 },
    status: { type: String, enum: ["New", "Read", "Closed"], default: "New" },
  },
  { timestamps: true },
);

export const ContactMessage = mongoose.model(
  "ContactMessage",
  contactMessageSchema,
);
