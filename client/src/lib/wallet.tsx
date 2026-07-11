/**
 * Krydo WalletProvider — multi-wallet Stellar (SIWS).
 *
 * Same `useWallet()` shape the app already uses. Internally:
 *   1. Connect opens Stellar Wallets Kit auth modal (Freighter, xBull, Lobstr, …).
 *   2. Sign-in is SIWS: server nonce → canonical message → kit.signMessage (SEP-53
 *      for Freighter-class wallets) → JWT.
 *   3. Contract calls go through the same kit (`lib/contracts.ts`).
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
import { apiRequest, queryClient } from "./queryClient";
import { setAuthToken, getAuthToken } from "./auth-token";
import { STELLAR_NETWORK, NETWORK_LABEL } from "./stellar";
import {
  ensureWalletKit,
  rememberWalletId,
  expectedPassphrase,
  KitEventType,
} from "./wallet-kit";
import { useToast } from "@/hooks/use-toast";

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
  /** True once at least one wallet module reports available (or after first modal). */
  hasWallet: boolean;
  /** Active kit module id, e.g. "freighter". */
  walletId: string | null;
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
  hasWallet: true,
  walletId: null,
  connect: async () => {},
  disconnect: () => {},
});

/** Normalise kit signed-message payload to a base64 signature string. */
function signatureToBase64(sig: unknown): string {
  if (typeof sig === "string") return sig;
  if (sig instanceof Uint8Array) {
    let bin = "";
    sig.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }
  const maybe = sig as { data?: number[] } | null;
  if (maybe?.data) {
    return btoa(String.fromCharCode(...maybe.data));
  }
  return String(sig);
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [onChainTxHash, setOnChainTxHash] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(true);
  const [walletId, setWalletId] = useState<string | null>(null);

  const addressRef = useRef<string | null>(null);
  const signInInFlightFor = useRef<string | null>(null);

  // Bootstrap kit + detect available wallets once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kit = ensureWalletKit();
        const wallets = await kit.refreshSupportedWallets();
        if (!cancelled) {
          setHasWallet(wallets.some((w) => w.isAvailable) || wallets.length > 0);
        }
      } catch {
        if (!cancelled) setHasWallet(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate from localStorage when a JWT is still present.
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
      ensureWalletKit();
      const id = localStorage.getItem("krydo_wallet_id");
      if (id) setWalletId(id);
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
    setWalletId(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    rememberWalletId(null);
    queryClient.invalidateQueries({ queryKey: ["/api"] });
  }, []);

  // If the kit disconnects (profile modal / wallet), clear Krydo session.
  useEffect(() => {
    const kit = ensureWalletKit();
    const unsub = kit.on(KitEventType.DISCONNECT, () => {
      clearLocalSession();
    });
    const unsubWallet = kit.on(KitEventType.WALLET_SELECTED, (ev) => {
      const id = (ev as { payload?: { id?: string } }).payload?.id;
      if (id) {
        rememberWalletId(id);
        setWalletId(id);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
      if (typeof unsubWallet === "function") unsubWallet();
    };
  }, [clearLocalSession]);

  const runSiwsFlow = useCallback(
    async (walletAddr: string) => {
      if (signInInFlightFor.current === walletAddr) return;
      signInInFlightFor.current = walletAddr;
      setIsConnecting(true);
      const kit = ensureWalletKit();
      try {
        // Prefer wallet-reported network when the module supports getNetwork.
        try {
          const net = await kit.getNetwork();
          if (net.networkPassphrase && net.networkPassphrase !== expectedPassphrase()) {
            throw new Error(
              `Please switch your wallet to ${NETWORK_LABEL} and try again.`,
            );
          }
        } catch (e) {
          // Some modules don't implement getNetwork — only rethrow our switch hint.
          const msg = errMessage(e);
          if (msg.includes("switch your wallet")) throw e;
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

        const signed = await kit.signMessage(message, {
          address: walletAddr,
          networkPassphrase: expectedPassphrase(),
        });
        if (!signed.signedMessage) {
          throw new Error("Wallet returned an empty signature");
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
        const msg = errMessage(err);
        // eslint-disable-next-line no-console
        console.error("Wallet sign-in failed:", err);
        setAuthToken(null);
        localStorage.removeItem(STORAGE_KEY);
        toast({
          title: "Sign-in failed",
          description: msg,
          variant: "destructive",
        });
        throw err;
      } finally {
        setIsConnecting(false);
        signInInFlightFor.current = null;
      }
    },
    [toast],
  );

  const connect = useCallback(async () => {
    setIsConnecting(true);
    const kit = ensureWalletKit();
    try {
      const { address: addr } = await kit.authModal();
      if (!addr) {
        throw new Error("No Stellar account selected. Pick a wallet and try again.");
      }
      await runSiwsFlow(addr);
    } catch (err) {
      const msg = errMessage(err);
      // User closed the modal — not an error toast.
      if (msg.toLowerCase().includes("closed the modal")) {
        return;
      }
      // eslint-disable-next-line no-console
      console.error("Wallet connect failed:", err);
      if (!msg.startsWith("Sign-in failed")) {
        toast({
          title: "Connect failed",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [runSiwsFlow, toast]);

  const disconnect = useCallback(() => {
    try {
      ensureWalletKit().disconnect();
    } catch {
      /* ignore */
    }
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
        walletId,
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
