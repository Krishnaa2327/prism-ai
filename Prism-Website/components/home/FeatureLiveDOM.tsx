"use client";
import { useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Zap, MousePointer, ArrowRight, Sparkles, RefreshCw, CheckCircle } from "lucide-react";

const features = [
  { icon: Zap, text: "Fill forms with collected user data" },
  { icon: MousePointer, text: "Click buttons with animated visual feedback" },
  { icon: ArrowRight, text: "Navigate across pages with session continuity" },
  { icon: Sparkles, text: "Spotlight, beacon, and arrow callouts" },
  { icon: RefreshCw, text: "8-strategy self-healing when selectors break" },
  { icon: CheckCircle, text: "Post-action verify loop confirms execution" },
];

const frames = [
  {
    label: "ask_clarification",
    content: (
      <div className="space-y-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-brand/60" />
            <span className="text-white text-sm font-semibold">Prism</span>
          </div>
          <p className="text-slate-300 text-sm mb-3">What&apos;s your primary use case?</p>
          <div className="grid grid-cols-2 gap-2">
            {["B2B SaaS", "E-commerce", "Analytics", "Developer Tool"].map((opt) => (
              <button key={opt} className="px-3 py-2 text-xs text-slate-300 border border-white/10 rounded-lg hover:border-brand/50 hover:text-brand-light transition-all">
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "execute_page_action",
    content: (
      <div className="space-y-3">
        <div className="glass rounded-xl p-4">
          <p className="text-slate-400 text-xs mb-3 font-medium uppercase tracking-wide">Action: fill_form</p>
          <div className="space-y-2">
            <div className="relative">
              <input className="w-full bg-white/5 border border-brand/40 rounded-lg px-3 py-2 text-sm text-white outline-none" value="john@company.com" readOnly />
              <motion.div animate={{ scale: [0.95,1.05,0.95] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-4 bg-brand rounded-sm" />
            </div>
            <motion.div animate={{ x: [-20, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="flex items-center gap-2 text-xs text-brand-light">
              <MousePointer className="w-3 h-3" /> Moving to field...
            </motion.div>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "spotlight",
    content: (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden border border-white/5">
          <div className="p-4 space-y-2">
            <div className="h-2 bg-white/5 rounded w-3/4" />
            <div className="h-2 bg-white/5 rounded w-1/2" />
            <div className="h-2 bg-white/5 rounded w-full" />
          </div>
          <div className="absolute inset-0 bg-black/60" />
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-brand/30 rounded-xl blur-lg" />
              <button className="relative bg-brand text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-brand">
                Connect Source →
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-brand-light text-xs bg-brand/20 px-3 py-1 rounded-full">Click here to save</span>
            </div>
          </motion.div>
        </div>
      </div>
    ),
  },
  {
    label: "complete_step",
    content: (
      <div className="space-y-3">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <motion.div animate={{ scale: [0.8, 1.1, 1] }} transition={{ duration: 0.5 }}
              className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </motion.div>
            <div>
              <p className="text-white text-sm font-semibold">Step 2 complete!</p>
              <p className="text-slate-400 text-xs">Integration connected</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {["Step 1", "Step 2", "Step 3 →"].map((s, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                i < 2 ? "bg-green-500/10 text-green-400" : "bg-brand/10 text-brand-light border border-brand/20"
              }`}>
                <span>{i < 2 ? "✓" : "→"}</span> {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function FeatureLiveDOM() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const frameIndex = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], [0, 1, 2, 3]);
  const [currentFrame, setCurrentFrame] = useState(0);
  frameIndex.on("change", (v) => setCurrentFrame(Math.min(Math.floor(v), frames.length - 1)));
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section className="bg-[#0a0a0f] relative" ref={containerRef} style={{ height: `${frames.length * 100}vh` }}>
      <div className="sticky top-0 h-screen flex items-center overflow-hidden" ref={ref}>
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left sticky text */}
          <div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="eyebrow mb-4">
              Live Actions
            </motion.p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              The AI doesn&apos;t just talk.
              <br /><span className="text-brand">It acts.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Most &ldquo;AI onboarding&rdquo; is a chatbot that gives directions. Prism&apos;s agent scans your live DOM, finds the right element, and executes the action for the user — fill form, click button, highlight UI, navigate pages. The self-healing resolver finds it across 8 fallback strategies.
            </p>
            <ul className="space-y-3">
              {features.map((f, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 text-slate-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-brand" />
                  </div>
                  {f.text}
                </motion.li>
              ))}
            </ul>

            {/* Progress dots */}
            <div className="flex gap-2 mt-10">
              {frames.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentFrame ? "w-8 bg-brand" : "w-2 bg-white/20"}`} />
              ))}
            </div>
          </div>

          {/* Right frame */}
          <div className="relative">
            {/* Browser chrome */}
            <div className="rounded-2xl overflow-hidden border border-white/8 shadow-glass bg-[#1a1a2e]">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 bg-white/2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/50" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400/50" />
                  <span className="w-3 h-3 rounded-full bg-green-400/50" />
                </div>
                <div className="flex-1 h-6 bg-white/5 rounded-md flex items-center px-3">
                  <span className="text-slate-500 text-xs">app.yourproduct.com/onboarding</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-brand/20 border border-brand/30 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-brand" />
                  </div>
                  <span className="text-brand-light text-[11px] font-medium">Prism</span>
                </div>
              </div>

              <div className="p-6 min-h-[300px]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] text-brand-light bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                    {frames[currentFrame].label}
                  </span>
                </div>
                <motion.div
                  key={currentFrame}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {frames[currentFrame].content}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
