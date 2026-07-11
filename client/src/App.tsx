import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider, useWallet } from "@/lib/wallet";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { WalletButton } from "@/components/wallet-button";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import IssuersPage from "@/pages/issuers";
import IssueCredentialPage from "@/pages/issue-credential";
import CredentialsPage from "@/pages/credentials";
import VerifyPage from "@/pages/verify";
import TransactionsPage from "@/pages/transactions";
import ZkProofsPage from "@/pages/zk-proofs";
import RequestCredentialPage from "@/pages/request-credential";
import { useEffect } from "react";
import { Redirect } from "wouter";

function AuthenticatedLayout() {
  const { isConnected } = useWallet();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isConnected) {
      navigate("/");
    }
  }, [isConnected, navigate]);

  if (!isConnected) return null;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-[100dvh] w-full max-w-[100vw] overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-white/5 bg-background/55 backdrop-blur-xl sticky top-0 z-40 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <ThemeToggle />
              <WalletButton />
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden stellar-space-bg grid-bg-overlay">
            <Switch>
              <Route path="/">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/issuers" component={IssuersPage} />
              <Route path="/issue" component={IssueCredentialPage} />
              <Route path="/request" component={RequestCredentialPage} />
              <Route path="/credentials" component={CredentialsPage} />
              <Route path="/verify/:proofId" component={VerifyPage} />
              <Route path="/verify" component={VerifyPage} />
              <Route path="/zk-proofs" component={ZkProofsPage} />
              <Route path="/transactions" component={TransactionsPage} />
              <Route>
                <Redirect to="/dashboard" />
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isConnected } = useWallet();
  const [location] = useLocation();

  // `/verify` and `/verify/:id` are the only public routes — QR-scanners /
  // external verifiers must be able to land here without a wallet.
  const isPublicVerifyRoute = location === "/verify" || location.startsWith("/verify/");

  if (!isConnected && !isPublicVerifyRoute) {
    return <Landing />;
  }

  if (isPublicVerifyRoute && !isConnected) {
    return (
      <div className="min-h-[100dvh] max-w-[100vw] overflow-x-hidden bg-background stellar-space-bg grid-bg-overlay">
        <header className="border-b border-white/5 bg-background/55 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-6 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 min-w-0 rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="link-logo-home"
            >
              <span className="font-serif font-bold text-lg truncate">Krydo</span>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeToggle />
              <WalletButton />
            </div>
          </div>
        </header>
        <Switch>
          <Route path="/verify/:proofId" component={VerifyPage} />
          <Route path="/verify" component={VerifyPage} />
        </Switch>
      </div>
    );
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <Toaster />
          <Router />
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
