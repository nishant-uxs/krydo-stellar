import { describe, it, expect } from "vitest";
import {
  parseSummaryBound,
  validateClaimValueAgainstSummary,
  validateIssuerClaimInputs,
} from "./claim-consistency";

describe("parseSummaryBound", () => {
  it("parses 'Above 750'", () => {
    expect(parseSummaryBound("CREDIT SCORE ABOVE 750")).toEqual({
      kind: "above",
      threshold: 750,
    });
  });

  it("parses at least / >=", () => {
    expect(parseSummaryBound("score at least 700")).toEqual({
      kind: "at_least",
      threshold: 700,
    });
  });

  it("returns null when no bound", () => {
    expect(parseSummaryBound("Verified CIBIL report")).toBeNull();
  });
});

describe("validateClaimValueAgainstSummary", () => {
  it("rejects 742 when summary says above 750", () => {
    const err = validateClaimValueAgainstSummary("CREDIT SCORE ABOVE 750", "742");
    expect(err).toMatch(/does not match/i);
  });

  it("accepts 780 when summary says above 750", () => {
    expect(validateClaimValueAgainstSummary("CREDIT SCORE ABOVE 750", "780")).toBeNull();
  });

  it("treats 'above N' as strict >", () => {
    expect(validateClaimValueAgainstSummary("above 750", "750")).toMatch(/does not match/i);
  });
});

describe("validateIssuerClaimInputs", () => {
  it("enforces credit_score range", () => {
    expect(
      validateIssuerClaimInputs({
        claimType: "credit_score",
        claimSummary: "score",
        claimValue: "100",
      }),
    ).toMatch(/300/);
  });

  it("passes a consistent credit score issue", () => {
    expect(
      validateIssuerClaimInputs({
        claimType: "credit_score",
        claimSummary: "Credit Score Above 750",
        claimValue: "812",
      }),
    ).toBeNull();
  });
});
