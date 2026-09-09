import "dotenv/config";
import { env } from "../src/config/env.js";
import { verifyPaystackCredentials } from "../src/services/paystack.js";

async function run() {
  if (!env.paystackConfigured) {
    throw new Error("Paystack keys are not configured in the current environment.");
  }
  if (env.paystackEnvironment !== "live") {
    throw new Error(
      "This command is intended to validate the production live Paystack configuration. Use pk_live_ and sk_live_ credentials.",
    );
  }
  await verifyPaystackCredentials();
  console.log("Paystack live authentication: PASS");
  console.log(`Callback URL: ${env.paystackCallbackUrl}`);
  console.log("No payment or charge was created by this check.");
}

run().catch((error) => {
  console.error(`Paystack live authentication: FAIL - ${error.message}`);
  process.exit(1);
});
