export const STORE_SIZES = Object.freeze([40, 41, 42, 43, 44, 45]);
export const MIN_SNEAKER_SIZE = 1;
export const MAX_SNEAKER_SIZE = 100;
export const MAX_SIZES_PER_PRODUCT = 30;

const MAX_STOCK_PER_SIZE = 100_000;
const MAX_TOTAL_STOCK = 100_000;

function inventoryError(message) {
  const error = new Error(message);
  error.name = "InventoryValidationError";
  error.status = 400;
  return error;
}

export function normalizeShoeSize(value) {
  const blankOrBoolean =
    value == null ||
    typeof value === "boolean" ||
    (typeof value === "string" && value.trim() === "");
  const size = blankOrBoolean ? Number.NaN : Number(value);
  const rounded = Math.round(size * 100) / 100;
  if (
    !Number.isFinite(size) ||
    size < MIN_SNEAKER_SIZE ||
    size > MAX_SNEAKER_SIZE ||
    Math.abs(size - rounded) > Number.EPSILON * 100
  ) {
    throw inventoryError(
      `Sneaker size must be a number from ${MIN_SNEAKER_SIZE} to ${MAX_SNEAKER_SIZE} with no more than two decimal places.`,
    );
  }
  return rounded;
}

export function isValidShoeSize(value) {
  try {
    normalizeShoeSize(value);
    return true;
  } catch {
    return false;
  }
}

export function normalizeSizeInventory(value, { required = true } = {}) {
  if (!Array.isArray(value)) {
    throw inventoryError("Choose at least one sneaker size and enter its stock.");
  }

  if (value.length > MAX_SIZES_PER_PRODUCT) {
    throw inventoryError(
      `A sneaker can have at most ${MAX_SIZES_PER_PRODUCT} sizes.`,
    );
  }

  const seen = new Set();
  const inventory = value.map((entry) => {
    const size = normalizeShoeSize(entry?.size);
    const stock = Number(entry?.stock);

    if (seen.has(size)) {
      throw inventoryError(`Size ${size} was selected more than once.`);
    }
    if (
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > MAX_STOCK_PER_SIZE
    ) {
      throw inventoryError(
        `Stock for size ${size} must be a whole number from 0 to ${MAX_STOCK_PER_SIZE.toLocaleString("en-NG")}.`,
      );
    }

    seen.add(size);
    return { size, stock };
  });

  if (required && inventory.length === 0) {
    throw inventoryError("Choose at least one sneaker size.");
  }

  inventory.sort((left, right) => left.size - right.size);
  if (totalInventoryStock(inventory) > MAX_TOTAL_STOCK) {
    throw inventoryError(
      `Total product stock cannot exceed ${MAX_TOTAL_STOCK.toLocaleString("en-NG")} pairs.`,
    );
  }
  return inventory;
}

export function totalInventoryStock(inventory = []) {
  return inventory.reduce(
    (total, entry) => total + Math.max(0, Number(entry?.stock) || 0),
    0,
  );
}

export function inventoryStockForSize(product, requestedSize) {
  let size;
  try {
    size = normalizeShoeSize(requestedSize);
  } catch {
    return 0;
  }
  const entry = productInventory(product).find((item) => item.size === size);
  return entry ? entry.stock : 0;
}

export function productInventory(product = {}) {
  if (Array.isArray(product.sizeInventory) && product.sizeInventory.length) {
    return product.sizeInventory
      .map((entry) => ({
        size: Number(entry?.size),
        stock: Math.max(0, Math.trunc(Number(entry?.stock) || 0)),
      }))
      .filter(
        (entry, index, entries) =>
          isValidShoeSize(entry.size) &&
          entries.findIndex((item) => item.size === entry.size) === index,
      )
      .sort((left, right) => left.size - right.size);
  }

  return legacySizeInventory(product.sizes, product.stock);
}

export function legacySizeInventory(sizes, totalStock = 0) {
  const normalizedSizes = Array.from(
    new Set(
      (Array.isArray(sizes) && sizes.length ? sizes : STORE_SIZES)
        .map(Number)
        .filter(isValidShoeSize),
    ),
  ).sort((left, right) => left - right);

  if (!normalizedSizes.length) return [];
  const stock = Math.min(
    MAX_TOTAL_STOCK,
    Math.max(0, Math.trunc(Number(totalStock) || 0)),
  );
  const base = Math.floor(stock / normalizedSizes.length);
  const remainder = stock % normalizedSizes.length;

  return normalizedSizes.map((size, index) => ({
    size,
    stock: base + (index < remainder ? 1 : 0),
  }));
}

export function inventoryFields(inventory) {
  const normalized = normalizeSizeInventory(inventory);
  return {
    sizeInventory: normalized,
    sizes: normalized.map((entry) => entry.size),
    stock: totalInventoryStock(normalized),
  };
}
