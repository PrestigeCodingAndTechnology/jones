import test from "node:test";
import assert from "node:assert/strict";
import { Product } from "../src/models/Product.js";
import { migrateLegacyProductInventory } from "../src/services/inventoryMigration.js";

test("legacy migration fills missing delivery fees without replacing existing size inventory", async (context) => {
  const originalFind = Product.collection.find;
  const originalBulkWrite = Product.collection.bulkWrite;
  context.after(() => {
    Product.collection.find = originalFind;
    Product.collection.bulkWrite = originalBulkWrite;
  });

  const legacyId = "507f1f77bcf86cd799439021";
  const feeOnlyId = "507f1f77bcf86cd799439022";
  Product.collection.find = () => ({
    async toArray() {
      return [
        { _id: legacyId, sizes: [40, 41], stock: 3 },
        {
          _id: feeOnlyId,
          sizes: [42],
          stock: 2,
          sizeInventory: [{ size: 42, stock: 2 }],
          deliveryFee: null,
        },
      ];
    },
  });
  let operations;
  Product.collection.bulkWrite = async (value) => {
    operations = value;
    return { modifiedCount: value.length };
  };

  assert.equal(await migrateLegacyProductInventory(), 2);
  assert.deepEqual(operations[0], {
    updateOne: {
      filter: { _id: legacyId },
      update: {
        $set: {
          sizeInventory: [
            { size: 40, stock: 2 },
            { size: 41, stock: 1 },
          ],
          sizes: [40, 41],
          stock: 3,
          deliveryFee: 0,
        },
      },
    },
  });
  assert.deepEqual(operations[1], {
    updateOne: {
      filter: { _id: feeOnlyId },
      update: { $set: { deliveryFee: 0 } },
    },
  });
});
