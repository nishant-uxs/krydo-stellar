/**
 * Delete Firestore rows left over from the Ethereum Krydo deployment
 * (0x… addresses, non-Stellar wallets/issuers/credentials/txs).
 *
 * Stellar StrKey accounts are `G` + 55 base32 chars. Anything else in an
 * address field is treated as legacy junk.
 *
 * Usage:
 *   npm run clean:eth-legacy
 */
import "dotenv/config";
import { collections } from "../server/db";

const STELLAR_G = /^G[A-Z2-7]{55}$/;

function isStellar(addr: unknown): boolean {
  return typeof addr === "string" && STELLAR_G.test(addr.trim());
}

async function purgeCollection(
  name: string,
  snap: FirebaseFirestore.QuerySnapshot,
  shouldDelete: (data: FirebaseFirestore.DocumentData, id: string) => string | null,
) {
  let deleted = 0;
  for (const doc of snap.docs) {
    const reason = shouldDelete(doc.data(), doc.id);
    if (!reason) continue;
    await doc.ref.delete();
    deleted++;
    console.log(`  deleted ${name}/${doc.id} (${reason})`);
  }
  return deleted;
}

async function main() {
  console.log("Purging Ethereum / non-Stellar legacy Firestore rows…\n");

  let total = 0;

  {
    const snap = await collections.issuers.get();
    const n = await purgeCollection("issuers", snap, (d) => {
      const a = d.walletAddress;
      if (isStellar(a)) return null;
      return `non-stellar-issuer:${a}`;
    });
    console.log(`issuers: deleted ${n}/${snap.size}\n`);
    total += n;
  }

  {
    const snap = await collections.wallets.get();
    const n = await purgeCollection("wallets", snap, (d, id) => {
      const addr = String(d.address ?? id);
      if (isStellar(addr)) return null;
      return `legacy-wallet:${addr}`;
    });
    console.log(`wallets: deleted ${n}/${snap.size}\n`);
    total += n;
  }

  {
    const snap = await collections.credentials.get();
    const n = await purgeCollection("credentials", snap, (d) => {
      if (!isStellar(d.issuerAddress) || !isStellar(d.holderAddress)) {
        return `legacy-cred issuer=${d.issuerAddress} holder=${d.holderAddress}`;
      }
      return null;
    });
    console.log(`credentials: deleted ${n}/${snap.size}\n`);
    total += n;
  }

  {
    const snap = await collections.credentialRequests.get();
    const n = await purgeCollection("credentialRequests", snap, (d) => {
      if (!isStellar(d.requesterAddress)) {
        return `legacy-req requester=${d.requesterAddress}`;
      }
      if (d.issuerAddress && !isStellar(d.issuerAddress)) {
        return `legacy-req issuer=${d.issuerAddress}`;
      }
      return null;
    });
    console.log(`credentialRequests: deleted ${n}/${snap.size}\n`);
    total += n;
  }

  {
    const snap = await collections.transactions.get();
    const n = await purgeCollection("transactions", snap, (d) => {
      if (!isStellar(d.fromAddress)) {
        return `legacy-tx from=${d.fromAddress}`;
      }
      if (d.toAddress && !isStellar(d.toAddress)) {
        return `legacy-tx to=${d.toAddress}`;
      }
      const h = String(d.txHash ?? "");
      if (/^0x[a-fA-F0-9]{64}$/.test(h)) return `eth-txHash:${h.slice(0, 18)}…`;
      return null;
    });
    console.log(`transactions: deleted ${n}/${snap.size}\n`);
    total += n;
  }

  {
    const snap = await collections.zkProofs.get();
    const n = await purgeCollection("zkProofs", snap, (d) => {
      if (!isStellar(d.proverAddress)) return `legacy-zk prover=${d.proverAddress}`;
      return null;
    });
    console.log(`zkProofs: deleted ${n}/${snap.size}\n`);
    total += n;
  }

  console.log(`--- Done. Total deleted: ${total} ---`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Purge failed:", err);
    process.exit(1);
  });
