import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Minimal probe — no Express / Firebase / config imports. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    vercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV ?? null,
    hasFirebaseJson: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    hasJwt: !!process.env.JWT_SECRET,
    hasSession: !!process.env.SESSION_SECRET,
    hasDeployer: !!process.env.DEPLOYER_SECRET,
    hasCors: !!process.env.CORS_ORIGINS,
  });
}
