"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function FeatureHealth() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left text */}
          <div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="eyebrow mb-4">
              Operational Visibility
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Green means working.
              <br /><span className="text-red-500">Red means fix this now.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="text-lg text-slate-500 mb-8 leading-relaxed">
              Real-time health panel shows success rate, last 10 sessions with status, average time-to-completion per step, and a 24-hour completion rate with automatic fallback to 7-day window when traffic is low.
            </motion.p>
            <motion.ul initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.3 }} className="space-y-3">
              {[
                "Green / yellow / red health signal",
                "24-hour success rate with 7-day fallback",
                "Avg response time per step",
                "Last 10 sessions (who, when, status)",
                "Zero-completion alert emails when a flow hits 0% in 24h",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-600">
                  <span className="text-brand mt-0.5 flex-shrink-0">✓</span> {item}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* Right - Health panel mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-[#0a0a0f]">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/50" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400/50" />
                  <span className="w-3 h-3 rounded-full bg-green-400/50" />
                </div>
                <span className="text-slate-500 text-xs">Agent Health — Prism Dashboard</span>
              </div>
              <div className="p-5 space-y-5">
                {/* Big status */}
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-3"
                  >
                    <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-green-400 text-base font-bold">Healthy</span>
                  </motion.div>
                  <div>
                    <p className="text-slate-500 text-xs">Success rate (24h)</p>
                    <p className="text-white text-3xl font-black">84%</p>
                  </div>
                </div>

                {/* Bar chart */}
                <div>
                  <p className="text-slate-500 text-xs mb-2 font-medium">Hourly completions (last 12h)</p>
                  <div className="flex items-end gap-1 h-14">
                    {[70, 85, 60, 90, 75, 88, 65, 92, 80, 70, 84, 91].map((v, i) => (
                      <motion.div
                        key={i}
                        initial={{ scaleY: 0 }} animate={inView ? { scaleY: 1 } : {}}
                        transition={{ delay: 0.4 + i * 0.04, duration: 0.4 }}
                        style={{ height: `${v}%` }}
                        className="flex-1 bg-gradient-to-t from-brand to-brand/40 rounded-t-sm origin-bottom"
                      />
                    ))}
                  </div>
                </div>

                {/* Sessions list */}
                <div>
                  <p className="text-slate-500 text-xs mb-2 font-medium uppercase tracking-wide">Last 10 sessions</p>
                  <div className="space-y-1">
                    {[
                      { name: "alice@co.com", time: "2m", status: "completed" },
                      { name: "bob@startup.io", time: "5m", status: "completed" },
                      { name: "carol@saas.co", time: "8m", status: "in progress" },
                      { name: "dave@product.ai", time: "22m", status: "dropped" },
                      { name: "elena@app.com", time: "31m", status: "completed" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/4 transition-colors">
                        <span className="text-slate-400 text-[11px]">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 text-[11px]">{s.time} ago</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            s.status === "completed" ? "bg-green-500/15 text-green-400" :
                            s.status === "in progress" ? "bg-yellow-500/15 text-yellow-400" :
                            "bg-red-500/15 text-red-400"
                          }`}>{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
