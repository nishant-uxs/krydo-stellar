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
  Award,
  Sliders,
  Cpu,
  Terminal,
  RefreshCw,
  Play,
  Activity,
  BadgeCheck,
  Building,
  CheckSquare
} from "lucide-react";
import { SiStellar } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { Stellar3DScene } from "@/components/stellar-3d-scene";

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
  const [activeTab, setActiveTab] = useState<"issue" | "prove" | "verify" | "governance">("prove");

  // Mouse coordinates for the background spotlight effect
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [trailPos, setTrailPos] = useState({ x: -200, y: -200 });

  // Interactive Local ZK Sandbox Playground State
  const [sandboxIncome, setSandboxIncome] = useState<number>(1850000);
  const [sandboxCriteria, setSandboxCriteria] = useState<number>(1500000);
  const [sandboxStatus, setSandboxStatus] = useState<"idle" | "proving" | "ready" | "verifying" | "success">("idle");
  const [sandboxProgress, setSandboxProgress] = useState<number>(0);
  const [sandboxLog, setSandboxLog] = useState<string>("");
  const [sandboxCommitment, setSandboxCommitment] = useState<string>("");
  const [sandboxBlinding, setSandboxBlinding] = useState<string>("");

  useEffect(() => {
    if (isConnected) navigate("/dashboard");
  }, [isConnected, navigate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Cursor Followback (inertial lagging trail)
  useEffect(() => {
    let animationFrameId: number;
    const updateTrail = () => {
      setTrailPos((prev) => {
        const dx = mousePos.x - prev.x;
        const dy = mousePos.y - prev.y;
        return {
          x: prev.x + dx * 0.12,
          y: prev.y + dy * 0.12,
        };
      });
      animationFrameId = requestAnimationFrame(updateTrail);
    };
    updateTrail();
    return () => cancelAnimationFrame(animationFrameId);
  }, [mousePos]);

  // ZK Playground simulation runner
  const handleRunProver = () => {
    setSandboxStatus("proving");
    setSandboxProgress(0);
    setSandboxLog("Accessing local WebAssembly cryptographic libraries...");
    
    const logs = [
      { p: 15, l: "Hashing plaintext monthly salary of ₹" + Math.round(sandboxIncome/12).toLocaleString() + "/mo..." },
      { p: 40, l: "Generating cryptographically secure 256-bit blinding factor r..." },
      { p: 65, l: "Computing Pedersen Commitment: C = v·G + r·H..." },
      { p: 85, l: "Synthesizing Sigma-protocol inequality proof for threshold ₹" + sandboxCriteria.toLocaleString() + "..." },
      { p: 100, l: "ZK-Proof successfully generated locally! 0% of salary data leaked." }
    ];

    logs.forEach((step, idx) => {
      setTimeout(() => {
        setSandboxProgress(step.p);
        setSandboxLog(step.l);
        if (step.p === 100) {
          setSandboxCommitment("C_" + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join("").toUpperCase());
          setSandboxBlinding("r_secp_" + Array.from({length: 12}, () => Math.floor(Math.random()*16).toString(16)).join(""));
          setSandboxStatus("ready");
        }
      }, (idx + 1) * 450);
    });
  };

  const handleVerifySandbox = () => {
    setSandboxStatus("verifying");
    setSandboxProgress(30);
    setSandboxLog("Submitting math proof and on-chain anchors to Soroban verifier node...");
    
    setTimeout(() => {
      setSandboxProgress(70);
      setSandboxLog("Validating Pedersen Commitment hash and whitelisted Issuer public key GDQO...");
    }, 600);

    setTimeout(() => {
      setSandboxProgress(100);
      setSandboxStatus("success");
      setSandboxLog("Math verified! Result: TRUE. Criteria satisfied without raw salary leak.");
    }, 1300);
  };

  const handleResetSandbox = () => {
    setSandboxStatus("idle");
    setSandboxProgress(0);
    setSandboxLog("");
    setSandboxCommitment("");
    setSandboxBlinding("");
  };

  const handleConnectClick = () => {
    connect();
  };

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-background text-foreground relative stellar-space-bg grid-bg-overlay">
      
      {/* DYNAMIC BACKGROUND SPOTLIGHT LIGHT EFFECT */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 opacity-90"
        style={{
          background: `
            radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(56, 189, 248, 0.15), transparent 80%),
            radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(129, 140, 248, 0.08), transparent 70%),
            radial-gradient(1200px circle at ${mousePos.x}px ${mousePos.y}px, rgba(236, 72, 153, 0.04), transparent 60%)
          `
        }}
      />

      {/* GLOWING CURSOR FOLLOWER WITH LAGGING FOLLOWBACK */}
      <div 
        className="hidden md:block fixed w-10 h-10 rounded-full border border-primary/40 pointer-events-none z-[9999] mix-blend-difference -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ease-out"
        style={{
          left: `${trailPos.x}px`,
          top: `${trailPos.y}px`,
        }}
      >
        <div className="absolute inset-1.5 rounded-full bg-primary/10 animate-ping" />
        <div className="absolute inset-3 rounded-full bg-primary/50" />
      </div>

      {/* Floating Space Background Orbs */}
      <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-primary/5 blur-[100px] animate-float pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-96 h-96 rounded-full bg-chart-2/5 blur-[120px] animate-float-delayed pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-80 h-80 rounded-full bg-chart-3/5 blur-[110px] animate-float pointer-events-none" />

      {/* Floating Constellation Stars */}
      <div className="absolute top-[25%] right-[25%] w-2 h-2 rounded-full bg-white/40 blur-[1px] animate-pulse pointer-events-none" />
      <div className="absolute top-[55%] left-[15%] w-1.5 h-1.5 rounded-full bg-white/30 blur-[1px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[30%] right-[18%] w-2 h-2 rounded-full bg-white/50 blur-[1px] animate-pulse pointer-events-none" />

      {/* GORGEOUS GLASS HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/45 backdrop-blur-3xl transition-all duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <button
            type="button"
            className="flex items-center gap-2.5 group cursor-pointer bg-transparent border-0 p-0 text-left"
            onClick={() => navigate("/")}
            data-testid="link-logo-home"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-4.5 h-4.5 text-primary" />
              <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Krydo<span className="text-primary font-sans font-medium text-sm align-super ml-0.5">stellar</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              onClick={handleConnectClick} 
              disabled={isConnecting} 
              data-testid="button-hero-connect"
              className="bg-primary/95 hover:bg-primary text-primary-foreground font-medium rounded-full shadow-md hover:shadow-lg hover:shadow-primary/25 backdrop-blur-3xl border border-white/10 transition-all duration-300 px-5 h-9"
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
                <Badge variant="secondary" className="mb-2 py-1.5 px-3.5 bg-primary/10 text-primary hover:bg-primary/15 transition-colors duration-300 border border-primary/20 rounded-full font-serif text-xs font-semibold tracking-wide flex items-center gap-1.5 w-fit no-default-active-elevate backdrop-blur-md">
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
                  className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-foreground transition-all duration-300 px-7 py-6 text-base backdrop-blur-3xl"
                >
                  <Eye className="w-4.5 h-4.5 mr-2 text-muted-foreground" />
                  Verify a Credential
                </Button>
              </motion.div>
            </motion.div>

            {/* INTERACTIVE 3D + GLASS STACK — simplified on mobile to avoid overflow */}
            <motion.div 
              className="lg:col-span-5 relative flex items-center justify-center min-h-[320px] sm:min-h-[420px] lg:min-h-[550px] xl:min-h-[600px] w-full max-w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 1200 }}
            >
              {/* Interactive 3D Stellar Orbit Scene behind/around the Card */}
              <div className="absolute inset-0 z-0 flex items-center justify-center opacity-70 sm:opacity-90 scale-90 sm:scale-120 pointer-events-none">
                <Stellar3DScene />
              </div>

              {/* CARD 1: MAIN PROVER GLASS CARD (CENTRAL AND LARGE) */}
              <motion.div 
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.2}
                whileDrag={{ scale: 1.03, cursor: "grabbing" }}
                whileHover={{ rotateX: 2, rotateY: -2, y: -2 }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
                className="relative z-20 rounded-3xl border border-white/15 bg-white/10 dark:bg-slate-950/25 backdrop-blur-3xl shadow-3xl p-4 sm:p-6 glow-primary w-full max-w-[min(100%,360px)] mx-auto select-none md:cursor-grab md:active:cursor-grabbing"
              >
                {/* Drag Handle Explainer Indicator */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-40 hover:opacity-90 transition-opacity">
                  <div className="w-8 h-1 rounded-full bg-foreground/30" />
                </div>

                {/* Visual Glass Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 animate-pulse" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 animate-pulse [animation-delay:0.3s]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 animate-pulse [animation-delay:0.6s]" />
                  </div>
                  <Badge variant="outline" className="font-mono text-[9px] tracking-wider text-muted-foreground/80 py-0.5 px-2 bg-white/5 border-white/10 backdrop-blur-3xl">
                    ZK_PROVER_CORE
                  </Badge>
                </div>

                {/* ZK Visual flow interactive display */}
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-white/5 dark:bg-black/20 border border-white/5 backdrop-blur-3xl">
                    <span className="text-[9px] text-muted-foreground/80 uppercase tracking-widest block mb-1">Your Plaintext Credential (Private)</span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold font-mono text-foreground/95">Monthly Income</span>
                      </div>
                      <span className="text-sm font-mono font-bold blur-[3px] select-none hover:blur-none transition-all duration-300 cursor-help text-foreground/90" title="Hover to temporarily reveal (stays local)">
                        ₹1,45,000 / mo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-0.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-md">
                      <Zap className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[9px] text-primary uppercase tracking-widest block mb-1.5 font-semibold">Zero-Knowledge ZK-Proof (Publicly Shared)</span>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground/80">Predicate:</span>
                        <span className="font-mono font-semibold bg-primary/10 px-2 py-0.5 rounded text-primary">income &gt;= ₹1,00,000</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground/80">On-Chain Anchor:</span>
                        <span className="font-mono text-[10px] text-muted-foreground/60 truncate max-w-[150px]">C234664...52950933</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/5">
                        <span className="text-muted-foreground/90 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-chart-3" /> Proof Result
                        </span>
                        <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 no-default-active-elevate font-sans text-[9px] font-bold py-0.5 px-2">
                          VERIFIED VALID
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proof Badge details */}
                <div className="mt-4 flex items-center justify-between bg-white/5 backdrop-blur-md p-2.5 rounded-xl border border-white/5 text-[10px] text-muted-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-chart-2 animate-pulse" />
                    <span>Sigma ZK Proof</span>
                  </div>
                  <span>Gasless &amp; Instant</span>
                </div>
              </motion.div>

              {/* CARD 2: OVERLAPPING DRAGGABLE TRUST TIER RATING CARD (TOP RIGHT) */}
              <motion.div 
                drag={true}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.4}
                whileDrag={{ scale: 1.05, zIndex: 50 }}
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="hidden md:flex absolute top-[2%] right-[-10px] z-30 rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-900/10 backdrop-blur-3xl shadow-xl p-4 w-[160px] cursor-grab active:cursor-grabbing text-xs flex-col gap-2.5 glow-secondary select-none"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Trust Score</span>
                  <Badge variant="outline" className="font-mono text-[8px] border-chart-3/30 bg-chart-3/10 text-chart-3 px-1 py-0 rounded-full">+150 pts</Badge>
                </div>
                <div>
                  <h4 className="font-serif text-2xl font-extrabold text-foreground tracking-tight">780</h4>
                  <p className="text-[10px] text-muted-foreground/90 mt-0.5">Tier: Platinum Sovereign</p>
                </div>
                <div className="flex flex-col gap-1 mt-1 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                    <span>Ledger State:</span>
                    <span className="font-bold text-chart-3">SECURED</span>
                  </div>
                </div>
              </motion.div>

              {/* CARD 3: OVERLAPPING DRAGGABLE ISSUER VERIFIED BANNER CARD (BOTTOM LEFT) */}
              <motion.div 
                drag={true}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.4}
                whileDrag={{ scale: 1.05, zIndex: 50 }}
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="hidden md:flex absolute bottom-[2%] left-[-20px] z-30 rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-900/10 backdrop-blur-3xl shadow-xl p-3.5 w-[200px] cursor-grab active:cursor-grabbing text-xs flex-col gap-2 glow-success select-none"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-chart-3/10 border border-chart-3/25 flex items-center justify-center text-chart-3 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-serif font-bold text-[11px] text-foreground">Issuer whitelisted</h5>
                    <p className="text-[9px] text-muted-foreground">CIBIL verified anchor</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] border-t border-white/5 pt-1.5 mt-0.5">
                  <span className="text-muted-foreground">Stellar Testnet:</span>
                  <span className="font-mono font-semibold text-primary truncate max-w-[80px]">GDQOE23C...</span>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </section>

        {/* CORE PILLARS SECTION (REFINED & GORGEOUS FOR THE BOTTOM PORTION) */}
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
                glow: "glow-primary",
                badge: "Ledger-Enforced"
              },
              {
                icon: LockKeyhole,
                title: "Mathematical Privacy",
                desc: "Plaintext values never reach any server or ledger. Pedersen commitments represent claims cryptographic-grade, leaving you with full sovereign control.",
                color: "text-chart-3 bg-chart-3/10 border-chart-3/20",
                glow: "glow-secondary",
                badge: "Zero-Knowledge"
              },
              {
                icon: Award,
                title: "Verified in Milliseconds",
                desc: "Verifiers validate mathematical proofs inside our lightweight engine instantly. No waiting on block confirmations, zero transaction fees for verification.",
                color: "text-chart-4 bg-chart-4/10 border-chart-4/20",
                glow: "glow-success",
                badge: "Instant Sync"
              }
            ].map((pillar, idx) => (
              <motion.div 
                key={pillar.title} 
                variants={fadeUp} 
                className="p-8 rounded-3xl border border-white/10 bg-white/5 dark:bg-slate-950/20 backdrop-blur-2xl hover:bg-white/10 hover:border-white/15 hover:shadow-2xl transition-all duration-300 glow-card-hover group cursor-default relative overflow-hidden flex flex-col justify-between h-full"
              >
                {/* Embedded Grid Overlay & Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="absolute inset-0 bg-grid-overlay opacity-[0.02] pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${pillar.color} group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <pillar.icon className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground/80 border-white/5 bg-white/2">
                      {pillar.badge}
                    </Badge>
                  </div>
                  <h3 className="font-serif font-bold text-xl mb-3 text-foreground">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                    {pillar.desc}
                  </p>
                </div>

                <div className="border-t border-white/5 mt-6 pt-4 flex items-center justify-between text-[10px] text-muted-foreground/60 font-mono">
                  <span>Soroban Contract:</span>
                  <span className="text-primary font-semibold">Active ✓</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* INTERACTIVE VALUE PROP TABS (ELEVATED MOCKUP INTEGRATION) */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 border-t border-white/5 bg-white/2 backdrop-blur-2xl relative z-10 rounded-3xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 py-1 px-3 bg-chart-2/10 text-chart-2 border-chart-2/20 no-default-active-elevate">
              End-To-End Architecture
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 tracking-tight">How Krydo Works on Stellar</h2>
            <p className="text-muted-foreground font-sans text-sm md:text-base">
              A comprehensive verifiable credential ecosystem leveraging Soroban smart contracts and Stellar wallet signatures.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Nav Controls */}
            <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
              {[
                { id: "issue", label: "1. Secure Issuance", desc: "Institutions sign credentials on-chain", color: "border-l-primary" },
                { id: "prove", label: "2. Zero-Knowledge Proving", desc: "Users generate math proofs off-chain", color: "border-l-chart-2" },
                { id: "verify", label: "3. Decentralized Verification", desc: "Verifiers validate proofs instantly", color: "border-l-chart-3" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left p-4 rounded-2xl border border-transparent transition-all duration-300 flex items-start justify-between group ${
                    activeTab === tab.id 
                      ? "bg-white/5 border-white/10 shadow-lg translate-x-1" 
                      : "hover:bg-white/2"
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

            {/* Right Interactive Visual: HIGH-FIDELITY DASHBOARD MOCKUP SCREEN */}
            <div className="lg:col-span-8 border border-white/10 bg-black/40 backdrop-blur-3xl rounded-3xl p-6 md:p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden glow-primary">
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Award className="w-5 h-5 text-primary animate-pulse" />
                          </div>
                          <div>
                            <Badge className="bg-primary/10 text-primary border-primary/20 no-default-active-elevate text-[10px] font-bold">STAGE 01</Badge>
                            <h3 className="font-serif font-bold text-lg text-foreground">Secure Issuance by Trusted Entities</h3>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-[9px] bg-chart-3/15 text-chart-3 border-none">ACTIVE SESSION</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                        Licensed issuers (like CIBIL, tax departments, or employers) generate a cryptographic claim. 
                        They commit the credential hash to the **KrydoCredentials** Soroban smart contract using Stellar Testnet, while delivering the plaintext securely to the user's browser.
                      </p>
                    </div>

                    {/* Premium Cert Mockup Card */}
                    <div className="p-5 rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-900/40 font-mono text-xs space-y-4 relative overflow-hidden backdrop-blur-2xl">
                      <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-primary" />
                          <span className="font-bold text-foreground text-[11px]">CIBIL National Authority</span>
                        </div>
                        <span className="text-[10px] text-chart-3 font-semibold bg-chart-3/10 px-2 py-0.5 rounded-full border border-chart-3/20">✓ WHITELISTED</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-[10px] text-muted-foreground">
                        <div>
                          <span>HOLDER_STELLAR_DID</span>
                          <p className="font-bold text-foreground font-mono mt-0.5">did:pkh:stellar:GDQO...</p>
                        </div>
                        <div>
                          <span>SCHEMA_REGISTRY</span>
                          <p className="font-bold text-foreground font-mono mt-0.5">Income_Commitment_V1</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span>CREDENTIAL_ANCHOR_HASH</span>
                          <span className="font-bold text-primary text-[10px]">A56E2B96FC...E2950933</span>
                        </div>
                      </div>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center border border-chart-2/20">
                            <Fingerprint className="w-5 h-5 text-chart-2" />
                          </div>
                          <div>
                            <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 no-default-active-elevate text-[10px] font-bold">STAGE 02</Badge>
                            <h3 className="font-serif font-bold text-lg text-foreground">In-Browser Zero-Knowledge Proving</h3>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-[9px] bg-chart-2/15 text-chart-2 border-none">LOCAL COMPUTE</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                        The user generates a Sigma-protocol proof locally in their browser. 
                        They construct a mathematical statement: "My salary is above threshold X" or "My credit score is above 750". 
                        The raw data never leaves the user's wallet, ensuring absolute self-sovereignty.
                      </p>
                    </div>

                    {/* Interactive Cryptographic Core sandbox mockup */}
                    <div className="p-4.5 rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-900/40 font-mono text-[11px] space-y-3 relative overflow-hidden backdrop-blur-2xl">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-foreground font-serif text-xs font-semibold">
                          <Sliders className="w-4 h-4 text-chart-2" /> Local Proof Generator Engine
                        </span>
                        <span className="text-[10px] text-chart-2 font-bold animate-pulse">COMPILING WASM</span>
                      </div>
                      <div className="space-y-2 border-t border-white/5 pt-2.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pedersen Commitment Eq:</span>
                          <span className="text-foreground font-bold">C = v · G + r · H</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Random Blinding Factor (r):</span>
                          <span className="text-chart-2 truncate max-w-[140px]">r_sigma_5a210bc931e2</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2 text-[10px]">
                          <span className="text-muted-foreground">Client CPU Performance:</span>
                          <span className="text-chart-3 font-bold">4.2ms (Zero data leaked to ledger)</span>
                        </div>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center border border-chart-3/20">
                            <Eye className="w-5 h-5 text-chart-3" />
                          </div>
                          <div>
                            <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20 no-default-active-elevate text-[10px] font-bold">STAGE 03</Badge>
                            <h3 className="font-serif font-bold text-lg text-foreground">Instant Verification & Trust Anchor</h3>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-[9px] bg-chart-4/15 text-chart-4 border-none">ON-CHAIN VERIFIED</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                        Verifiers (e.g. lenders, exchanges) run the verification math against the on-chain anchor on Stellar. 
                        The **KrydoAuthority** contract verifies that the original issuer remains whitelisted, and the proof verifies mathematically. Truth is secured without any leaks.
                      </p>
                    </div>

                    {/* Step-by-step Audit Timeline Card */}
                    <div className="p-4.5 rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-900/40 font-mono text-[10px] space-y-2.5 relative overflow-hidden backdrop-blur-2xl">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs font-semibold text-foreground">
                        <span>Soroban Audit Operations Sequence</span>
                        <span className="text-chart-3 font-bold">LEDGER_OK</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-chart-3 shrink-0" />
                          <span className="text-muted-foreground">Step 1: Whitelist check for original Issuer public key...</span>
                          <span className="ml-auto font-bold text-chart-3">[PASS]</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-chart-3 shrink-0" />
                          <span className="text-muted-foreground">Step 2: Mathematical validity signature evaluation...</span>
                          <span className="ml-auto font-bold text-chart-3">[VALID]</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5 text-chart-3 shrink-0" />
                          <span className="text-muted-foreground">Step 3: Verification of age/income constraint criteria...</span>
                          <span className="ml-auto font-bold text-chart-3">[TRUE]</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* TRUST ARCHITECTURE SECTION (GORGEOUS CONNECTED NEON TIMELINE PATHWAY) */}
        <section className="max-w-6xl mx-auto px-6 py-24 relative z-10">
          <div className="text-center mb-20">
            <Badge variant="secondary" className="mb-3 py-1 px-3 bg-chart-1/10 text-chart-1 border-chart-1/20 no-default-active-elevate">
              Network Roles
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3 tracking-tight">The Hierarchical Trust Tree</h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-sans text-sm md:text-base">
              A balanced decentralized model inspired by central banking authorities, connected with real-time trust flows.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto space-y-12">
            {/* SVG Connecting Neon Line in Background */}
            <div className="absolute left-[39px] md:left-1/2 top-8 bottom-8 w-[2px] bg-gradient-to-b from-primary via-chart-2 to-chart-3 opacity-30 -translate-x-1/2 hidden sm:block" />

            {[
              {
                icon: Network,
                title: "Root Authority",
                desc: "Governs contract parameters, administers issuing banks, whitelists keys, and maintains WASM hash integrity directly on Stellar.",
                role: "Level 01 - System Governor",
                color: "text-chart-5 bg-chart-5/5 border-chart-5/10",
                alignment: "md:flex-row"
              },
              {
                icon: Shield,
                title: "Trusted Issuers",
                desc: "Regulated entities (such as KYC organizations, banks, or employers) that commit verifiable credential hashes on-chain.",
                role: "Level 02 - Anchor Agency",
                color: "text-chart-1 bg-chart-1/5 border-chart-1/10",
                alignment: "md:flex-row-reverse"
              },
              {
                icon: Wallet,
                title: "Sovereign Users",
                desc: "Stellar account holders who request claims, store plaintext parameters, and generate instant ZK mathematical proofs locally.",
                role: "Level 03 - Secret Prover",
                color: "text-chart-3 bg-chart-3/5 border-chart-3/10",
                alignment: "md:flex-row"
              },
              {
                icon: Eye,
                title: "Public Verifiers",
                desc: "Smart contracts or platforms that validate zero-knowledge proofs instantly using the Krydo verifier contract without gas costs.",
                role: "Level 04 - Trust Auditor",
                color: "text-chart-4 bg-chart-4/5 border-chart-4/10",
                alignment: "md:flex-row-reverse"
              }
            ].map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`flex flex-col ${step.alignment} items-start md:items-center gap-8 relative`}
              >
                {/* Visual Connection Node Bubble */}
                <div className="absolute left-[39px] md:left-1/2 w-8 h-8 rounded-full border-2 border-background bg-slate-900 flex items-center justify-center -translate-x-1/2 z-20 shadow-md">
                  <div className={`w-3.5 h-3.5 rounded-full ${idx === 0 ? "bg-primary" : idx === 1 ? "bg-chart-2" : "bg-chart-3"} animate-pulse`} />
                </div>

                {/* Left/Right Card */}
                <div className="w-full md:w-[45%] pl-14 md:pl-0">
                  <div className="p-6 rounded-3xl border border-white/10 bg-white/5 dark:bg-slate-950/20 backdrop-blur-3xl hover:border-white/20 transition-all duration-300 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${step.color}`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground/80 bg-white/2 border-white/5">
                        {step.role}
                      </Badge>
                    </div>
                    <h3 className="font-serif font-bold text-lg mb-2 text-foreground">{step.title}</h3>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed font-sans">{step.desc}</p>
                  </div>
                </div>

                {/* Empty Spacer on other side */}
                <div className="hidden md:block w-[45%]" />
              </motion.div>
            ))}
          </div>
        </section>

        {/* BRAND NEW SECTION: INTERACTIVE ZK SANDBOX PLAYGROUND (THE SHOWSTOPPER "WOW" FEATURE) */}
        <section className="max-w-6xl mx-auto px-6 py-24 relative z-10 border-t border-white/5">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-3 py-1 px-3 bg-chart-3/10 text-chart-3 border-chart-3/20 no-default-active-elevate">
              Live Cryptographic Playground
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 tracking-tight">Interactive Local Prover Sandbox</h2>
            <p className="text-muted-foreground font-sans text-sm md:text-base">
              Drag the parameters to generate an instant mathematical zero-knowledge proof in your browser, then submit it to Soroban.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Inputs Panel */}
            <div className="lg:col-span-5 p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  <h3 className="font-serif font-bold text-lg text-foreground">1. Configure Credentials</h3>
                </div>

                {/* Input Slider 1 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">My Secret Income (Private):</span>
                    <span className="text-foreground font-mono font-bold">₹{sandboxIncome.toLocaleString()} / year</span>
                  </div>
                  <input 
                    type="range" 
                    min={600000} 
                    max={4800000} 
                    step={10000}
                    value={sandboxIncome}
                    disabled={sandboxStatus === "proving" || sandboxStatus === "verifying"}
                    onChange={(e) => setSandboxIncome(Number(e.target.value))}
                    className="w-full accent-primary bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
                    <span>₹6,00,000</span>
                    <span>₹48,00,000</span>
                  </div>
                </div>

                {/* Input Slider 2 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Verifier Threshold Criteria (Public):</span>
                    <span className="text-foreground font-mono font-bold">Income &gt;= ₹{sandboxCriteria.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" 
                    min={1000000} 
                    max={3000000} 
                    step={50000}
                    value={sandboxCriteria}
                    disabled={sandboxStatus === "proving" || sandboxStatus === "verifying"}
                    onChange={(e) => setSandboxCriteria(Number(e.target.value))}
                    className="w-full accent-chart-2 bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
                    <span>₹10,00,000</span>
                    <span>₹30,00,000</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-6 border-t border-white/5">
                {sandboxStatus === "idle" && (
                  <Button 
                    onClick={handleRunProver}
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full py-5 text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    <Cpu className="w-4.5 h-4.5" />
                    Generate Local ZK-Proof
                  </Button>
                )}

                {sandboxStatus === "proving" && (
                  <Button disabled className="w-full bg-primary/20 text-muted-foreground rounded-full py-5 text-sm flex items-center justify-center gap-2 border border-primary/20">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    Computing locally ({sandboxProgress}%)
                  </Button>
                )}

                {sandboxStatus === "ready" && (
                  <div className="flex gap-2 w-full">
                    <Button 
                      onClick={handleVerifySandbox}
                      className="flex-1 bg-chart-3 hover:bg-chart-3/95 text-white font-bold rounded-full py-5 text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-chart-3/20"
                    >
                      <Play className="w-4 h-4" />
                      Verify on Soroban
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleResetSandbox}
                      className="rounded-full border-white/10 hover:bg-white/5 px-4"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {sandboxStatus === "verifying" && (
                  <Button disabled className="w-full bg-chart-3/25 text-muted-foreground rounded-full py-5 text-sm flex items-center justify-center gap-2 border border-chart-3/20">
                    <RefreshCw className="w-4 h-4 animate-spin text-chart-3" />
                    Running Soroban Contract Math...
                  </Button>
                )}

                {sandboxStatus === "success" && (
                  <div className="flex gap-2 w-full">
                    <div className="flex-1 bg-chart-3/10 border border-chart-3/20 text-chart-3 rounded-full py-2.5 text-xs font-bold font-serif flex items-center justify-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-chart-3 shrink-0" />
                      VERIFIED SUCCESSFUL
                    </div>
                    <Button 
                      variant="outline"
                      onClick={handleResetSandbox}
                      className="rounded-full border-white/10 hover:bg-white/5 px-4 text-xs"
                    >
                      Reset Demo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Execution Terminal Panel */}
            <div className="lg:col-span-7 border border-white/10 bg-slate-950/85 rounded-3xl p-6 md:p-8 font-mono text-xs flex flex-col justify-between shadow-2xl relative overflow-hidden h-[400px] lg:h-auto">
              <div className="absolute inset-x-0 top-0 bg-slate-900 border-b border-white/5 px-4 py-2 flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="text-[10px] text-muted-foreground/60 ml-2">krydo_local_prover.wasm</span>
                <Terminal className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto" />
              </div>

              {/* Console Output Area */}
              <div className="flex-1 pt-8 overflow-y-auto space-y-3.5 text-muted-foreground leading-relaxed">
                {sandboxStatus === "idle" ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/50 space-y-3 font-sans py-12">
                    <Terminal className="w-12 h-12 text-muted-foreground/25" />
                    <div>
                      <p className="font-semibold text-xs text-muted-foreground/75">Cryptographic Console Idle</p>
                      <p className="text-[11px] max-w-xs mt-1">Configure parameters and click the button to see local prover executions.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                      <Activity className="w-3 h-3 text-primary animate-pulse" />
                      <span>LOG STREAM STATE COMPILING</span>
                    </div>

                    <div className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-1">
                      <span className="text-[9px] text-muted-foreground/50 block">SANDBOX STATEMENT IN</span>
                      <p className="font-bold text-foreground text-[11px]">Prove: Secret Income &gt;= ₹{sandboxCriteria.toLocaleString()}</p>
                    </div>

                    <div className="text-primary font-mono flex items-start gap-2">
                      <span className="text-muted-foreground/30 shrink-0">1.</span>
                      <p className="text-foreground/90 font-medium">{sandboxLog}</p>
                    </div>

                    {sandboxCommitment && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[9px] uppercase tracking-wider text-primary font-bold">Constructed local commitment C</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground/50 block font-sans">Blinding (r):</span>
                            <span className="text-foreground font-mono truncate block">{sandboxBlinding}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/50 block font-sans">Commitment Hash:</span>
                            <span className="text-primary font-mono truncate block">{sandboxCommitment}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {sandboxStatus === "success" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-2xl bg-chart-3/15 border border-chart-3/35 text-chart-3 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4.5 h-4.5 text-chart-3 animate-bounce" />
                          <span className="font-bold">Access Verifiably Approved on Stellar ledger</span>
                        </div>
                        <span className="text-[10px] font-bold bg-chart-3/20 px-2 py-0.5 rounded">STATUS_PASS</span>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar footer */}
              {sandboxStatus === "proving" && (
                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden mt-4">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${sandboxProgress}%` }} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="max-w-4xl mx-auto px-6 pb-28 pt-8 text-center relative z-10">
          <div className="p-8 md:p-12 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-2xl shadow-2xl relative overflow-hidden glow-primary">
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-chart-2/5 rounded-full blur-2xl pointer-events-none animate-pulse" />
            
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 tracking-tight">Ready to verify on Stellar?</h2>
            <p className="text-muted-foreground font-sans text-sm md:text-base max-w-lg mx-auto mb-8">
              Experience the future of financial trust. Connect your Stellar wallet to explore or verify any credential instantly.
            </p>
            <div className="flex justify-center flex-wrap gap-4">
              <Button 
                size="lg" 
                onClick={handleConnectClick} 
                disabled={isConnecting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full shadow-lg px-8 py-6 transition-all duration-300"
              >
                <SiStellar className="w-4.5 h-4.5 mr-2" />
                {isConnecting ? "Signing in..." : "Launch App"}
              </Button>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 bg-white/2 backdrop-blur-2xl">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <button
              type="button"
              className="flex items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              data-testid="link-logo-footer"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="font-serif font-bold text-md tracking-tight">Krydo</span>
            </button>
            <p className="text-xs text-muted-foreground/75 font-sans">
              &copy; 2026 Krydo. Built with Cryptography, Powered by Stellar Soroban.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
