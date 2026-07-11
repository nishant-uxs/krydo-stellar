/**
 * Prints Vercel-ready environment variables to stdout.
 * Run: npx tsx script/print-vercel-env.ts > vercel-env.local.txt
 * Then copy each KEY=VALUE into Vercel → Settings → Environment Variables.
 */
import fs from "fs";
import crypto from "crypto";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const firebasePath = path.join(root, "krydo-c51f7-firebase-adminsdk-fbsvc-7b210186bd.json");

if (!fs.existsSync(firebasePath)) {
  console.error("Firebase JSON not found:", firebasePath);
  process.exit(1);
}

const firebase = JSON.parse(fs.readFileSync(firebasePath, "utf8"));
const session = crypto.randomBytes(48).toString("hex");
const jwt = crypto.randomBytes(48).toString("hex");

const lines: Record<string, string> = {
  NODE_ENV: "production",
  FIREBASE_PROJECT_ID: firebase.project_id ?? "krydo-c51f7",
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify(firebase),
  SESSION_SECRET: session,
  JWT_SECRET: jwt,
  STELLAR_NETWORK: "testnet",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
  CORS_ORIGINS: "https://krydo-stellar.vercel.app",
  RATE_LIMIT_WINDOW_MS: "60000",
  RATE_LIMIT_MAX: "120",
};

// DEPLOYER_SECRET is optional — paste your S... key if on-chain mode is needed.
const deployer = process.env.DEPLOYER_SECRET?.trim();
if (deployer) {
  lines.DEPLOYER_SECRET = deployer;
}

for (const [key, value] of Object.entries(lines)) {
  console.log(`${key}=${value}`);
}
