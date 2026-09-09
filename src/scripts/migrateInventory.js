import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { migrateLegacyProductInventory } from "../services/inventoryMigration.js";

async function migrate() {
  await connectDatabase();
  const count = await migrateLegacyProductInventory();
  console.log(
    count
      ? `Migrated ${count} product(s) to per-size inventory.`
      : "All products already use per-size inventory.",
  );
}

migrate()
  .catch((error) => {
    console.error("Inventory migration failed:", error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
