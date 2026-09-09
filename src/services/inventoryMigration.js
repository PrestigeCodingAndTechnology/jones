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
        ],
      },
      { projection: { sizes: 1, stock: 1 } },
    )
    .toArray();

  if (!legacyProducts.length) return 0;

  const operations = legacyProducts.map((product) => {
    const sizeInventory = legacySizeInventory(product.sizes, product.stock);
    return {
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            sizeInventory,
            sizes: sizeInventory.map((entry) => entry.size),
            stock: totalInventoryStock(sizeInventory),
          },
        },
      },
    };
  });

  const result = await Product.collection.bulkWrite(operations, {
    ordered: false,
  });
  return result.modifiedCount;
}
