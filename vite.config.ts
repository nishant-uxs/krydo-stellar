import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // @stellar/stellar-sdk expects a Node-style `global`; map it to globalThis in
  // the browser build. `Buffer` is polyfilled at runtime in client/src/lib/polyfills.ts.
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
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
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
