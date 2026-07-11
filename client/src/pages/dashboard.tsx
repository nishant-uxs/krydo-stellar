import { useWallet } from "@/lib/wallet";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  Users, 
  FileCheck, 
  Activity, 
  TrendingUp, 
  Clock, 
  Link2, 
  ArrowUpRight, 
  History, 
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight
} from "lucide-react";
import type { Issuer, Credential, Transaction } from "@shared/schema";
import { isOffChainTx } from "@shared/schema";
import { motion } from "framer-motion";
import { explorerTxUrl, NETWORK_LABEL } from "@/lib/stellar";
import { Link } from "wouter";
import { PageShell, PageHeader } from "@/components/page-shell";

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function Dashboard() {
  const { address, role, onChainTxHash } = useWallet();

  const { data: stats, isLoading: statsLoading } = useQuery<{
    issuers: number;
    credentials: number;
    transactions: number;
    activeCredentials: number;
    revokedCredentials: number;
  }>({
    queryKey: ["/api/stats", address],
    enabled: !!address,
  });

  const { data: recentTx, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions/recent", address],
    enabled: !!address,
  });

  const { data: credentials, isLoading: credsLoading } = useQuery<Credential[]>({
    queryKey: ["/api/credentials", address],
    enabled: !!address,
  });

  const { data: network } = useQuery<{
    blockchain: boolean;
    network: string | null;
    contracts: { authority: string; credentials: string; audit: string | null } | null;
    deployer: string | null;
  }>({
    queryKey: ["/api/network"],
  });

  const roleTitles: Record<string, string> = {
    root: "Root Authority Dashboard",
    issuer: "Issuer Dashboard",
    user: "Sovereign Dashboard",
  };

  const roleDescriptions: Record<string, string> = {
    root: "Administer the trust ecosystem: whitelist issuers and monitor system activity.",
    issuer: "Certify financial credibility by issuing cryptographic credentials securely.",
    user: "Access secure verifiable credentials, initiate proofs, and manage your identity.",
  };

  return (
    <PageShell maxWidth="6xl">
      <PageHeader
        eyebrow="KRYDO STELLAR IDENTITY"
        title={roleTitles[role || "user"] || "Dashboard"}
        description={roleDescriptions[role || "user"]}
        titleTestId="text-dashboard-title"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {network?.blockchain && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-chart-3/10 text-chart-3 no-default-active-elevate font-sans border border-chart-3/20 flex items-center gap-1"
                data-testid="badge-network-status"
              >
                <Link2 className="w-3 h-3" />
                Stellar {NETWORK_LABEL}
              </Badge>
            )}
            {onChainTxHash && (
              <a
                href={explorerTxUrl(onChainTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-role-onchain"
              >
                <Badge
                  variant="secondary"
                  className="text-[11px] py-1.5 px-3 bg-primary/10 text-primary border border-primary/20 no-default-active-elevate font-medium cursor-pointer hover:bg-primary/15 transition-all duration-300 shadow-sm flex items-center gap-1.5 rounded-full"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Authority Role On-Chain</span>
                  <span className="sm:hidden">On-Chain</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Badge>
              </a>
            )}
          </div>
        }
      />

      {/* METRICS GRID WITH MODERN GRADIENTS AND GLASSMORPHISM */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        initial="initial"
        animate="animate"
        variants={stagger}
      >
        {role === "root" && (
          <motion.div variants={fadeUp}>
            <Card className="glow-card-hover border-border/80 bg-card/45 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2.5">
                <CardTitle className="text-xs font-bold font-sans uppercase tracking-widest text-muted-foreground">Trusted Issuers</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Users className="w-4.5 h-4.5" />
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-extrabold font-mono text-foreground" data-testid="text-stat-issuers">{stats?.issuers || 0}</p>
                    <span className="text-xs text-muted-foreground font-sans">Active whitelisted</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Card className="glow-card-hover border-border/80 bg-card/45 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-chart-1/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2.5">
              <CardTitle className="text-xs font-bold font-sans uppercase tracking-widest text-muted-foreground">
                {role === "root" ? "System Credentials" : "My Credentials"}
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-chart-1/10 flex items-center justify-center text-chart-1 border border-chart-1/20">
                <FileCheck className="w-4.5 h-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold font-mono text-foreground" data-testid="text-stat-credentials">{stats?.credentials || 0}</p>
                  <span className="text-xs text-muted-foreground font-sans">Issued claims</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="glow-card-hover border-border/80 bg-card/45 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-chart-3/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2.5">
              <CardTitle className="text-xs font-bold font-sans uppercase tracking-widest text-muted-foreground">Valid / Active</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center text-chart-3 border border-chart-3/20">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold font-mono text-chart-3" data-testid="text-stat-active">
                    {stats?.activeCredentials || 0}
                  </p>
                  <span className="text-xs text-muted-foreground font-sans">Unrevoked</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="glow-card-hover border-border/80 bg-card/45 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-chart-5/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2.5">
              <CardTitle className="text-xs font-bold font-sans uppercase tracking-widest text-muted-foreground">Anchor Events</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-chart-5/10 flex items-center justify-center text-chart-5 border border-chart-5/20">
                <Activity className="w-4.5 h-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold font-mono text-foreground" data-testid="text-stat-transactions">{stats?.transactions || 0}</p>
                  <span className="text-xs text-muted-foreground font-sans">Ledger commits</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* RECENT ACTIVITY & RECENT CREDENTIALS TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECENT ACTIVITY CARD */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <Card className="border-border/80 bg-card/30 backdrop-blur-sm h-full flex flex-col justify-between">
            <div>
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-serif font-bold flex items-center gap-2">
                    <History className="w-4.5 h-4.5 text-primary" />
                    Ledger Audit Anchors
                  </CardTitle>
                  <Link href="/transactions">
                    <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 flex items-center gap-1 px-2 h-8 rounded-full">
                      View all
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
                <CardDescription className="font-sans text-xs mt-0.5">
                  Recent system transactions anchored on Stellar testnet
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {txLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : recentTx && recentTx.length > 0 ? (
                  <div className="space-y-3">
                    {recentTx.slice(0, 5).map((tx) => {
                      const offChain = isOffChainTx(tx);
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-background/55 hover:bg-background/85 transition-colors duration-200"
                          data-testid={`row-tx-${tx.id}`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold capitalize bg-primary/5 text-foreground py-0.5 px-1.5 rounded border border-border/40">
                                {tx.action.replace(/_/g, " ")}
                              </span>
                              {!offChain ? (
                                <a
                                  href={explorerTxUrl(tx.txHash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-testid={`link-tx-onchain-${tx.id}`}
                                >
                                  <Badge variant="secondary" className="text-[9px] bg-chart-3/10 text-chart-3 border border-chart-3/20 no-default-active-elevate cursor-pointer hover:bg-chart-3/20 transition-all py-0 px-2 rounded-full">
                                    On-Chain
                                  </Badge>
                                </a>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] bg-muted/65 text-muted-foreground border no-default-active-elevate py-0 px-2 rounded-full">
                                  Local
                                </Badge>
                              )}
                            </div>
                            {offChain ? (
                              <span className="text-[10px] text-muted-foreground block truncate max-w-[250px]">
                                {tx.action.includes("zk")
                                  ? "Local ZK event (anchor for on-chain hash)"
                                  : "Local event"}
                              </span>
                            ) : (
                              <a
                                href={explorerTxUrl(tx.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-muted-foreground truncate block hover:text-primary transition-colors"
                              >
                                {tx.txHash}
                              </a>
                            )}
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <Badge variant="outline" className="text-[9px] font-mono border-border/80 text-muted-foreground py-0.5 px-1.5 rounded-md bg-muted/20">
                              {offChain
                                ? "Off-chain"
                                : tx.blockNumber && tx.blockNumber !== "0"
                                  ? `Ledger #${tx.blockNumber}`
                                  : "Ledger pending"}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-background/30 rounded-xl border border-dashed border-border/60">
                    <Clock className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No recent system activity</p>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </motion.div>

        {/* RECENT CREDENTIALS CARD */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <Card className="border-border/80 bg-card/30 backdrop-blur-sm h-full flex flex-col justify-between">
            <div>
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-serif font-bold flex items-center gap-2">
                    <Shield className="w-4.5 h-4.5 text-primary" />
                    {role === "root" ? "Trust Network Credentials" : "My Credentials"}
                  </CardTitle>
                  <Link href="/credentials">
                    <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 flex items-center gap-1 px-2 h-8 rounded-full">
                      View all
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
                <CardDescription className="font-sans text-xs mt-0.5">
                  {role === "root" ? "Recent credentials generated across the network" : "Cryptographic claims stored in your sovereign control"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {credsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : credentials && credentials.length > 0 ? (
                  <div className="space-y-3">
                    {credentials.slice(0, 5).map((cred) => (
                      <div
                        key={cred.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-background/55 hover:bg-background/85 transition-colors duration-200"
                        data-testid={`row-cred-${cred.id}`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-semibold capitalize text-foreground flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {cred.claimType.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{cred.claimSummary}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-medium py-0.5 px-2.5 rounded-full border no-default-active-elevate ${
                            cred.status === "active"
                              ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}
                        >
                          {cred.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-background/30 rounded-xl border border-dashed border-border/60">
                    <Shield className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No credentials available</p>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </motion.div>

      </div>
    </PageShell>
  );
}
