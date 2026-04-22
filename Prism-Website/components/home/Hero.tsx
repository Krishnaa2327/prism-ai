"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Play, Sparkles, ArrowRight } from "lucide-react";

/* ---------- Particle System ---------- */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.4 + 0.05,
      });
    }
    let raf: number;
    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    const ro = new ResizeObserver(() => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; });
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ---------- Animated Widget Panel ---------- */
const chatMessages = [
  { role: "agent", text: "Welcome! I'm here to guide you through setup.", delay: 0.8 },
  { role: "user", text: "Ok, where do I start?", delay: 1.8 },
  { role: "agent", text: "Click Settings → Integrations → Add source", delay: 2.6, action: true },
];

function WidgetPanel({ mouse }: { mouse: { x: number; y: number } }) {
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    chatMessages.forEach((msg, i) => {
      timers.push(setTimeout(() => {
        setTyping(true);
        setTimeout(() => { setVisibleMessages(i + 1); setTyping(false); }, 600);
      }, msg.delay * 1000));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const tiltX = (mouse.y - 0.5) * -8;
  const tiltY = (mouse.x - 0.5) * 8;

  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
      style={{ perspective: "800px" }}
      className="relative"
    >
      <motion.div
        style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        className="relative w-full max-w-sm mx-auto"
      >
        <div className="absolute -inset-10 bg-brand/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative glass rounded-2xl overflow-hidden shadow-glass border border-white/10">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/2">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-brand/80 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Prism</p>
                <p className="text-slate-400 text-[11px]">Step 2 of 4: Connect your data source</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < 2 ? "bg-brand" : "bg-white/20"}`} />
              ))}
            </div>
          </div>
          <div className="h-0.5 bg-white/5">
            <div className="h-full bg-gradient-to-r from-brand to-purple-400 w-1/2" />
          </div>
          <div className="p-4 space-y-3 min-h-[200px]">
            {chatMessages.slice(0, visibleMessages).map((msg, i) => (
              <div key={i} className={`chat-bubble-animate flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 0.05}s` }}>
                {msg.role === "agent" && (
                  <div className="w-6 h-6 rounded-full bg-brand/30 border border-brand/50 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-brand-light" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                  msg.role === "agent"
                    ? msg.action ? "bg-brand/20 border border-brand/30 text-brand-light" : "bg-white/8 text-slate-200"
                    : "bg-brand text-white"
                }`}>
                  {msg.action && <span className="text-[10px] text-brand-light uppercase tracking-wide block mb-1 font-medium">Action</span>}
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand/30 border border-brand/50 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-brand-light" />
                </div>
                <div className="bg-white/8 rounded-xl px-4 py-3 flex gap-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                </div>
              </div>
            )}
          </div>
          {visibleMessages >= 3 && (
            <div className="px-4 pb-4">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="w-full relative overflow-hidden rounded-xl bg-brand text-white text-sm font-semibold py-3 group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4" /> Add source
                </span>
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear", delay: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Wavy Underline ---------- */
function WavyUnderline() {
  return (
    <span className="relative wavy-underline">
      fixes it
      <svg className="absolute -bottom-2 left-0 w-full overflow-visible" height="12" viewBox="0 0 200 12" preserveAspectRatio="none">
        <path d="M0,6 C20,2 40,10 60,6 C80,2 100,10 120,6 C140,2 160,10 180,6 C190,4 196,5 200,6"
          fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/* ---------- Live Session Counter ---------- */
function LiveCounter() {
  const [count, setCount] = useState(1247);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + Math.floor(Math.random() * 3)), 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-300 text-xs font-medium mb-6"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
      </span>
      <span className="tabular-nums font-mono text-green-300">{count.toLocaleString()}</span>
      <span className="text-slate-400">sessions guided today</span>
    </motion.div>
  );
}

/* ---------- Hero ---------- */
export default function Hero() {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  return (
    <section
      className="relative min-h-screen bg-[#050510] flex items-center overflow-hidden pt-16"
      onMouseMove={(e) => setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })}
    >
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid" />

      {/* Aurora gradient blobs — Stripe-level */}
      <div className="mesh-orb absolute top-[-10%] right-[-5%] w-[55vw] h-[55vw] bg-brand/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="mesh-orb-b absolute bottom-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="mesh-orb-c absolute top-[30%] left-[20%] w-[35vw] h-[35vw] bg-pink-500/8 rounded-full blur-[90px] pointer-events-none" />
      <div className="mesh-orb absolute bottom-[10%] right-[25%] w-[25vw] h-[25vw] bg-cyan-500/6 rounded-full blur-[80px] pointer-events-none" />

      {/* Particles */}
      <ParticleCanvas />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-16 lg:gap-8 items-center w-full">
        {/* Left column */}
        <div className="max-w-2xl">
          {/* Live counter badge */}
          <LiveCounter />

          {/* Free tier badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-medium mb-8"
          >
            <span className="text-brand">✦</span>
            Free tier — no credit card required
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6"
          >
            Your users are
            <br />dropping off.
            <br />
            <span className="text-brand">Prism shows you where</span>
            <br />
            — and{" "}
            <WavyUnderline />
            .
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-xl text-slate-400 leading-relaxed mb-10 max-w-xl"
          >
            Embed an AI agent in your SaaS in 2 lines of code. It guides users through onboarding in real time — clicks buttons, fills forms, answers questions. You watch it all from a dashboard that shows you exactly where users get stuck.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-wrap gap-4 mb-8"
          >
            <Link
              href="https://app.useprism.ai/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-bold text-lg rounded-xl transition-all duration-200 shadow-brand hover:shadow-[0_20px_60px_rgba(99,102,241,0.4)] hover:scale-[1.02]"
            >
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="inline-flex items-center gap-2 px-8 py-4 border border-white/15 hover:border-brand/50 text-slate-200 hover:text-white font-semibold text-lg rounded-xl transition-all duration-200 hover:bg-white/5 group">
              <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-brand/20 border border-white/15 flex items-center justify-center transition-colors">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              Watch 3-min demo
            </button>
          </motion.div>

          {/* Micro-copy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-500 text-sm flex flex-wrap gap-x-4 gap-y-1"
          >
            {["Free forever", "3 agents", "100 MTU", "No credit card"].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand inline-block" />
                {item}
              </span>
            ))}
          </motion.p>
        </div>

        {/* Right column — Widget */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full lg:w-[420px] xl:w-[480px]"
        >
          <WidgetPanel mouse={mouse} />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
