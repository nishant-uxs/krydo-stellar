// Deploy the Krydo Soroban contracts and write contracts/deployment.json.
//
// Prereqs:
//   - DEPLOYER_SECRET  : Stellar secret key (S...) with funded balance
//   - STELLAR_NETWORK  : testnet | mainnet | futurenet (default: testnet)
//   - Stellar CLI installed; contracts built (`npm run compile:contracts`)
//
//   npm run deploy:contracts
import "dotenv/config";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";

interface NetworkCfg {
  passphrase: string;
  rpc: string;
  horizon: string;
  explorer: string;
}

const NETWORKS: Record<string, NetworkCfg> = {
  testnet: {
    passphrase: "Test SDF Network ; September 2015",
    rpc: "https://soroban-testnet.stellar.org",
    horizon: "https://horizon-testnet.stellar.org",
    explorer: "https://stellar.expert/explorer/testnet",
  },
  mainnet: {
    passphrase: "Public Global Stellar Network ; September 2015",
    rpc: "https://mainnet.sorobanrpc.com",
    horizon: "https://horizon.stellar.org",
    explorer: "https://stellar.expert/explorer/public",
  },
  futurenet: {
    passphrase: "Test SDF Future Network ; October 2022",
    rpc: "https://rpc-futurenet.stellar.org",
    horizon: "https://horizon-futurenet.stellar.org",
    explorer: "https://stellar.expert/explorer/futurenet",
  },
};

const WASM_DIR = "contracts/target/wasm32v1-none/release";

function deployContract(
  wasmFile: string,
  secret: string,
  net: NetworkCfg,
  ctorArgs: string[] = [],
): string {
  const wasm = path.join(WASM_DIR, wasmFile);
  if (!fs.existsSync(wasm)) {
    throw new Error(`WASM not found: ${wasm}. Run \`npm run compile:contracts\` first.`);
  }
  const args = [
    "stellar contract deploy",
    `--wasm "${wasm}"`,
    `--source-account ${secret}`,
    `--rpc-url ${net.rpc}`,
    `--network-passphrase "${net.passphrase}"`,
    ctorArgs.length ? `-- ${ctorArgs.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Logs go to our stderr; the contract id is the only thing on stdout.
  const out = execSync(args, { stdio: ["ignore", "pipe", "inherit"] })
    .toString()
    .trim();
  const contractId = out.split(/\s+/).filter(Boolean).pop() ?? "";
  if (!/^C[A-Z2-7]{55}$/.test(contractId)) {
    throw new Error(`Unexpected deploy output (no contract id): ${out}`);
  }
  return contractId;
}

async function main() {
  const secret = process.env.DEPLOYER_SECRET;
  if (!secret) throw new Error("DEPLOYER_SECRET not set");

  const networkName = (process.env.STELLAR_NETWORK || "testnet").toLowerCase();
  const net = NETWORKS[networkName];
  if (!net) throw new Error(`Unknown STELLAR_NETWORK: ${networkName}`);

  const deployer = Keypair.fromSecret(secret).publicKey();
  console.log("Deployer:", deployer);
  console.log("Network:", networkName);

  console.log("\nDeploying KrydoAuthority...");
  const authorityId = deployContract("krydo_authority.wasm", secret, net, [
    `--root ${deployer}`,
  ]);
  console.log("KrydoAuthority:", authorityId);

  console.log("\nDeploying KrydoCredentials...");
  const credentialsId = deployContract("krydo_credentials.wasm", secret, net, [
    `--authority ${authorityId}`,
  ]);
  console.log("KrydoCredentials:", credentialsId);

  console.log("\nDeploying KrydoAudit...");
  const auditId = deployContract("krydo_audit.wasm", secret, net);
  console.log("KrydoAudit:", auditId);

  const deployment = {
    network: networkName,
    networkPassphrase: net.passphrase,
    rpcUrl: net.rpc,
    horizonUrl: net.horizon,
    explorerUrl: net.explorer,
    deployer,
    deployedAt: new Date().toISOString(),
    contracts: {
      KrydoAuthority: { contractId: authorityId },
      KrydoCredentials: { contractId: credentialsId },
      KrydoAudit: { contractId: auditId },
    },
  };

  const deploymentPath = path.resolve("contracts/deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2) + "\n");
  console.log("\nDeployment info saved to:", deploymentPath);

  console.log("\n--- Deployment Summary ---");
  console.log("Network:", networkName);
  console.log("KrydoAuthority:", `${net.explorer}/contract/${authorityId}`);
  console.log("KrydoCredentials:", `${net.explorer}/contract/${credentialsId}`);
  console.log("KrydoAudit:", `${net.explorer}/contract/${auditId}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
