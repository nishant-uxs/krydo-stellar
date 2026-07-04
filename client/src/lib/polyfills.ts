/**
 * Browser polyfills required by @stellar/stellar-sdk.
 *
 * Imported first (before any SDK code) in main.tsx so `Buffer`/`global` exist
 * by the time the SDK module graph is evaluated.
 */
import { Buffer } from "buffer";

const g = globalThis as unknown as { Buffer?: typeof Buffer; global?: unknown };
if (typeof g.Buffer === "undefined") g.Buffer = Buffer;
if (typeof g.global === "undefined") g.global = globalThis;
