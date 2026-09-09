import mongoose from "mongoose";
import {
  isValidShoeSize,
  legacySizeInventory,
  MAX_SIZES_PER_PRODUCT,
  MAX_SNEAKER_SIZE,
  MIN_SNEAKER_SIZE,
  totalInventoryStock,
} from "../services/inventory.js";

export function slugifyProduct(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const sizeInventorySchema = new mongoose.Schema(
  {
    size: {
      type: Number,
      required: true,
      min: MIN_SNEAKER_SIZE,
      max: MAX_SNEAKER_SIZE,
      validate: {
        validator: isValidShoeSize,
        message: "Sneaker sizes may have no more than two decimal places.",
      },
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      max: 100_000,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    tag: { type: String, trim: true, maxlength: 40, default: "New" },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0, default: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, max: 100_000, default: 0 },
    sizeInventory: {
      type: [sizeInventorySchema],
      default: undefined,
      validate: {
        validator: (inventory) =>
          Array.isArray(inventory) &&
          inventory.length > 0 &&
          inventory.length <= MAX_SIZES_PER_PRODUCT &&
          inventory.every((entry) => isValidShoeSize(entry.size)) &&
          new Set(inventory.map((entry) => entry.size)).size ===
            inventory.length &&
          totalInventoryStock(inventory) <= 100_000,
        message:
          `Choose up to ${MAX_SIZES_PER_PRODUCT} unique numeric sizes from ${MIN_SNEAKER_SIZE} to ${MAX_SNEAKER_SIZE} and keep total stock at or below 100,000 pairs.`,
      },
    },
    sizes: {
      type: [
        {
          type: Number,
          min: MIN_SNEAKER_SIZE,
          max: MAX_SNEAKER_SIZE,
          validate: isValidShoeSize,
        },
      ],
      default: [40, 41, 42, 43, 44, 45],
      validate: {
        validator: (sizes) =>
          sizes.length > 0 &&
          sizes.length <= MAX_SIZES_PER_PRODUCT &&
          sizes.every(isValidShoeSize) &&
          new Set(sizes).size === sizes.length,
        message: "Product sizes must be unique.",
      },
    },
    image: { type: String, required: true, trim: true, maxlength: 2_200 },
    fallbackImage: { type: String, trim: true, maxlength: 2_200, default: "" },
    description: { type: String, required: true, trim: true, maxlength: 2_000 },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    views: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, optimisticConcurrency: true },
);

productSchema.pre("validate", function setSlug() {
  if (!this.slug) {
    this.slug = slugifyProduct(this.name);
  }
  if ((!this.sizeInventory || !this.sizeInventory.length) && !this.isNew) {
    this.sizeInventory = legacySizeInventory(this.sizes, this.stock);
  }
  if (this.sizeInventory?.length) {
    this.sizeInventory.sort((left, right) => left.size - right.size);
    this.sizes = this.sizeInventory.map((entry) => entry.size);
    this.stock = totalInventoryStock(this.sizeInventory);
  }
});

productSchema.index({ name: "text", category: "text", description: "text" });

export const Product = mongoose.model("Product", productSchema);
