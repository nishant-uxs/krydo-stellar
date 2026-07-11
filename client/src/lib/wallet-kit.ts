/**
 * Stellar Wallets Kit — multi-wallet connect modal for Freighter, xBull, Lobstr, etc.
 *
 * One modal lists Freighter, xBull, Lobstr, Hana, etc. Auth still goes through
 * our SIWS (SEP-53 signMessage → JWT) flow; contract txs use kit.signTransaction.
 */
import {
  StellarWalletsKit,
  Networks,
  KitEventType,
} from "@creit.tech/stellar-wallets-kit";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import { NETWORK_PASSPHRASE, STELLAR_NETWORK } from "@shared/contracts";

const WALLET_ID_KEY = "krydo_wallet_id";

function kitNetwork(): Networks {
  if (STELLAR_NETWORK === "mainnet") return Networks.PUBLIC;
  if (STELLAR_NETWORK === "futurenet") return Networks.FUTURENET;
  return Networks.TESTNET;
}

let initialized = false;

/** Idempotent kit bootstrap — call once before connect / sign. */
export function ensureWalletKit(): typeof StellarWalletsKit {
  if (!initialized) {
    // Albedo's signMessage is not SEP-43/SEP-53 compatible, so SIWS would fail.
    const modules = defaultModules({
      filterBy: (mod) => mod.productId !== "albedo",
    });
    StellarWalletsKit.init({
      modules,
      network: kitNetwork(),
      authModal: {
        showInstallLabel: true,
        hideUnsupportedWallets: false,
      },
    });
    initialized = true;
  }

  StellarWalletsKit.setNetwork(kitNetwork());

  const savedId = localStorage.getItem(WALLET_ID_KEY);
  if (savedId) {
    try {
      StellarWalletsKit.setWallet(savedId);
    } catch {
      localStorage.removeItem(WALLET_ID_KEY);
    }
  }

  return StellarWalletsKit;
}

export function rememberWalletId(id: string | null) {
  if (id) localStorage.setItem(WALLET_ID_KEY, id);
  else localStorage.removeItem(WALLET_ID_KEY);
}

export function getRememberedWalletId(): string | null {
  return localStorage.getItem(WALLET_ID_KEY);
}

/** Expected passphrase for SIWS / Soroban signing. */
export function expectedPassphrase(): string {
  return NETWORK_PASSPHRASE || kitNetwork();
}

export { StellarWalletsKit, KitEventType, Networks };
