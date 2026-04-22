"use client";
import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    const ps = Array.from({ length: 50 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
        p.x = (p.x + p.vx + w) % w;
        p.y = (p.y + p.vy + h) % h;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const ro = new ResizeObserver(() => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; });
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />;
}

export default function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-32 overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#6366f1] to-[#7c3aed]" ref={ref}>
      <ParticleCanvas />

      {/* Glow orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-900/40 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight"
        >
          Your first 3 agents are free.
          <br />
          <span className="text-white/70">No credit card. Setup in 5 minutes.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="text-xl text-white/70 mb-10 leading-relaxed"
        >
          Join founders who stopped guessing why users drop off — and started fixing it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-4 justify-center mb-8"
        >
          <Link
            href="https://app.useprism.ai/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand font-bold text-lg rounded-xl hover:bg-white/95 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            Start for free →
          </Link>
          <Link
            href="https://cal.com/useprism"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 hover:border-white/60 text-white font-semibold text-lg rounded-xl transition-all hover:bg-white/10"
          >
            Book a 20-min demo
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-white/60 text-sm"
        >
          {["No credit card", "3 agents free", "100 MTU free", "Cancel anytime"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <span className="text-green-300">✓</span> {item}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
