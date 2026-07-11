import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const steps: string[] = [];
  try {
    steps.push("start");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createApp } = require("./app.bundle.cjs");
    steps.push("bundle-ok");
    await createApp({ serveStaticFiles: false });
    steps.push("createApp-ok");
    res.status(200).json({ ok: true, steps });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      steps,
      message: err?.message ?? String(err),
      stack: String(err?.stack ?? "").split("\n").slice(0, 8),
    });
  }
}
