import mongoose from "mongoose";

const adminSessionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    csrfToken: { type: String, required: true },
    userAgentHash: { type: String, default: "" },
    ipHash: { type: String, default: "" },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const AdminSession = mongoose.model("AdminSession", adminSessionSchema);
