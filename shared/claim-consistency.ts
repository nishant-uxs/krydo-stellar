/**
 * Cross-check a public claim summary against the private numeric claim value.
 *
 * Issuers often type summaries like "Credit Score Above 750" while entering
 * a private value of 742. That makes the public statement false relative to
 * the credential — block it at the UI + API boundary.
 */

export type SummaryBound =
  | { kind: "above"; threshold: number } // value must be > threshold
  | { kind: "at_least"; threshold: number } // value must be >= threshold
  | { kind: "below"; threshold: number } // value must be < threshold
  | { kind: "at_most"; threshold: number }; // value must be <= threshold

const ABOVE =
  /\b(?:above|over|greater\s+than|more\s+than|>\s*)\s*([0-9]+(?:\.[0-9]+)?)/i;
const AT_LEAST =
  /\b(?:at\s+least|minimum|min(?:imum)?|>=\s*|≥\s*)\s*([0-9]+(?:\.[0-9]+)?)/i;
const BELOW =
  /\b(?:below|under|less\s+than|lower\s+than|<\s*)\s*([0-9]+(?:\.[0-9]+)?)/i;
const AT_MOST =
  /\b(?:at\s+most|maximum|max(?:imum)?|<=\s*|≤\s*)\s*([0-9]+(?:\.[0-9]+)?)/i;

/** Extract the strongest / first bound mentioned in a free-text summary. */
export function parseSummaryBound(summary: string): SummaryBound | null {
  const s = summary.trim();
  if (!s) return null;

  // Prefer explicit inequalities; check "at least/most" before loose above/below
  // when both could match (rare).
  let m = s.match(AT_LEAST);
  if (m) return { kind: "at_least", threshold: Number(m[1]) };
  m = s.match(AT_MOST);
  if (m) return { kind: "at_most", threshold: Number(m[1]) };
  m = s.match(ABOVE);
  if (m) return { kind: "above", threshold: Number(m[1]) };
  m = s.match(BELOW);
  if (m) return { kind: "below", threshold: Number(m[1]) };
  return null;
}

export function claimValueSatisfiesBound(
  value: number,
  bound: SummaryBound,
): boolean {
  switch (bound.kind) {
    case "above":
      return value > bound.threshold;
    case "at_least":
      return value >= bound.threshold;
    case "below":
      return value < bound.threshold;
    case "at_most":
      return value <= bound.threshold;
  }
}

export function boundLabel(bound: SummaryBound): string {
  switch (bound.kind) {
    case "above":
      return `above ${bound.threshold}`;
    case "at_least":
      return `at least ${bound.threshold}`;
    case "below":
      return `below ${bound.threshold}`;
    case "at_most":
      return `at most ${bound.threshold}`;
  }
}

/**
 * If `summary` states a numeric bound and `claimValue` parses as a number,
 * ensure the value satisfies that bound. Returns an error message or null.
 */
export function validateClaimValueAgainstSummary(
  summary: string,
  claimValue: string,
): string | null {
  const bound = parseSummaryBound(summary);
  if (!bound) return null;

  const trimmed = String(claimValue ?? "").trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return `Summary says ${boundLabel(bound)}, so claim value must be a number.`;
  }
  if (!claimValueSatisfiesBound(n, bound)) {
    return `Claim value ${n} does not match the summary (“${boundLabel(bound)}”). Enter a value that satisfies it, or change the summary.`;
  }
  return null;
}

/** Claim-type numeric bounds used by the issuer forms (string `value` field). */
const TYPE_BOUNDS: Record<string, { min: number; max: number; label: string }> = {
  credit_score: { min: 300, max: 900, label: "Credit score" },
  debt_ratio: { min: 0, max: 1, label: "Debt ratio" },
};

export function validateNumericClaimValue(
  claimType: string,
  claimValue: string,
): string | null {
  const bounds = TYPE_BOUNDS[claimType];
  if (!bounds) return null;
  const trimmed = String(claimValue ?? "").trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return `${bounds.label} must be a number.`;
  }
  if (n < bounds.min || n > bounds.max) {
    return `${bounds.label} must be between ${bounds.min} and ${bounds.max}.`;
  }
  return null;
}

/** Combined issuer-side check used by UI + API. */
export function validateIssuerClaimInputs(opts: {
  claimType: string;
  claimSummary: string;
  claimValue: string;
}): string | null {
  return (
    validateNumericClaimValue(opts.claimType, opts.claimValue) ||
    validateClaimValueAgainstSummary(opts.claimSummary, opts.claimValue)
  );
}
