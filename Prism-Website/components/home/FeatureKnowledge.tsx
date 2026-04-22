"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Search } from "lucide-react";

export default function FeatureKnowledge() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 bg-[#0a0a0f] relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-brand/5 rounded-full blur-3xl" />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="eyebrow mb-4">
          Context-Aware AI
        </motion.p>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-bold text-white mb-6">
          The AI knows your product.
          <br /><span className="text-brand">Not just how to click buttons.</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="text-slate-400 text-lg leading-relaxed mb-14">
          Upload your docs, help articles, and internal guides. The agent uses hybrid BM25 + vector search with Reciprocal Rank Fusion to find the right answer in milliseconds.
        </motion.p>

        {/* Search viz animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-8 border border-white/8"
        >
          {/* Query */}
          <motion.div
            animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-8"
          >
            <Search className="w-4 h-4 text-brand" />
            <span className="text-slate-300 text-sm">&quot;How do I connect my Postgres database?&quot;</span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
              className="w-0.5 h-4 bg-brand ml-auto"
            />
          </motion.div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* BM25 */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-medium">BM25 Results</p>
              <div className="space-y-2">
                {["Database setup guide", "Postgres connection", "Environment variables"].map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-2 text-sm text-slate-400 bg-white/3 border border-white/5 rounded-lg px-3 py-2"
                  >
                    <span className="text-brand text-xs font-bold opacity-60">#{i + 1}</span>
                    {r}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Vector */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3 font-medium">Vector Results</p>
              <div className="space-y-2">
                {["Postgres setup guide", "Data source connection", "Integration quickstart"].map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-2 text-sm text-slate-400 bg-white/3 border border-white/5 rounded-lg px-3 py-2"
                  >
                    <span className="text-purple-400 text-xs font-bold opacity-60">#{i + 1}</span>
                    {r}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Arrow merge */}
          <div className="flex items-center justify-center mb-6">
            <motion.div
              animate={{ scale: [0.95, 1.02, 0.95] }} transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-2 text-brand text-sm font-medium"
            >
              <div className="h-px w-16 bg-gradient-to-r from-brand to-purple-400" />
              <span className="px-3 py-1.5 rounded-full bg-brand/10 border border-brand/30">RRF Fusion</span>
              <div className="h-px w-16 bg-gradient-to-l from-brand to-purple-400" />
            </motion.div>
          </div>

          {/* Final result */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.8 }}
            className="bg-brand/10 border border-brand/30 rounded-xl p-4"
          >
            <p className="text-brand-light text-xs uppercase tracking-wide font-medium mb-2">Best match</p>
            <p className="text-white text-sm font-semibold">Database setup guide — Postgres connection</p>
            <p className="text-slate-400 text-xs mt-1">Go to Settings → Data Sources → Add Postgres. Enter your connection string...</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
