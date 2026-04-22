import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  GitBranch,
  MessageSquare,
  Lightbulb,
  BookOpen,
  Plug,
  ArrowRight,
  CheckCircle,
  Code2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Product — Prism",
  description:
    "Everything Prism ships: AI widget, flow builder, questions analytics, auto-surfaced insights, knowledge base, and MCP integrations.",
};

const features = [
  {
    id: "widget",
    icon: Zap,
    eyebrow: "AI Widget",
    title: "An AI agent embedded directly in your product.",
    desc: "2 lines of script. Instantly live. Zero framework lock-in.",
    body: "The Prism widget loads a stateful AI panel on the side of your users' screen. It knows what page they're on and what they've already told the agent — across page navigations, refreshes, and sessions.",
    bullets: [
      "~18 KB gzipped — invisible to your performance budget",
      "Works on React, Next.js, Vue, Angular, Webflow, plain HTML",
      "SPA-compatible with route-aware context",
      "Fully white-labeled — your colors, your font, your brand",
      "Test mode: chat as yourself without counting as a real session",
    ],
    codeSnippet: `<script>
  window.PrismConfig = {
    apiKey: "YOUR_API_KEY",
    userId: "{{current_user_id}}",
    metadata: { name: "{{user.name}}", plan: "{{user.plan}}" }
  };
</script>
<script src="https://cdn.useprism.ai/widget.js" async></script>`,
    href: "/docs/quickstart",
    color: "from-indigo-500/10 to-violet-500/10",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-500/10",
  },
  {
    id: "flows",
    icon: GitBranch,
    eyebrow: "Flow Builder",
    title: "Build guided flows without touching engineering.",
    desc: "No-code. No deploy. Live in minutes.",
    body: "Design step-by-step flows from the Prism dashboard. Each flow defines what the AI should guide users through — set instructions, connect knowledge, and publish without a code deploy.",
    bullets: [
      "Create flows with a name, description, and trigger settings",
      "Trigger by URL pattern or idle threshold",
      "Add custom AI instructions per flow",
      "Toggle flows live or draft without redeploying",
      "Connect knowledge base articles per flow context",
    ],
    href: "/docs/first-flow",
    color: "from-violet-500/10 to-purple-500/10",
    border: "border-violet-500/20",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
  },
  {
    id: "questions",
    icon: MessageSquare,
    eyebrow: "Questions",
    title: "Every question users ask, clustered by intent.",
    desc: "Gaps revealed in users' own words.",
    body: "Prism analyses every message users send to your AI assistant and groups them by intent — how-to requests, blockers, navigation confusion, and recurring questions. You see the real language users use, not sanitised categories.",
    bullets: [
      "Intent clustering: how-to, stuck, navigation, question, other",
      "Full question variations with repeat counts",
      "Last-seen timestamps so you know what's trending now",
      "7, 30, or 90-day lookback window",
      "Directly inform your knowledge base and AI instructions",
    ],
    href: "/docs/dashboard/questions",
    color: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
  {
    id: "insights",
    icon: Lightbulb,
    eyebrow: "Insights",
    title: "Issues flagged. Gaps suggested. Automatically.",
    desc: "Informed by user behaviour — no manual tagging.",
    body: "Prism continuously analyses your conversation data and surfaces actionable insight cards: where users are blocked, what knowledge is missing, which questions keep coming back. Each insight includes example quotes and a suggested action.",
    bullets: [
      "Pain points — messages where users report errors or blockers",
      "Knowledge gaps — how-to questions your AI can't yet answer well",
      "Navigation confusion — users who can't find key features",
      "Low engagement signal — conversations ending too quickly",
      "Severity rating (high / medium / low) with suggested fix",
    ],
    href: "/docs/dashboard/insights",
    color: "from-rose-500/10 to-pink-500/10",
    border: "border-rose-500/20",
    iconColor: "text-rose-500",
    iconBg: "bg-rose-500/10",
  },
  {
    id: "kb",
    icon: BookOpen,
    eyebrow: "Knowledge Base",
    title: "Give your agent product knowledge it can actually use.",
    desc: "Docs, FAQs, help articles — all searchable mid-session.",
    body: "Upload your documentation, help center articles, or custom markdown to the Prism Knowledge Base. The AI agent retrieves the right content using hybrid BM25 + vector search with Reciprocal Rank Fusion — so it answers from your product knowledge, not hallucinated guesses.",
    bullets: [
      "Hybrid BM25 + vector search (Reciprocal Rank Fusion)",
      "Upload docs, PDFs, markdown, or plain text",
      "Agent cites sources inline — users see where answers come from",
      "Tag articles for organisation and filtering",
      "Knowledge base updates apply instantly, no redeploy needed",
    ],
    href: "/docs/agent/knowledge-base",
    color: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
  {
    id: "integrations",
    icon: Plug,
    eyebrow: "MCP Integrations",
    title: "Give the AI tools, not just prompts.",
    desc: "Connect any internal API in minutes.",
    body: "Prism's MCP connector framework lets the AI call your own APIs mid-conversation — look up account data, check integration status, create resources. Built on the Model Context Protocol, it works with any REST endpoint.",
    bullets: [
      "Connect any REST API as an MCP tool",
      "Auth options: none, Bearer token, API key",
      "Enable or disable connectors per-org without redeployment",
      "Works with Postgres, HubSpot, Webhooks, Salesforce, and more",
      "Model Context Protocol — open standard, no lock-in",
    ],
    href: "/integrations",
    color: "from-sky-500/10 to-cyan-500/10",
    border: "border-sky-500/20",
    iconColor: "text-sky-500",
    iconBg: "bg-sky-500/10",
  },
];

export default function ProductPage() {
  return (
    <div className="pt-16 bg-white">
      {/* Hero */}
      <section className="bg-[#0a0a0f] py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-brand/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Everything that ships today
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            The AI assistant layer<br />
            <span className="gradient-text">for B2B SaaS.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Embed an AI agent in your SaaS in 2 lines of code. See what users ask,
            surface what's broken, and fix it — without touching your codebase.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="https://app.useprism.ai/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-bold text-lg rounded-xl transition-all shadow-brand hover:scale-[1.02]"
            >
              Start free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/docs/quickstart"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/15 hover:border-white/30 text-white font-semibold text-lg rounded-xl transition-all"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Feature nav pills */}
      <div className="sticky top-16 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {features.map((f) => (
            <a
              key={f.id}
              href={`#${f.id}`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-brand border border-slate-200 hover:border-brand/30 rounded-full transition-all bg-white hover:bg-brand/5"
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.eyebrow}
            </a>
          ))}
        </div>
      </div>

      {/* Feature sections */}
      <div className="divide-y divide-slate-100">
        {features.map((feature, idx) => (
          <section
            key={feature.id}
            id={feature.id}
            className={`py-24 scroll-mt-28 ${idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"}`}
          >
            <div className="max-w-6xl mx-auto px-6">
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${idx % 2 !== 0 ? "lg:flex-row-reverse" : ""}`}>
                {/* Text column */}
                <div className={idx % 2 !== 0 ? "lg:order-2" : ""}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5 ${feature.iconBg} ${feature.iconColor} border ${feature.border}`}>
                    <feature.icon className="w-3.5 h-3.5" />
                    {feature.eyebrow}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 leading-tight">
                    {feature.title}
                  </h2>
                  <p className={`text-lg font-semibold mb-4 ${feature.iconColor}`}>{feature.desc}</p>
                  <p className="text-slate-600 leading-relaxed mb-8">{feature.body}</p>
                  <ul className="space-y-3 mb-8">
                    {feature.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${feature.iconColor}`} />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={feature.href}
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${feature.iconColor} hover:opacity-80 transition-opacity`}
                  >
                    Read the docs <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Visual column */}
                <div className={idx % 2 !== 0 ? "lg:order-1" : ""}>
                  <div className={`rounded-3xl bg-gradient-to-br ${feature.color} border ${feature.border} p-8 min-h-[320px] flex flex-col justify-center`}>
                    {feature.codeSnippet ? (
                      <div className="rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-[#161b22] px-4 py-3 flex items-center gap-2 border-b border-white/5">
                          <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-400/60" />
                            <span className="w-3 h-3 rounded-full bg-yellow-400/60" />
                            <span className="w-3 h-3 rounded-full bg-green-400/60" />
                          </div>
                          <span className="text-slate-500 text-xs ml-2">index.html</span>
                          <Code2 className="w-3.5 h-3.5 text-slate-600 ml-auto" />
                        </div>
                        <pre className="bg-[#0d1117] p-5 text-xs text-slate-300 leading-relaxed overflow-x-auto">
                          <code>{feature.codeSnippet}</code>
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className={`w-12 h-12 rounded-2xl ${feature.iconBg} border ${feature.border} flex items-center justify-center mb-6`}>
                          <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                        </div>
                        {feature.bullets.slice(0, 4).map((b, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-white/60 rounded-xl border border-white/80">
                            <CheckCircle className={`w-4 h-4 flex-shrink-0 ${feature.iconColor}`} />
                            <span className="text-slate-700 text-sm font-medium">{b}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Final CTA */}
      <section className="py-24 bg-[#0a0a0f] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/15 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Ready to see it<br /><span className="text-brand">in your product?</span>
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Free forever. No credit card. Running in 5 minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="https://app.useprism.ai/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-bold text-lg rounded-xl transition-all shadow-brand hover:scale-[1.02]"
            >
              Start for free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/15 hover:border-white/30 text-white font-semibold text-lg rounded-xl transition-all"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
