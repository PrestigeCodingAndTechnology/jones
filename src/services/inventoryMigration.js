import { Product } from "../models/Product.js";
import { legacySizeInventory, totalInventoryStock } from "./inventory.js";

export async function migrateLegacyProductInventory() {
  const legacyProducts = await Product.collection
    .find(
      {
        $or: [
          { sizeInventory: { $exists: false } },
          { sizeInventory: { $type: 10 } },
          { sizeInventory: { $size: 0 } },
          { deliveryFee: { $exists: false } },
          { deliveryFee: null },
        ],
      },
      { projection: { sizes: 1, stock: 1, sizeInventory: 1, deliveryFee: 1 } },
    )
    .toArray();

  if (!legacyProducts.length) return 0;

  const operations = legacyProducts.map((product) => {
    const update = {};
    if (!Array.isArray(product.sizeInventory) || !product.sizeInventory.length) {
      const sizeInventory = legacySizeInventory(product.sizes, product.stock);
      update.sizeInventory = sizeInventory;
      update.sizes = sizeInventory.map((entry) => entry.size);
      update.stock = totalInventoryStock(sizeInventory);
    }
    if (product.deliveryFee == null) update.deliveryFee = 0;

    return {
      updateOne: {
        filter: { _id: product._id },
        update: { $set: update },
      },
    };
  });

  const result = await Product.collection.bulkWrite(operations, {
    ordered: false,
  });
  return result.modifiedCount;
}
