/**
 * Stellar network configuration for the client.
 *
 * Mirrors the shared deployment metadata so the browser signs on the same
 * network the server anchors to.
 */
import {
  AUTHORITY_ID,
  CREDENTIALS_ID,
  AUDIT_ID,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
  STELLAR_NETWORK,
  EXPLORER_URL,
  explorerTxUrl,
  explorerAccountUrl,
  explorerContractUrl,
} from "@shared/contracts";

export {
  AUTHORITY_ID,
  CREDENTIALS_ID,
  AUDIT_ID,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
  STELLAR_NETWORK,
  EXPLORER_URL,
  explorerTxUrl,
  explorerAccountUrl,
  explorerContractUrl,
};

/** The network the app expects the wallet to be on. */
export const SUPPORTED_NETWORK = {
  network: STELLAR_NETWORK,
  networkPassphrase: NETWORK_PASSPHRASE,
  rpcUrl: SOROBAN_RPC_URL,
} as const;

/** Human label for the active network, e.g. "Testnet". */
export const NETWORK_LABEL =
  STELLAR_NETWORK.charAt(0).toUpperCase() + STELLAR_NETWORK.slice(1);
