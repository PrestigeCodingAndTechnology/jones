import mongoose from "mongoose";

export function slugifyProduct(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    tag: { type: String, trim: true, maxlength: 40, default: "New" },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0, default: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sizes: {
      type: [{ type: Number, min: 40, max: 45 }],
      default: [40, 41, 42, 43, 44, 45],
      validate: {
        validator: (sizes) =>
          sizes.length > 0 && new Set(sizes).size === sizes.length,
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
});

productSchema.index({ name: "text", category: "text", description: "text" });

export const Product = mongoose.model("Product", productSchema);
