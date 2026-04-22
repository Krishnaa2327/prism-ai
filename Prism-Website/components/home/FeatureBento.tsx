"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  MousePointer, Sparkles, CheckCircle, Search,
  Database, Settings, BarChart2, Link as LinkIcon, Plus,
  Lightbulb, MessageSquare,
} from "lucide-react";

/* ─────────────────────────────────────────
   Card 1 — Live DOM Actions (col-span-2)
───────────────────────────────────────── */
function LiveActionsCard() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setStep((s) => (s + 1) % 5), 2200);
    return () => clearTimeout(id);
  }, [step]);

  const emailFilled = step >= 1;
  const buttonClicked = step >= 2;
  const stepDone = step >= 3;

  return (
    <div className="bento-card md:col-span-2 rounded-3xl border border-slate-200 bg-white overflow-hidden relative group hover:border-brand/40 hover:shadow-2xl">
      {/* Gradient accent */}
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-brand/25 via-purple-500/12 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-3">Live Actions</p>
        <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 leading-tight">
          The AI doesn&apos;t just talk.
          <br /><span className="text-brand">It acts.</span>
        </h3>
        <p className="text-slate-400 text-sm mb-7 max-w-md">
          Fills forms, clicks buttons, highlights UI elements — in the user&apos;s live browser. 8 self-healing fallback strategies when selectors break.
        </p>

        {/* Product mockup — browser chrome */}
        <div className="rounded-2xl bg-[#0d1117] border border-white/5 overflow-hidden shadow-xl">
          {/* Chrome bar */}
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 bg-[#161b22]">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            </div>
            <div className="flex-1 h-5 bg-white/5 rounded-md mx-2 flex items-center px-2.5">
              <span className="text-[10px] text-slate-600">app.yourproduct.com/onboarding</span>
            </div>
            <div className="flex items-center gap-1 bg-brand/20 border border-brand/30 rounded-md px-2 py-0.5">
              <Sparkles className="w-2.5 h-2.5 text-brand" />
              <span className="text-[10px] text-brand-light font-semibold">Prism</span>
            </div>
          </div>

          <div className="grid grid-cols-2">
            {/* Left: simulated user app */}
            <div className="p-5 border-r border-white/5 space-y-4">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">User&apos;s screen</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Work email</label>
                  <div className="relative">
                    <input
                      className="w-full bg-white/6 border border-brand/50 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all"
                      value={emailFilled ? "john@company.com" : ""}
                      readOnly
                      placeholder="Enter email..."
                    />
                    {step === 1 && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-px h-3.5 bg-brand"
                      />
                    )}
                  </div>
                </div>
                <motion.button
                  animate={buttonClicked ? { scale: [1, 0.94, 1] } : {}}
                  transition={{ duration: 0.25 }}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    stepDone ? "bg-green-500 text-white" : "bg-brand text-white"
                  }`}
                >
                  {stepDone ? "✓ Saved!" : buttonClicked ? "Saving..." : "Save & Continue"}
                </motion.button>
                {stepDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-[10px] text-green-400"
                  >
                    <CheckCircle className="w-3 h-3" /> Step 1 of 4 complete
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right: agent action log */}
            <div className="p-5 space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Agent log</p>
              <div className="space-y-1.5">
                {[
                  { action: "ask_clarification", done: step >= 0 },
                  { action: "fill_form → email field", done: step >= 1 },
                  { action: "click_element → Save btn", done: step >= 2 },
                  { action: "verify_step → post-action", done: step >= 3 },
                ].map((a, i) => (
                  <div key={i} className={`flex items-center gap-1.5 text-[10px] py-1.5 px-2.5 rounded-lg font-mono transition-all ${
                    a.done ? "text-green-400 bg-green-500/10 border border-green-500/15" : "text-slate-700 bg-white/3"
                  }`}>
                    <span className="text-[8px]">{a.done ? "✓" : "·"}</span>
                    {a.action}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card 2 — Insights (col-span-1)
───────────────────────────────────────── */
function InsightsCard() {
  return (
    <div className="bento-card md:col-span-1 rounded-3xl border border-slate-200 bg-white overflow-hidden relative group hover:border-rose-200 hover:shadow-xl">
      <div className="absolute bottom-0 right-0 w-52 h-52 bg-gradient-to-tl from-rose-400/20 via-pink-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 p-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3" /> Insights
        </p>
        <h3 className="text-xl font-black text-slate-900 mb-2 leading-snug">
          Issues flagged. Gaps suggested.{" "}
          <span className="text-rose-500">Automatically.</span>
        </h3>
        <p className="text-slate-400 text-sm mb-5">
          Prism surfaces blockers and knowledge gaps from real conversations — no manual tagging.
        </p>

        <div className="rounded-2xl bg-[#0d1117] border border-white/5 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">Insights</span>
            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full font-bold">3 high</span>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { label: "Users hitting blockers", sev: "high", color: "text-red-400 bg-red-500/15 border-red-500/15" },
              { label: "Knowledge gap: how-to", sev: "medium", color: "text-amber-400 bg-amber-500/15 border-amber-500/15" },
              { label: "Navigation confusion", sev: "medium", color: "text-amber-400 bg-amber-500/15 border-amber-500/15" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5">
                <p className="text-[11px] text-slate-300 font-medium">{s.label}</p>
                <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-semibold ${s.color}`}>{s.sev}</span>
              </div>
            ))}
          </div>
          <div className="px-3 py-3 border-t border-white/5">
            <p className="text-[10px] text-slate-600 mb-1.5">What users are saying</p>
            {[
              `"I can't find the Settings page"`,
              `"How do I connect my database?"`,
            ].map((q, i) => (
              <div key={i} className="text-[10px] text-slate-400 bg-white/4 border border-white/8 rounded-lg px-2 py-1.5 mb-1">{q}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card 3 — Questions (col-span-1)
───────────────────────────────────────── */
function QuestionsCard() {
  return (
    <div className="bento-card md:col-span-1 rounded-3xl border border-slate-200 bg-white overflow-hidden relative group hover:border-emerald-200 hover:shadow-xl">
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-emerald-400/20 via-green-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 p-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" /> Questions
        </p>
        <h3 className="text-xl font-black text-slate-900 mb-2 leading-snug">
          Every question users ask,{" "}
          <span className="text-emerald-600">in their own words.</span>
        </h3>
        <p className="text-slate-400 text-sm mb-5">
          Clustered by intent. Gaps revealed before they become churn.
        </p>

        <div className="rounded-2xl bg-[#0d1117] border border-white/5 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5">
            <span className="text-[10px] text-slate-500 font-medium">Questions — last 30 days</span>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { intent: "How-to", count: 312, example: "How do I connect Postgres?" },
              { intent: "Stuck", count: 87, example: "I can't find the export button" },
              { intent: "Navigation", count: 54, example: "Where is the Settings page?" },
            ].map((g, i) => (
              <div key={i} className="px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-emerald-400 font-semibold">{g.intent}</span>
                  <span className="text-[9px] text-slate-500">{g.count} questions</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">&quot;{g.example}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card 4 — Knowledge Base (col-span-1)
───────────────────────────────────────── */
function KnowledgeCard() {
  return (
    <div className="bento-card md:col-span-1 rounded-3xl border border-slate-200 bg-white overflow-hidden relative group hover:border-violet-200 hover:shadow-xl">
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-violet-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 p-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500 mb-3">Knowledge Base</p>
        <h3 className="text-xl font-black text-slate-900 mb-5 leading-snug">
          The AI knows your product,{" "}
          <span className="text-violet-600">not just buttons.</span>
        </h3>

        <div className="rounded-2xl bg-[#0d1117] border border-white/5 p-4 space-y-3">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2"
          >
            <Search className="w-3 h-3 text-brand flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">&quot;How do I connect Postgres?&quot;</span>
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-px h-3 bg-brand ml-auto flex-shrink-0" />
          </motion.div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-slate-600 uppercase tracking-wide mb-1.5 font-semibold">BM25</p>
              {["Database guide", "Postgres setup", "Env variables"].map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-1.5 text-slate-500 bg-white/3 rounded-lg px-2 py-1 mb-1">
                  <span className="text-brand text-[8px] font-bold">#{i + 1}</span>{r}
                </motion.div>
              ))}
            </div>
            <div>
              <p className="text-slate-600 uppercase tracking-wide mb-1.5 font-semibold">Vector</p>
              {["Postgres guide", "Data sources", "Integration QS"].map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-1.5 text-slate-500 bg-white/3 rounded-lg px-2 py-1 mb-1">
                  <span className="text-violet-400 text-[8px] font-bold">#{i + 1}</span>{r}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
            <p className="text-[9px] text-brand font-semibold uppercase tracking-wide mb-1">RRF Best match</p>
            <p className="text-white text-[11px] font-medium">Postgres setup guide</p>
            <p className="text-slate-500 text-[10px] mt-0.5">Go to Settings → Data Sources → Add Postgres...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card 5 — MCP Connectors (col-span-1)
───────────────────────────────────────── */
const connectors = [
  { icon: Database, name: "Postgres", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  { icon: Settings, name: "REST API", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { icon: BarChart2, name: "HubSpot", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { icon: LinkIcon, name: "Webhooks", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  { icon: Database, name: "Salesforce", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { icon: Plus, name: "+ Custom", color: "text-brand bg-brand/10 border-brand/20" },
];

function MCPCard() {
  return (
    <div className="bento-card md:col-span-1 rounded-3xl border border-slate-200 bg-white overflow-hidden relative group hover:border-sky-200 hover:shadow-xl">
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-sky-400/15 via-cyan-500/8 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 p-7">
        <p className="text-[11px] font-bold uppercase tracking-widest text-sky-500 mb-3">MCP Connectors</p>
        <h3 className="text-xl font-black text-slate-900 mb-2 leading-snug">
          Give the AI tools,{" "}
          <span className="text-sky-600">not just prompts.</span>
        </h3>
        <p className="text-slate-400 text-sm mb-6">
          Live API calls during onboarding — verify integrations, create resources, check state in real time.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {connectors.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 + 0.2, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.04 }}
              className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-default ${c.color}`}
            >
              <c.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {c.name}
            </motion.div>
          ))}
        </div>

        <p className="text-slate-400 text-xs">
          Built on the{" "}
          <span className="text-slate-300 font-semibold">Model Context Protocol</span>
          {" "}— connect any internal API in minutes.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Section
───────────────────────────────────────── */
export default function FeatureBento() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-28 bg-[#f8fafc]" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section heading — Stripe left-align style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <p className="eyebrow mb-3">Everything you need</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight">
            A complete platform
            <br />
            <span className="text-slate-400 font-normal text-3xl md:text-4xl">for AI-powered onboarding.</span>
          </h2>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <LiveActionsCard />
          <InsightsCard />
          <QuestionsCard />
          <KnowledgeCard />
          <MCPCard />
        </motion.div>
      </div>
    </section>
  );
}
