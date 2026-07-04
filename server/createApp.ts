import { config } from "./config";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { seedDatabase } from "./seed";
import { installSecurityMiddleware } from "./middleware/security";
import { logger } from "./logger";

export interface AppBundle {
  app: Express;
  httpServer: Server;
}

let initPromise: Promise<AppBundle> | null = null;

export interface CreateAppOptions {
  /** When true (default for `npm start`), serve the built Vite SPA. Disable on Vercel — static assets are served by the CDN. */
  serveStaticFiles?: boolean;
}

async function buildApp(options: CreateAppOptions): Promise<AppBundle> {
  const app = express();
  const httpServer = createServer(app);

  installSecurityMiddleware(app);

  app.use(
    express.json({
      limit: "256kb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "64kb" }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (!req.path.startsWith("/api")) return;
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      logger[level]({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
      }, `${req.method} ${req.path} → ${res.statusCode}`);
    });
    next();
  });

  await seedDatabase().catch((err) => {
    logger.error({ err: err.message ?? String(err) }, "seed error");
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({ err: err.message ?? String(err), status, stack: err.stack }, "internal server error");

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  const shouldServeStatic = options.serveStaticFiles ?? config.isProd;
  if (shouldServeStatic) {
    serveStatic(app);
  }

  return { app, httpServer };
}

/** Singleton factory — safe to call from both long-running server and serverless handlers. */
export async function createApp(options: CreateAppOptions = {}): Promise<AppBundle> {
  if (!initPromise) {
    initPromise = buildApp(options);
  }
  return initPromise;
}
