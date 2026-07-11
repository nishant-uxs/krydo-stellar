/**
 * Single source of truth for deployed-contract metadata, shared between
 * `server/*` (Stellar SDK + Soroban RPC) and `client/src/*` (wallet kit signer).
 *
 * The deployment JSON is produced by `script/deploy.ts` after running
 * `stellar contract deploy`; it contains the Soroban contract ids and the
 * network parameters. Everything below is derived from that file so the
 * server and browser can never drift apart on which contracts / network
 * they're talking to.
 */
import deployment from "../contracts/deployment.json";

export interface ContractInfo {
  contractId: string;
}

export interface DeploymentInfo {
  /** "testnet" | "mainnet" | "futurenet" | "standalone" */
  network: string;
  /** Network passphrase used to scope signatures + transactions. */
  networkPassphrase: string;
  /** Soroban RPC endpoint. */
  rpcUrl: string;
  /** Horizon endpoint (classic account queries, funding). */
  horizonUrl: string;
  /** Block-explorer base for user-facing links (stellar.expert). */
  explorerUrl: string;
  /** Deployer / root authority public key (G...). Empty before first deploy. */
  deployer: string;
  deployedAt: string;
  contracts: {
    KrydoAuthority: ContractInfo;
    KrydoCredentials: ContractInfo;
    /** Optional: present only after the audit contract has been deployed. */
    KrydoAudit?: ContractInfo;
  };
}

/** Typed view of the deployment.json baked into the bundle. */
export const DEPLOYMENT = deployment as DeploymentInfo;

/** Soroban contract ids. Empty string until `npm run deploy:contracts` is run. */
export const AUTHORITY_ID = DEPLOYMENT.contracts.KrydoAuthority.contractId;
export const CREDENTIALS_ID = DEPLOYMENT.contracts.KrydoCredentials.contractId;
export const AUDIT_ID = DEPLOYMENT.contracts.KrydoAudit?.contractId ?? "";

/** Network constants. */
export const STELLAR_NETWORK = DEPLOYMENT.network;
export const NETWORK_PASSPHRASE = DEPLOYMENT.networkPassphrase;
export const SOROBAN_RPC_URL = DEPLOYMENT.rpcUrl;
export const HORIZON_URL = DEPLOYMENT.horizonUrl;
export const EXPLORER_URL = DEPLOYMENT.explorerUrl;

/** Well-known Stellar network passphrases. */
export const NETWORK_PASSPHRASES = {
  testnet: "Test SDF Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
  futurenet: "Test SDF Future Network ; October 2022",
} as const;

/** stellar.expert explorer link helpers (user-facing). */
export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}
export function explorerAccountUrl(address: string): string {
  return `${EXPLORER_URL}/account/${address}`;
}
export function explorerContractUrl(contractId: string): string {
  return `${EXPLORER_URL}/contract/${contractId}`;
}
