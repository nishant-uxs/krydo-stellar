import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertIssuerSchema, type Issuer } from "@shared/schema";
import { AUTHORITY_ID, DEPLOYMENT } from "@shared/contracts";
import {
  isBlockchainReady,
  isChainReadable,
  listIssuersFromChain,
} from "../blockchain";
import { requireAuth, requireRole } from "../auth/jwt";
import { sensitiveLimiter } from "../middleware/security";
import { readPageOpts, sendPage } from "../middleware/pagination";
import { childLogger } from "../logger";

const log = childLogger("routes/issuers");

export type IssuerWithChain = Issuer & { onChain: boolean };

/**
 * Merge KrydoAuthority whitelist (source of truth) with Firestore metadata
 * (description, category, stable id). Purges Eth leftover rows as a side effect.
 */
async function loadIssuersFromChain(): Promise<IssuerWithChain[]> {
  const onChain = await listIssuersFromChain();
  const root = DEPLOYMENT.deployer || "";

  // Drop legacy non-Stellar issuer docs once (e.g. old 0x… rows).
  try {
    const purged = await storage.deleteLegacyNonStellarIssuers();
    if (purged > 0) log.info({ purged }, "deleted legacy non-Stellar issuer rows");
  } catch (err: any) {
    log.warn({ err: err.message }, "legacy issuer purge failed");
  }

  const merged: IssuerWithChain[] = [];
  for (const row of onChain) {
    const approvedAt = row.approvedAt
      ? new Date(row.approvedAt * 1000)
      : new Date();
    const revokedAt =
      !row.active && row.revokedAt ? new Date(row.revokedAt * 1000) : null;

    const issuer = await storage.upsertIssuerFromChain({
      walletAddress: row.address,
      name: row.name,
      active: row.active,
      approvedAt,
      revokedAt,
      approvedBy: root,
    });
    merged.push({ ...issuer, onChain: true });
  }

  // Sort active first, then by approvedAt desc.
  merged.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return b.approvedAt.getTime() - a.approvedAt.getTime();
  });
  return merged;
}

/**
 * Issuer registry routes.
 *
 *  GET  /api/issuers                   — list (chain-backed when Authority is live)
 *  POST /api/issuers                   — root-only, add issuer (on-chain)
 *  POST /api/issuers/:id/revoke        — root-only, revoke issuer (on-chain)
 *  GET  /api/issuers/category/:cat     — filter by category
 */
export function registerIssuerRoutes(app: Express) {
  app.get("/api/issuers", async (req, res) => {
    try {
      const search =
        typeof req.query.search === "string" ? req.query.search.toLowerCase().trim() : "";
      const category = typeof req.query.category === "string" ? req.query.category : "";

      let items: IssuerWithChain[];

      if (AUTHORITY_ID && isChainReadable()) {
        try {
          items = await loadIssuersFromChain();
        } catch (err: any) {
          log.error({ err: err.message }, "chain issuer list failed; falling back to Firestore");
          const page = await storage.listIssuersPaged(readPageOpts(req));
          items = page.items.map((i) => ({ ...i, onChain: false }));
        }
      } else {
        const page = await storage.listIssuersPaged(readPageOpts(req));
        items = page.items.map((i) => ({ ...i, onChain: false }));
      }

      if (category) items = items.filter((i) => i.category === category);
      if (search) {
        items = items.filter(
          (i) =>
            i.name.toLowerCase().includes(search) ||
            (i.description ?? "").toLowerCase().includes(search) ||
            i.walletAddress.toLowerCase().includes(search),
        );
      }
      sendPage(res, { items, nextCursor: null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(
    "/api/issuers",
    requireAuth,
    requireRole("root"),
    sensitiveLimiter,
    async (req, res) => {
      try {
        const { onChainTxHash: clientTxHash, ...body } = req.body;
        // Force approvedBy to match the authenticated wallet.
        body.approvedBy = req.auth!.sub;
        const data = insertIssuerSchema.parse(body);

        const existing = await storage.getIssuerByAddress(data.walletAddress);
        if (existing && existing.active) {
          return res.status(400).json({
            message: "This wallet address is already registered as an active issuer",
          });
        }

        let onChainTxHash: string | null = clientTxHash || null;
        let onChainBlockNumber: string | null = null;
        if (AUTHORITY_ID && !onChainTxHash) {
          return res.status(400).json({
            message:
              "onChainTxHash required. Confirm in the app popup, then sign add_issuer with your Stellar wallet.",
          });
        }
        if (clientTxHash) {
          log.info({ txHash: clientTxHash }, "issuer added on-chain (wallet)");
          if (isBlockchainReady() || isChainReadable()) {
            try {
              const { waitForClientTx } = await import("../blockchain");
              const waited = await waitForClientTx(clientTxHash, { timeoutMs: 45_000 });
              if (waited.status === "confirmed") onChainBlockNumber = waited.blockNumber;
            } catch (err: any) {
              log.warn({ err: err.message }, "could not confirm issuer tx yet");
            }
          }
        }
        const result =
          existing && !existing.active
            ? await storage.reactivateIssuer(
                existing.id,
                data.name,
                data.description || "",
                data.approvedBy,
                onChainTxHash,
                data.category,
              )
            : await storage.createIssuer(data, onChainTxHash);

        if (onChainTxHash && onChainBlockNumber) {
          await storage.updateTransactionOnChain(result.tx.id, onChainTxHash, onChainBlockNumber);
        }

        res.json({
          ...result.issuer,
          onChain: !!onChainTxHash,
          txHash: onChainTxHash || result.tx.txHash,
          blockNumber: onChainBlockNumber || result.tx.blockNumber,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: error.message });
      }
    },
  );

  app.post(
    "/api/issuers/:id/revoke",
    requireAuth,
    requireRole("root"),
    sensitiveLimiter,
    async (req, res) => {
      try {
        const id = req.params.id as string;
        const { onChainTxHash: clientTxHash } = req.body;
        const revokedBy = req.auth!.sub;

        const issuer = await storage.getIssuer(id);
        if (!issuer) return res.status(404).json({ message: "Issuer not found" });
        if (!issuer.active) return res.status(400).json({ message: "Issuer is already revoked" });

        let onChainTxHash: string | null = clientTxHash || null;
        let onChainBlockNumber: string | null = null;
        if (AUTHORITY_ID && !onChainTxHash) {
          return res.status(400).json({
            message:
              "onChainTxHash required. Confirm in the app popup, then sign revoke_issuer with your Stellar wallet.",
          });
        }
        if (clientTxHash) {
          log.info({ txHash: clientTxHash }, "issuer revoked on-chain (wallet)");
          if (isBlockchainReady() || isChainReadable()) {
            try {
              const { waitForClientTx } = await import("../blockchain");
              const waited = await waitForClientTx(clientTxHash, { timeoutMs: 45_000 });
              if (waited.status === "confirmed") onChainBlockNumber = waited.blockNumber;
            } catch (err: any) {
              log.warn({ err: err.message }, "could not confirm revoke tx yet");
            }
          }
        }

        const result = await storage.revokeIssuer(id, revokedBy, onChainTxHash);
        if (onChainTxHash && onChainBlockNumber) {
          await storage.updateTransactionOnChain(result.tx.id, onChainTxHash, onChainBlockNumber);
        }
        res.json({
          ...result.issuer,
          onChain: !!onChainTxHash,
          txHash: onChainTxHash || result.tx.txHash,
          blockNumber: onChainBlockNumber || result.tx.blockNumber,
        });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    },
  );

  app.get("/api/issuers/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const list = await storage.getIssuersByCategory(category);
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
