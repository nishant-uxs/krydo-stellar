import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";
import { createApp } from "../server/createApp";

let app: Express | null = null;

/**
 * Vercel serverless entrypoint. Serves API routes, auth, health probes.
 * Static SPA assets are served by Vercel CDN from dist/public (see vercel.json).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    const bundle = await createApp({ serveStaticFiles: false });
    app = bundle.app;
  }
  return app(req, res);
}
