import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Shield, 
  Hash, 
  Building, 
  User, 
  Clock, 
  Link2, 
  Fingerprint, 
  Lock, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Loader2
} from "lucide-react";
import { shortenAddress } from "@/lib/wallet";
import type { Credential } from "@shared/schema";
import { claimTypeLabels, proofTypeLabels, type ClaimType, type ProofType } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

const verifySchema = z.object({
  credentialHash: z.string().min(1, "Credential hash or ID is required"),
});

const zkVerifySchema = z.object({
  proofId: z.string().min(1, "ZK Proof ID is required"),
});

interface VerificationResult {
  valid: boolean;
  credential: Credential | null;
  issuerName: string | null;
  issuerActive: boolean;
  onChain: boolean;
  message: string;
}

interface ZkVerificationResult {
  valid: boolean;
  reason: string;
  onChainVerified?: boolean | null;
  proof: {
    id: string;
    proofType: string;
    commitment: string;
    createdAt: string;
    onChainTxHash?: string | null;
    onChainStatus?: string | null;
    publicInputs: {
      proofType: string;
      threshold?: number;
      targetValue?: string;
      disclosedFields?: string[];
      fieldCommitments?: Record<string, string>;
      commitment: string;
      timestamp: number;
    };
  };
  credential: {
    claimType: string;
    claimSummary: string;
    status: string;
    holderAddress: string;
  } | null;
  issuer: {
    name: string;
    active: boolean;
  } | null;
}

function CredentialResult({ result }: { result: VerificationResult }) {
  return (
    <Card 
      data-testid="card-verification-result"
      className="border-border/80 bg-card/45 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden mt-4"
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b">
          {result.valid ? (
            <div className="w-11 h-11 rounded-xl bg-chart-3/10 flex items-center justify-center border border-chart-3/20">
              <CheckCircle2 className="w-5.5 h-5.5 text-chart-3" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <XCircle className="w-5.5 h-5.5 text-destructive" />
            </div>
          )}
          <div>
            <h3 className="font-serif font-bold text-xl text-foreground">
              {result.valid ? "Credential Verified" : "Verification Failed"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-sans">{result.message}</p>
          </div>
        </div>

        {result.credential && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Claim Type</span>
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {claimTypeLabels[result.credential.claimType as ClaimType] || result.credential.claimType}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Building className="w-4 h-4 text-chart-5 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Issuer</span>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {result.issuerName || shortenAddress(result.credential.issuerAddress)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {result.issuerActive ? (
                      <Badge variant="secondary" className="text-[9px] font-bold bg-chart-3/10 text-chart-3 border border-chart-3/20 no-default-active-elevate rounded-full py-0 px-1.5">Active Whitelist</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] font-bold bg-destructive/10 text-destructive border border-destructive/20 no-default-active-elevate rounded-full py-0 px-1.5">Revoked Whitelist</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <User className="w-4 h-4 text-chart-2 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Holder</span>
                  <p className="font-mono text-xs text-foreground truncate">{result.credential.holderAddress}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Clock className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Issued At</span>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(result.credential.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t space-y-3 font-sans text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Hash className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">On-Chain Credential Hash</span>
                  <p className="font-mono text-xs text-foreground break-all">{result.credential.credentialHash}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Link2 className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Stellar Ledger Verification</span>
                  {result.onChain ? (
                    <Badge variant="secondary" className="text-[10px] font-bold bg-chart-3/10 text-chart-3 border border-chart-3/20 no-default-active-elevate rounded-full mt-1" data-testid="badge-onchain-verified">Verified on Stellar</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground border no-default-active-elevate rounded-full mt-1" data-testid="badge-offchain">Off-chain only</Badge>
                  )}
                </div>
              </div>
            </div>

            {!result.issuerActive && result.valid && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-chart-4/10 border border-chart-4/20 mt-2 font-sans text-xs">
                <AlertTriangle className="w-4.5 h-4.5 text-chart-4 mt-0.5 shrink-0" />
                <p className="text-chart-4 leading-relaxed">
                  <strong>Warning:</strong> The original issuer of this credential has been revoked by the Root Authority. The cryptographic integrity of the claim remains intact, but the issuer signature is no longer whitelisted.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ZkProofResult({ zkResult }: { zkResult: ZkVerificationResult }) {
  return (
    <Card 
      data-testid="card-zk-verification-result"
      className="border-border/80 bg-card/45 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden mt-4"
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b">
          {zkResult.valid ? (
            <div className="w-11 h-11 rounded-xl bg-chart-3/10 flex items-center justify-center border border-chart-3/20">
              <CheckCircle2 className="w-5.5 h-5.5 text-chart-3" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <XCircle className="w-5.5 h-5.5 text-destructive" />
            </div>
          )}
          <div>
            <h3 className="font-serif font-bold text-xl text-foreground">
              {zkResult.valid ? "ZK Proof Verified" : "ZK Proof Invalid"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-sans">{zkResult.reason}</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
            
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
              <Fingerprint className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Proof Statement</span>
                <p className="text-sm font-semibold text-foreground">
                  {proofTypeLabels[zkResult.proof.proofType as ProofType] || zkResult.proof.proofType}
                </p>
              </div>
            </div>

            {zkResult.proof.publicInputs.threshold !== undefined && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Hash className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Threshold Statement</span>
                  <p className="text-sm font-bold text-foreground font-mono">{zkResult.proof.publicInputs.threshold}</p>
                </div>
              </div>
            )}

            {zkResult.proof.publicInputs.disclosedFields && zkResult.proof.publicInputs.disclosedFields.length > 0 && (
              <div className="col-span-full flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Eye className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Disclosed Fields</span>
                  <div className="flex flex-wrap gap-1">
                    {zkResult.proof.publicInputs.disclosedFields.map((f: string) => (
                      <Badge key={f} variant="secondary" className="text-[9px] font-bold bg-chart-3/10 text-chart-3 border border-chart-3/20 no-default-active-elevate capitalize rounded-full py-0 px-2">
                        <Eye className="w-2.5 h-2.5 mr-0.5 text-chart-3" />
                        {f.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {zkResult.credential && (
              <>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                  <Shield className="w-4 h-4 text-chart-5 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Target Claim Type</span>
                    <p className="text-sm font-semibold capitalize text-foreground">
                      {claimTypeLabels[zkResult.credential.claimType as ClaimType] || zkResult.credential.claimType}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                  <User className="w-4 h-4 text-chart-2 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Claim Holder</span>
                    <p className="font-mono text-xs text-foreground truncate">{zkResult.credential.holderAddress}</p>
                  </div>
                </div>
              </>
            )}

            {zkResult.issuer && (
              <div className="col-span-full flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Building className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Authorizing Issuer</span>
                  <p className="text-sm font-semibold text-foreground">{zkResult.issuer.name}</p>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] font-bold mt-1 no-default-active-elevate rounded-full border py-0 px-2 ${zkResult.issuer.active ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}
                  >
                    {zkResult.issuer.active ? "Issuer whitelisted" : "Issuer revoked"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-3 font-sans text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
              <Hash className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Commitment Parameter</span>
                <p className="font-mono text-xs text-foreground break-all">{zkResult.proof.commitment}</p>
              </div>
            </div>
            {zkResult.proof.onChainTxHash && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Link2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Stellar Soroban Proof Anchor</span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${zkResult.proof.onChainTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-primary hover:text-primary/80 hover:underline break-all flex items-center gap-1 mt-0.5"
                    data-testid="link-proof-tx"
                  >
                    {zkResult.proof.onChainTxHash}
                    <ExternalLink className="w-3 h-3 inline shrink-0" />
                  </a>
                </div>
              </div>
            )}
            {zkResult.onChainVerified !== null && zkResult.onChainVerified !== undefined && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
                <Shield className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Stellar Ledger Credential Validation</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold no-default-active-elevate rounded-full border mt-1 ${zkResult.onChainVerified ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}
                    data-testid="badge-onchain-cred-status"
                  >
                    {zkResult.onChainVerified ? "Verified on Stellar" : "Not verified on-chain"}
                  </Badge>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background/40 border border-border/40">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Mathematical Privacy Status</span>
                <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 no-default-active-elevate rounded-full mt-1">
                  Zero-Knowledge Proof — Plaintext stays hidden
                </Badge>
              </div>
            </div>
          </div>

          {zkResult.valid && (
            <div className="p-3.5 rounded-xl bg-chart-3/5 border border-chart-3/20 font-sans text-xs">
              <p className="text-chart-3 leading-relaxed">
                This statement has been cryptographically confirmed. The underlying parameter satisfies the condition mathematically, and its actual value remains fully hidden from any third party.
                {zkResult.proof.onChainTxHash && " The proof commitment is fully anchored on Stellar Testnet."}
                {zkResult.onChainVerified && " Underlying credential is valid and registered on-chain."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  const params = useParams<{ proofId?: string }>();
  const autoProofId = params?.proofId;

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [zkResult, setZkResult] = useState<ZkVerificationResult | null>(null);

  const form = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: { credentialHash: "" },
  });

  const zkForm = useForm<z.infer<typeof zkVerifySchema>>({
    resolver: zodResolver(zkVerifySchema),
    defaultValues: { proofId: autoProofId ?? "" },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof verifySchema>) => {
      const res = await apiRequest("POST", "/api/verify", data);
      return res.json() as Promise<VerificationResult>;
    },
    onSuccess: (data) => setResult(data),
    onError: () => {
      setResult({
        valid: false,
        credential: null,
        issuerName: null,
        issuerActive: false,
        onChain: false,
        message: "Verification failed. The credential could not be found or verified.",
      });
    },
  });

  const zkVerifyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof zkVerifySchema>) => {
      const res = await apiRequest("POST", "/api/zk/verify", data);
      return res.json() as Promise<ZkVerificationResult>;
    },
    onSuccess: (data) => setZkResult(data),
    onError: () => {
      setZkResult(null);
    },
  });

  useEffect(() => {
    if (!autoProofId) return;
    zkForm.setValue("proofId", autoProofId);
    zkVerifyMutation.mutate({ proofId: autoProofId });
  }, [autoProofId]);

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8 relative">
      <div className="absolute top-0 right-10 w-72 h-72 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div>
        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-widest text-primary bg-primary/5 py-1 px-2">
          Public Verifier
        </Badge>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight mt-2 flex items-center gap-2" data-testid="text-verify-title">
          {autoProofId ? "Proof Verification" : "Verify Claims"}
          <Eye className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-sans">
          {autoProofId
            ? "Live cryptographic + on-chain verification of the proof encoded in the QR code you scanned."
            : "Verify credential signatures or zero-knowledge mathematical proofs instantly."}
        </p>
      </div>

      <Tabs defaultValue={autoProofId ? "zk-proof" : "credential"}>
        <TabsList className="w-full h-12 bg-muted/40 border rounded-xl p-1">
          <TabsTrigger value="credential" className="flex-1 rounded-lg text-sm font-semibold h-full" data-testid="tab-verify-credential">
            <Eye className="w-4 h-4 mr-2" />
            Plaintext Credential
          </TabsTrigger>
          <TabsTrigger value="zk-proof" className="flex-1 rounded-lg text-sm font-semibold h-full" data-testid="tab-verify-zk">
            <Fingerprint className="w-4 h-4 mr-2" />
            Zero-Knowledge Proof
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credential" className="space-y-4 mt-4">
          <Card className="border-border/80 bg-card/45 backdrop-blur-sm shadow-xl rounded-2xl relative overflow-hidden">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base font-serif font-bold flex items-center gap-2">
                <Search className="w-4.5 h-4.5 text-primary" />
                Credential Registry Search
              </CardTitle>
              <CardDescription className="text-xs">
                Lookup the cryptographic signature of an issued claim directly on the ledger
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => verifyMutation.mutate(data))}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="credentialHash"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Credential Hash or ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter 64-character hash or unique UUID..."
                            className="font-mono text-xs rounded-xl border-border/80 focus:ring-primary/20 h-11"
                            data-testid="input-verify-hash"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg hover:shadow-primary/10 transition-all duration-300"
                    disabled={verifyMutation.isPending}
                    data-testid="button-verify"
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning Registries...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Verify Credential
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.valid ? "valid" : "invalid"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <CredentialResult result={result} />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="zk-proof" className="space-y-4 mt-4">
          <Card className="border-border/80 bg-card/45 backdrop-blur-sm shadow-xl rounded-2xl relative overflow-hidden">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base font-serif font-bold flex items-center gap-2">
                <Fingerprint className="w-4.5 h-4.5 text-primary" />
                Zero-Knowledge Verifier Input
              </CardTitle>
              <CardDescription className="text-xs">
                Validate a cryptographic proof statement without accessing the underlying values
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...zkForm}>
                <form
                  onSubmit={zkForm.handleSubmit((data) => zkVerifyMutation.mutate(data))}
                  className="space-y-5"
                >
                  <FormField
                    control={zkForm.control}
                    name="proofId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">ZK Proof ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter the unique proof ID shared by the holder..."
                            className="font-mono text-xs rounded-xl border-border/80 focus:ring-primary/20 h-11"
                            data-testid="input-verify-zk-id"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg hover:shadow-primary/10 transition-all duration-300"
                    disabled={zkVerifyMutation.isPending}
                    data-testid="button-verify-zk"
                  >
                    {zkVerifyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Cryptographic Algebra...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Verify ZK Proof
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {zkResult && (
              <motion.div
                key={zkResult.valid ? "zk-valid" : "zk-invalid"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <ZkProofResult zkResult={zkResult} />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
