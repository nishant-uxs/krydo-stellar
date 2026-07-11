import { useState, useMemo, useEffect } from "react";
import { useWallet, shortenAddress } from "@/lib/wallet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Lock,
  Loader2,
  Copy,
  CheckCircle2,
  Eye,
  Fingerprint,
  Hash,
  ArrowUpRight,
  EyeOff,
  Link2,
  ExternalLink,
  QrCode,
  Sparkles,
  ChevronRight,
  Check
} from "lucide-react";
import type { Credential, ZkProof } from "@shared/schema";
import { proofTypeLabels, claimTypeLabels, type ProofType, type ClaimType } from "@shared/schema";
import { motion } from "framer-motion";
import { QrCodeCanvas } from "@/components/qr-code-canvas";
import { TxConfirmDialog, type TxConfirmInfo } from "@/components/tx-confirm-dialog";
import { anchorZkProofViaWallet } from "@/lib/contracts";
import { NETWORK_LABEL } from "@/lib/stellar";
import { AUDIT_ID } from "@shared/contracts";
import { PageShell, PageHeader } from "@/components/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export default function ZkProofsPage() {
  const { address } = useWallet();
  const { toast } = useToast();
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [proofType, setProofType] = useState<ProofType>("range_above");
  const [threshold, setThreshold] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [generatedProof, setGeneratedProof] = useState<any>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [qrProofId, setQrProofId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState<TxConfirmInfo | null>(null);
  const [zkStep, setZkStep] = useState("");

  const credentialFields = useMemo(() => {
    if (!selectedCredential) return {};
    const cd = selectedCredential.claimData as { fields?: Record<string, string>; value?: string } | null;
    if (cd?.fields) return cd.fields;
    if (cd?.value) return { value: cd.value };
    return {};
  }, [selectedCredential]);

  const { data: credentials, isLoading: credsLoading } = useQuery<Credential[]>({
    queryKey: ["/api/credentials", address],
    enabled: !!address,
  });

  const { data: proofs, isLoading: proofsLoading } = useQuery<ZkProof[]>({
    queryKey: ["/api/zk/proofs", address],
    enabled: !!address,
  });

  const activeCredentials = credentials?.filter((c) => c.status === "active") || [];

  const credentialNumericValue = useMemo<number | null>(() => {
    const v = (credentialFields as Record<string, string>).value;
    if (v === undefined) return null;
    const trimmed = String(v).trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }, [credentialFields]);

  const hasNonNumericValue = useMemo<boolean>(() => {
    const v = (credentialFields as Record<string, string>).value;
    if (v === undefined) return false;
    const trimmed = String(v).trim();
    if (trimmed === "") return false;
    return !Number.isFinite(Number(trimmed));
  }, [credentialFields]);

  useEffect(() => {
    if (hasNonNumericValue && (proofType === "range_above" || proofType === "range_below")) {
      setProofType("equality");
      setThreshold("");
    }
  }, [hasNonNumericValue, proofType]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCredential) throw new Error("Select a credential");
      if (!address) throw new Error("Wallet not connected");

      const body: any = {
        credentialId: selectedCredential.id,
        proverAddress: address,
        proofType,
        clientWillAnchor: !!AUDIT_ID,
      };
      if (proofType === "range_above" || proofType === "range_below") {
        if (!threshold) throw new Error("Threshold is required for range proofs");
        const t = parseFloat(threshold);
        if (!Number.isFinite(t)) throw new Error("Threshold must be a valid number");
        if (credentialNumericValue !== null) {
          if (proofType === "range_above" && t > credentialNumericValue) {
            throw new Error(
              `Your credential value is ${credentialNumericValue}. You can only prove thresholds up to ${credentialNumericValue}.`,
            );
          }
          if (proofType === "range_below" && t < credentialNumericValue) {
            throw new Error(
              `Your credential value is ${credentialNumericValue}. You can only prove thresholds at or above ${credentialNumericValue}.`,
            );
          }
        }
        body.threshold = t;
      }
      if (proofType === "equality") {
        if (!targetValue) throw new Error("Target value is required");
        if (credentialNumericValue !== null) {
          const t = Number(String(targetValue).trim());
          if (Number.isFinite(t) && t !== credentialNumericValue) {
            throw new Error(
              `Your credential value is ${credentialNumericValue}. Enter ${credentialNumericValue} to produce a verifiable equality proof.`,
            );
          }
        }
        body.targetValue = targetValue;
      }
      if (proofType === "selective_disclosure") {
        if (selectedFields.length === 0) throw new Error("Select at least one field to disclose");
        body.selectedFields = selectedFields;
      }

      setZkStep("Generating proof...");
      const res = await apiRequest("POST", "/api/zk/generate", body);
      const proof = await res.json();

      if (AUDIT_ID) {
        setZkStep("Waiting for wallet approval...");
        try {
          const tx = await anchorZkProofViaWallet(
            proof.id,
            address,
            proof.credentialHash || selectedCredential.credentialHash,
            proof.commitment,
          );
          setZkStep("Recording anchor on Stellar...");
          await apiRequest("POST", `/api/zk/${proof.id}/anchor`, { txHash: tx.txHash });
          return { ...proof, onChainTxHash: tx.txHash };
        } catch (err: any) {
          if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
            throw new Error("Wallet signing cancelled. Proof was generated off-chain only.");
          }
          throw err;
        }
      }

      return proof;
    },
    onSuccess: (data) => {
      setZkStep("");
      setGeneratedProof(data);
      setProofDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/zk/proofs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: data.onChainTxHash ? "ZK Proof Anchored" : "ZK Proof Generated",
        description: data.verified
          ? data.onChainTxHash
            ? "Proof verified and anchored on Stellar."
            : "Proof verified successfully."
          : "Proof generated but claim does NOT satisfy the condition.",
      });
    },
    onError: (error: Error) => {
      setZkStep("");
      toast({ title: "Failed to generate proof", description: error.message, variant: "destructive" });
    },
  });

  const copyProofId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Zero-Knowledge Engine"
        title="Zero-Knowledge Proofs"
        description="Prove facts about your credentials mathematically without revealing any sensitive underlying data."
        titleTestId="text-zk-title"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start min-w-0">
        
        {/* LEFT COLUMN: FORM GENERATION */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          <Card className="border-border/80 bg-card/45 backdrop-blur-sm shadow-xl rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base font-serif font-bold flex items-center gap-2">
                <Lock className="w-4.5 h-4.5 text-primary" />
                Configure Mathematical Statement
              </CardTitle>
              <CardDescription className="text-xs">
                Draft a formal cryptographic predicate over your selected claim
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              
              {/* Select Credential */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Select Credential</label>
                {credsLoading ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : activeCredentials.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 font-sans italic">No active credentials available to prove.</p>
                ) : (
                  <Select
                    value={selectedCredential?.id || ""}
                    onValueChange={(id) => {
                      setSelectedCredential(activeCredentials.find((c) => c.id === id) || null);
                      setSelectedFields([]);
                      setThreshold("");
                      setTargetValue("");
                    }}
                  >
                    <SelectTrigger data-active={!!selectedCredential} className="rounded-xl border-border/80 focus:ring-primary/20" data-testid="select-zk-credential">
                      <SelectValue placeholder="Choose a credential..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {activeCredentials.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {claimTypeLabels[cred.claimType as ClaimType] || cred.claimType} — {cred.claimSummary}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Selected Credential Stats / Meta Info */}
              {selectedCredential && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-background/60 border border-border/50 text-sm space-y-2.5 relative"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] font-semibold bg-chart-3/10 text-chart-3 border-chart-3/20 no-default-active-elevate rounded-full">
                      {claimTypeLabels[selectedCredential.claimType as ClaimType]}
                    </Badge>
                    {Object.keys(credentialFields).length > 1 && (
                      <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 no-default-active-elevate rounded-full">
                        {Object.keys(credentialFields).length} fields
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground font-sans text-xs leading-relaxed">{selectedCredential.claimSummary}</p>
                  
                  {credentialNumericValue !== null && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground font-sans">Your private ledger value: </span>
                      <span className="font-semibold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded" data-testid="text-cred-value">
                        {credentialNumericValue}
                      </span>
                    </div>
                  )}

                  {hasNonNumericValue && (
                    <div className="p-3 bg-chart-4/5 rounded-lg border border-chart-4/15 text-xs text-chart-4 flex gap-2 items-start" data-testid="text-non-numeric-warning">
                      <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        This claim uses a non-numeric value. Range proof algorithms are restricted. Please generate an <strong>Exact Match</strong> or <strong>Selective Disclosure</strong> proof instead.
                      </p>
                    </div>
                  )}
                  
                  <p className="font-mono text-[10px] text-muted-foreground/75 border-t pt-2 block truncate">
                    Hash: {selectedCredential.credentialHash}
                  </p>
                </motion.div>
              )}

              {/* Select Proof Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Proof Type</label>
                <Select
                  value={proofType}
                  onValueChange={(v) => {
                    setProofType(v as ProofType);
                    setSelectedFields([]);
                    setThreshold("");
                    setTargetValue("");
                  }}
                >
                  <SelectTrigger className="rounded-xl border-border/80 focus:ring-primary/20 text-sm" data-testid="select-proof-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(Object.entries(proofTypeLabels) as [ProofType, string][])
                      .filter(([key]) => {
                        if (key === "membership" || key === "non_zero") return false;
                        if (hasNonNumericValue && (key === "range_above" || key === "range_below")) return false;
                        return true;
                      })
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selective Disclosure Sub-panel */}
              {proofType === "selective_disclosure" && selectedCredential && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2.5 p-4 rounded-xl border bg-background/55"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Select Fields to Disclose</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    Check which metadata parameters you are comfortable showing publicly. Unselected fields are encrypted and kept hidden inside the ZK commitment.
                  </p>
                  
                  {Object.keys(credentialFields).length > 0 ? (
                    <div className="space-y-2 pt-2">
                      {Object.entries(credentialFields).map(([fieldName, fieldValue]) => (
                        <div 
                          key={fieldName} 
                          className="flex items-center gap-3 p-2.5 rounded-lg border bg-background/40 hover:bg-background/80 transition-colors"
                        >
                          <Checkbox
                            id={`field-${fieldName}`}
                            checked={selectedFields.includes(fieldName)}
                            onCheckedChange={(checked) => {
                              setSelectedFields(
                                checked
                                  ? [...selectedFields, fieldName]
                                  : selectedFields.filter((f) => f !== fieldName)
                              );
                            }}
                            data-testid={`checkbox-field-${fieldName}`}
                          />
                          <label htmlFor={`field-${fieldName}`} className="flex-1 flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-semibold capitalize text-foreground">{fieldName.replace(/_/g, " ")}</span>
                            {selectedFields.includes(fieldName) ? (
                              <Badge variant="secondary" className="text-[9px] font-bold bg-chart-3/10 text-chart-3 border-chart-3/20 no-default-active-elevate py-0 px-2 rounded-full">
                                Reveal
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] font-medium bg-muted text-muted-foreground border no-default-active-elevate py-0 px-2 rounded-full">
                                Hidden
                              </Badge>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-sans italic">No fields available to selectively disclose.</p>
                  )}
                </motion.div>
              )}

              {/* Threshold Fields */}
              {(proofType === "range_above" || proofType === "range_below") && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Threshold Value</label>
                  <Input
                    type="number"
                    placeholder={proofType === "range_above" ? "e.g. 700" : "e.g. 40"}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    max={
                      proofType === "range_above" && credentialNumericValue !== null
                        ? credentialNumericValue
                        : undefined
                    }
                    min={
                      proofType === "range_below" && credentialNumericValue !== null
                        ? credentialNumericValue
                        : undefined
                    }
                    className="rounded-xl border-border/80 focus:ring-primary/20 text-sm"
                    data-testid="input-zk-threshold"
                  />
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    {proofType === "range_above"
                      ? credentialNumericValue !== null
                        ? `Prove value is ≥ ${threshold || 'this threshold'}. Your actual value satisfies this condition up to: ${credentialNumericValue}.`
                        : "Proves your private numeric credential is at or above this threshold without revealing the exact amount."
                      : credentialNumericValue !== null
                        ? `Prove value is ≤ ${threshold || 'this threshold'}. Your actual value satisfies this condition from: ${credentialNumericValue} and up.`
                        : "Proves your private numeric credential is at or below this threshold without revealing the exact amount."}
                  </p>
                </motion.div>
              )}

              {/* Equality Field */}
              {proofType === "equality" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Target Value</label>
                  <Input
                    placeholder={
                      credentialNumericValue !== null
                        ? `Must equal ${credentialNumericValue}`
                        : "e.g. India"
                    }
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="rounded-xl border-border/80 focus:ring-primary/20 text-sm"
                    data-testid="input-zk-target"
                  />
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    {credentialNumericValue !== null
                      ? `Produces a proof demonstrating your secret value is exactly equal to the target. Must equal ${credentialNumericValue} to succeed.`
                      : "Produces a proof demonstrating your secret value is exactly equal to this target string."}
                  </p>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                onClick={() => {
                  if (!selectedCredential || !address) return;
                  if (AUDIT_ID) {
                    setConfirmInfo({
                      action: "zk_anchor",
                      title: "Generate & Anchor ZK Proof",
                      description:
                        "Proof math runs off-chain first. Then your wallet signs an on-chain audit anchor — no private claim data is revealed.",
                      details: [
                        {
                          label: "Credential",
                          value:
                            claimTypeLabels[selectedCredential.claimType as ClaimType] ||
                            selectedCredential.claimType,
                        },
                        {
                          label: "Proof type",
                          value: proofTypeLabels[proofType] || proofType,
                        },
                        { label: "Your wallet", value: address, mono: true },
                        { label: "Contract", value: "KrydoAudit", mono: true },
                        { label: "Network", value: NETWORK_LABEL },
                      ],
                    });
                    setConfirmOpen(true);
                    return;
                  }
                  generateMutation.mutate();
                }}
                disabled={!selectedCredential || generateMutation.isPending}
                className="w-full h-11 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg hover:shadow-primary/10 transition-all duration-300"
                data-testid="button-generate-proof"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {zkStep || "Executing ZK Proof Math..."}
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4.5 h-4.5 mr-2" />
                    {AUDIT_ID ? "Generate & Sign On-Chain" : "Generate Proof"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: GENERATED PROOFS HISTORICAL LIST */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold flex items-center gap-1.5 text-foreground">
              Proof History
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </h2>
            <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground py-0.5 px-2 bg-muted/40">
              {proofs?.length || 0} TOTAL
            </Badge>
          </div>

          {proofsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : proofs && proofs.length > 0 ? (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {proofs.map((proof, i) => (
                <motion.div
                  key={proof.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card 
                    data-testid={`card-zk-proof-${proof.id}`}
                    className="border-border/80 bg-card/45 backdrop-blur-sm glow-card-hover rounded-xl overflow-hidden"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {proofTypeLabels[proof.proofType as ProofType] || proof.proofType}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] font-bold py-0.5 px-2 rounded-full border no-default-active-elevate ${
                                proof.verified
                                  ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
                                  : "bg-chart-4/10 text-chart-4 border-chart-4/20"
                              }`}
                            >
                              {proof.verified ? "Verified" : "Pending"}
                            </Badge>
                            
                            {proof.onChainTxHash ? (
                              <Badge
                                variant="secondary"
                                className="text-[9px] font-semibold bg-chart-1/10 text-chart-1 border border-chart-1/20 no-default-active-elevate cursor-pointer hover:bg-chart-1/15 flex items-center gap-0.5 rounded-full py-0 px-2"
                                onClick={() => window.open(`https://stellar.expert/explorer/testnet/tx/${proof.onChainTxHash}`, "_blank")}
                                data-testid={`badge-onchain-${proof.id}`}
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                On-Ledger
                                <ExternalLink className="w-1.5 h-1.5" />
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] bg-muted/65 text-muted-foreground border no-default-active-elevate py-0 px-2 rounded-full">
                                Off-Ledger
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground">
                            <p className="truncate"><span className="text-foreground/60 font-semibold font-sans">Proof ID:</span> {proof.id}</p>
                            <p className="truncate"><span className="text-foreground/60 font-semibold font-sans">Commitment:</span> {proof.commitment}</p>
                            {proof.onChainTxHash && (
                              <p className="truncate text-chart-1"><span className="text-foreground/60 font-semibold font-sans">Tx:</span> {proof.onChainTxHash}</p>
                            )}
                          </div>

                          <p className="text-[10px] text-muted-foreground font-sans">
                            {new Date(proof.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0 self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQrProofId(proof.id)}
                            data-testid={`button-qr-proof-${proof.id}`}
                            className="h-8 w-12 p-0 border-border/80 hover:bg-primary/5 hover:text-primary rounded-lg"
                            title="Share Proof QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyProofId(proof.id)}
                            data-testid={`button-copy-proof-${proof.id}`}
                            className="h-8 w-12 p-0 border-border/80 hover:bg-primary/5 hover:text-primary rounded-lg"
                            title="Copy Proof ID"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-chart-3" /> : <Copy className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border-dashed py-10 text-center bg-card/10 backdrop-blur-sm rounded-2xl">
              <CardContent className="space-y-3 max-w-xs mx-auto">
                <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="font-serif text-sm font-bold">No generated proofs</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  Generate a math proof from your active credentials to publish verified conditions without exposing plaintext claims.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* POPUP MODAL: JUST GENERATED PROOF ID */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 font-serif font-bold text-lg text-foreground">
              <ShieldCheck className="w-5 h-5 text-chart-3" />
              ZK Proof Generated!
            </DialogTitle>
          </DialogHeader>
          {generatedProof && (
            <div className="space-y-4 pt-3 font-sans">
              <div className={`p-3.5 rounded-xl ${generatedProof.verified ? "bg-chart-3/10 border-chart-3/15 text-chart-3" : "bg-destructive/10 border-destructive/15 text-destructive"} border text-xs font-semibold leading-relaxed`}>
                <p>
                  {generatedProof.verified
                    ? "Cryptographic proof successfully verified locally! Your private claim fully satisfies this statement."
                    : "Cryptographic proof generated but your private claim does NOT satisfy the requested statement."}
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Proof ID (Share with verifiers)</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs bg-muted/50 p-2.5 rounded-xl border flex-1 break-all font-semibold text-foreground">
                      {generatedProof.id}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyProofId(generatedProof.id)}
                      data-testid="button-copy-proof-dialog"
                      className="rounded-xl border-border/80 h-10 w-10 shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4 text-chart-3" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-0.5">Commitment Hash</span>
                  <code className="font-mono text-[10px] break-all text-foreground/80">{generatedProof.commitment}</code>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-0.5">Proof Statement</span>
                    <span className="text-xs font-semibold">{proofTypeLabels[generatedProof.proofType as ProofType]}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-0.5">Engine Protocol</span>
                    <span className="text-xs font-mono font-bold text-primary">krydo-zkp-v1</span>
                  </div>
                </div>

                {generatedProof?.proofType === "selective_disclosure" && generatedProof?.publicInputs?.disclosedFields && (
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Disclosed Fields</span>
                    <div className="flex flex-wrap gap-1">
                      {generatedProof.publicInputs.disclosedFields.map((f: string) => (
                        <Badge key={f} variant="secondary" className="text-[9px] font-bold bg-chart-3/10 text-chart-3 border-chart-3/20 no-default-active-elevate capitalize rounded-full py-0 px-2">
                          <Eye className="w-2.5 h-2.5 mr-0.5" />
                          {f.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code Embed */}
              <div className="pt-3 border-t">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block text-center mb-3">Scan QR to Verify Instantly</span>
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-3 rounded-xl shadow-md border">
                    <QrCodeCanvas
                      value={`${window.location.origin}/verify/${generatedProof.id}`}
                      size={160}
                    />
                  </div>
                  <code className="font-mono text-[9px] text-muted-foreground break-all text-center px-4 max-w-xs mt-1 block">
                    {`${window.location.origin}/verify/${generatedProof.id}`}
                  </code>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed text-center max-w-xs mx-auto font-sans pt-1">
                Provide the QR or Proof ID code to any verifier in the network. They will mathematically confirm the condition is valid.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SHARE COMPLETED PROOF QR MODAL */}
      <Dialog open={!!qrProofId} onOpenChange={(open) => !open && setQrProofId(null)}>
        <DialogContent className="max-w-xs rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 font-serif font-bold text-lg">
              <QrCode className="w-5 h-5 text-primary" />
              Share ZK Proof
            </DialogTitle>
          </DialogHeader>
          {qrProofId && (
            <div className="flex flex-col items-center gap-3.5 py-3 font-sans">
              <div className="bg-white p-3 rounded-xl shadow-md border">
                <QrCodeCanvas
                  value={`${window.location.origin}/verify/${qrProofId}`}
                  size={200}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Scan this QR to open the public Krydo Verification screen for this proof on any device without logging in.
              </p>
              
              <div className="w-full bg-muted/40 p-2.5 rounded-xl border font-mono text-[9px] text-muted-foreground break-all text-center">
                {`${window.location.origin}/verify/${qrProofId}`}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/verify/${qrProofId}`);
                  toast({ title: "Verification link copied", description: "Proof URL copied to clipboard." });
                }}
                className="w-full font-semibold rounded-full border-border/80 hover:bg-primary/5 hover:text-primary transition-all duration-300 gap-1.5"
                data-testid="button-copy-qr-link"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Link String
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TxConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        info={confirmInfo}
        isPending={generateMutation.isPending}
        onConfirm={() => {
          setConfirmOpen(false);
          generateMutation.mutate();
        }}
      />
    </PageShell>
  );
}
