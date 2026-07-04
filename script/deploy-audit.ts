// Incremental deployer for KrydoAudit. Reads the existing
// contracts/deployment.json produced by deploy.ts, deploys only the audit
// contract, and merges its contract id back into the same file so server and
// client pick it up via @shared/contracts.
//
//   npm run deploy:audit
import "dotenv/config";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WASM_DIR = "contracts/target/wasm32v1-none/release";

async function main() {
  const secret = process.env.DEPLOYER_SECRET;
  if (!secret) throw new Error("DEPLOYER_SECRET not set");

  const deploymentPath = path.resolve("contracts/deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      "contracts/deployment.json not found. Run `npm run deploy:contracts` first.",
    );
  }
  const existing = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const passphrase: string = existing.networkPassphrase;
  const rpc: string = existing.rpcUrl;
  if (!passphrase || !rpc) {
    throw new Error("deployment.json is missing networkPassphrase/rpcUrl.");
  }

  const wasm = path.join(WASM_DIR, "krydo_audit.wasm");
  if (!fs.existsSync(wasm)) {
    throw new Error(`WASM not found: ${wasm}. Run \`npm run compile:contracts\` first.`);
  }

  console.log("Deploying KrydoAudit...");
  const cmd = [
    "stellar contract deploy",
    `--wasm "${wasm}"`,
    `--source-account ${secret}`,
    `--rpc-url ${rpc}`,
    `--network-passphrase "${passphrase}"`,
  ].join(" ");
  const out = execSync(cmd, { stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
  const auditId = out.split(/\s+/).filter(Boolean).pop() ?? "";
  if (!/^C[A-Z2-7]{55}$/.test(auditId)) {
    throw new Error(`Unexpected deploy output (no contract id): ${out}`);
  }
  console.log("KrydoAudit:", auditId);

  existing.contracts = existing.contracts || {};
  existing.contracts.KrydoAudit = { contractId: auditId };
  existing.deployedAt = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(existing, null, 2) + "\n");
  console.log("\nUpdated deployment info saved to:", deploymentPath);

  const explorer: string = existing.explorerUrl || "https://stellar.expert/explorer/testnet";
  console.log("\n--- Deployment Summary ---");
  console.log("KrydoAudit:", `${explorer}/contract/${auditId}`);
}

main().catch((err) => {
  console.error("Audit deployment failed:", err);
  process.exit(1);
});
