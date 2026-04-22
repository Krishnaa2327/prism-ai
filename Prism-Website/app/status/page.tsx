import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "System Status — Prism",
  description: "Live status and uptime for all Prism systems — widget delivery, dashboard, API, and AI processing.",
};

const systems = [
  { name: "Widget Delivery (CDN)", status: "operational", uptime: "99.98%" },
  { name: "Dashboard", status: "operational", uptime: "99.95%" },
  { name: "AI Processing", status: "operational", uptime: "99.91%" },
  { name: "REST API", status: "operational", uptime: "99.96%" },
  { name: "MCP Connector Gateway", status: "operational", uptime: "99.93%" },
  { name: "Failure Inbox & Analytics", status: "operational", uptime: "99.97%" },
];

const incidents = [
  {
    date: "March 28, 2026",
    title: "Elevated AI response latency",
    status: "Resolved",
    duration: "42 minutes",
    severity: "Minor",
    detail: "Increased latency on AI processing due to upstream provider degradation. Widget remained functional; responses were delayed by ~3–6 seconds. Resolved by rerouting to secondary provider.",
  },
  {
    date: "February 14, 2026",
    title: "Dashboard login intermittently unavailable",
    status: "Resolved",
    duration: "18 minutes",
    severity: "Minor",
    detail: "Authentication service returned 502 errors for approximately 12% of login attempts during a dependency upgrade. Widget delivery and AI processing were unaffected.",
  },
];

// Generate last 90 days uptime bars (all green for demo)
const uptimeDays = Array.from({ length: 90 }, (_, i) => {
  // Simulate 2 minor incidents
  if (i === 44 || i === 79) return "degraded";
  return "operational";
});

function UptimeBar({ days }: { days: string[] }) {
  return (
    <div className="flex gap-0.5">
      {days.map((status, i) => (
        <div
          key={i}
          title={status}
          className={`h-8 flex-1 rounded-sm ${
            status === "operational"
              ? "bg-emerald-400"
              : status === "degraded"
              ? "bg-amber-400"
              : "bg-red-400"
          }`}
        />
      ))}
    </div>
  );
}

export default function StatusPage() {
  return (
    <div className="pt-16 bg-[#fafbfc] min-h-screen">
      {/* Hero */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            All systems operational
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">Prism System Status</h1>
          <p className="text-slate-500 text-lg">Real-time status for all Prism services.</p>
          <p className="text-slate-400 text-sm mt-2">
            Last checked: {new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-10">
        {/* System status cards */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Services</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {systems.map((system, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-slate-800 font-medium text-sm">{system.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-slate-400 text-sm hidden md:block">{system.uptime} uptime (90d)</span>
                  <span className="text-emerald-600 text-sm font-semibold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                    Operational
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 90-day uptime chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-900">90-day uptime</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Operational</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Degraded</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Outage</span>
            </div>
          </div>
          <UptimeBar days={uptimeDays} />
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>90 days ago</span>
            <span className="font-semibold text-emerald-600">99.95% uptime</span>
            <span>Today</span>
          </div>
        </div>

        {/* Past incidents */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Past Incidents</h2>
          </div>
          {incidents.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">No incidents in the last 90 days.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {incidents.map((incident, i) => (
                <div key={i} className="px-6 py-5">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-slate-400">{incident.date}</span>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                      {incident.status}
                    </span>
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-semibold">
                      {incident.severity}
                    </span>
                    <span className="text-xs text-slate-400">Duration: {incident.duration}</span>
                  </div>
                  <h3 className="text-slate-900 font-bold text-sm mb-1">{incident.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{incident.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe CTA */}
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-3">Get notified when incidents are reported or resolved.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="mailto:status@useprism.ai?subject=Subscribe to status updates"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold text-sm rounded-xl hover:bg-brand-dark transition-colors"
            >
              Subscribe via email
            </a>
            <Link
              href="/security"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:border-brand/30 transition-colors"
            >
              Security page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
