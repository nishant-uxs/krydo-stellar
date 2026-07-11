import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Request, Response } from "express";
import type { Express } from "express";
import { createRequire } from "node:module";

/**
 * Pre-bundled by `npm run build` (esbuild → api/app.bundle.cjs).
 * Avoids Vercel NFT failing to package ../server/*.ts sources.
 */
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require("./app.bundle.cjs") as {
  createApp: (opts?: { serveStaticFiles?: boolean }) => Promise<{ app: Express }>;
};

let app: Express | null = null;
let initError: string | null = null;

function restoreOriginalUrl(req: VercelRequest): void {
  const headers = req.headers ?? {};
  const candidates = [
    headers["x-forwarded-uri"],
    headers["x-invoke-path"],
    headers["x-matched-path"],
  ];
  for (const raw of candidates) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.startsWith("/") && value !== "/api") {
      const q = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      req.url = value.includes("?") ? value : `${value}${q}`;
      return;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    restoreOriginalUrl(req);

    if (initError) {
      res.status(500).json({ message: `Server init failed: ${initError}` });
      return;
    }

    if (!app) {
      try {
        const bundle = await createApp({ serveStaticFiles: false });
        app = bundle.app;
      } catch (err: any) {
        initError = err?.message ?? String(err);
        console.error("[api] createApp failed:", initError);
        res.status(500).json({ message: `Server init failed: ${initError}` });
        return;
      }
    }

    return app(req as unknown as Request, res as unknown as Response);
  } catch (err: any) {
    console.error("[api] handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: err?.message ?? "Internal Server Error" });
    }
  }
}
