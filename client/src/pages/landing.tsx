import { useWallet } from "@/lib/wallet";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Shield, 
  Lock, 
  Eye, 
  ArrowRight, 
  Wallet, 
  Layers, 
  CheckCircle2, 
  Network, 
  Zap, 
  Fingerprint, 
  LockKeyhole,
  Check,
  ChevronRight,
  TrendingUp,
  Award
} from "lucide-react";
import { SiStellar } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

export default function Landing() {
  const { isConnected, isConnecting, connect } = useWallet();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"issue" | "prove" | "verify">("prove");

  useEffect(() => {
    if (isConnected) navigate("/dashboard");
  }, [isConnected, navigate]);

  const handleConnectClick = () => {
    connect();
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden stellar-space-bg grid-bg-overlay">
      {/* Absolute Decorative Floating Orbs */}
      <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-primary/10 blur-[100px] animate-float pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-96 h-96 rounded-full bg-chart-2/10 blur-[120px] animate-float-delayed pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-80 h-80 rounded-full bg-chart-3/10 blur-[110px] animate-float pointer-events-none" />

      {/* Floating Constellation Stars (Stellar Theme) */}
      <div className="absolute top-[25%] right-[25%] w-2 h-2 rounded-full bg-white/40 blur-[1px] animate-pulse pointer-events-none" />
      <div className="absolute top-[55%] left-[15%] w-1.5 h-1.5 rounded-full bg-white/30 blur-[1px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[30%] right-[18%] w-2 h-2 rounded-full bg-white/50 blur-[1px] animate-pulse pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/60 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-4.5 h-4.5 text-primary" />
              <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Krydo<span className="text-primary font-sans font-medium text-sm align-super ml-0.5">stellar</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              onClick={handleConnectClick} 
              disabled={isConnecting} 
              data-testid="button-hero-connect"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 px-5"
            >
              <SiStellar className="w-4 h-4 mr-2" />
              {isConnecting ? "Signing in..." : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 relative z-10">
        {/* HERO SECTION */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Text */}
            <motion.div
              className="lg:col-span-7 space-y-8"
              variants={stagger}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={fadeUp}>
                <Badge variant="secondary" className="mb-2 py-1.5 px-3.5 bg-primary/10 text-primary hover:bg-primary/15 transition-colors duration-300 border border-primary/20 rounded-full font-serif text-xs font-semibold tracking-wide flex items-center gap-1.5 w-fit no-default-active-elevate">
                  <SiStellar className="w-3 h-3 text-primary animate-spin-slow" />
                  Stellar Soroban Smart Contracts
                </Badge>
              </motion.div>
              
              <motion.h1
                className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground"
                variants={fadeUp}
              >
                Prove financial credibility{" "}
                <span className="gradient-text-stellar font-extrabold relative">
                  without revealing
                  <span className="absolute bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400 to-pink-500 rounded-full opacity-60" />
                </span>{" "}
                sensitive data
              </motion.h1>
              
              <motion.p
                className="text-lg md:text-xl text-muted-foreground leading-relaxed font-sans max-w-2xl"
                variants={fadeUp}
              >
                Krydo is a privacy-preserving trust infrastructure. 
                Institutions issue verifiable credentials, while users generate instant zero-knowledge proofs locally. 
                Keep your assets secret, prove you qualify in milliseconds.
              </motion.p>
              
              <motion.div className="flex flex-wrap items-center gap-4" variants={fadeUp}>
                <Button 
                  size="lg" 
                  onClick={handleConnectClick} 
                  disabled={isConnecting} 
                  data-testid="button-cta-connect"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 px-8 py-6 text-base"
                >
                  <SiStellar className="w-4.5 h-4.5 mr-2" />
                  {isConnecting ? "Signing in..." : "Connect Wallet"}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate("/verify")} 
                  data-testid="button-cta-verify"
                  className="rounded-full border-border/80 hover:bg-muted/50 transition-colors duration-300 px-7 py-6 text-base"
                >
                  <Eye className="w-4.5 h-4.5 mr-2 text-muted-foreground" />
                  Verify a Credential
                </Button>
              </motion.div>
            </motion.div>

            {/* Interactive Demo Representation Panel (Mental Model "Wow" factor) */}
            <motion.div 
              className="lg:col-span-5"
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-2xl p-6 glow-primary">
                {/* Visual Glass Header */}
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] tracking-wider text-muted-foreground py-0.5 px-2 bg-muted/40">
                    KRYDO_ZK_PROVER
                  </Badge>
                </div>

                {/* ZK Visual flow interactive display */}
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-background/80 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Your Plaintext Credential (Private)</span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold font-mono">Monthly Income</span>
                      </div>
                      <span className="text-sm font-mono font-bold blur-[3px] select-none hover:blur-none transition-all duration-300 cursor-help" title="Hover to temporarily reveal (stays local)">
                        ₹1,45,000 / mo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Zap className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[10px] text-primary uppercase tracking-widest block mb-1 font-semibold">Zero-Knowledge ZK-Proof (Publicly Shared)</span>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Predicate:</span>
                        <span className="font-mono font-semibold bg-primary/10 px-2 py-0.5 rounded text-primary">income &gt;= ₹1,00,000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">On-Chain Anchor:</span>
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">C234664...52950933</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-chart-3" /> Proof Result
                        </span>
                        <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 no-default-active-elevate font-sans text-[10px] font-bold py-0.5 px-2">
                          VERIFIED VALID
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proof Badge details */}
                <div className="mt-4 flex items-center justify-between bg-muted/30 p-2.5 rounded-lg border text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-chart-2" />
                    <span>secp256k1 Sigma Proof</span>
                  </div>
                  <span>Gasless &amp; Instant</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CORE PILLARS SECTION */}
        <section className="max-w-6xl mx-auto px-6 pb-24 relative z-10">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Layers,
                title: "Hierarchical Trust",
                desc: "Soroban-enforced architecture where the Root Authority whitelists top-tier issuers. Fully deterministic credentials backed by on-chain public keys.",
                color: "text-primary bg-primary/10 border-primary/20",
                glow: "glow-primary"
              },
              {
                icon: LockKeyhole,
                title: "Mathematical Privacy",
                desc: "Plaintext values never reach any server or ledger. Pedersen commitments represent claims cryptographic-grade, leaving you with full sovereign control.",
                color: "text-chart-3 bg-chart-3/10 border-chart-3/20",
                glow: "glow-secondary"
              },
              {
                icon: Award,
                title: "Verified in Milliseconds",
                desc: "Verifiers validate mathematical proofs inside our lightweight engine instantly. No waiting on block confirmations, zero transaction fees for verification.",
                color: "text-chart-4 bg-chart-4/10 border-chart-4/20",
                glow: "glow-success"
              }
            ].map((pillar, idx) => (
              <motion.div 
                key={pillar.title} 
                variants={fadeUp} 
                className="p-8 rounded-2xl bg-card/45 backdrop-blur-sm border border-border/60 hover:bg-card/75 transition-all duration-300 glow-card-hover group cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border ${pillar.color} group-hover:scale-110 transition-transform duration-300`}>
                  <pillar.icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl mb-3 text-foreground">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                  {pillar.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* INTERACTIVE VALUE PROP TABS (THE "LOOKING LIKE A WOW" COMPONENT) */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 border-t bg-card/25 backdrop-blur-sm relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 py-1 px-3 bg-chart-2/10 text-chart-2 border-chart-2/20 no-default-active-elevate">
              End-To-End Architecture
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 tracking-tight">How Krydo Works on Stellar</h2>
            <p className="text-muted-foreground font-sans text-sm md:text-base">
              A comprehensive verifiable credential ecosystem leveraging Soroban smart contracts and Freighter wallet signatures.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Nav Controls */}
            <div className="lg:col-span-4 space-y-3">
              {[
                { id: "issue", label: "1. Secure Issuance", desc: "Institutions sign credentials on-chain", color: "border-l-primary" },
                { id: "prove", label: "2. Zero-Knowledge Proving", desc: "Users generate math proofs off-chain", color: "border-l-chart-2" },
                { id: "verify", label: "3. Decentralized Verification", desc: "Verifiers validate proofs instantly", color: "border-l-chart-3" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left p-4 rounded-xl border border-transparent transition-all duration-300 flex items-start justify-between group ${
                    activeTab === tab.id 
                      ? "bg-card border-border/80 shadow-md translate-x-1" 
                      : "hover:bg-muted/30"
                  }`}
                >
                  <div>
                    <h4 className={`font-serif font-bold text-md transition-colors duration-200 ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                      {tab.label}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 font-sans">{tab.desc}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 self-center transition-all duration-300 ${activeTab === tab.id ? "text-primary translate-x-1" : "text-muted-foreground/30 group-hover:text-muted-foreground/80"}`} />
                </button>
              ))}
            </div>

            {/* Right Interactive Visual */}
            <div className="lg:col-span-8 bg-card/45 backdrop-blur-md rounded-2xl border p-6 md:p-8 min-h-[350px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {activeTab === "issue" && (
                  <motion.div
                    key="issue"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Award className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <Badge className="bg-primary/10 text-primary border-primary/20 no-default-active-elevate text-[10px] font-bold">STAGE 01</Badge>
                          <h3 className="font-serif font-bold text-xl text-foreground">Secure Issuance by Trusted Entities</h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                        Licensed issuers (like CIBIL, tax departments, or employers) generate a cryptographic claim. 
                        They commit the credential hash to the **KrydoCredentials** Soroban smart contract using Stellar Testnet, while delivering the plaintext securely to the user's browser.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-background/60 border border-border/80 flex items-center justify-between gap-4 font-mono text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Check className="w-4 h-4 text-chart-3 shrink-0" />
                        <span className="text-muted-foreground">Contract call:</span>
                        <span className="font-semibold text-primary truncate">issue_credential(holder, cred_hash)</span>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-sans text-[10px] text-chart-3 border-chart-3/30 bg-chart-3/5">
                        SUB-CENT FEES
                      </Badge>
                    </div>
                  </motion.div>
                )}

                {activeTab === "prove" && (
                  <motion.div
                    key="prove"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center border border-chart-2/20">
                          <Fingerprint className="w-5 h-5 text-chart-2" />
                        </div>
                        <div>
                          <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 no-default-active-elevate text-[10px] font-bold">STAGE 02</Badge>
                          <h3 className="font-serif font-bold text-xl text-foreground">In-Browser Zero-Knowledge Proving</h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                        The user generates a Sigma-protocol proof locally in their browser. 
                        They construct a mathematical statement: "My salary is above threshold X" or "My credit score is above 750". 
                        The raw data never leaves the user's wallet, ensuring absolute self-sovereignty.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                      <div className="p-3 bg-background/60 rounded-xl border">
                        <span className="text-[9px] text-muted-foreground uppercase block mb-1">Pedersen Commitment</span>
                        <span className="font-bold text-foreground">C = v·G + r·H</span>
                      </div>
                      <div className="p-3 bg-background/60 rounded-xl border">
                        <span className="text-[9px] text-muted-foreground uppercase block mb-1">Sigma Witness</span>
                        <span className="font-bold text-chart-2">ZK-Proof Generated</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "verify" && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center border border-chart-3/20">
                          <Eye className="w-5 h-5 text-chart-3" />
                        </div>
                        <div>
                          <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20 no-default-active-elevate text-[10px] font-bold">STAGE 03</Badge>
                          <h3 className="font-serif font-bold text-xl text-foreground">Instant Verification & Trust Anchor</h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                        Verifiers (e.g. lenders, exchanges) run the verification math against the on-chain anchor on Stellar. 
                        The **KrydoAuthority** contract verifies that the original issuer remains whitelisted, and the proof verifies mathematically. Truth is secured without any leaks.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-chart-3/5 border border-chart-3/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-chart-3 animate-ping" />
                        <span className="font-sans font-medium text-foreground">Soroban Verification Complete:</span>
                        <span className="font-mono text-chart-3 font-semibold">100% Legit</span>
                      </div>
                      <Badge className="bg-chart-3/15 text-chart-3 border-none hover:bg-chart-3/20 font-serif text-[10px]">SUCCESS</Badge>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* TRUST ARCHITECTURE SECTION */}
        <section className="max-w-6xl mx-auto px-6 py-20 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-3 py-1 px-3 bg-chart-1/10 text-chart-1 border-chart-1/20 no-default-active-elevate">
              Network Roles
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3 tracking-tight">The Hierarchical Trust Tree</h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-sans text-sm md:text-base">
              A balanced decentralized model inspired by central banking authorities
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { icon: Network, title: "Root Authority", desc: "Deploys contracts, governs whitelist approvals, maintains system integrity.", color: "text-chart-5 bg-chart-5/5 border-chart-5/10" },
              { icon: Shield, title: "Trusted Issuers", desc: "Regulated third-party entities authorized to issue credentials (KYC, banks).", color: "text-chart-1 bg-chart-1/5 border-chart-1/10" },
              { icon: Wallet, title: "Sovereign Users", desc: "Stellar account holders who request, store, and prove their credentials securely.", color: "text-chart-3 bg-chart-3/5 border-chart-3/10" },
              { icon: Eye, title: "Public Verifiers", desc: "Any client or protocol that validates user statements instantly with zero gas cost.", color: "text-chart-4 bg-chart-4/5 border-chart-4/10" },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="p-6 rounded-2xl border border-border bg-card/35 backdrop-blur-sm hover:bg-card/75 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-lg mb-2">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CALL TO ACTION */}
        <section className="max-w-4xl mx-auto px-6 pb-28 pt-8 text-center relative z-10">
          <div className="p-8 md:p-12 rounded-3xl border border-border/80 bg-gradient-to-br from-card/60 to-muted/40 backdrop-blur-md shadow-xl relative overflow-hidden glow-primary">
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-chart-2/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
            
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 tracking-tight">Ready to verify on Stellar?</h2>
            <p className="text-muted-foreground font-sans text-sm md:text-base max-w-lg mx-auto mb-8">
              Experience the future of financial trust. Connect your Freighter wallet to explore or verify any credential instantly.
            </p>
            <div className="flex justify-center flex-wrap gap-4">
              <Button 
                size="lg" 
                onClick={handleConnectClick} 
                disabled={isConnecting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full shadow-lg px-8 py-6 transition-all duration-300"
              >
                <SiStellar className="w-4.5 h-4.5 mr-2" />
                {isConnecting ? "Signing in..." : "Launch App with Freighter"}
              </Button>
            </div>
          </div>
        </section>

        <footer className="border-t bg-card/45 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="font-serif font-bold text-md tracking-tight">Krydo</span>
            </div>
            <p className="text-xs text-muted-foreground font-sans">
              &copy; 2026 Krydo. Built with Cryptography, Powered by Stellar Soroban.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
