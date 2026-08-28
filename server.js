import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./src/app.js";
import { connectDatabase, disconnectDatabase } from "./src/config/database.js";
import { env } from "./src/config/env.js";

let server;

async function start() {
  await connectDatabase();
  const app = createApp();
  server = createServer(app);

  server.listen(env.port, () => {
    console.log(`Jones Kicks is running at ${env.appUrl}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Closing Jones Kicks safely...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  console.error("Unable to start Jones Kicks:", error);
  process.exit(1);
});
