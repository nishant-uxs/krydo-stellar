import { describe, it, expect } from "vitest";
import { credentialToVC, type KrydoCredentialLike } from "./vc";

// Real-format Stellar StrKey addresses (case-sensitive).
const ISSUER_ADDR = "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP";
const HOLDER_ADDR = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";

function baseCred(over: Partial<KrydoCredentialLike> = {}): KrydoCredentialLike {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    credentialHash: "ab".repeat(32), // 32 bytes, bare hex
    issuerAddress: ISSUER_ADDR,
    holderAddress: HOLDER_ADDR,
    claimType: "credit_score",
    claimSummary: "CIBIL score above 750",
    claimData: { min: 750, max: 900, currency: "N/A" },
    status: "active",
    issuedAt: new Date("2026-01-01T00:00:00.000Z"),
    revokedAt: null,
    expiresAt: new Date("2027-01-01T00:00:00.000Z"),
    ...over,
  };
}

describe("credentialToVC (W3C VC Data Model v2)", () => {
  it("emits the mandatory W3C VC v2 context first", () => {
    const vc = credentialToVC(baseCred());
    expect(vc["@context"][0]).toBe("https://www.w3.org/ns/credentials/v2");
  });

  it("includes Krydo context alongside W3C", () => {
    const vc = credentialToVC(baseCred());
    expect(vc["@context"]).toContain("https://krydo.dev/credentials/v1");
  });

  it("encodes id as urn:uuid", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.id).toBe("urn:uuid:11111111-1111-4111-8111-111111111111");
  });

  it("emits type: [VerifiableCredential, Krydo<ClaimType>Credential]", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.type[0]).toBe("VerifiableCredential");
    expect(vc.type[1]).toBe("KrydoCreditScoreCredential");
  });

  it("maps multi-word claim types to PascalCase", () => {
    const vc = credentialToVC(baseCred({ claimType: "income_verification" }));
    expect(vc.type[1]).toBe("KrydoIncomeVerificationCredential");
  });

  it("issuer.id is a did:pkh:stellar with the exact StrKey address", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.issuer.id).toBe(`did:pkh:stellar:testnet:${ISSUER_ADDR}`);
  });

  it("includes issuer.name when provided", () => {
    const vc = credentialToVC(baseCred(), { issuerName: "CIBIL India" });
    expect(vc.issuer.name).toBe("CIBIL India");
  });

  it("omits issuer.name when not provided", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.issuer).not.toHaveProperty("name");
  });

  it("credentialSubject.id is the holder's did:pkh:stellar", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.credentialSubject.id).toBe(`did:pkh:stellar:testnet:${HOLDER_ADDR}`);
  });

  it("nests claimData under credentialSubject[claimType]", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.credentialSubject.credit_score).toEqual({
      min: 750,
      max: 900,
      currency: "N/A",
    });
  });

  it("surfaces claimSummary at credentialSubject.summary", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.credentialSubject.summary).toBe("CIBIL score above 750");
  });

  it("sets validFrom and validUntil from issuance + expiry dates", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.validFrom).toBe("2026-01-01T00:00:00.000Z");
    expect(vc.validUntil).toBe("2027-01-01T00:00:00.000Z");
  });

  it("omits validUntil when credential has no expiry", () => {
    const vc = credentialToVC(baseCred({ expiresAt: null }));
    expect(vc).not.toHaveProperty("validUntil");
  });

  it("accepts ISO string dates as well as Date objects", () => {
    const vc = credentialToVC(
      baseCred({ issuedAt: "2026-01-01T00:00:00.000Z" }),
    );
    expect(vc.validFrom).toBe("2026-01-01T00:00:00.000Z");
  });

  it("reports credentialStatus.status=active for an active non-expired credential", () => {
    const vc = credentialToVC(baseCred(), {
      now: new Date("2026-06-01T00:00:00.000Z"),
    });
    expect(vc.credentialStatus.status).toBe("active");
  });

  it("reports revoked when status is revoked", () => {
    const vc = credentialToVC(
      baseCred({ status: "revoked", revokedAt: new Date() }),
    );
    expect(vc.credentialStatus.status).toBe("revoked");
  });

  it("reports revoked when revokedAt is set even if status text says active", () => {
    const vc = credentialToVC(
      baseCred({ revokedAt: new Date("2026-03-01T00:00:00.000Z") }),
    );
    expect(vc.credentialStatus.status).toBe("revoked");
  });

  it("reports expired when now > expiresAt", () => {
    const vc = credentialToVC(baseCred(), {
      now: new Date("2028-01-01T00:00:00.000Z"),
    });
    expect(vc.credentialStatus.status).toBe("expired");
  });

  it("credentialStatus.id points at a status endpoint", () => {
    const vc = credentialToVC(baseCred(), { statusBaseUrl: "https://x/api/credentials" });
    expect(vc.credentialStatus.id).toBe(
      "https://x/api/credentials/11111111-1111-4111-8111-111111111111/status",
    );
  });

  it("proof anchors to the credential hash with CAIP-2 Stellar chain id", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.proof.type).toBe("KrydoOnChainAnchor2025");
    expect(vc.proof.anchor.chain).toBe("stellar:testnet");
    expect(vc.proof.anchor.credentialHash).toBe("ab".repeat(32));
    expect(vc.proof.proofValue).toBe("ab".repeat(32));
    expect(vc.proof.proofPurpose).toBe("assertionMethod");
  });

  it("verificationMethod references issuer DID's controller key", () => {
    const vc = credentialToVC(baseCred());
    expect(vc.proof.verificationMethod).toBe(
      `did:pkh:stellar:testnet:${ISSUER_ADDR}#controller`,
    );
  });

  it("output serializes to valid JSON", () => {
    const vc = credentialToVC(baseCred());
    expect(() => JSON.stringify(vc)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(vc));
    expect(parsed["@context"][0]).toBe("https://www.w3.org/ns/credentials/v2");
  });
});
