import { describe, it, expect } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { verifySep53Message, sep53MessageHash, SEP53_PREFIX } from "./sep53";

/**
 * Official SEP-53 test vectors from:
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0053.md
 */
const SEED = "SAKICEVQLYWGSOJS4WW7HZJWAHZVEEBS527LHK5V4MLJALYKICQCJXMW";
const ADDRESS = "GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L";

describe("SEP-53 message verify (Freighter SIWS)", () => {
  it("matches official ASCII test vector", () => {
    const message = "Hello, World!";
    const signature =
      "fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==";
    expect(verifySep53Message(ADDRESS, message, signature)).toBe(true);
  });

  it("matches official Japanese test vector", () => {
    const message = "こんにちは、世界！";
    const signature =
      "CDU265Xs8y3OWbB/56H9jPgUss5G9A0qFuTqH2zs2YDgTm+++dIfmAEceFqB7bhfN3am59lCtDXrCtwH2k1GBA==";
    expect(verifySep53Message(ADDRESS, message, signature)).toBe(true);
  });

  it("rejects wrong message for a valid signature", () => {
    const signature =
      "fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==";
    expect(verifySep53Message(ADDRESS, "Hello, World?", signature)).toBe(false);
  });

  it("rejects raw-message verify (the old buggy path)", () => {
    // Signing SEP-53 hash then verifying raw UTF-8 must fail — this is the bug we fixed.
    const kp = Keypair.fromSecret(SEED);
    const message = "Hello, World!";
    const sig = kp.sign(sep53MessageHash(message));
    expect(kp.verify(Buffer.from(message, "utf8"), sig)).toBe(false);
    expect(verifySep53Message(ADDRESS, message, sig)).toBe(true);
  });

  it("prefix is exactly Stellar Signed Message + newline", () => {
    expect(SEP53_PREFIX).toBe("Stellar Signed Message:\n");
  });
});
