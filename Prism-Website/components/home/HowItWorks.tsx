"use client";
import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";

const snippet = `<script>
  window.PrismConfig = {
    apiKey: "YOUR_KEY",
    userId: "{{user.id}}"
  };
</script>
<script src="https://cdn.useprism.ai/widget.js" async></script>`;

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block relative group">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/2">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400/60" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/60" />
          <span className="w-3 h-3 rounded-full bg-green-400/60" />
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-5 text-sm text-slate-300 overflow-x-auto"><code>{code}</code></pre>
    </div>
  );
}

const steps = [
  {
    n: "01",
    label: "Install",
    title: "2 lines of code. That's it.",
    desc: 'Paste into your app\'s <head>. Works with React, Next.js, Vue, plain HTML — anything that runs JavaScript.',
    content: <CodeBlock code={snippet} />,
  },
  {
    n: "02",
    label: "Build",
    title: "Build your flow visually.",
    desc: "Drag steps, set AI prompts, configure actions. No-code builder — deploy changes without a release.",
    content: (
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/60" />
            <span className="w-3 h-3 rounded-full bg-green-400/60" />
          </div>
          <span className="text-slate-400 text-xs ml-2">Flow Builder — Prism Dashboard</span>
        </div>
        <div className="p-6 space-y-3">
          {["Connect data source", "Verify integration", "Create first resource", "Complete setup"].map((step, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
              i === 1 ? "border-brand/40 bg-brand/5 text-brand" : "border-slate-100 text-slate-500 bg-slate-50"
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < 1 ? "bg-green-100 text-green-600" : i === 1 ? "bg-brand text-white" : "bg-slate-100 text-slate-400"
              }`}>{i < 1 ? "✓" : i + 1}</div>
              {step}
              {i === 1 && <span className="ml-auto text-xs text-brand bg-brand/10 px-2 py-0.5 rounded-full">Active</span>}
            </div>
          ))}
          <button className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm hover:border-brand/30 hover:text-brand transition-all">
            + Add step
          </button>
        </div>
      </div>
    ),
  },
  {
    n: "03",
    label: "Watch",
    title: "Watch it work in real time.",
    desc: "See live conversations in your dashboard. Step completions tick in real time. Insights surface drop-off patterns automatically.",
    content: (
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#0a0a0f] border border-white/5 p-4 space-y-3">
          <p className="text-slate-400 text-xs font-medium">Your user sees →</p>
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-brand/60" />
              <span className="text-white text-xs font-semibold">Prism</span>
            </div>
            <div className="bg-white/8 rounded-lg p-2 text-slate-300 text-xs">Click Settings → Integrations</div>
            <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2 }}
              className="bg-brand rounded-lg p-2 text-white text-xs text-center font-medium">
              → Go to Integrations
            </motion.div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <p className="text-slate-400 text-xs font-medium">You see →</p>
          <div className="space-y-2">
            {["Step 1", "Step 2", "Step 3"].map((s, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${i < 2 ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-400"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${i < 2 ? "bg-green-500 text-white" : "bg-slate-200"}`}>{i < 2 ? "✓" : ""}</span>
                {s} {i < 2 ? "✓" : "..."}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="py-28 bg-white" ref={ref}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-14">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="eyebrow mb-4">
            How It Works
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl md:text-5xl font-black text-slate-900">
            Three steps. Zero configuration.
          </motion.h2>
        </div>

        {/* Tab selectors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex gap-2 justify-center mb-10 flex-wrap"
        >
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === i
                  ? "bg-slate-900 text-white shadow-lg scale-[1.02]"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <span className={`text-xs font-bold ${activeTab === i ? "text-slate-400" : "text-slate-300"}`}>{step.n}</span>
              {step.label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl border border-slate-100 bg-[#fafbfc] p-8 md:p-12 shadow-sm"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
              {/* Left text */}
              <div>
                <div className="text-8xl font-black text-slate-100 leading-none mb-5 select-none">{steps[activeTab].n}</div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">{steps[activeTab].title}</h3>
                <p className="text-slate-500 leading-relaxed text-base">{steps[activeTab].desc}</p>
              </div>
              {/* Right content */}
              <div>{steps[activeTab].content}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
