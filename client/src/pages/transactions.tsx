import { useWallet, shortenAddress } from "@/lib/wallet";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ArrowUpRight, ArrowDownLeft, ExternalLink, Link2 } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { isOffChainTx } from "@shared/schema";
import { motion } from "framer-motion";
import { explorerTxUrl, explorerAccountUrl, NETWORK_LABEL } from "@/lib/stellar";
import { PageShell, PageHeader, glassCardClass } from "@/components/page-shell";

const actionColors: Record<string, string> = {
  issuer_approved: "bg-chart-3/15 text-chart-3",
  issuer_revoked: "bg-destructive/15 text-destructive",
  credential_issued: "bg-chart-1/15 text-chart-1",
  credential_revoked: "bg-chart-4/15 text-chart-4",
  wallet_connected: "bg-chart-2/15 text-chart-2",
  zk_proof_generated: "bg-chart-5/15 text-chart-5",
};

export default function TransactionsPage() {
  const { address } = useWallet();

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", address],
    enabled: !!address,
  });

  return (
    <PageShell>
      <PageHeader
        title="Transaction Log"
        description={`Activity on Krydo — on-chain Stellar ${NETWORK_LABEL} commits and local ZK events`}
        titleTestId="text-transactions-title"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : transactions && transactions.length > 0 ? (
        <div className="space-y-2">
          {transactions.map((tx, i) => {
            const offChain = isOffChainTx(tx);
            const hasLedger = !offChain && tx.blockNumber && tx.blockNumber !== "0";
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={glassCardClass} data-testid={`card-tx-${tx.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                          {tx.action.includes("issued") || tx.action.includes("approved") ? (
                            <ArrowUpRight className="w-4 h-4 text-chart-3" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-chart-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium capitalize">
                              {tx.action.replace(/_/g, " ")}
                            </p>
                            {offChain ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-muted text-muted-foreground no-default-active-elevate"
                              >
                                Off-chain
                              </Badge>
                            ) : hasLedger ? (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] no-default-active-elevate ${actionColors[tx.action] || ""}`}
                              >
                                Ledger #{tx.blockNumber}
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-chart-4/15 text-chart-4 no-default-active-elevate"
                              >
                                Ledger pending
                              </Badge>
                            )}
                            {!offChain && (
                              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary no-default-active-elevate">
                                <Link2 className="w-2.5 h-2.5 mr-0.5" />
                                On-Chain
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {offChain ? (
                              <span className="text-[11px] text-muted-foreground">
                                {tx.action.includes("zk")
                                  ? "ZK proof computed locally (no Stellar tx until anchored)"
                                  : "Local event — not a Stellar transaction"}
                              </span>
                            ) : (
                              <a
                                href={explorerTxUrl(tx.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 break-all"
                                data-testid={`link-tx-hash-${tx.id}`}
                              >
                                {tx.txHash.slice(0, 18)}...
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              from{" "}
                              <a
                                href={explorerAccountUrl(tx.fromAddress)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                              >
                                {shortenAddress(tx.fromAddress)}
                              </a>
                            </span>
                            {tx.toAddress && (
                              <span className="text-[11px] text-muted-foreground">
                                to{" "}
                                <a
                                  href={explorerAccountUrl(tx.toAddress)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary transition-colors"
                                >
                                  {shortenAddress(tx.toAddress)}
                                </a>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0 sm:text-right pl-11 sm:pl-0">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className={glassCardClass}>
          <CardContent className="py-16 text-center">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold mb-1">No Transactions</h3>
            <p className="text-sm text-muted-foreground">
              Transactions will appear here as network activity occurs.
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
