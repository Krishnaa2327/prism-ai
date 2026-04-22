import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations — Prism",
  description: "Connect Prism to your existing stack. Native integrations with Slack, Segment, Intercom, HubSpot, webhooks, and more.",
};

const categories = [
  {
    name: "Notifications",
    integrations: [
      {
        name: "Slack",
        desc: "Get alerted in Slack when a user fails onboarding or triggers a human escalation. Route by workspace, channel, or urgency.",
        status: "live",
        badge: "Popular",
        href: "/docs/integrations/slack",
      },
      {
        name: "Email (Resend)",
        desc: "Send triggered emails when users drop off mid-flow — re-engagement sequences based on the exact step they stopped at.",
        status: "live",
        href: "/docs/integrations/email",
      },
      {
        name: "PagerDuty",
        desc: "Page your on-call team when agent failure rates spike above a threshold you configure.",
        status: "coming-soon",
        href: "#",
      },
    ],
  },
  {
    name: "Analytics & CRM",
    integrations: [
      {
        name: "Segment",
        desc: "Send Prism events (flow_started, step_completed, escalated) to your Segment workspace. All downstream tools get the data automatically.",
        status: "live",
        badge: "Popular",
        href: "/docs/integrations/segment",
      },
      {
        name: "HubSpot",
        desc: "Update contact properties when users complete or fail onboarding. Trigger HubSpot workflows based on Prism events.",
        status: "live",
        href: "/docs/integrations/hubspot",
      },
      {
        name: "Mixpanel",
        desc: "Track onboarding funnel events directly in Mixpanel. See activation rate by cohort alongside your existing product analytics.",
        status: "coming-soon",
        href: "#",
      },
      {
        name: "Amplitude",
        desc: "Push Prism step events to Amplitude as user actions for correlation with downstream retention metrics.",
        status: "coming-soon",
        href: "#",
      },
    ],
  },
  {
    name: "Support & Chat",
    integrations: [
      {
        name: "Intercom",
        desc: "Escalate failed sessions directly to Intercom. Agent opens with full conversation context pre-loaded for the support rep.",
        status: "live",
        href: "/docs/integrations/intercom",
      },
      {
        name: "Zendesk",
        desc: "Create Zendesk tickets automatically when a user's onboarding session fails and no human escalation resolves it.",
        status: "coming-soon",
        href: "#",
      },
      {
        name: "Plain",
        desc: "Route escalations to Plain with full session transcript attached as a thread.",
        status: "coming-soon",
        href: "#",
      },
    ],
  },
  {
    name: "Data & Infrastructure",
    integrations: [
      {
        name: "Webhooks",
        desc: "Receive HTTP POST requests for any Prism event. Pipe data anywhere — your own database, custom dashboards, data warehouse.",
        status: "live",
        badge: "Recommended",
        href: "/docs/webhooks",
      },
      {
        name: "MCP Connectors",
        desc: "Let the AI agent call your own API endpoints mid-onboarding — verify connections, create resources, check status in real time.",
        status: "live",
        badge: "Powerful",
        href: "/docs/mcp-connectors",
      },
      {
        name: "Postgres / Snowflake",
        desc: "Export session data directly to your data warehouse on a nightly schedule. Full event stream, exportable at any time.",
        status: "coming-soon",
        href: "#",
      },
    ],
  },
];

const statusConfig = {
  live: { label: "Live", className: "bg-emerald-50 text-emerald-700 border-emerald-100 border" },
  "coming-soon": { label: "Coming soon", className: "bg-slate-50 text-slate-400 border-slate-100 border" },
};

export default function IntegrationsPage() {
  const liveCount = categories.flatMap((c) => c.integrations).filter((i) => i.status === "live").length;

  return (
    <div className="pt-16 bg-white">
      {/* Hero */}
      <div className="border-b border-slate-100 bg-[#fafbfc]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="eyebrow mb-3">Integrations</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            Prism works with your stack.
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mb-8 leading-relaxed">
            {liveCount} integrations live today. Connect Prism to your notification, analytics, support, and data tools — no custom engineering required.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/docs/webhooks"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold text-sm rounded-xl hover:bg-brand-dark transition-colors"
            >
              Webhook docs <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs/mcp-connectors"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:border-brand/30 transition-colors"
            >
              MCP Connectors
            </Link>
          </div>
        </div>
      </div>

      {/* Integrations by category */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
        {categories.map((category) => (
          <div key={category.name}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.integrations.map((integration) => {
                const status = statusConfig[integration.status as keyof typeof statusConfig];
                const isLive = integration.status === "live";
                return (
                  <div
                    key={integration.name}
                    className={`rounded-2xl border p-6 flex flex-col transition-all ${
                      isLive
                        ? "border-slate-200 bg-white hover:border-brand/30 hover:shadow-md"
                        : "border-slate-100 bg-[#fafbfc]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-black text-slate-500">
                        {integration.name[0]}
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.badge && (
                          <span className="text-[10px] font-bold text-brand bg-brand/8 border border-brand/15 px-2 py-0.5 rounded-full">
                            {integration.badge}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <h3 className={`font-bold mb-2 ${isLive ? "text-slate-900" : "text-slate-500"}`}>
                      {integration.name}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed flex-1 mb-4">
                      {integration.desc}
                    </p>
                    {isLive && (
                      <Link
                        href={integration.href}
                        className="inline-flex items-center gap-1.5 text-brand text-sm font-semibold hover:text-brand-dark transition-colors"
                      >
                        View docs <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Request an integration */}
        <div className="text-center bg-gradient-to-br from-brand/5 to-purple-50 border border-brand/15 rounded-3xl p-12">
          <h2 className="text-2xl font-black text-slate-900 mb-3">
            Don&apos;t see what you need?
          </h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Request an integration or build your own using our Webhook API or MCP connector framework.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:hello@useprism.ai?subject=Integration request"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors"
            >
              Request an integration
            </a>
            <Link
              href="/docs/webhooks"
              className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-brand/30 transition-colors"
            >
              Build with Webhooks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
