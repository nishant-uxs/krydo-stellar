import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express, Request, Response } from "express";

let app: Express | null = null;
let initError: string | null = null;

/**
 * Vercel rewrites `/api/*` and `/healthz` onto this function. Restore the
 * browser path so Express route matching (`/api/auth/nonce`, `/healthz`, …)
 * still works.
 */
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

/**
 * Vercel serverless entrypoint. Serves API routes, auth, health probes.
 * Static SPA assets are served by Vercel CDN from dist/public (see vercel.json).
 *
 * createApp is lazy-imported so config/Firebase failures become JSON 500s
 * instead of opaque FUNCTION_INVOCATION_FAILED.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    restoreOriginalUrl(req);

    if (initError) {
      res.status(500).json({ message: `Server init failed: ${initError}` });
      return;
    }

    if (!app) {
      try {
        const { createApp } = await import("../server/createApp");
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
