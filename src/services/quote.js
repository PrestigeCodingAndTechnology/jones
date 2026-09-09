import { cleanInteger, HttpError } from "../utils/http.js";
import { inventoryStockForSize, productInventory } from "./inventory.js";

export function calculateQuote(cartItems, products) {
  if (
    !Array.isArray(cartItems) ||
    cartItems.length < 1 ||
    cartItems.length > 20
  ) {
    throw new HttpError(
      400,
      "Your bag must contain between 1 and 20 product lines.",
    );
  }
  const productMap = new Map(
    products.map((product) => [String(product._id || product.id), product]),
  );
  const combined = new Map();

  for (const entry of cartItems) {
    const productId = String(entry?.productId || "");
    const size = cleanInteger(entry?.size, "Size", { min: 40, max: 45 });
    const quantity = cleanInteger(entry?.qty ?? entry?.quantity, "Quantity", {
      min: 1,
      max: 10,
    });
    const key = `${productId}:${size}`;
    combined.set(key, {
      productId,
      size,
      quantity: (combined.get(key)?.quantity || 0) + quantity,
    });
  }

  const items = [];
  for (const entry of combined.values()) {
    if (entry.quantity > 10) {
      throw new HttpError(400, "A maximum of 10 pairs is allowed per size.");
    }
    const product = productMap.get(entry.productId);
    if (!product || !product.active) {
      throw new HttpError(409, "A product in your bag is no longer available.");
    }
    const offeredSizes = productInventory(product).map((item) => item.size);
    if (!offeredSizes.includes(entry.size)) {
      throw new HttpError(
        409,
        `${product.name} is unavailable in size ${entry.size}.`,
      );
    }
    const availableStock = inventoryStockForSize(product, entry.size);
    if (availableStock < entry.quantity) {
      throw new HttpError(
        409,
        availableStock > 0
          ? `Only ${availableStock} ${product.name} pair(s) remain in size ${entry.size}.`
          : `${product.name} is sold out in size ${entry.size}.`,
      );
    }
    const lineSubtotal = Math.round(product.price) * entry.quantity;
    const lineDeliveryFee =
      Math.round(product.deliveryFee || 0) * entry.quantity;
    items.push({
      product: product._id || product.id,
      name: product.name,
      slug: product.slug,
      image: product.image,
      size: entry.size,
      quantity: entry.quantity,
      unitPrice: Math.round(product.price),
      unitDeliveryFee: Math.round(product.deliveryFee || 0),
      lineSubtotal,
      lineDeliveryFee,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const deliveryFee = items.reduce(
    (sum, item) => sum + item.lineDeliveryFee,
    0,
  );
  return {
    items,
    subtotal,
    deliveryFee,
    discount: 0,
    promotion: null,
    total: subtotal + deliveryFee,
    currency: "NGN",
  };
}

export function applyCouponToQuote(quote, coupon, now = new Date()) {
  if (!coupon || coupon.active === false) {
    throw new HttpError(400, "That promo code is not active.");
  }
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    throw new HttpError(400, "That promo code is not active yet.");
  }
  if (coupon.endsAt && new Date(coupon.endsAt) < now) {
    throw new HttpError(400, "That promo code has expired.");
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new HttpError(400, "That promo code has reached its usage limit.");
  }
  if (quote.subtotal < Number(coupon.minSubtotal || 0)) {
    throw new HttpError(
      400,
      `This promo code requires at least ₦${Number(coupon.minSubtotal || 0).toLocaleString("en-NG")} in products.`,
    );
  }

  let discount =
    coupon.type === "percentage"
      ? Math.round((quote.subtotal * Number(coupon.value)) / 100)
      : Math.round(Number(coupon.value));
  if (coupon.maxDiscount > 0) {
    discount = Math.min(discount, Math.round(coupon.maxDiscount));
  }
  discount = Math.max(0, Math.min(discount, quote.subtotal));

  return {
    ...quote,
    discount,
    promotion: {
      coupon: coupon._id || coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    },
    total: quote.subtotal + quote.deliveryFee - discount,
  };
}
