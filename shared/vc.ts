/**
 * Krydo → W3C Verifiable Credentials Data Model v2 mapper.
 *
 * Why this module exists:
 *   Our internal `Credential` shape is optimized for on-chain anchoring +
 *   Firestore storage, not for interop. If we want issuers and verifiers
 *   outside Krydo to consume our credentials, they need to see them in the
 *   format the DID/VC ecosystem expects (Veramo, Ceramic, Walt.id,
 *   Consensys mesh, microsoft entra, etc. all speak W3C VC).
 *
 *   Spec: https://www.w3.org/TR/vc-data-model-2.0/
 *
 *   This is a *view* layer. Internal storage stays unchanged; we just
 *   render credentials in the W3C shape on the wire when asked.
 *
 * What we map:
 *   - `id` → `id` (urn:uuid:…)
 *   - `issuerAddress` → `issuer.id` (`did:pkh:stellar:...`)
 *   - `holderAddress` → `credentialSubject.id` (did:pkh:stellar)
 *   - `claimType` → contributes to `type` array + is the key inside subject
 *   - `claimData` → placed at `credentialSubject[claimType]`
 *   - `issuedAt` → `validFrom`
 *   - `expiresAt` → `validUntil`
 *   - `status` + revocation metadata → `credentialStatus`
 *   - `credentialHash` → `proof.proofValue` + `proof.anchor`
 *
 * We use a "Krydo-native" proof type (`KrydoOnChainAnchor2025`) rather than
 * a full cryptographic VC proof suite (like DataIntegrityProof). A
 * verifier consumes the on-chain anchor to confirm issuance; this is
 * strictly stronger than a JSON-LD signature for our use case because the
 * anchor is stored on Stellar. The anchor hash IS the credential hash.
 *
 * Callers that need a standard cryptographic VC proof can run the
 * returned VC through their own signing pipeline.
 */

import { STELLAR_NETWORK } from "./contracts";

export interface KrydoCredentialLike {
  id: string;
  credentialHash: string;
  issuerAddress: string;
  holderAddress: string;
  claimType: string;
  claimSummary: string;
  claimData: unknown;
  status: string;
  issuedAt: Date | string;
  revokedAt: Date | string | null;
  expiresAt: Date | string | null;
}

export interface VerifiableCredentialV2 {
  "@context": string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
  };
  validFrom: string;
  validUntil?: string;
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  credentialStatus: {
    id: string;
    type: string;
    statusPurpose: "revocation" | "suspension";
    status: "active" | "revoked" | "expired" | "suspended";
  };
  credentialSchema?: {
    id: string;
    type: string;
  };
  proof: {
    type: "KrydoOnChainAnchor2025";
    created: string;
    verificationMethod: string;
    proofPurpose: "assertionMethod";
    anchor: {
      /** CAIP-2 chain id, e.g. `stellar:testnet` / `stellar:pubnet`. */
      chain: string;
      authority: string;
      credentialHash: string;
    };
    proofValue: string;
  };
}

const KRYDO_CONTEXT = "https://krydo.dev/credentials/v1";
const W3C_VC_V2 = "https://www.w3.org/ns/credentials/v2";

/** Map a Krydo network name to the CAIP-2 Stellar chain reference. */
function caip2ChainRef(network: string): string {
  if (network === "mainnet" || network === "public" || network === "pubnet") {
    return "pubnet";
  }
  if (network === "futurenet") return "futurenet";
  return "testnet";
}

const CHAIN_REF = caip2ChainRef(STELLAR_NETWORK);
/** CAIP-2 chain id for the active network. */
const CAIP2_CHAIN = `stellar:${CHAIN_REF}`;

function toIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function didFromAddress(addr: string): string {
  // did:pkh over CAIP-10 for Stellar. StrKey addresses are case-sensitive, so
  // we never normalise case.
  return `did:pkh:stellar:${CHAIN_REF}:${addr}`;
}

function pascalCase(s: string): string {
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function resolveStatus(
  cred: KrydoCredentialLike,
  now: Date = new Date(),
): "active" | "revoked" | "expired" | "suspended" {
  if (cred.status === "revoked" || cred.revokedAt) return "revoked";
  if (cred.status === "suspended") return "suspended";
  if (cred.expiresAt) {
    const exp = cred.expiresAt instanceof Date ? cred.expiresAt : new Date(cred.expiresAt);
    if (exp.getTime() <= now.getTime()) return "expired";
  }
  return "active";
}

export interface ToVcOptions {
  /**
   * Base URL where the status can be independently re-checked. Defaults to
   * the Krydo public API path; callers can override for tenanted deploys.
   */
  statusBaseUrl?: string;
  /**
   * Issuer display name (optional; we have this in the Issuer record but
   * the Credential record itself doesn't carry it).
   */
  issuerName?: string;
  /**
   * Current time. Injectable for deterministic tests.
   */
  now?: Date;
}

/**
 * Render a Krydo credential as a W3C Verifiable Credential (Data Model v2).
 * Pure and synchronous — does not hit the database.
 */
export function credentialToVC(
  cred: KrydoCredentialLike,
  opts: ToVcOptions = {},
): VerifiableCredentialV2 {
  const statusBase = opts.statusBaseUrl ?? "/api/credentials";
  const now = opts.now ?? new Date();
  const issuerDid = didFromAddress(cred.issuerAddress);
  const subjectDid = didFromAddress(cred.holderAddress);
  const typeTag = `Krydo${pascalCase(cred.claimType)}Credential`;

  const subject: VerifiableCredentialV2["credentialSubject"] = {
    id: subjectDid,
    [cred.claimType]: cred.claimData,
  };
  if (cred.claimSummary) {
    subject.summary = cred.claimSummary;
  }

  const vc: VerifiableCredentialV2 = {
    "@context": [W3C_VC_V2, KRYDO_CONTEXT],
    id: `urn:uuid:${cred.id}`,
    type: ["VerifiableCredential", typeTag],
    issuer: {
      id: issuerDid,
      ...(opts.issuerName ? { name: opts.issuerName } : {}),
    },
    validFrom: toIso(cred.issuedAt),
    ...(cred.expiresAt ? { validUntil: toIso(cred.expiresAt) } : {}),
    credentialSubject: subject,
    credentialStatus: {
      id: `${statusBase}/${cred.id}/status`,
      type: "KrydoOnChainRevocationList2025",
      statusPurpose: "revocation",
      status: resolveStatus(cred, now),
    },
    credentialSchema: {
      id: `${KRYDO_CONTEXT}#${cred.claimType}`,
      type: "JsonSchema",
    },
    proof: {
      type: "KrydoOnChainAnchor2025",
      created: toIso(cred.issuedAt),
      verificationMethod: `${issuerDid}#controller`,
      proofPurpose: "assertionMethod",
      anchor: {
        chain: CAIP2_CHAIN, // CAIP-2 for the active Stellar network
        authority: cred.issuerAddress,
        credentialHash: cred.credentialHash,
      },
      proofValue: cred.credentialHash,
    },
  };

  return vc;
}
