"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Monitor, BookOpen, Clock, Plug, User } from "lucide-react";

const sources = [
  {
    icon: Monitor,
    label: "Page content",
    desc: "Reads every element — fields, buttons, values, error states — in real time.",
    color: "text-brand bg-brand/10 border-brand/20",
    glow: "from-brand/20",
  },
  {
    icon: BookOpen,
    label: "Knowledge base",
    desc: "Your docs, FAQs, help articles. Referenced instantly, never hallucinated.",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    glow: "from-violet-500/20",
  },
  {
    icon: Clock,
    label: "User history",
    desc: "What the user has done, said, and completed across sessions.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    glow: "from-emerald-500/20",
  },
  {
    icon: Plug,
    label: "MCP / API data",
    desc: "Live data from your backend via MCP servers or direct API calls.",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    glow: "from-sky-500/20",
  },
  {
    icon: User,
    label: "User data",
    desc: "Plan, role, segment — anything you pass via the script tag.",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    glow: "from-amber-500/20",
  },
];

export default function AgentContext() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-28 bg-[#0a0b0f]" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-2xl"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">
            Intelligence layer
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
            What the agent sees
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Prism isn&apos;t guessing. It reads five live context streams before every response — so guidance is always accurate and specific to that user, on that page, right now.
          </p>
        </motion.div>

        {/* Context grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
              className="relative rounded-2xl border border-white/8 bg-white/3 p-6 overflow-hidden group hover:border-white/16 hover:bg-white/5 transition-all duration-300"
            >
              {/* Subtle glow */}
              <div className={`absolute top-0 left-0 w-48 h-48 bg-gradient-to-br ${s.glow} to-transparent blur-3xl opacity-50 pointer-events-none`} />

              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${s.color} mb-4`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{s.label}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}

          {/* Sixth tile — the output */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.1 + sources.length * 0.08 }}
            className="relative rounded-2xl border border-brand/30 bg-brand/8 p-6 overflow-hidden sm:col-span-2 lg:col-span-1"
          >
            <div className="absolute top-0 left-0 w-56 h-56 bg-gradient-to-br from-brand/25 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-brand/20 border border-brand/30 rounded-xl px-3 py-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <span className="text-brand text-xs font-bold">Prism Agent</span>
              </div>
              <h3 className="text-white font-bold text-base mb-2">All five, every turn</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Every response combines all five streams. No stale context, no guessing, no hallucinated instructions.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
