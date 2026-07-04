/**
 * Krydo WalletProvider — Stellar / Freighter edition.
 *
 * Exposes the same `useWallet()` shape the rest of the app depends on
 * (address, role, label, connect, disconnect, …), but internally:
 *   1. Connection + signing go through the Freighter browser wallet
 *      (`@stellar/freighter-api`).
 *   2. Sign-in is "Sign in with Stellar": we fetch a server nonce, build a
 *      canonical message, and have Freighter sign the raw message bytes; the
 *      server verifies the ed25519 signature.
 *   3. Contract calls (see `lib/contracts.ts`) read the connected address from
 *      Freighter directly, so no provider bridge is needed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isConnected as freighterIsConnected,
  isAllowed as freighterIsAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signMessage,
} from "@stellar/freighter-api";
import { apiRequest, queryClient } from "./queryClient";
import { setAuthToken, getAuthToken } from "./auth-token";
import { NETWORK_PASSPHRASE, STELLAR_NETWORK, NETWORK_LABEL } from "./stellar";

const STORAGE_KEY = "krydo_wallet";

interface StoredWallet {
  address: string;
  role: string;
  label: string | null;
  onChainTxHash: string | null;
}

interface WalletContextType {
  address: string | null;
  role: string | null;
  label: string | null;
  onChainTxHash: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  /** True once we've detected the Freighter extension is installed. */
  hasWallet: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  role: null,
  label: null,
  onChainTxHash: null,
  isConnected: false,
  isConnecting: false,
  hasWallet: false,
  connect: async () => {},
  disconnect: () => {},
});

/** Normalise Freighter's signed-message payload to a base64 signature string. */
function signatureToBase64(sig: unknown): string {
  if (typeof sig === "string") return sig; // already base64
  if (sig instanceof Uint8Array) {
    let bin = "";
    sig.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }
  // Some Freighter versions return a Buffer-like { data: number[] }.
  const maybe = sig as { data?: number[] } | null;
  if (maybe?.data) {
    return btoa(String.fromCharCode(...maybe.data));
  }
  return String(sig);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [onChainTxHash, setOnChainTxHash] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);

  const addressRef = useRef<string | null>(null);
  const signInInFlightFor = useRef<string | null>(null);

  // Detect the Freighter extension once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await freighterIsConnected();
        if (!cancelled) setHasWallet(!!res.isConnected);
      } catch {
        if (!cancelled) setHasWallet(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate from localStorage. Only trust it if a valid JWT is still around.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const token = getAuthToken();
      if (!token) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const data = JSON.parse(stored) as StoredWallet;
      setAddress(data.address);
      setRole(data.role);
      setLabel(data.label);
      setOnChainTxHash(data.onChainTxHash || null);
      addressRef.current = data.address;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearLocalSession = useCallback(() => {
    setAddress(null);
    setRole(null);
    setLabel(null);
    setOnChainTxHash(null);
    addressRef.current = null;
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    queryClient.invalidateQueries({ queryKey: ["/api"] });
  }, []);

  const runSiwsFlow = useCallback(
    async (walletAddr: string) => {
      if (signInInFlightFor.current === walletAddr) return;
      signInInFlightFor.current = walletAddr;
      setIsConnecting(true);
      try {
        // Make sure Freighter is on the expected network before signing.
        const net = await getNetwork();
        if (!net.error && net.networkPassphrase !== NETWORK_PASSPHRASE) {
          throw new Error(
            `Please switch Freighter to ${NETWORK_LABEL} and try again.`,
          );
        }

        const nonceRes = await fetch(
          `/api/auth/nonce?address=${encodeURIComponent(walletAddr)}`,
        );
        if (!nonceRes.ok) throw new Error("Failed to fetch auth nonce");
        const { nonce } = (await nonceRes.json()) as { nonce: string };

        const message = [
          `${window.location.host} wants you to sign in with your Stellar account:`,
          walletAddr,
          ``,
          `Sign in to Krydo to prove ownership of this wallet.`,
          ``,
          `URI: ${window.location.origin}`,
          `Version: 1`,
          `Network: ${STELLAR_NETWORK}`,
          `Nonce: ${nonce}`,
          `Issued At: ${new Date().toISOString()}`,
        ].join("\n");

        const signed = await signMessage(message, {
          address: walletAddr,
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        if (signed.error) {
          throw new Error(String(signed.error));
        }
        const signature = signatureToBase64(signed.signedMessage);

        const verifyRes = await apiRequest("POST", "/api/auth/verify", {
          address: walletAddr,
          message,
          signature,
        });
        const { token, wallet } = (await verifyRes.json()) as {
          token: string;
          wallet: StoredWallet;
        };

        setAuthToken(token);
        setAddress(wallet.address);
        setRole(wallet.role);
        setLabel(wallet.label);
        setOnChainTxHash(wallet.onChainTxHash || null);
        addressRef.current = wallet.address;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
        queryClient.invalidateQueries({ queryKey: ["/api"] });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Wallet sign-in failed:", err);
        setAuthToken(null);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsConnecting(false);
        signInInFlightFor.current = null;
      }
    },
    [clearLocalSession],
  );

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request access; Freighter prompts the user to allow the site + returns
      // the selected public key.
      let addr = "";
      const allowed = await freighterIsAllowed();
      if (allowed.isAllowed) {
        const got = await getAddress();
        addr = got.address || "";
      }
      if (!addr) {
        const access = await requestAccess();
        if (access.error) throw new Error(String(access.error));
        addr = access.address || "";
      }
      if (!addr) throw new Error("No Stellar account selected in Freighter.");
      await runSiwsFlow(addr);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Wallet connect failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [runSiwsFlow]);

  const disconnect = useCallback(() => {
    // Freighter has no programmatic disconnect; we just drop our own session.
    clearLocalSession();
    queryClient.clear();
  }, [clearLocalSession]);

  return (
    <WalletContext.Provider
      value={{
        address,
        role,
        label,
        onChainTxHash,
        isConnected: !!address && !!role,
        isConnecting,
        hasWallet,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

export function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
