export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function cleanText(value, { name = "Value", min = 0, max = 500 } = {}) {
  const text = String(value ?? "").trim();
  if (text.length < min) throw new HttpError(400, `${name} is required.`);
  if (text.length > max) throw new HttpError(400, `${name} is too long.`);
  return text;
}

export function cleanEmail(value, required = true) {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!email && !required) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) || email.length > 180) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  return email;
}

export function cleanMoney(value, name, { min = 0, max = 100_000_000 } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < min || amount > max) {
    throw new HttpError(400, `${name} must be a valid amount.`);
  }
  return Math.round(amount);
}

export function cleanInteger(value, name, { min = 0, max = 100_000 } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new HttpError(
      400,
      `${name} must be a whole number between ${min} and ${max}.`,
    );
  }
  return number;
}

export function publicProduct(product) {
  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    category: product.category,
    tag: product.tag,
    price: product.price,
    comparePrice: product.comparePrice,
    deliveryFee: product.deliveryFee,
    stock: product.stock,
    sizes: product.sizes,
    image: product.image,
    fallback: product.fallbackImage || product.image,
    description: product.description,
    featured: product.featured,
    active: product.active,
    views: product.views,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function publicOrder(order, { includeCustomer = false } = {}) {
  const result = {
    id: order.reference,
    reference: order.reference,
    items: order.items.map((item) => ({
      productId: String(item.product),
      name: item.name,
      slug: item.slug,
      image: item.image,
      size: item.size,
      qty: item.quantity,
      quantity: item.quantity,
      price: item.unitPrice,
      deliveryFee: item.unitDeliveryFee,
      lineSubtotal: item.lineSubtotal,
      lineDeliveryFee: item.lineDeliveryFee,
    })),
    subtotal: order.subtotal,
    discount: order.discount || 0,
    delivery: order.deliveryFee,
    deliveryFee: order.deliveryFee,
    total: order.total,
    promotionCode: order.promotion?.code || "",
    paymentMethod: order.payment.method,
    paymentStatus: order.payment.status,
    status: order.status,
    statusHistory: (order.statusHistory || []).map((entry) => ({
      status: entry.status,
      changedAt: entry.changedAt,
    })),
    createdAt: order.createdAt,
  };
  if (includeCustomer) {
    result.customer = order.customer;
    result.notification = {
      sentAt: order.notification?.sentAt || null,
      lastError: order.notification?.lastError || "",
      statusSentAt: order.notification?.statusSentAt || null,
      statusLastError: order.notification?.statusLastError || "",
    };
  }
  return result;
}
