import pino from "pino";

/**
 * Central structured logger. Pretty-prints in development, JSON in production
 * so log aggregators (Datadog / Grafana Loki / CloudWatch) can parse it.
 *
 * Never log secrets: redact common sensitive keys at the formatter level.
 * Uses NODE_ENV directly (not config) so importing this module is side-effect free
 * on Vercel cold starts.
 */
const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: { service: "krydo" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "privateKey",
      "secretKey",
      "*.privateKey",
      "*.password",
    ],
    censor: "[REDACTED]",
  },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:HH:MM:ss.l",
          ignore: "pid,hostname,service",
          singleLine: false,
        },
      },
});

/** Create a child logger bound to a specific module name. */
export function childLogger(component: string) {
  return logger.child({ component });
}
