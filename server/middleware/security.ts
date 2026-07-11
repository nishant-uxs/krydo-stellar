import type { Express, Request } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import { SOROBAN_RPC_URL, HORIZON_URL } from "@shared/contracts";

/** Client IP behind Vercel / other proxies — avoids express-rate-limit ValidationError. */
function clientKey(req: Request): string {
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) return realIp;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || "unknown";
}

/** Disable proxy header validations that throw on Vercel. */
const rateLimitValidate = {
  xForwardedForHeader: false,
  trustProxy: false,
} as const;

/**
 * Installs a defense-in-depth stack of HTTP security middleware.
 * Must be called BEFORE the body parser / route handlers.
 */
export function installSecurityMiddleware(app: Express) {
  // Vercel sits behind multiple hops — `true` is required for correct IPs there.
  app.set("trust proxy", process.env.VERCEL ? true : 1);

  // -- Helmet: sane HTTP security headers.
  // CSP is relaxed in dev so Vite HMR (inline scripts, ws://) works.
  app.use(
    helmet({
      contentSecurityPolicy: config.isProd
        ? {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "script-src": ["'self'"],
              "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
              "img-src": ["'self'", "data:", "blob:"],
              "connect-src": [
                "'self'",
                SOROBAN_RPC_URL,
                HORIZON_URL,
                "https://*.stellar.org",
                "https://horizon-testnet.stellar.org",
                "https://soroban-testnet.stellar.org",
              ],
              "frame-ancestors": ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false, // would break the wallet extension provider
    }),
  );

  // -- CORS
  const corsOrigins = config.corsOrigins;
  app.use(
    cors({
      origin: corsOrigins ?? true, // true = reflect request origin in dev
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );

  // -- Global rate limit: lenient baseline.
  // Sensitive routes (auth, on-chain mutations) can add a tighter limiter.
  const baseLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: clientKey,
    validate: rateLimitValidate,
    // Only rate-limit /api/*; static assets should not be throttled.
    skip: (req) => !req.path.startsWith("/api"),
    message: { message: "Too many requests, please slow down and retry shortly." },
  });
  app.use(baseLimiter);
}

/**
 * Tight limiter for auth + on-chain mutation routes.
 * 10 requests / minute per IP by default.
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: clientKey,
  validate: rateLimitValidate,
  message: { message: "Too many attempts, please wait a minute." },
});
