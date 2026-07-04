// Compile the Soroban contracts to WASM using the Stellar CLI.
//
//   npm run compile:contracts
//
// Requires the Stellar CLI (`stellar`) and the wasm32 Rust target:
//   rustup target add wasm32-unknown-unknown
//   cargo install --locked stellar-cli
import { execSync } from "node:child_process";
import path from "node:path";

const contractsDir = path.resolve("contracts");

console.log("Building Soroban contracts (stellar contract build)...");
try {
  execSync("stellar contract build", { cwd: contractsDir, stdio: "inherit" });
  console.log("\nCompilation complete! WASM artifacts in contracts/target/wasm32v1-none/release/");
} catch (err) {
  console.error("Contract build failed. Is the Stellar CLI installed?");
  process.exit(1);
}
