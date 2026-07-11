/**
 * Client-side Soroban contract helpers.
 *
 * Each state-changing helper builds a Soroban invocation, has the active
 * Stellar Wallets Kit module sign it (non-custodial), submits via Soroban RPC,
 * and waits for confirmation. Read helpers use simulation only.
 *
 * These functions require the contracts to be deployed (contract ids in
 * `contracts/deployment.json`); until then they throw a clear error.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import {
  rpc,
  Contract,
  Address,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import {
  AUTHORITY_ID,
  CREDENTIALS_ID,
  AUDIT_ID,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
} from "@shared/contracts";
import { ensureWalletKit, expectedPassphrase } from "./wallet-kit";

export interface TxResult {
  txHash: string;
  blockNumber: number;
}

const server = new rpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_URL.startsWith("http://"),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function requireContract(id: string, name: string): string {
  if (!id) {
    throw new Error(
      `${name} contract is not deployed yet. Run \`npm run deploy:contracts\` and fill contracts/deployment.json.`,
    );
  }
  return id;
}

async function connectedAddress(): Promise<string> {
  const kit = ensureWalletKit();
  const got = await kit.getAddress();
  if (!got.address) {
    throw new Error("No connected Stellar account. Connect your wallet first.");
  }
  return got.address;
}

// ---------- ScVal builders ----------

function addrArg(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}
function strArg(s: string): xdr.ScVal {
  return nativeToScVal(s, { type: "string" });
}
function symArg(s: string): xdr.ScVal {
  return nativeToScVal(s, { type: "symbol" });
}
function bytes32Arg(hex: string): xdr.ScVal {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return xdr.ScVal.scvBytes(Buffer.from(clean, "hex"));
}
function bytesArg(bytes: Uint8Array): xdr.ScVal {
  return xdr.ScVal.scvBytes(Buffer.from(bytes));
}
function id32(s: string): Uint8Array {
  return sha256(new TextEncoder().encode(s));
}

// ---------- core invoke / read ----------

async function invokeViaWallet(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<TxResult> {
  const caller = await connectedAddress();
  const account = await server.getAccount(caller);
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);

  const kit = ensureWalletKit();
  const signed = await kit.signTransaction(prepared.toXDR(), {
    address: caller,
    networkPassphrase: expectedPassphrase(),
  });
  if (!signed.signedTxXdr) {
    throw new Error("Wallet returned an empty signed transaction");
  }

  const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK_PASSPHRASE);
  const sent = await server.sendTransaction(signedTx);
  if (sent.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${JSON.stringify(sent.errorResult)}`);
  }

  const deadline = Date.now() + 60_000;
  let got = await server.getTransaction(sent.hash);
  while (
    got.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    Date.now() < deadline
  ) {
    await sleep(1500);
    got = await server.getTransaction(sent.hash);
  }
  if (got.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction ${sent.hash} not successful: ${got.status}`);
  }
  return { txHash: sent.hash, blockNumber: Number(got.ledger) };
}

async function simulateRead<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<T> {
  const caller = await connectedAddress();
  const account = await server.getAccount(caller);
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval) throw new Error(`No return value from ${method}`);
  return scValToNative(retval) as T;
}

// ---------- KrydoAuthority ----------

export async function checkIsIssuerOnChain(issuerAddress: string): Promise<boolean> {
  if (!AUTHORITY_ID) return false;
  return simulateRead<boolean>(AUTHORITY_ID, "is_issuer", [addrArg(issuerAddress)]);
}

export async function addIssuerViaWallet(
  issuerAddress: string,
  name: string,
): Promise<TxResult> {
  const id = requireContract(AUTHORITY_ID, "KrydoAuthority");
  return invokeViaWallet(id, "add_issuer", [addrArg(issuerAddress), strArg(name)]);
}

export async function revokeIssuerViaWallet(issuerAddress: string): Promise<TxResult> {
  const id = requireContract(AUTHORITY_ID, "KrydoAuthority");
  return invokeViaWallet(id, "revoke_issuer", [addrArg(issuerAddress)]);
}

// ---------- KrydoCredentials ----------

export async function issueCredentialViaWallet(
  credentialHash: string,
  holderAddress: string,
  claimType: string,
  claimSummary: string,
): Promise<TxResult> {
  const id = requireContract(CREDENTIALS_ID, "KrydoCredentials");
  const caller = await connectedAddress();
  return invokeViaWallet(id, "issue_credential", [
    addrArg(caller),
    bytes32Arg(credentialHash),
    addrArg(holderAddress),
    strArg(claimType),
    strArg(claimSummary),
  ]);
}

export async function revokeCredentialViaWallet(credentialHash: string): Promise<TxResult> {
  const id = requireContract(CREDENTIALS_ID, "KrydoCredentials");
  const caller = await connectedAddress();
  return invokeViaWallet(id, "revoke_credential", [
    addrArg(caller),
    bytes32Arg(credentialHash),
  ]);
}

interface RawVerifyResult {
  valid: boolean;
  issuer: string;
  holder: string;
  claim_type: string;
  issuer_active: boolean;
}

export async function verifyCredentialOnChainView(credentialHash: string): Promise<{
  valid: boolean;
  issuer: string;
  holder: string;
  claimType: string;
  issuerActive: boolean;
}> {
  const id = requireContract(CREDENTIALS_ID, "KrydoCredentials");
  const result = await simulateRead<RawVerifyResult | null>(id, "verify_credential", [
    bytes32Arg(credentialHash),
  ]);
  if (!result) {
    return { valid: false, issuer: "", holder: "", claimType: "", issuerActive: false };
  }
  return {
    valid: result.valid,
    issuer: result.issuer,
    holder: result.holder,
    claimType: result.claim_type,
    issuerActive: result.issuer_active,
  };
}

// ---------- KrydoAudit ----------

async function callAuditAnchor(
  kind: string,
  id: Uint8Array,
  data: Uint8Array,
): Promise<TxResult> {
  const auditId = requireContract(AUDIT_ID, "KrydoAudit");
  const caller = await connectedAddress();
  return invokeViaWallet(auditId, "anchor", [
    addrArg(caller),
    symArg(kind),
    bytesArg(id),
    bytesArg(data),
  ]);
}

const enc = (obj: unknown) => new TextEncoder().encode(JSON.stringify(obj));

export async function anchorRoleViaWallet(
  walletAddress: string,
  role: string,
  label: string,
): Promise<TxResult> {
  const data = enc({ walletAddress, role, label, ts: Math.floor(Date.now() / 1000) });
  return callAuditAnchor("role", id32(walletAddress), data);
}

export async function anchorCredentialRequestViaWallet(
  requestId: string,
  requesterAddress: string,
  claimType: string,
  action: string,
): Promise<TxResult> {
  const data = enc({
    requestId,
    requesterAddress,
    claimType,
    action,
    ts: Math.floor(Date.now() / 1000),
  });
  return callAuditAnchor("credreq", id32(String(requestId)), data);
}

export async function anchorCredentialRenewalViaWallet(
  credentialHash: string,
  holderAddress: string,
  newExpiresAt: number,
): Promise<TxResult> {
  const data = enc({
    credentialHash,
    holderAddress,
    newExpiresAt,
    ts: Math.floor(Date.now() / 1000),
  });
  const clean = credentialHash.startsWith("0x") ? credentialHash.slice(2) : credentialHash;
  const idBytes = Uint8Array.from(
    clean.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [],
  );
  return callAuditAnchor("renewal", idBytes, data);
}
