"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Sparkles, Plus, ArrowRight } from "lucide-react";

const stepTypes = [
  { id: "guide", label: "Guide step", icon: "💬", desc: "The AI explains a concept or walks through a UI action verbally." },
  { id: "action", label: "Action step", icon: "⚡", desc: "The AI performs a DOM action: fill form, click button, navigate." },
  { id: "question", label: "Smart question", icon: "❓", desc: "The AI asks the user something and uses the answer to personalize the next step." },
  { id: "verify", label: "Verification", icon: "✓", desc: "The AI checks that a required condition is true before moving on." },
];

const completionConditions = [
  { label: "URL matches", example: "/dashboard (after completing setup)", active: true },
  { label: "Element visible", example: ".success-banner", active: false },
  { label: "API response", example: "GET /api/me → { integration_connected: true }", active: false },
  { label: "User confirms", example: "User clicks the Mark as done button", active: false },
];

const promptExample = `Guide the user to connect their first data source.

The user needs to:
1. Click Settings in the left sidebar
2. Select "Data Sources" from the submenu
3. Click "Add source" and choose Postgres or MySQL

If they ask where Settings is, use the fill_element action
to highlight it. If they get stuck, call the check_integration
MCP action to verify their connection string is valid.

Tone: friendly, concise. No more than 2 sentences per message.`;

export default function FirstFlowPage() {
  const [activeType, setActiveType] = useState(0);

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
        <Link href="/docs" className="hover:text-slate-600 transition-colors">Docs</Link>
        <span>/</span>
        <span className="text-slate-700">Your first flow</span>
      </div>

      <h1 className="text-4xl font-black text-slate-900 mb-4">Your first flow</h1>
      <p className="text-xl text-slate-500 mb-12">
        Build a complete onboarding flow — from connect-data-source to first success — in under 10 minutes.
      </p>

      <div className="space-y-14">

        {/* Step 1 */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">1</span>
            Go to Flows → New Flow
          </h2>
          <p className="text-slate-600 mb-4">
            In your Prism dashboard, click <strong>Flows</strong> in the left sidebar, then <strong>+ New Flow</strong>. Give it a name like{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">Main Onboarding</code>.
          </p>
          <div className="rounded-xl bg-[#0d1117] border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
              </div>
              <span className="text-slate-500 text-xs">Prism Dashboard — New Flow</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-slate-500 text-xs w-24">Flow name</label>
                <div className="flex-1 bg-white/10 border border-brand/40 rounded-lg px-3 py-1.5 text-sm text-white">Main Onboarding</div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-slate-500 text-xs w-24">Trigger</label>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-400">On login — new users only</div>
              </div>
              <button className="mt-2 w-full py-2 bg-brand/70 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Create flow
              </button>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">2</span>
            Add your first step
          </h2>
          <p className="text-slate-600 mb-5">
            Click <strong>+ Add step</strong>. Every step has a type — choose based on what you need to happen:
          </p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {stepTypes.map((type, i) => (
              <button
                key={type.id}
                onClick={() => setActiveType(i)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeType === i
                    ? "border-brand/50 bg-brand/5 shadow-sm"
                    : "border-slate-200 hover:border-brand/20 bg-white"
                }`}
              >
                <span className="text-xl mb-2 block">{type.icon}</span>
                <p className={`font-bold text-sm mb-1 ${activeType === i ? "text-brand" : "text-slate-800"}`}>{type.label}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{type.desc}</p>
              </button>
            ))}
          </div>
          <div className="bg-[#fafbfc] border border-slate-100 rounded-xl p-4 text-sm text-slate-600">
            <strong>Selected: {stepTypes[activeType].label}</strong> — {stepTypes[activeType].desc}
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">3</span>
            Write your step prompt
          </h2>
          <p className="text-slate-600 mb-4">
            Each step has a <strong>System prompt</strong> that shapes what the AI says and does. Keep it specific — the more context, the better the agent performs.
          </p>
          <div className="rounded-xl bg-[#0d1117] border border-white/5 overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span className="text-slate-400 text-xs">Step 1 — System prompt</span>
            </div>
            <pre className="p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{promptExample}</pre>
          </div>
        </div>

        {/* Step 4 */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">4</span>
            Set a completion condition
          </h2>
          <p className="text-slate-600 mb-4">
            Tell Prism when this step is done. This triggers moving to the next step automatically.
          </p>
          <div className="space-y-2">
            {completionConditions.map((c, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${c.active ? "border-brand/30 bg-brand/5" : "border-slate-100 bg-white"}`}>
                <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.active ? "text-brand" : "text-slate-300"}`} />
                <div>
                  <span className={`font-semibold ${c.active ? "text-brand" : "text-slate-600"}`}>{c.label}</span>
                  <span className="text-slate-400"> — </span>
                  <code className="text-xs text-slate-500">{c.example}</code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 5 */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand text-white text-sm font-black flex items-center justify-center flex-shrink-0">5</span>
            Publish and test
          </h2>
          <p className="text-slate-600 mb-4">
            Click <strong>Save &amp; Publish</strong>. Your flow is now live. Open your app in an incognito window — the Prism widget will start the flow automatically for new users.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>💡 Tip:</strong> Use <strong>Test mode</strong> to run the flow as yourself without it counting as a real session. Go to{" "}
            <code className="text-amber-700">Settings → Test mode → Enable</code>.
          </div>
        </div>

        {/* Nav footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <Link href="/docs/quickstart" className="flex items-center gap-2 text-slate-500 hover:text-brand text-sm transition-colors">
            ← Quickstart
          </Link>
          <Link href="/docs/concepts" className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors text-sm">
            How it works <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
