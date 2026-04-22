"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Edit } from "lucide-react";
import Image from "next/image";

export default function FeatureInbox() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 bg-bg-light" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: -40 }} animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1"
          >
            {/* Dashboard mockup */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-[#0a0a0f]">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/50" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400/50" />
                  <span className="w-3 h-3 rounded-full bg-green-400/50" />
                </div>
                <span className="text-slate-500 text-xs">Failure Inbox — Prism Dashboard</span>
              </div>
              {/* Inbox UI */}
              <div className="grid grid-cols-5">
                {/* Session list */}
                <div className="col-span-2 border-r border-white/5 p-3 space-y-1.5">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wide px-2 py-1">Recent failures</p>
                  {[
                    { name: "Sarah K.", time: "2m ago", dropped: true, expanded: true },
                    { name: "Mark T.", time: "18m ago", dropped: true, expanded: false },
                    { name: "Ana R.", time: "1h ago", dropped: true, expanded: false },
                    { name: "Dev P.", time: "3h ago", dropped: false, expanded: false },
                  ].map((s, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs ${s.expanded ? "bg-white/8 border border-white/10" : "hover:bg-white/4"}`}>
                      <div>
                        <p className={`font-medium ${s.expanded ? "text-white" : "text-slate-400"}`}>{s.name}</p>
                        <p className="text-slate-600">{s.time}</p>
                      </div>
                      {s.dropped && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-medium">dropped</span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Replay */}
                <div className="col-span-3 p-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-xs font-semibold">Sarah K. — Session replay</p>
                    <button className="flex items-center gap-1 text-[10px] text-brand-light bg-brand/10 border border-brand/20 px-2 py-1 rounded-md hover:bg-brand/20 transition-colors">
                      <Edit className="w-2.5 h-2.5" /> Edit prompt
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { role: "ai", text: "Let's connect your data source first.", ok: true },
                      { role: "user", text: "I don't see the Settings option?", ok: true },
                      { role: "ai", text: "Click the gear icon in the top right.", ok: true },
                      { role: "system", text: "⚠ Step failed — user left page", ok: false },
                    ].map((m, i) => (
                      <div key={i} className={`p-2 rounded-lg text-[11px] ${
                        m.role === "system" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                        m.role === "user" ? "bg-white/5 text-slate-300 ml-4" : "text-slate-400"
                      }`}>
                        {!m.ok && "⚠ "}{m.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Text */}
          <div className="order-1 lg:order-2">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="eyebrow mb-4">
              Unique to Prism
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              See exactly what users said before they gave up.
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="text-lg text-slate-500 leading-relaxed mb-8">
              Every session where a user got stuck, dropped off, or triggered a human escalation lands in your Failure Inbox — with the full conversation, which step they were on, and what the AI said right before they left. No other tool shows you this.
            </motion.p>
            <motion.ul initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.3 }} className="space-y-3 mb-8">
              {[
                "Sessions where users dropped mid-flow",
                "Full conversation replay with timestamps",
                "Step where failure occurred, highlighted",
                "AI action that was taken before drop",
                "One-click to edit that step's AI prompt",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-600">
                  <span className="text-brand mt-0.5 flex-shrink-0">✓</span> {item}
                </li>
              ))}
            </motion.ul>
            {/* Callout */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.4 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-amber-800 text-sm leading-relaxed italic">
                ⚡ &ldquo;We found the bug in our onboarding in 20 minutes. Users were being asked for a field we&apos;d already deleted. The inbox caught it.&rdquo;
              </p>
              <p className="text-amber-500 text-xs mt-2">— placeholder until real quote</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
