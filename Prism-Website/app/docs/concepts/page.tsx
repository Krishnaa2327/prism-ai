import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "How Prism Works — Docs",
  description: "Understand the core concepts behind Prism: agents, flows, steps, MTU, and the DOM action engine.",
};

const concepts = [
  {
    id: "agent",
    title: "The Agent",
    icon: "🤖",
    body: `The Prism Agent is an AI assistant embedded in your product via a lightweight JavaScript widget (~18kb gzipped). It appears as a panel on the side of the user's screen.

The agent is stateful — it knows which flow is active, which step the user is on, and what they've completed. Unlike a chatbot, it maintains complete context across an entire onboarding session, even across page navigations.

The agent can communicate in two modes:
- **Conversational**: Natural language responses to user questions
- **Action**: Direct DOM interactions in the user's live browser`,
  },
  {
    id: "flows",
    title: "Flows",
    icon: "🔀",
    body: `A Flow is a sequence of steps designed to guide a user toward a specific outcome — usually their first meaningful value moment (activation).

You define flows in the Prism dashboard using a no-code builder. Each flow has:
- A **name** and **description** (visible to the agent, not the user)
- A **trigger condition** (when to start — new users, specific URL, user segment)
- An ordered **list of steps**
- A **completion condition** (what counts as "done")

Flows are versioned. You can publish changes without a code deploy.`,
  },
  {
    id: "steps",
    title: "Steps",
    icon: "📋",
    body: `Steps are the individual units inside a flow. There are four step types:

**Guide step** — the agent talks the user through a concept or action using natural language. No DOM interaction.

**Action step** — the agent directly interacts with the user's UI: fills form fields, clicks buttons, scrolls, highlights elements. Uses the DOM action engine (8 self-healing selector strategies).

**Smart question** — the agent asks the user a question and uses their answer to personalize subsequent steps (e.g., "What's your primary use case?").

**Verification step** — the agent checks a condition before proceeding: URL match, element visible, API response, or user confirmation.`,
  },
  {
    id: "mtu",
    title: "MTU (Monthly Tracked Users)",
    icon: "📊",
    body: `MTU stands for Monthly Tracked User. One MTU = one unique user who interacts with a Prism-powered flow in a given calendar month.

A user counts as one MTU regardless of how many flows they complete or how many sessions they have that month.

Users are identified via the \`userId\` field in your PrismConfig. If no userId is set, Prism uses a cookie-based anonymous ID (this still counts as an MTU).

Your plan limits define how many MTUs you can track per month. The free tier includes 100 MTU.`,
  },
  {
    id: "dom-engine",
    title: "DOM Action Engine",
    icon: "⚡",
    body: `When the agent needs to interact with your UI, it uses the DOM Action Engine — a selector-based system that can find and interact with elements reliably.

The engine uses 8 sequential fallback strategies to locate elements, in order of reliability:
1. data-prism-id attribute (most reliable — add to elements you want targetable)
2. data-testid attribute
3. aria-label
4. CSS class + text content combination
5. XPath
6. Position-based fallback
7. Visual similarity matching
8. AI-generated selector (last resort)

This means a UI redesign that changes class names won't break your flows — the engine falls through to the next strategy.`,
  },
  {
    id: "failure-inbox",
    title: "Failure Inbox",
    icon: "📬",
    body: `The Failure Inbox captures every session where a user got stuck, dropped off, or triggered a human escalation.

For each failed session, you can see:
- The complete conversation transcript between agent and user
- Which step the failure occurred on
- What the agent said immediately before the user left
- The time spent on each step
- A one-click button to edit the agent's prompt for that specific step

This closes the feedback loop: you see exactly what broke, exactly where, and you can fix it without a code deploy.`,
  },
  {
    id: "mcp",
    title: "MCP Connectors",
    icon: "🔌",
    body: `MCP (Model Context Protocol) connectors let the agent take real actions in your backend during onboarding — not just in the UI.

Examples:
- Check if a user's integration is live (GET /api/integrations/:id → check status)
- Create a starter resource on their behalf (POST /api/projects → seed project)
- Verify credentials (POST /api/auth/verify → confirm API key)

You configure connectors in the dashboard by providing an endpoint URL, method, and auth headers. The agent decides when to call them based on its system prompt.`,
  },
];

export default function ConceptsPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
        <Link href="/docs" className="hover:text-slate-600 transition-colors">Docs</Link>
        <span>/</span>
        <span className="text-slate-700">How it works</span>
      </div>

      <h1 className="text-4xl font-black text-slate-900 mb-4">How Prism works</h1>
      <p className="text-xl text-slate-500 mb-12">
        Core concepts behind the agent, flows, steps, MTU, and the DOM action engine.
      </p>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2 mb-12 p-4 bg-slate-50 border border-slate-100 rounded-xl">
        {concepts.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="text-xs font-semibold text-slate-500 hover:text-brand px-2.5 py-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
          >
            {c.icon} {c.title}
          </a>
        ))}
      </div>

      <div className="space-y-14">
        {concepts.map((concept) => (
          <div key={concept.id} id={concept.id} className="scroll-mt-24">
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="text-2xl">{concept.icon}</span>
              {concept.title}
            </h2>
            <div className="space-y-4">
              {concept.body.split("\n\n").map((para, i) => {
                if (para.startsWith("**") && para.endsWith("**")) {
                  return <p key={i} className="font-bold text-slate-800">{para.replace(/\*\*/g, "")}</p>;
                }
                // Render inline bold
                const parts = para.split(/\*\*(.*?)\*\*/g);
                if (parts.length > 1) {
                  return (
                    <p key={i} className="text-slate-600 leading-relaxed">
                      {parts.map((part, j) =>
                        j % 2 === 1 ? <strong key={j} className="text-slate-800">{part}</strong> : part
                      )}
                    </p>
                  );
                }
                if (para.startsWith("- ")) {
                  return (
                    <ul key={i} className="space-y-1.5">
                      {para.split("\n").filter(l => l.startsWith("- ")).map((line, j) => (
                        <li key={j} className="flex items-start gap-2 text-slate-600 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                          {line.slice(2)}
                        </li>
                      ))}
                    </ul>
                  );
                }
                return <p key={i} className="text-slate-600 leading-relaxed">{para}</p>;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Nav footer */}
      <div className="flex items-center justify-between pt-10 mt-14 border-t border-slate-100">
        <Link href="/docs/quickstart" className="text-slate-500 hover:text-brand text-sm transition-colors">
          ← Quickstart
        </Link>
        <Link href="/docs/first-flow" className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors text-sm">
          Your first flow <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
