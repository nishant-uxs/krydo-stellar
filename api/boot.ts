import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Progressive boot probe — imports createApp and reports the failure point.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const steps: string[] = [];
  try {
    steps.push("start");
    const express = await import("express");
    steps.push("express-ok");
    const { createApp } = await import("../server/createApp");
    steps.push("createApp-import-ok");
    const bundle = await createApp({ serveStaticFiles: false });
    steps.push("createApp-ok");
    res.status(200).json({ ok: true, steps, routes: typeof bundle.app });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      steps,
      message: err?.message ?? String(err),
      stack: String(err?.stack ?? "").split("\n").slice(0, 8),
    });
  }
}
