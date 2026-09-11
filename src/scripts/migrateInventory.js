import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { migrateLegacyProductInventory } from "../services/inventoryMigration.js";

async function migrate() {
  await connectDatabase();
  const count = await migrateLegacyProductInventory();
  console.log(
    count
      ? `Migrated ${count} legacy catalogue product(s).`
      : "All products already use the current catalogue fields.",
  );
}

migrate()
  .catch((error) => {
    console.error("Inventory migration failed:", error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
