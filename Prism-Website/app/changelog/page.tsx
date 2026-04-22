import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — Prism",
  description: "Product updates and release notes for Prism.",
};

const entries = [
  {
    month: "April 2026",
    items: [
      {
        date: "2026-04-13",
        version: "v1.3",
        title: "Real GPT-4o streaming + MCP tool wiring",
        changes: [
          { type: "New", text: "MCP connectors now inject live tools into the AI agent" },
          { type: "New", text: "Real token streaming from GPT-4o (words appear as generated)" },
          { type: "Fix", text: "Selector heal logs now write to DB — self-healing telemetry live" },
          { type: "Fix", text: "/session/heal route wired in, webhook alerts on 3+ failures" },
        ],
      },
      {
        date: "2026-04-11",
        version: "v1.2",
        title: "Trigger controls + session streaming",
        changes: [
          { type: "New", text: "Delay, URL pattern, max-triggers-per-user per flow" },
          { type: "New", text: "SSE streaming on /act/stream" },
          { type: "New", text: "Session message history + thumbs up/down feedback" },
        ],
      },
    ],
  },
  {
    month: "March 2026",
    items: [
      {
        date: "2026-03-28",
        version: "v1.1",
        title: "Knowledge base + agent health panel",
        changes: [
          { type: "New", text: "BM25 + vector hybrid search with Reciprocal Rank Fusion" },
          { type: "New", text: "Agent health panel with 24h success rate" },
          { type: "New", text: "Failure inbox with conversation replay" },
          { type: "Improved", text: "Widget UI redesign — dark mode, glass morphism" },
        ],
      },
      {
        date: "2026-03-10",
        version: "v1.0",
        title: "Initial Release",
        changes: [
          { type: "New", text: "Widget SDK with 2-line install" },
          { type: "New", text: "Flow builder with drag-and-drop steps" },
          { type: "New", text: "3 action types: fill_form, click_element, navigate" },
          { type: "New", text: "Basic session tracking and dashboard" },
        ],
      },
    ],
  },
];

const tagClass: Record<string, string> = {
  New: "tag-new",
  Fix: "tag-fix",
  Improved: "tag-improved",
  Breaking: "tag-breaking",
};

export default function ChangelogPage() {
  return (
    <div className="pt-16">
      <section className="bg-bg-light py-16 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-5xl font-black text-slate-900 mb-3">Changelog</h1>
          <p className="text-xl text-slate-500">What we&apos;ve been building.</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          {entries.map((group) => (
            <div key={group.month} className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-slate-200" />
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{group.month}</h2>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="space-y-10">
                {group.items.map((item) => (
                  <div key={item.date} className="relative pl-8 border-l-2 border-slate-100">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand" />
                    <div className="mb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <time className="text-slate-400 text-sm">{item.date}</time>
                        <span className="px-2.5 py-0.5 bg-brand/10 text-brand text-xs font-bold rounded-full">{item.version}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mt-1">{item.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {item.changes.map((c, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded flex-shrink-0 mt-0.5 ${tagClass[c.type]}`}>{c.type}</span>
                          <span className="text-slate-600 text-sm">{c.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Subscribe */}
          <div className="mt-12 p-8 bg-bg-light border border-slate-200 rounded-2xl">
            <h3 className="font-bold text-slate-900 mb-2">Get notified about major updates</h3>
            <div className="flex gap-3 mt-4">
              <input type="email" placeholder="you@company.com" className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              <button className="px-5 py-2.5 bg-brand text-white font-semibold text-sm rounded-xl hover:bg-brand-dark transition-colors">Subscribe</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
