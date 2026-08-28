import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Admin } from "../models/Admin.js";
import { Product, slugifyProduct } from "../models/Product.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { hashPassword } from "../utils/crypto.js";

const catalogue = [
  ["PUMA", "Lifestyle", 48_000, 58_000, "New", "pics1.jpeg", 3_000],
  [
    "ADDIDAS SAMBA",
    "Lifestyle",
    45_000,
    52_000,
    "Bestseller",
    "pics2.jpeg",
    3_000,
  ],
  ["ASICS", "Performance", 52_000, 60_000, "New", "pics3.jpeg", 3_500],
  ["HELIOT EMIL", "Limited", 68_000, 76_000, "Limited", "pics10.jpeg", 4_000],
  ["CHANNEL", "Luxury", 72_000, 82_000, "Premium", "pics11.jpeg", 4_000],
  ["TIMBERLAND", "Boots", 75_000, 84_000, "Icon", "pics12.jpeg", 4_500],
  ["LAVIN BURGUNDY", "Luxury", 85_000, 95_000, "Limited", "pics7.jpeg", 4_000],
  ["NIKE NOCTA", "Limited", 65_000, 75_000, "Hot", "pics8.jpeg", 3_500],
  [
    "AIR JORDAN 4",
    "Jordan",
    58_000,
    67_000,
    "Bestseller",
    "pics13.jpeg",
    3_500,
  ],
  [
    "SUPREME X NIKE",
    "Limited",
    70_000,
    80_000,
    "Limited",
    "pics14.jpeg",
    4_000,
  ],
  ["NIKE SB LOW", "Nike", 52_000, 61_000, "Hot", "pics15.jpeg", 3_500],
  ["NIKE AIRFORCE", "Nike", 45_000, 52_000, "Icon", "pics16.jpeg", 3_000],
  ["NEW ASICS", "Performance", 50_000, 58_000, "New", "pics17.jpeg", 3_500],
  [
    "NIKE AIR JORDAN",
    "Jordan",
    58_000,
    67_000,
    "Classic",
    "pics18.jpeg",
    3_500,
  ],
  ["NEW CONVERSE", "Lifestyle", 42_000, 49_000, "New", "pics19.jpeg", 3_000],
  ["VANS HYLANE", "Lifestyle", 43_000, 50_000, "New", "pics20.jpeg", 3_000],
  [
    "NEW BALANCE 9060",
    "Lifestyle",
    55_000,
    64_000,
    "Bestseller",
    "pics21.jpeg",
    3_500,
  ],
  ["NIKE AIR MAX", "Nike", 56_000, 65_000, "Hot", "pics22.jpeg", 3_500],
  ["NIKE SB", "Nike", 46_000, 53_000, "Everyday", "pics23.jpeg", 3_000],
  ["NEW BALANCE", "Lifestyle", 54_000, 62_000, "New", "pics24.jpeg", 3_500],
];

const description =
  "A carefully selected statement pair made for confident everyday rotation, premium comfort and unmistakable street presence.";

async function seed() {
  await connectDatabase();

  for (const [
    name,
    category,
    price,
    comparePrice,
    tag,
    filename,
    deliveryFee,
  ] of catalogue) {
    const slug = slugifyProduct(name);
    await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          category,
          price,
          comparePrice,
          deliveryFee,
          tag,
          image: `/assets/images/${filename}`,
          fallbackImage: "/assets/images/pics4.jpeg",
          sizes: [40, 41, 42, 43, 44, 45],
          description,
          active: true,
        },
        $setOnInsert: {
          slug,
          stock: 12,
          featured: catalogue.findIndex((item) => item[0] === name) < 8,
          views: 0,
        },
      },
      { upsert: true, new: true },
    );
  }

  const adminEmail = String(
    process.env.ADMIN_EMAIL || "admin@joneskick.com",
  ).toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (process.env.NODE_ENV === "production" && adminPassword.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD must contain at least 12 characters in production.",
    );
  }
  const existingAdmin = await Admin.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await Admin.create({
      name: process.env.ADMIN_NAME || "Jones Kicks Admin",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "owner",
    });
  }

  await StoreSettings.findOneAndUpdate(
    { key: "primary" },
    {
      $setOnInsert: {
        key: "primary",
        storeName: "Jones Kicks",
        phone: "0905 857 9374",
        notificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || "",
        orderAlerts: true,
        viewTracking: true,
      },
    },
    { upsert: true },
  );

  console.log(`Seed complete: ${catalogue.length} products and ${adminEmail}`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
