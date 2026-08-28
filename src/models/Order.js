import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String, required: true },
    size: { type: Number, required: true, min: 40, max: 45 },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitDeliveryFee: { type: Number, required: true, min: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
    lineDeliveryFee: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    customer: {
      fullName: { type: String, required: true, trim: true, maxlength: 120 },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 180,
      },
      phone: { type: String, required: true, trim: true, maxlength: 40 },
      address: { type: String, required: true, trim: true, maxlength: 240 },
      city: { type: String, required: true, trim: true, maxlength: 100 },
      region: { type: String, required: true, trim: true, maxlength: 100 },
      notes: { type: String, trim: true, maxlength: 500, default: "" },
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (items) => items.length > 0,
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", enum: ["NGN"] },
    payment: {
      provider: { type: String, enum: ["paystack", "demo"], required: true },
      method: { type: String, default: "online" },
      status: {
        type: String,
        enum: ["pending", "processing", "paid", "failed", "refunded"],
        default: "pending",
        index: true,
      },
      reference: { type: String, required: true, index: true },
      accessCode: { type: String, default: "", select: false },
      channel: { type: String, default: "" },
      authorizationCode: { type: String, default: "", select: false },
      paidAt: Date,
      providerResponse: { type: mongoose.Schema.Types.Mixed, select: false },
      processingAt: Date,
    },
    status: {
      type: String,
      enum: [
        "Awaiting payment",
        "New",
        "Confirmed",
        "Processing",
        "Dispatched",
        "Completed",
        "Cancelled",
        "Needs review",
      ],
      default: "Awaiting payment",
      index: true,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String, default: "system" },
        _id: false,
      },
    ],
    inventoryCommittedAt: Date,
    notification: {
      sentAt: Date,
      lastError: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });

export const Order = mongoose.model("Order", orderSchema);
