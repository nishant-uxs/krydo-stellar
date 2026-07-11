import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const viteLogger = createLogger();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export async function setupVite(server: Server, app: Express) {
  const vite = await createViteServer({
    configFile: false,
    root: path.resolve(root, "client"),
    plugins: [react()],
    define: {
      global: "globalThis",
    },
    resolve: {
      alias: {
        "@": path.resolve(root, "client", "src"),
        "@shared": path.resolve(root, "shared"),
        buffer: "buffer",
      },
    },
    optimizeDeps: {
      include: [
        "@creit.tech/stellar-wallets-kit",
        "@creit.tech/stellar-wallets-kit/modules/utils",
        "buffer",
      ],
      esbuildOptions: {
        define: { global: "globalThis" },
      },
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't hard-exit the whole process on a single HMR error on Windows.
        console.error("[vite]", msg);
      },
    },
    server: {
      middlewareMode: true,
      // Avoid attaching HMR to the same HTTP server — that combo has been
      // crashing Node with STATUS_HEAP_CORRUPTION on Windows in this repo.
      hmr: false,
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(root, "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
