import crypto from "node:crypto";
import {
  rpc,
  Keypair,
  Contract,
  Address,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import {
  DEPLOYMENT,
  AUTHORITY_ID,
  CREDENTIALS_ID,
  AUDIT_ID,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
  type DeploymentInfo,
} from "@shared/contracts";

/**
 * Thin wrapper around the Soroban RPC. Every state-changing operation returns
 * both the transaction hash AND the ledger sequence from the confirmed result,
 * so the storage layer never has to fabricate placeholder values.
 *
 * Contract ids + network params come from `@shared/contracts`, which is itself
 * generated from `contracts/deployment.json` at build/startup time. The same
 * constants are consumed by the React client (Freighter signer) so server and
 * browser can never drift apart on which contracts they're talking to.
 *
 * When `DEPLOYER_SECRET` or the contract ids are missing the module stays in
 * off-chain mode: `isBlockchainReady()` returns false and callers skip
 * anchoring entirely.
 */

export interface OnChainResult {
  txHash: string;
  /** Soroban ledger sequence, kept as a string for API stability. */
  blockNumber: string;
}

let server: rpc.Server | undefined;
let sourceKeypair: Keypair | undefined;
let deployment: DeploymentInfo | undefined;

export function getServer() {
  return server;
}

export function getSourceKeypair() {
  return sourceKeypair;
}

export function getDeployment() {
  return deployment;
}

export async function initBlockchain(): Promise<boolean> {
  const secret = process.env.DEPLOYER_SECRET;
  const rpcUrl = process.env.SOROBAN_RPC_URL || SOROBAN_RPC_URL;

  if (!secret) {
    console.warn("DEPLOYER_SECRET not configured. Running in off-chain mode.");
    return false;
  }
  if (!AUTHORITY_ID || !CREDENTIALS_ID) {
    console.warn("Deployment metadata is missing contract ids. Off-chain mode.");
    return false;
  }
  if (!rpcUrl) {
    console.warn("No Soroban RPC URL configured. Off-chain mode.");
    return false;
  }

  deployment = DEPLOYMENT;
  // allowHttp only matters for local/standalone http endpoints.
  server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
  sourceKeypair = Keypair.fromSecret(secret);

  console.log(`Soroban initialized. Root: ${sourceKeypair.publicKey()}`);
  console.log(`Network: ${deployment.network} (${rpcUrl})`);
  console.log(`Authority contract: ${AUTHORITY_ID}`);
  console.log(`Credentials contract: ${CREDENTIALS_ID}`);
  console.log(`Audit contract: ${AUDIT_ID || "(not deployed — anchoring disabled)"}`);
  return true;
}

export function isBlockchainReady(): boolean {
  return !!server && !!sourceKeypair && !!AUTHORITY_ID && !!CREDENTIALS_ID;
}

// ---------- low-level helpers ----------

function requireReady(): { server: rpc.Server; source: Keypair } {
  if (!server || !sourceKeypair) throw new Error("Blockchain not initialized");
  return { server, source: sourceKeypair };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Build, simulate, sign, submit and confirm a contract invocation. */
async function invokeSigned(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  opts: { timeoutMs?: number } = {},
): Promise<OnChainResult> {
  const { server, source } = requireReady();
  const { timeoutMs = 30_000 } = opts;

  const account = await server.getAccount(source.publicKey());
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // prepareTransaction runs simulation and assembles the Soroban footprint.
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(source);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error(`sendTransaction failed: ${JSON.stringify(sent.errorResult)}`);
  }

  const deadline = Date.now() + timeoutMs;
  let got = await server.getTransaction(sent.hash);
  while (
    got.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    Date.now() < deadline
  ) {
    await sleep(1000);
    got = await server.getTransaction(sent.hash);
  }

  if (got.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction ${sent.hash} not successful: ${got.status}`);
  }
  return { txHash: sent.hash, blockNumber: String(got.ledger) };
}

/** Simulate a read-only view call and decode the return value. */
async function simulateRead<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<T> {
  const { server, source } = requireReady();
  const account = await server.getAccount(source.publicKey());
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation error: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval) throw new Error(`No return value from ${method}`);
  return scValToNative(retval) as T;
}

// ---------- ScVal argument builders ----------

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
function bytesArg(buf: Buffer): xdr.ScVal {
  return xdr.ScVal.scvBytes(buf);
}

/** Deterministic 32-byte id from a free-form string (sha256). */
function id32(s: string): Buffer {
  return crypto.createHash("sha256").update(s).digest();
}

// ---------- KrydoAuthority ----------

export async function addIssuerOnChain(address: string, name: string): Promise<OnChainResult> {
  return invokeSigned(AUTHORITY_ID, "add_issuer", [addrArg(address), strArg(name)]);
}

export async function revokeIssuerOnChain(address: string): Promise<OnChainResult> {
  return invokeSigned(AUTHORITY_ID, "revoke_issuer", [addrArg(address)]);
}

export async function isIssuerOnChain(address: string): Promise<boolean> {
  if (!isBlockchainReady()) return false;
  return simulateRead<boolean>(AUTHORITY_ID, "is_issuer", [addrArg(address)]);
}

// ---------- KrydoCredentials ----------

export async function issueCredentialOnChain(
  issuerAddress: string,
  credentialHash: string,
  holderAddress: string,
  claimType: string,
  claimSummary: string,
): Promise<OnChainResult> {
  const { source } = requireReady();
  // Soroban `issuer.require_auth()` — server can only sign as DEPLOYER_SECRET.
  // Real issuers must submit a Freighter-signed tx (clientTxHash path).
  if (source.publicKey() !== issuerAddress) {
    throw new Error(
      "Server key cannot authorize this issuer. Use Freighter to sign issue_credential on-chain.",
    );
  }
  return invokeSigned(CREDENTIALS_ID, "issue_credential", [
    addrArg(issuerAddress),
    bytes32Arg(credentialHash),
    addrArg(holderAddress),
    strArg(claimType),
    strArg(claimSummary),
  ]);
}

export async function revokeCredentialOnChain(
  issuerAddress: string,
  credentialHash: string,
): Promise<OnChainResult> {
  const { source } = requireReady();
  if (source.publicKey() !== issuerAddress) {
    throw new Error(
      "Server key cannot authorize this issuer. Use Freighter to sign revoke_credential on-chain.",
    );
  }
  return invokeSigned(CREDENTIALS_ID, "revoke_credential", [
    addrArg(issuerAddress),
    bytes32Arg(credentialHash),
  ]);
}

interface RawVerifyResult {
  valid: boolean;
  issuer: string;
  holder: string;
  claim_type: string;
  claim_summary: string;
  issued_at: bigint | number;
  issuer_active: boolean;
}

export async function verifyCredentialOnChain(credentialHash: string) {
  const result = await simulateRead<RawVerifyResult | null>(
    CREDENTIALS_ID,
    "verify_credential",
    [bytes32Arg(credentialHash)],
  );
  if (!result) {
    return {
      valid: false,
      issuer: "",
      holder: "",
      claimType: "",
      claimSummary: "",
      issuedAt: 0,
      issuerActive: false,
    };
  }
  return {
    valid: result.valid,
    issuer: result.issuer,
    holder: result.holder,
    claimType: result.claim_type,
    claimSummary: result.claim_summary,
    issuedAt: Number(result.issued_at),
    issuerActive: result.issuer_active,
  };
}

// ---------- KrydoAudit ----------

function requireAudit(): string {
  if (!AUDIT_ID) throw new Error("KrydoAudit contract is not deployed");
  return AUDIT_ID;
}

async function sendAnchor(
  kind: string,
  id: Buffer,
  data: Buffer,
): Promise<OnChainResult> {
  const auditId = requireAudit();
  const { source } = requireReady();
  return invokeSigned(auditId, "anchor", [
    addrArg(source.publicKey()),
    symArg(kind),
    bytesArg(id),
    bytesArg(data),
  ]);
}

export async function anchorRoleAssignmentOnChain(
  walletAddress: string,
  role: string,
  label: string,
): Promise<OnChainResult> {
  const data = Buffer.from(
    JSON.stringify({ walletAddress, role, label, ts: Math.floor(Date.now() / 1000) }),
    "utf8",
  );
  return sendAnchor("role", id32(walletAddress), data);
}

export async function anchorCredentialRequestOnChain(
  requestId: string,
  requesterAddress: string,
  claimType: string,
  action: string,
): Promise<OnChainResult> {
  const data = Buffer.from(
    JSON.stringify({
      requestId,
      requesterAddress,
      claimType,
      action,
      ts: Math.floor(Date.now() / 1000),
    }),
    "utf8",
  );
  return sendAnchor("credreq", id32(requestId), data);
}

export async function anchorCredentialRenewalOnChain(
  credentialHash: string,
  holderAddress: string,
  newExpiresAt: number,
): Promise<OnChainResult> {
  const data = Buffer.from(
    JSON.stringify({
      credentialHash,
      holderAddress,
      newExpiresAt,
      ts: Math.floor(Date.now() / 1000),
    }),
    "utf8",
  );
  const clean = credentialHash.startsWith("0x") ? credentialHash.slice(2) : credentialHash;
  return sendAnchor("renewal", Buffer.from(clean, "hex"), data);
}

/**
 * Inspect a client-submitted (Freighter-signed) transaction hash. The client's
 * wallet broadcasts the invocation and reports the hash; we must independently
 * confirm it succeeded before recording it as a valid on-chain anchor.
 *
 * Returns:
 *   { status: "confirmed", blockNumber } — tx applied successfully
 *   { status: "reverted", blockNumber }  — tx failed on-chain
 *   { status: "pending" }                 — RPC knows the tx but it's not final
 *   { status: "unknown" }                 — RPC has never seen this hash
 */
export async function waitForClientTx(
  txHash: string,
  opts: { timeoutMs?: number } = {},
): Promise<
  | { status: "confirmed"; blockNumber: string }
  | { status: "reverted"; blockNumber: string }
  | { status: "pending" }
  | { status: "unknown" }
> {
  const { server } = requireReady();
  const { timeoutMs = 45_000 } = opts;

  const deadline = Date.now() + timeoutMs;
  let got = await server.getTransaction(txHash);
  while (
    got.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    Date.now() < deadline
  ) {
    await sleep(1500);
    got = await server.getTransaction(txHash);
  }

  switch (got.status) {
    case rpc.Api.GetTransactionStatus.SUCCESS:
      return { status: "confirmed", blockNumber: String(got.ledger) };
    case rpc.Api.GetTransactionStatus.FAILED:
      return { status: "reverted", blockNumber: String(got.ledger) };
    case rpc.Api.GetTransactionStatus.NOT_FOUND:
      return { status: "unknown" };
    default:
      return { status: "pending" };
  }
}
