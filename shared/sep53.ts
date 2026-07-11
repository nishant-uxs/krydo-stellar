/**
 * SEP-53 — Sign and Verify Messages
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0053.md
 *
 * Freighter's `signMessage` follows SEP-53: it signs SHA-256("Stellar Signed Message:\n" + msg),
 * not the raw UTF-8 bytes. Server-side SIWS verification MUST use the same payload.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { Keypair } from "@stellar/stellar-sdk";

export const SEP53_PREFIX = "Stellar Signed Message:\n";

/** Canonical SEP-53 payload bytes for a UTF-8 string message. */
export function sep53Payload(message: string): Buffer {
  return Buffer.concat([
    Buffer.from(SEP53_PREFIX, "utf8"),
    Buffer.from(message, "utf8"),
  ]);
}

/** SHA-256 of the SEP-53 payload — this is what wallets sign with ed25519. */
export function sep53MessageHash(message: string): Buffer {
  return Buffer.from(sha256(sep53Payload(message)));
}

/**
 * Verify a Freighter / SEP-53 message signature.
 * `signature` may be base64 string or raw 64-byte buffer.
 */
export function verifySep53Message(
  address: string,
  message: string,
  signature: string | Buffer | Uint8Array,
): boolean {
  try {
    const sigBuf = typeof signature === "string"
      ? Buffer.from(signature, "base64")
      : Buffer.from(signature);
    if (sigBuf.length !== 64) return false;
    const kp = Keypair.fromPublicKey(address);
    return kp.verify(sep53MessageHash(message), sigBuf);
  } catch {
    return false;
  }
}
