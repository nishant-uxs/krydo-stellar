import { z } from "zod";

// ---------- shared primitive validators ----------

/**
 * Stellar account address in StrKey form: `G` + 55 base32 chars (ed25519
 * public key). Case-sensitive — StrKey is canonical upper-case base32, so we
 * never lower-case it (unlike EVM addresses).
 */
export const stellarAddressSchema = z
  .string()
  .trim()
  .regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar address (expected G...)");

/** Soroban contract id in StrKey form: `C` + 55 base32 chars. */
export const stellarContractIdSchema = z
  .string()
  .trim()
  .regex(/^C[A-Z2-7]{55}$/, "Invalid Stellar contract id (expected C...)");

/**
 * 32-byte hex hash (credential hash / commitment). Bare hex, no `0x` prefix,
 * to match Stellar's hex conventions; an optional `0x` is tolerated on input.
 */
export const hash32HexSchema = z
  .string()
  .trim()
  .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid 32-byte hex hash");

/** Stellar transaction hash: 64 lowercase hex chars (SHA-256 of the tx). */
export const stellarTxHashSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/i, "Invalid Stellar transaction hash");

/** Generic short free-text field. */
const shortText = (max: number) => z.string().trim().min(1).max(max);

// --- Wallet ---
export interface Wallet {
  address: string;
  role: string;
  label: string | null;
  onChainTxHash: string | null;
  createdAt: Date;
}

export const walletRoles = ["root", "issuer", "user"] as const;
export type WalletRole = typeof walletRoles[number];

export const insertWalletSchema = z.object({
  address: stellarAddressSchema,
  role: z.enum(walletRoles).default("user"),
  label: z.string().trim().max(128).nullable().optional(),
});
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export const issuerCategories = [
  "credit_bureau",
  "income_verifier",
  "identity_provider",
  "asset_auditor",
  "employment_verifier",
  "tax_authority",
  "insurance_provider",
  "general",
] as const;

export type IssuerCategory = typeof issuerCategories[number];

export const issuerCategoryLabels: Record<IssuerCategory, string> = {
  credit_bureau: "Credit Bureau (CIBIL/Experian)",
  income_verifier: "Income Verifier",
  identity_provider: "Identity Provider (KYC)",
  asset_auditor: "Asset Auditor",
  employment_verifier: "Employment Verifier",
  tax_authority: "Tax Authority",
  insurance_provider: "Insurance Provider",
  general: "General",
};

// --- Issuer ---
export interface Issuer {
  id: string;
  walletAddress: string;
  name: string;
  description: string | null;
  category: string;
  active: boolean;
  approvedBy: string;
  approvedAt: Date;
  revokedAt: Date | null;
}

export const insertIssuerSchema = z.object({
  walletAddress: stellarAddressSchema,
  name: shortText(120),
  description: z.string().trim().max(500).nullable().optional(),
  category: z.enum(issuerCategories).default("general"),
  approvedBy: stellarAddressSchema,
});
export type InsertIssuer = z.infer<typeof insertIssuerSchema>;

// --- Credential ---
export interface Credential {
  id: string;
  credentialHash: string;
  issuerAddress: string;
  holderAddress: string;
  claimType: string;
  claimSummary: string;
  claimData: unknown;
  status: string;
  issuedAt: Date;
  revokedAt: Date | null;
  expiresAt: Date | null;
}

/** Bounded JSON blob: max 32 KB serialized, max depth 6, max 64 keys per object. */
const boundedJson = z.unknown().superRefine((val, ctx) => {
  try {
    const s = JSON.stringify(val);
    if (s && s.length > 32_768) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payload exceeds 32 KB limit" });
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Not serializable as JSON" });
  }
});

export const insertCredentialSchema = z.object({
  issuerAddress: stellarAddressSchema,
  holderAddress: stellarAddressSchema,
  claimType: z.string().trim().min(1).max(64),
  claimSummary: shortText(500),
  claimData: boundedJson,
  expiresAt: z.date().nullable().optional(),
});
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

// --- Transaction ---
export interface Transaction {
  id: string;
  txHash: string;
  action: string;
  fromAddress: string;
  toAddress: string | null;
  data: unknown;
  blockNumber: string;
  timestamp: Date;
}

export const insertTransactionSchema = z.object({
  txHash: stellarTxHashSchema,
  action: z.string().trim().min(1).max(64),
  fromAddress: stellarAddressSchema,
  toAddress: stellarAddressSchema.nullable().optional(),
  data: boundedJson.optional(),
  /** Soroban ledger sequence (kept as string for API stability). */
  blockNumber: z.string().trim().max(32),
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

/**
 * Deterministic sentinel used as `txHash` on Transaction rows that were
 * created purely off-chain (e.g. ZK proof generation). All-zeros passes
 * the 64-hex shape check in `insertTransactionSchema` but is trivially
 * distinguishable from a real Stellar tx hash on the client, so the UI can
 * suppress explorer links for these rows.
 */
export const OFF_CHAIN_TX_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * True when a transaction row represents a server-only / off-chain event
 * and MUST NOT be linked to the block explorer. Prefers the explicit
 * `data.onChain === false` flag (set by the producer), and falls back to
 * the all-zeros sentinel for legacy rows.
 */
export function isOffChainTx(tx: { txHash: string; data?: unknown }): boolean {
  const d = tx.data as { onChain?: boolean } | null | undefined;
  if (d && d.onChain === false) return true;
  return /^0+$/.test(tx.txHash);
}

export const requestStatuses = ["pending", "approved", "rejected", "issued"] as const;
export type RequestStatus = typeof requestStatuses[number];

// --- CredentialRequest ---
export interface CredentialRequest {
  id: string;
  requesterAddress: string;
  issuerAddress: string | null;
  issuerCategory: string | null;
  claimType: string;
  message: string | null;
  status: string;
  responseMessage: string | null;
  credentialId: string | null;
  onChainTxHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const insertCredentialRequestSchema = z.object({
  requesterAddress: stellarAddressSchema,
  issuerAddress: stellarAddressSchema.nullable().optional(),
  issuerCategory: z.enum(issuerCategories).nullable().optional(),
  claimType: z.string().trim().min(1).max(64),
  message: z.string().trim().max(1000).nullable().optional(),
});
export type InsertCredentialRequest = z.infer<typeof insertCredentialRequestSchema>;

// --- ZkProof ---
export interface ZkProof {
  id: string;
  credentialId: string;
  proverAddress: string;
  proofType: string;
  publicInputs: unknown;
  proofData: unknown;
  commitment: string;
  verified: boolean;
  onChainTxHash: string | null;
  onChainStatus: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export const insertZkProofSchema = z.object({
  credentialId: z.string().uuid(),
  proverAddress: stellarAddressSchema,
  proofType: z.string().trim().min(1).max(32),
  publicInputs: boundedJson,
  proofData: boundedJson,
  commitment: z.string().trim().min(4).max(256),
  expiresAt: z.date().nullable().optional(),
});
export type InsertZkProof = z.infer<typeof insertZkProofSchema>;

export const proofTypes = [
  "range_above",
  "range_below",
  "equality",
  "membership",
  "non_zero",
  "selective_disclosure",
] as const;

export type ProofType = typeof proofTypes[number];

export const proofTypeLabels: Record<ProofType, string> = {
  range_above: "Value Above Threshold",
  range_below: "Value Below Threshold",
  equality: "Exact Match",
  membership: "Set Membership",
  non_zero: "Non-Zero Proof",
  selective_disclosure: "Selective Disclosure",
};

export const claimTypes = [
  "credit_score",
  "income_verification",
  "asset_proof",
  "debt_ratio",
  "payment_history",
  "identity_verification",
] as const;

export type ClaimType = typeof claimTypes[number];

export const claimTypeLabels: Record<ClaimType, string> = {
  credit_score: "Credit Score Range",
  income_verification: "Income Verification",
  asset_proof: "Asset Proof",
  debt_ratio: "Debt-to-Income Ratio",
  payment_history: "Payment History",
  identity_verification: "Identity Verification",
};

export const categoryClaimTypes: Record<IssuerCategory, ClaimType[]> = {
  credit_bureau: ["credit_score", "debt_ratio", "payment_history"],
  income_verifier: ["income_verification"],
  identity_provider: ["identity_verification"],
  asset_auditor: ["asset_proof"],
  employment_verifier: ["income_verification", "identity_verification"],
  tax_authority: ["income_verification", "debt_ratio", "asset_proof"],
  insurance_provider: ["asset_proof", "identity_verification"],
  general: ["credit_score", "income_verification", "asset_proof", "debt_ratio", "payment_history", "identity_verification"],
};
