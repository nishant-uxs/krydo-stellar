import type { Express, Request, Response } from "express";
import { z } from "zod";
import { Keypair } from "@stellar/stellar-sdk";
import { storage } from "../storage";
import {
  getDeployment,
  isBlockchainReady,
  isIssuerOnChain,
  anchorRoleAssignmentOnChain,
} from "../blockchain";
import { stellarAddressSchema, type WalletRole } from "@shared/schema";
import { issueNonce, consumeNonce } from "./nonce-store";
import { signAuthToken } from "./jwt";
import { sensitiveLimiter } from "../middleware/security";
import { childLogger } from "../logger";

const log = childLogger("auth/siws");

/**
 * "Sign in with Stellar" — the Stellar analogue of EIP-4361 SIWE.
 *
 * The client fetches a server-issued nonce, builds a canonical human-readable
 * message embedding that nonce + its own address, and signs the raw message
 * bytes with its Stellar key (via Freighter). We verify the ed25519 signature
 * against the claimed public key, consume the single-use nonce, then issue a
 * short-lived JWT.
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

      // Verify the ed25519 signature over the raw UTF-8 message bytes.
      let verified = false;
      try {
        const kp = Keypair.fromPublicKey(address);
        verified = kp.verify(Buffer.from(message, "utf8"), Buffer.from(signature, "base64"));
      } catch {
        verified = false;
      }
      if (!verified) {
        return res.status(401).json({ message: "Signature verification failed" });
      }

      // Single-use nonce check: prevents replay and ensures the signed message
      // was created from a challenge we issued.
      if (!consumeNonce(nonce, address)) {
        return res.status(401).json({ message: "Invalid or expired nonce" });
      }

      // Detect role. Stellar addresses are case-sensitive, so we compare exact.
      const dep = getDeployment();
      const deployerAddr = dep?.deployer;
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

      // Role-assignment anchor on Stellar: fire-and-forget. The user's
      // signature has already been verified; the anchor is a provenance record,
      // not a correctness gate. Skip when the wallet already carries the same
      // role to avoid burning fees on repeat sign-ins.
      const roleChanged = !previous || previous.role !== role;
      const neverAnchored = !previous || !previous.onChainTxHash;
      const shouldAnchor = isBlockchainReady() && (roleChanged || neverAnchored);

      if (shouldAnchor) {
        void (async () => {
          try {
            const { txHash, blockNumber } = await anchorRoleAssignmentOnChain(
              address,
              role,
              label,
            );
            await storage.updateWalletOnChainTxHash(address, txHash);
            await storage.createTransaction({
              txHash,
              action: "role_assigned_onchain",
              fromAddress: address,
              data: { role, label, onChain: true },
              blockNumber,
            });
          } catch (err: any) {
            log.error({ err: err.message, address }, "role anchor failed");
          }
        })();
      }

      const token = signAuthToken({ sub: address, role });
      res.json({ token, wallet });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.issues[0].message });
      }
      res.status(401).json({ message: err.message || "Authentication failed" });
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
