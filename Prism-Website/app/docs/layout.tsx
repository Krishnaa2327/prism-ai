"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebar = [
  { heading: "Getting Started", links: [
    { label: "Quickstart", href: "/docs/quickstart" },
    { label: "How it works", href: "/docs/concepts" },
    { label: "Your first flow", href: "/docs/first-flow" },
  ]},
  { heading: "Widget", links: [
    { label: "Installation", href: "/docs/widget/installation" },
    { label: "Configuration options", href: "/docs/widget/configuration" },
    { label: "SPA support", href: "/docs/widget/spa" },
    { label: "Test mode", href: "/docs/widget/test-mode" },
  ]},
  { heading: "Flow Builder", links: [
    { label: "Steps", href: "/docs/flows/steps" },
    { label: "Smart questions", href: "/docs/flows/questions" },
    { label: "Action types", href: "/docs/flows/actions" },
    { label: "Trigger controls", href: "/docs/flows/triggers" },
  ]},
  { heading: "AI Agent", links: [
    { label: "System prompt", href: "/docs/agent/system-prompt" },
    { label: "Knowledge base", href: "/docs/agent/knowledge-base" },
    { label: "MCP connectors", href: "/docs/mcp-connectors" },
    { label: "Guardrails", href: "/docs/agent/guardrails" },
  ]},
  { heading: "Dashboard", links: [
    { label: "Failure inbox", href: "/docs/dashboard/failure-inbox" },
    { label: "Health panel", href: "/docs/dashboard/health" },
    { label: "Session replay", href: "/docs/dashboard/sessions" },
    { label: "Audit log", href: "/docs/dashboard/audit" },
  ]},
  { heading: "API Reference", links: [
    { label: "Authentication", href: "/docs/api-reference#auth" },
    { label: "Sessions", href: "/docs/api-reference#sessions" },
    { label: "Flows", href: "/docs/api-reference#flows" },
    { label: "Analytics", href: "/docs/api-reference#analytics" },
    { label: "Escalations", href: "/docs/api-reference#escalations" },
  ]},
  { heading: "Integrations", links: [
    { label: "Slack", href: "/integrations/slack" },
    { label: "Webhooks", href: "/docs/webhooks" },
    { label: "MCP setup guide", href: "/docs/mcp-connectors" },
  ]},
  { heading: "Self-hosting", links: [
    { label: "Coming soon", href: "#", disabled: true },
  ]},
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="pt-16 min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:block w-60 fixed top-16 left-0 bottom-0 overflow-y-auto border-r border-slate-200 bg-white">
        <nav className="p-5 space-y-6">
          {sidebar.map((group) => (
            <div key={group.heading}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">{group.heading}</p>
              <ul className="space-y-0.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        (link as { disabled?: boolean }).disabled
                          ? "text-slate-300 cursor-not-allowed"
                          : pathname === link.href
                          ? "bg-brand/8 text-brand font-medium"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {link.label}
                      {(link as { disabled?: boolean }).disabled && <span className="ml-2 text-[10px] text-slate-300 font-medium">soon</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 lg:ml-60">
        {children}
      </div>
    </div>
  );
}
