import "dotenv/config";
import { env } from "../src/config/env.js";
import { verifyEmailConnection } from "../src/services/email.js";

async function run() {
  if (!env.smtpConfigured) {
    throw new Error("SMTP credentials are not configured.");
  }
  await verifyEmailConnection();
  console.log("SMTP authentication: PASS");
  console.log("No email was sent by this check.");
}

run().catch((error) => {
  console.error(`SMTP authentication: FAIL - ${error.message}`);
  process.exit(1);
});
