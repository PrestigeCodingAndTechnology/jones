export const STORE_SIZES = Object.freeze([40, 41, 42, 43, 44, 45]);

const MAX_STOCK_PER_SIZE = 100_000;
const MAX_TOTAL_STOCK = 100_000;

function inventoryError(message) {
  const error = new Error(message);
  error.name = "InventoryValidationError";
  error.status = 400;
  return error;
}

export function normalizeSizeInventory(value, { required = true } = {}) {
  if (!Array.isArray(value)) {
    throw inventoryError("Choose at least one sneaker size and enter its stock.");
  }

  const seen = new Set();
  const inventory = value.map((entry) => {
    const size = Number(entry?.size);
    const stock = Number(entry?.stock);

    if (!Number.isInteger(size) || !STORE_SIZES.includes(size)) {
      throw inventoryError("Sneaker sizes must be whole EU sizes from 40 to 45.");
    }
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
  const size = Number(requestedSize);
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
          STORE_SIZES.includes(entry.size) &&
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
        .filter((size) => Number.isInteger(size) && STORE_SIZES.includes(size)),
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
