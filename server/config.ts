import "dotenv/config";
import { z } from "zod";

/**
 * Central, validated configuration. Fails fast on startup if any required
 * secret is missing or malformed, so we never silently run in a half-broken
 * state.
 *
 * Loading is lazy so Vercel serverless can import the module graph without
 * crashing the isolate before the request handler can return a JSON error.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  // --- Firebase Admin ---
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),

  // --- Blockchain (Stellar / Soroban) ---
  SOROBAN_RPC_URL: z.string().url().optional(),
  DEPLOYER_SECRET: z
    .string()
    .regex(/^S[A-Z2-7]{55}$/, "DEPLOYER_SECRET must be a Stellar secret key (S...)")
    .optional(),

  // --- Auth / sessions ---
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").default(
    "krydo-dev-session-secret-change-in-prod-please-this-is-not-secure",
  ),
  JWT_SECRET: z.string().min(32).optional(),

  // --- CORS ---
  CORS_ORIGINS: z.string().optional(),

  // --- Rate limiting ---
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

function loadConfig() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const msg = `Invalid environment configuration:\n${issues}`;
    // eslint-disable-next-line no-console
    console.error(msg);
    if (process.env.VERCEL) throw new Error(msg);
    process.exit(1);
  }

  const env = parsed.data;

  if (!env.GOOGLE_APPLICATION_CREDENTIALS && !env.FIREBASE_SERVICE_ACCOUNT) {
    const msg =
      "Missing Firebase credentials: set GOOGLE_APPLICATION_CREDENTIALS (path) or FIREBASE_SERVICE_ACCOUNT (JSON)";
    // eslint-disable-next-line no-console
    console.error(msg);
    if (process.env.VERCEL) throw new Error(msg);
    process.exit(1);
  }

  const jwtSecret = env.JWT_SECRET ?? env.SESSION_SECRET;

  return {
    ...env,
    JWT_SECRET: jwtSecret,
    isProd: env.NODE_ENV === "production",
    isDev: env.NODE_ENV === "development",
    corsOrigins:
      env.CORS_ORIGINS && env.CORS_ORIGINS.trim().length > 0
        ? env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) cached = loadConfig();
  return cached;
}

/** Lazy proxy — importing this module does not validate env until first use. */
export const config: AppConfig = new Proxy({} as AppConfig, {
  get(_target, prop, receiver) {
    return Reflect.get(getConfig(), prop, receiver);
  },
});
