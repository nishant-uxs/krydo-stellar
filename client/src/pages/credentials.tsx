import { useWallet, shortenAddress } from "@/lib/wallet";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Clock, 
  Hash, 
  User, 
  Building, 
  QrCode, 
  AlertTriangle, 
  CalendarClock, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight
} from "lucide-react";
import type { Credential } from "@shared/schema";
import { claimTypeLabels, type ClaimType } from "@shared/schema";
import { motion } from "framer-motion";
import { useState } from "react";
import { QrCodeCanvas } from "@/components/qr-code-canvas";
import { explorerAccountUrl } from "@/lib/stellar";

function getExpiryStatus(cred: Credential): { label: string; color: string; icon: typeof Clock } | null {
  if (!cred.expiresAt) return null;
  const exp = new Date(cred.expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return { label: "Expired", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle };
  if (daysLeft <= 30) return { label: `Expires in ${daysLeft}d`, color: "bg-chart-4/10 text-chart-4 border-chart-4/20", icon: CalendarClock };
  return { label: `Expires ${exp.toLocaleDateString()}`, color: "bg-muted/70 text-muted-foreground border-border/60", icon: CalendarClock };
}

export default function CredentialsPage() {
  const { address } = useWallet();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [qrTitle, setQrTitle] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);

  const { data: credentials, isLoading } = useQuery<Credential[]>({
    queryKey: ["/api/credentials", address],
    enabled: !!address,
  });

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 relative">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-10 w-72 h-72 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b">
        <div>
          <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-widest text-primary bg-primary/5 py-1 px-2">
            Verifiable Claims
          </Badge>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight mt-2 flex items-center gap-2" data-testid="text-credentials-title">
            My Cryptographic Credentials
            <Shield className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-sans">
            Sovereign, mathematical claims anchored on Stellar Soroban contracts.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : credentials && credentials.length > 0 ? (
        <div className="space-y-5">
          {credentials.map((cred, i) => (
            <motion.div
              key={cred.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card 
                data-testid={`card-credential-${cred.id}`}
                className="border-border/80 bg-card/45 backdrop-blur-sm glow-card-hover overflow-hidden rounded-2xl"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 pb-5 border-b border-border/50">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif font-bold text-xl text-foreground capitalize">
                          {claimTypeLabels[cred.claimType as ClaimType] || cred.claimType.replace(/_/g, " ")}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold py-0.5 px-2.5 rounded-full border no-default-active-elevate ${
                            cred.status === "active"
                              ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}
                        >
                          {cred.status}
                        </Badge>
                        {(() => {
                          const expiry = getExpiryStatus(cred);
                          if (!expiry) return null;
                          const ExpiryIcon = expiry.icon;
                          return (
                            <Badge variant="secondary" className={`text-[10px] py-0.5 px-2 rounded-full border no-default-active-elevate ${expiry.color}`}>
                              <ExpiryIcon className="w-3 h-3 mr-1" />
                              {expiry.label}
                            </Badge>
                          );
                        })()}
                        {(() => {
                          const cd = cred.claimData as { fields?: Record<string, string> } | null;
                          const fieldCount = cd?.fields ? Object.keys(cd.fields).length : 0;
                          if (fieldCount <= 1) return null;
                          return (
                            <Badge variant="secondary" className="text-[10px] py-0.5 px-2 bg-primary/10 text-primary border border-primary/20 no-default-active-elevate rounded-full">
                              <Layers className="w-3 h-3 mr-1" />
                              {fieldCount} parameters
                            </Badge>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-muted-foreground font-sans leading-relaxed">{cred.claimSummary}</p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQrValue(cred.credentialHash);
                        setQrTitle(claimTypeLabels[cred.claimType as ClaimType] || cred.claimType);
                        setQrOpen(true);
                      }}
                      data-testid={`button-qr-${cred.id}`}
                      className="shrink-0 self-start sm:self-center font-semibold rounded-full border-border/80 hover:bg-primary/5 hover:text-primary transition-all duration-300 gap-1.5 px-4"
                    >
                      <QrCode className="w-4 h-4" />
                      Share QR code
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                    
                    {/* Hash Field */}
                    <div className="flex gap-3 p-3 rounded-xl bg-background/40 border border-border/40">
                      <Hash className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Credential Hash</span>
                        <p className="font-mono text-xs text-foreground break-all select-all">{cred.credentialHash}</p>
                      </div>
                    </div>

                    {/* Issuer Field */}
                    <div className="flex gap-3 p-3 rounded-xl bg-background/40 border border-border/40">
                      <Building className="w-4.5 h-4.5 text-chart-5 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Issuer Address</span>
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-xs text-foreground truncate">{cred.issuerAddress}</p>
                          <a 
                            href={explorerAccountUrl(cred.issuerAddress)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-muted-foreground hover:text-primary shrink-0 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Issued Date Field */}
                    <div className="flex gap-3 p-3 rounded-xl bg-background/40 border border-border/40">
                      <Clock className="w-4.5 h-4.5 text-chart-3 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Issued Date</span>
                        <p className="text-xs text-foreground font-semibold">
                          {new Date(cred.issuedAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Holder Field */}
                    <div className="flex gap-3 p-3 rounded-xl bg-background/40 border border-border/40">
                      <User className="w-4.5 h-4.5 text-chart-2 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Holder Address</span>
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-xs text-foreground truncate">{cred.holderAddress}</p>
                          <a 
                            href={explorerAccountUrl(cred.holderAddress)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-muted-foreground hover:text-primary shrink-0 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 py-16 text-center bg-card/10 backdrop-blur-sm rounded-2xl">
          <CardContent className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto border">
              <Shield className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-serif text-xl font-bold text-foreground">No Credentials Found</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You do not have any cryptographic credentials stored in your profile yet. Request a claim from a trusted whitelist issuer to begin.
            </p>
          </CardContent>
        </Card>
      )}

      {/* SHARE QR CODE MODAL */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2.5 font-serif font-bold text-lg">
              <QrCode className="w-5 h-5 text-primary" />
              Cryptographic Anchor
            </DialogTitle>
            <DialogDescription className="text-xs">
              {qrTitle} — share with verifiers to perform mathematical ZK proving
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-3 rounded-xl shadow-lg border">
              <QrCodeCanvas value={qrValue} />
            </div>
            
            <div className="w-full space-y-1 text-center bg-muted/35 p-3 rounded-xl border border-border/60">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Credential Hash</span>
              <p className="font-mono text-[10px] text-foreground break-all select-all font-semibold">
                {qrValue}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyHash(qrValue)}
              data-testid="button-copy-hash"
              className="font-semibold rounded-full border-border/80 hover:bg-primary/5 hover:text-primary transition-all duration-300 gap-1.5 px-6"
            >
              {copiedHash ? (
                <>
                  <Check className="w-3.5 h-3.5 text-chart-3" />
                  Copied Hash!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Hash String
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
