import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const required = [
  "server.js",
  "src/app.js",
  "src/models/Product.js",
  "src/models/Order.js",
  "src/models/Promotion.js",
  "src/models/Subscriber.js",
  "src/routes/admin.js",
  "src/routes/public.js",
  "src/routes/payments.js",
  "src/services/promotionService.js",
  "views/store.ejs",
  "assets/js/app.js",
  "assets/css/styles.css",
  "assets/images/footprint.png",
  ".env.example",
  "Dockerfile",
  "compose.yaml",
  "DEPLOYMENT.md",
];

for (const path of required) await access(path, constants.R_OK);

const [client, styles, productModel, orderModel, adminRoutes, publicRoutes, deployment] = await Promise.all([
  readFile("assets/js/app.js", "utf8"),
  readFile("assets/css/styles.css", "utf8"),
  readFile("src/models/Product.js", "utf8"),
  readFile("src/models/Order.js", "utf8"),
  readFile("src/routes/admin.js", "utf8"),
  readFile("src/routes/public.js", "utf8"),
  readFile("DEPLOYMENT.md", "utf8"),
]);

const assertions = [
  [
    styles.includes(".site-header .brand-word{display:inline-flex}"),
    "mobile brand name override",
  ],
  [client.includes("Delivery fee per pair"), "admin delivery-fee input"],
  [client.includes("Product delivery fees"), "checkout delivery-fee summary"],
  [productModel.includes("deliveryFee"), "product delivery-fee field"],
  [adminRoutes.includes('"/products/:id"'), "product update endpoint"],
  [client.includes("/api/orders"), "live checkout connection"],
  [client.includes('path === "/wishlist"'), "saved-sneaker collection"],
  [client.includes("data-new-promotion"), "promotion management interface"],
  [adminRoutes.includes('"/promotions"'), "promotion management API"],
  [adminRoutes.includes('"/messages/:id/status"'), "customer inbox workflow"],
  [adminRoutes.includes('"/orders/:reference/resend-status-notification"'), "status-email retry workflow"],
  [adminRoutes.includes('"/subscribers/:id"'), "subscriber management workflow"],
  [orderModel.includes("inventoryReleasedAt"), "cancellation stock safeguard"],
  [publicRoutes.includes('req.get("x-order-token")'), "private order token header"],
  [deployment.includes("/api/payments/webhook"), "production payment instructions"],
];

for (const [passed, name] of assertions) {
  if (!passed) throw new Error(`Project check failed: ${name}`);
}

console.log(
  `Project check passed: ${required.length} required files and ${assertions.length} feature assertions.`,
);
