import type { Express } from "express";
import { getDeployment, isBlockchainReady } from "../blockchain";
import { DEPLOYMENT, EXPLORER_URL } from "@shared/contracts";

/**
 * Network info + disabled legacy wallet-connect endpoint.
 */
export function registerNetworkRoutes(app: Express) {
  app.get("/api/network", async (_req, res) => {
    const deployment = getDeployment() ?? (DEPLOYMENT.deployer ? DEPLOYMENT : null);
    res.json({
      blockchain: isBlockchainReady(),
      network: deployment?.network || null,
      explorerUrl: EXPLORER_URL,
      contracts: deployment
        ? {
            authority: deployment.contracts.KrydoAuthority.contractId,
            credentials: deployment.contracts.KrydoCredentials.contractId,
            audit: deployment.contracts.KrydoAudit?.contractId ?? null,
          }
        : null,
      deployer: deployment?.deployer || null,
    });
  });

  // Legacy /api/wallet/connect is intentionally disabled: connecting now
  // requires a Sign-in-with-Stellar message (GET /api/auth/nonce +
  // POST /api/auth/verify).
  app.post("/api/wallet/connect", (_req, res) => {
    res.status(410).json({
      message:
        "Endpoint removed. Use the Sign-in-with-Stellar flow: GET /api/auth/nonce then POST /api/auth/verify with a signed message.",
    });
  });
}
