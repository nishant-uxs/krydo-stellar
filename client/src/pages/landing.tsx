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
  const [activeTab, setActiveTab] = useState<"issue" | "prove" | "verify">("prove");

  // 1. Mouse coordinates for the background spot light effect
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [trailPos, setTrailPos] = useState({ x: -200, y: -200 });

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

  // 2. Cursor Followback (inertial lagging trail)
  useEffect(() => {
    let animationFrameId: number;
    const updateTrail = () => {
      setTrailPos((prev) => {
        // Easing interpolation (10% speed)
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

  const handleConnectClick = () => {
    connect();
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden stellar-space-bg grid-bg-overlay">
      
      {/* 3. DYNAMIC BACKGROUND SPOTLIGHT LIGHT EFFECT */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 opacity-80"
        style={{
          background: `radial-gradient(700px circle at ${mousePos.x}px ${mousePos.y}px, rgba(56, 189, 248, 0.12), rgba(129, 140, 248, 0.08) 35%, rgba(236, 72, 153, 0.04) 70%, transparent 100%)`
        }}
      />

      {/* 4. GLOWING CURSOR FOLLOWER WITH SMOOTH FOLLOWBACK */}
      <div 
        className="hidden md:block fixed w-8 h-8 rounded-full border-2 border-primary/30 pointer-events-none z-[9999] mix-blend-difference -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${trailPos.x}px`,
          top: `${trailPos.y}px`,
        }}
      >
        <div className="absolute inset-1.5 rounded-full bg-primary/20 animate-ping" />
        <div className="absolute inset-2.5 rounded-full bg-primary/60" />
      </div>

      {/* Absolute Decorative Floating Orbs */}
      <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-primary/5 blur-[100px] animate-float pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-96 h-96 rounded-full bg-chart-2/5 blur-[120px] animate-float-delayed pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] w-80 h-80 rounded-full bg-chart-3/5 blur-[110px] animate-float pointer-events-none" />

      {/* Floating Constellation Stars */}
      <div className="absolute top-[25%] right-[25%] w-2 h-2 rounded-full bg-white/40 blur-[1px] animate-pulse pointer-events-none" />
      <div className="absolute top-[55%] left-[15%] w-1.5 h-1.5 rounded-full bg-white/30 blur-[1px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[30%] right-[18%] w-2 h-2 rounded-full bg-white/50 blur-[1px] animate-pulse pointer-events-none" />

      {/* 5. GORGEOUS GLASS HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/40 backdrop-blur-2xl transition-all duration-300">
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
              className="bg-primary/90 hover:bg-primary text-primary-foreground font-medium rounded-full shadow-md hover:shadow-lg hover:shadow-primary/20 backdrop-blur-md border border-white/10 transition-all duration-300 px-5 h-9"
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
                  className="rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-foreground transition-all duration-300 px-7 py-6 text-base backdrop-blur-md"
                >
                  <Eye className="w-4.5 h-4.5 mr-2 text-muted-foreground" />
                  Verify a Credential
                </Button>
              </motion.div>
            </motion.div>

            {/* 6. INTERACTIVE 3D + DRAGGABLE GLASS SHOWCASE CARD */}
            <motion.div 
              className="lg:col-span-5 relative flex items-center justify-center min-h-[500px] xl:min-h-[550px]"
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Interactive 3D Stellar Orbit Scene behind/around the Card */}
              <div className="absolute inset-0 z-0 flex items-center justify-center opacity-85 scale-110 sm:scale-120 pointer-events-none">
                <Stellar3DScene />
              </div>

              {/* DRAGGABLE FROSTED GLASS CARD WITH SPRING FOLLOWBACK */}
              <motion.div 
                drag={true}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.25}
                whileDrag={{ scale: 1.04, cursor: "grabbing" }}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 180, damping: 20 }}
                className="relative z-10 rounded-3xl border border-white/10 bg-white/5 dark:bg-slate-950/20 backdrop-blur-2xl shadow-3xl p-6 glow-primary w-full max-w-[380px] cursor-grab active:cursor-grabbing select-none"
              >
                {/* Drag Handle Explainer Indicator */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                  <div className="w-8 h-1 rounded-full bg-foreground/30" />
                </div>

                {/* Visual Glass Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 animate-pulse" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 animate-pulse [animation-delay:0.3s]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 animate-pulse [animation-delay:0.6s]" />
                  </div>
                  <Badge variant="outline" className="font-mono text-[9px] tracking-wider text-muted-foreground/80 py-0.5 px-2 bg-white/5 border-white/5 backdrop-blur-md">
                    DRAG ME SNAP_BACK
                  </Badge>
                </div>

                {/* ZK Visual flow interactive display */}
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-white/5 dark:bg-black/20 border border-white/5 backdrop-blur-md">
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
                    <span>secp256k1 Sigma Proof</span>
                  </div>
                  <span>Gasless &amp; Instant</span>
                </div>
              </motion.div>
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
                className="p-8 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-2xl hover:bg-white/10 hover:border-white/10 hover:shadow-2xl transition-all duration-300 glow-card-hover group cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 border ${pillar.color} group-hover:scale-110 transition-transform duration-300`}>
                  <pillar.icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl mb-3 text-foreground">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                  {pillar.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* INTERACTIVE VALUE PROP TABS */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 border-t border-white/5 bg-white/2 backdrop-blur-2xl relative z-10">
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
                      ? "bg-white/5 border-white/10 shadow-md translate-x-1" 
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

            {/* Right Interactive Visual */}
            <div className="lg:col-span-8 border border-white/5 bg-white/5 backdrop-blur-2xl rounded-2xl p-6 md:p-8 min-h-[350px] flex flex-col justify-between relative overflow-hidden">
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
                      <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                        Licensed issuers (like CIBIL, tax departments, or employers) generate a cryptographic claim. 
                        They commit the credential hash to the **KrydoCredentials** Soroban smart contract using Stellar Testnet, while delivering the plaintext securely to the user's browser.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-2xl flex items-center justify-between gap-4 font-mono text-xs">
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
                      <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
                        The user generates a Sigma-protocol proof locally in their browser. 
                        They construct a mathematical statement: "My salary is above threshold X" or "My credit score is above 750". 
                        The raw data never leaves the user's wallet, ensuring absolute self-sovereignty.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                      <div className="p-3 bg-white/5 backdrop-blur-2xl rounded-xl border border-white/5">
                        <span className="text-[9px] text-muted-foreground uppercase block mb-1">Pedersen Commitment</span>
                        <span className="font-bold text-foreground">C = v·G + r·H</span>
                      </div>
                      <div className="p-3 bg-white/5 backdrop-blur-2xl rounded-xl border border-white/5">
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
                      <p className="text-sm text-muted-foreground/80 leading-relaxed font-sans">
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
                className="p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-lg mb-2">{item.title}</h4>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed font-sans">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CALL TO ACTION */}
        <section className="max-w-4xl mx-auto px-6 pb-28 pt-8 text-center relative z-10">
          <div className="p-8 md:p-12 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-2xl shadow-2xl relative overflow-hidden glow-primary">
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

        <footer className="border-t border-white/5 bg-white/2 backdrop-blur-2xl">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="font-serif font-bold text-md tracking-tight">Krydo</span>
            </div>
            <p className="text-xs text-muted-foreground/75 font-sans">
              &copy; 2026 Krydo. Built with Cryptography, Powered by Stellar Soroban.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
