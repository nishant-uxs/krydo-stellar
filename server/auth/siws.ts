import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  getDeployment,
  isBlockchainReady,
  isIssuerOnChain,
} from "../blockchain";
import { stellarAddressSchema, type WalletRole } from "@shared/schema";
import { DEPLOYMENT, AUDIT_ID } from "@shared/contracts";
import { verifySep53Message } from "@shared/sep53";
import { issueNonce, consumeNonce } from "./nonce-store";
import { signAuthToken, requireAuth } from "./jwt";
import { sensitiveLimiter } from "../middleware/security";
import { childLogger } from "../logger";

const log = childLogger("auth/siws");

/**
 * Sign-in-with-Stellar (SIWS).
 *
 * The client fetches a server-issued nonce, builds a canonical human-readable
 * message embedding that nonce + its own address, and has Freighter sign it
 * per SEP-53. We verify with `verifySep53Message` (NOT raw Keypair.verify on
 * UTF-8 bytes — Freighter signs SHA-256("Stellar Signed Message:\\n" + msg)).
 */
const verifySchema = z.object({
  address: stellarAddressSchema,
  message: z.string().min(20).max(4_000),
  // base64-encoded 64-byte ed25519 signature.
  signature: z.string().min(16).max(1_024),
});

export function registerAuthRoutes(app: Express) {
  /** GET /api/auth/nonce?address=G... — returns a server-issued nonce to sign. */
  app.get("/api/auth/nonce", sensitiveLimiter, async (req: Request, res: Response) => {
    try {
      const address = stellarAddressSchema.parse(req.query.address);
      const { nonce, expiresAt } = issueNonce(address);
      res.json({ nonce, expiresAt });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.issues[0].message });
      }
      res.status(500).json({ message: err.message });
    }
  });

  /** POST /api/auth/verify — verifies the signed message, issues a JWT. */
  app.post("/api/auth/verify", sensitiveLimiter, async (req: Request, res: Response) => {
    try {
      const { address, message, signature } = verifySchema.parse(req.body);

      // The signed message must reference the claimed address (binds the
      // signature to this identity) and carry the nonce we issued.
      if (!message.includes(address)) {
        return res.status(401).json({ message: "Message does not match address" });
      }
      const nonceMatch = message.match(/Nonce:\s*([a-fA-F0-9]{8,})/);
      if (!nonceMatch) {
        return res.status(401).json({ message: "Message is missing a nonce" });
      }
      const nonce = nonceMatch[1];

      // Freighter signs per SEP-53 — verify the prefixed SHA-256 payload.
      if (!verifySep53Message(address, message, signature)) {
        return res.status(401).json({ message: "Signature verification failed" });
      }

      // Single-use nonce check: prevents replay and ensures the signed message
      // was created from a challenge we issued.
      if (!consumeNonce(nonce, address)) {
        return res.status(401).json({ message: "Invalid or expired nonce" });
      }

      // Detect role. Stellar addresses are case-sensitive, so we compare exact.
      // Prefer live deployment handle; fall back to baked-in deployment.json so
      // root still resolves when the server runs without DEPLOYER_SECRET.
      const deployerAddr = getDeployment()?.deployer || DEPLOYMENT.deployer || "";
      let role: WalletRole = "user";
      let label = "User";

      if (deployerAddr && address === deployerAddr) {
        role = "root";
        label = "Root Authority";
      } else {
        const issuer = await storage.getIssuerByAddress(address);
        if (issuer && issuer.active) {
          role = "issuer";
          label = issuer.name;
        } else if (isBlockchainReady()) {
          try {
            if (await isIssuerOnChain(address)) {
              role = "issuer";
              label = "Trusted Issuer";
            }
          } catch {
            /* fall through to user */
          }
        }
      }

      // Snapshot the previous state BEFORE connectWallet mutates it so we can
      // tell whether this is a first-time connect, a role change, or a repeat
      // sign-in with the same role.
      const previous = await storage.getWallet(address);
      const wallet = await storage.connectWallet(address, role, label);

      // Client must wallet-sign the role audit anchor (popup → Freighter/etc).
      // Server never signs this with DEPLOYER_SECRET.
      const roleChanged = !previous || previous.role !== role;
      const neverAnchored = !previous || !previous.onChainTxHash;
      const needsRoleAnchor = !!(AUDIT_ID && (roleChanged || neverAnchored));

      const token = signAuthToken({ sub: address, role });
      res.json({ token, wallet, needsRoleAnchor });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.issues[0].message });
      }
      res.status(401).json({ message: err.message || "Authentication failed" });
    }
  });

  /** POST /api/auth/role-anchor — record a wallet-signed role audit tx. */
  app.post("/api/auth/role-anchor", requireAuth, sensitiveLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.auth) return res.status(401).json({ message: "Not authenticated" });
      const schema = z.object({
        txHash: z.string().regex(/^[0-9a-f]{64}$/i, "Invalid Stellar tx hash"),
      });
      const { txHash } = schema.parse(req.body);
      const address = req.auth.sub;

      const { waitForClientTx } = await import("../blockchain");
      const result = await waitForClientTx(txHash, { timeoutMs: 45_000 });
      if (result.status === "unknown") {
        return res.status(422).json({
          message: "Role-anchor tx not found on Stellar. Retry signing on Testnet.",
        });
      }
      if (result.status === "reverted") {
        return res.status(422).json({ message: "Role-anchor tx reverted on-chain." });
      }
      if (result.status !== "confirmed") {
        return res.status(422).json({ message: "Role-anchor tx still pending on Stellar. Retry shortly." });
      }

      await storage.updateWalletOnChainTxHash(address, txHash);
      await storage.createTransaction({
        txHash,
        action: "role_assigned_onchain",
        fromAddress: address,
        data: { role: req.auth.role, onChain: true, walletSigned: true },
        blockNumber: result.blockNumber,
      });

      const wallet = await storage.getWallet(address);
      res.json({ success: true, wallet, txHash });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.issues[0].message });
      }
      log.error({ err: err.message }, "role-anchor failed");
      res.status(500).json({ message: err.message });
    }
  });

  /** GET /api/auth/me — returns the current session wallet if JWT is valid. */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });
    const wallet = await storage.getWallet(req.auth.sub);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });
    res.json({ wallet });
  });
}
