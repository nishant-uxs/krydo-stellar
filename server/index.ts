import { config } from "./config";
import { createApp } from "./createApp";
import { logger } from "./logger";

/** Back-compat shim for server/vite.ts */
export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

(async () => {
  const { app, httpServer } = await createApp({ serveStaticFiles: config.isProd });

  if (!config.isProd) {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = config.PORT;
  const listenOpts: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform !== "win32") {
    listenOpts.reusePort = true;
  }
  httpServer.listen(listenOpts, () => {
    log(`serving on port ${port}`);
  });
})();
