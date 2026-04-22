import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  HeadphonesIcon,
  Settings2,
  Building2,
  ArrowRight,
  CheckCircle,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use Cases — Prism",
  description:
    "How SaaS teams use Prism for onboarding automation, support deflection, setup flows, and internal ops guidance.",
};

const useCases = [
  {
    id: "onboarding",
    icon: Users,
    eyebrow: "SaaS Onboarding",
    title: "Turn sign-ups into activated users.",
    headline: "Stop watching users drop off at step 3.",
    desc: "Most SaaS users never complete onboarding. Not because your product is bad — because there's nobody to help them when they get confused at 11pm on a Tuesday. Prism runs the onboarding flow for you, 24/7.",
    howItWorks: [
      "User signs up and logs in for the first time",
      "Prism agent appears, greets them, and starts the onboarding flow",
      "Agent walks them through setup step by step — filling forms, clicking buttons, guiding decisions",
      "If they get stuck, the agent answers questions from your knowledge base",
      "Activation event triggers → session marked complete",
      "Insights surface drop-off patterns — you update the prompt, no code deploy",
    ],
    metrics: [
      { value: "+18%", label: "average activation lift" },
      { value: "11 days", label: "avg time to first result" },
      { value: "62%", label: "sessions completed without escalation" },
    ],
    cta: "See pricing",
    ctaHref: "/pricing",
    color: "indigo",
    gradient: "from-indigo-50 to-violet-50",
    border: "border-indigo-200",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    metricColor: "text-indigo-600",
  },
  {
    id: "support",
    icon: HeadphonesIcon,
    eyebrow: "Support Deflection",
    title: "Let the AI handle tier-1 support in your product.",
    headline: "Answer the question before they open a ticket.",
    desc: "Most support tickets are the same 20 questions. An AI that answers from your knowledge base and can actually click around your UI deflects the ticket before it's created — without making users feel abandoned.",
    howItWorks: [
      "User gets stuck and messages the Prism agent",
      "Agent searches your knowledge base with hybrid BM25 + vector search",
      "For procedural questions, agent walks them through the fix step by step in their UI",
      "For complex issues, agent escalates to Slack or Intercom with full context attached",
      "Support rep gets the entire conversation transcript — zero re-explanation needed",
      "Escalation patterns surface in Insights for your next knowledge base update",
    ],
    metrics: [
      { value: "~3x", label: "fewer tier-1 tickets per onboarding user" },
      { value: "<60s", label: "average time to first agent response" },
      { value: "80%", label: "of escalations pre-loaded with context" },
    ],
    cta: "View integrations",
    ctaHref: "/integrations",
    color: "emerald",
    gradient: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    metricColor: "text-emerald-600",
  },
  {
    id: "setup-flows",
    icon: Settings2,
    eyebrow: "Setup Flows",
    title: "Guide users through complex integrations and configuration.",
    headline: "The part your docs can't do: actually doing it for them.",
    desc: "Some setups require your users to connect APIs, configure webhooks, or navigate admin panels they've never seen before. A Prism flow can walk them through it live, verify the connection worked, and catch failures before they give up.",
    howItWorks: [
      "User reaches the integration setup step in your product",
      "Prism agent activates the setup flow automatically",
      "Agent guides them through each step — API key, webhook URL, connection test",
      "MCP connector calls your API to verify the connection is live in real time",
      "If verification fails, agent gives the user a specific error message and how to fix it",
      "Successful connection triggers the next step in the onboarding sequence",
    ],
    metrics: [
      { value: "8 selectors", label: "DOM strategies for reliable UI actions" },
      { value: "Real-time", label: "API verification via MCP connectors" },
      { value: "Zero deploy", label: "to update flow prompts or steps" },
    ],
    cta: "Try the docs",
    ctaHref: "/docs/mcp-connectors",
    color: "violet",
    gradient: "from-violet-50 to-purple-50",
    border: "border-violet-200",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    metricColor: "text-violet-600",
  },
  {
    id: "internal",
    icon: Building2,
    eyebrow: "Internal Ops",
    title: "Onboard employees to internal tools without writing playbooks.",
    headline: "Your internal wiki doesn't help when you're staring at a form.",
    desc: "Internal tools — CRMs, admin dashboards, ops platforms — get the worst onboarding. Prism can run in the same model for internal users as it does for customers. Guided flows for new hires, compliance workflows, and tool-specific procedures.",
    howItWorks: [
      "New employee logs into the internal tool for the first time",
      "Prism agent starts the role-specific onboarding flow (scoped by user segment)",
      "Agent walks them through required setup: connect accounts, configure profile, run first workflow",
      "Smart questions branch the flow based on role or team",
      "Compliance verification step confirms required fields are complete",
      "Manager receives activation confirmation via Slack escalation",
    ],
    metrics: [
      { value: "User segments", label: "to scope flows by role or team" },
      { value: "Smart questions", label: "that branch flows dynamically" },
      { value: "Slack alerts", label: "for completion or escalation" },
    ],
    cta: "See how it works",
    ctaHref: "/docs/concepts",
    color: "amber",
    gradient: "from-amber-50 to-orange-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    metricColor: "text-amber-600",
  },
];

export default function UseCasesPage() {
  return (
    <div className="pt-16 bg-white">
      {/* Hero */}
      <section className="bg-[#0a0a0f] py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand/10 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-medium mb-8">
            Use cases
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            One AI agent.<br />
            <span className="gradient-text">Every use case that matters.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Prism runs wherever users need guidance — product onboarding, support deflection,
            complex integrations, or internal tooling.
          </p>
        </div>
      </section>

      {/* Quick nav */}
      <div className="border-b border-slate-100 bg-white sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto">
          {useCases.map((uc) => (
            <a
              key={uc.id}
              href={`#${uc.id}`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-brand border border-slate-200 hover:border-brand/30 rounded-full transition-all bg-white hover:bg-brand/5"
            >
              <uc.icon className="w-3.5 h-3.5" />
              {uc.eyebrow}
            </a>
          ))}
        </div>
      </div>

      {/* Use case sections */}
      <div className="divide-y divide-slate-100">
        {useCases.map((uc, idx) => (
          <section
            key={uc.id}
            id={uc.id}
            className="py-24 scroll-mt-28"
          >
            <div className="max-w-6xl mx-auto px-6">
              {/* Top */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-16">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5 ${uc.iconBg} ${uc.iconColor} border ${uc.border}`}>
                    <uc.icon className="w-3.5 h-3.5" />
                    {uc.eyebrow}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
                    {uc.title}
                  </h2>
                  <p className={`text-xl font-semibold mb-4 ${uc.iconColor}`}>{uc.headline}</p>
                  <p className="text-slate-600 leading-relaxed text-lg">{uc.desc}</p>
                </div>

                {/* Metrics */}
                <div className={`grid grid-cols-3 gap-4 bg-gradient-to-br ${uc.gradient} border ${uc.border} rounded-3xl p-8`}>
                  {uc.metrics.map((m, i) => (
                    <div key={i} className="text-center">
                      <p className={`text-2xl md:text-3xl font-black mb-1 ${uc.metricColor}`}>{m.value}</p>
                      <p className="text-slate-500 text-xs leading-snug">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="bg-[#fafbfc] border border-slate-100 rounded-3xl p-8 md:p-10">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">How it works</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uc.howItWorks.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl p-4">
                      <div className={`w-7 h-7 rounded-full ${uc.iconBg} ${uc.iconColor} flex items-center justify-center text-xs font-black flex-shrink-0 border ${uc.border}`}>
                        {i + 1}
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <Link
                    href={uc.ctaHref}
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${uc.iconColor} hover:opacity-80 transition-opacity`}
                  >
                    {uc.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="py-24 bg-[#0a0a0f] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/15 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Free forever on the starter plan
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Which use case<br /><span className="text-brand">fits your team?</span>
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Start free and see your first activation improvement in under 2 weeks.
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
              Talk to us first
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
