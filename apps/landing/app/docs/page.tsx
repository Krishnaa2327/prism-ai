import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Docs — OnboardAI',
  description: 'Widget API reference, quick-start guide, flow configuration, and integration examples.',
};

const SECTIONS = [
  {
    id: 'quick-start',
    title: 'Quick start',
    content: `
Get OnboardAI running in 5 minutes.

**1. Create a flow in the dashboard**

Go to **Flows → New flow** and pick a template for your SaaS vertical (Analytics, CRM, Dev Tools, etc.) or build from scratch. Each flow contains ordered steps — each step has a name, an AI prompt, an intent tag, and an optional completion event.

**2. Add the script tag**

\`\`\`html
<script src="https://cdn.onboardai.com/widget.js"></script>
\`\`\`

**3. Initialize with your API key**

\`\`\`html
<script>
  OnboardAI('init', {
    apiKey: 'org_YOUR_KEY',     // Settings → Widget in the dashboard
    userId: currentUser.id,     // your own user ID — must be a string
    metadata: {
      plan: 'trial',
      role: 'admin',
    },
  });
</script>
\`\`\`

**4. Fire completion events when users take action**

\`\`\`html
<script>
  // Call this wherever the user completes that step in your product
  OnboardAI('event', 'data_connected');       // step 1 done
  OnboardAI('event', 'dashboard_created');    // step 2 done
  OnboardAI('event', 'insight_viewed');       // step 3 done
</script>
\`\`\`

Each event name must match the \`completionEvent\` field set on that step in your flow config. When the event fires, the session auto-advances and fires your connected integrations (Segment, Mixpanel, HubSpot, Webhook) in parallel.

**5. Check the dashboard**

Go to **Activation** to see your funnel in real time. Go to **Benchmarks** to compare your completion rate against industry baselines.
    `,
  },
  {
    id: 'widget-api',
    title: 'Widget API reference',
    content: `
### \`OnboardAI('init', config)\`

Initializes the widget. Call once per page load after the script tag loads.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`apiKey\` | \`string\` | required | Your org API key from **Settings → Widget** |
| \`userId\` | \`string\` | auto-generated | Your user's internal ID — use a consistent identifier |
| \`metadata\` | \`object\` | \`{}\` | Arbitrary JSON passed to the AI as context (plan, role, page, etc.) |
| \`idleThreshold\` | \`number\` | \`30000\` | Ms of inactivity before the copilot opens automatically |
| \`primaryColor\` | \`string\` | \`'#6366f1'\` | Hex accent color for the widget |
| \`position\` | \`string\` | \`'bottom-right'\` | Bubble position: \`'bottom-right'\` or \`'bottom-left'\` |

### \`OnboardAI('event', eventName)\`

Fires a completion event. The widget calls \`POST /api/v1/session/event\` with the event name. If the current step's \`completionEvent\` matches, the session advances and integrations fire.

\`\`\`js
OnboardAI('event', 'data_connected');
\`\`\`

### Automatic triggers

The copilot opens automatically in two cases:

- **Idle** — user hasn't moved, scrolled, or typed for \`idleThreshold\` ms
- **Churn risk** — on session start, if the user's churn score ≥ 50, the copilot opens immediately with a re-engagement message

### Bundle size

The widget is a self-contained IIFE bundle. Zero external dependencies. ~15KB gzipped.
    `,
  },
  {
    id: 'flows',
    title: 'Onboarding flows',
    content: `
A **flow** is a sequence of steps. Each user gets one active session that tracks which step they're on.

### Step fields

| Field | Description |
|-------|-------------|
| \`name\` | Display name shown in progress bar and admin UI |
| \`description\` | Internal note — not shown to users |
| \`aiPrompt\` | Instructions the AI follows when this step is active. Be specific: what should the user do? what counts as success? |
| \`intentTag\` | Slug that maps to an industry drop-off benchmark (e.g. \`data_connection\`, \`integration_setup\`) |
| \`completionEvent\` | Event name that auto-advances this step when fired from the widget |
| \`order\` | Step order within the flow |

### Intent tags (benchmark mapping)

Use these \`intentTag\` values to get accurate industry benchmarks:

\`\`\`
data_connection      dashboard_creation   insight_discovery
integration_setup    account_configuration team_invite
api_setup            payment_setup        workflow_creation
first_export
\`\`\`

Any other value falls back to the 42% industry average.

### Session lifecycle

\`\`\`
init called → GET /api/v1/session/start
  → session created (or resumed) with current step
  → copilot opens if idle or churn risk detected
  → user chats → AI acts → step may complete
  → OnboardAI('event', name) → step advances
  → all steps done → session marked completed
\`\`\`
    `,
  },
  {
    id: 'ai-agent',
    title: 'AI agent actions',
    content: `
The AI agent uses Claude tool_use to take structured actions inside your product. Your widget renders each action type automatically.

### Action types

| Action | What the widget does |
|--------|---------------------|
| \`ask_clarification\` | Renders the question text + quick-reply chip buttons for the user to tap |
| \`execute_page_action: fill_form\` | Fills DOM inputs matching CSS selectors you specify in the step prompt |
| \`execute_page_action: click\` | Clicks a DOM element matching a selector |
| \`execute_page_action: navigate\` | Redirects the user to a URL |
| \`execute_page_action: highlight\` | Draws a glow outline around an element and scrolls to it for 3 seconds |
| \`complete_step\` | Shows a confirmation message, refreshes the progress bar |
| \`celebrate_milestone\` | Renders a gradient celebration card, pulses the bubble |
| \`verify_integration\` | Tests the API key the user just entered (Segment, Mixpanel, HubSpot, or Webhook URL) — shows success or failure badge |

### Writing step prompts

The \`aiPrompt\` field controls how the AI behaves on that step. Be concrete:

\`\`\`
You are guiding the user through connecting their data source.
The user needs to click "Add data source", choose CSV upload,
and upload any file. Once they land on the dashboard with data
visible, this step is complete.

If they seem confused about file format: tell them any CSV works,
column names don't matter for the first test.

Do not move on until they confirm they can see rows in the table.
\`\`\`

**Tips:**
- Name the exact UI element ("the blue 'Connect' button in the top right")
- Define what "done" looks like so the AI knows when to call complete_step
- Keep prompts under 300 words — they are prepended to every turn on that step
    `,
  },
  {
    id: 'integrations',
    title: 'Integrations',
    content: `
Connect your analytics and CRM tools in **Dashboard → Settings → Integrations**. When a step completes, OnboardAI fires all enabled integrations in parallel.

### Segment

Paste your **Source Write Key** from Segment → Sources → your source → Settings.

Event fired: \`track\` call with \`event: 'OnboardAI Step Completed'\` and properties:

\`\`\`json
{
  "stepName": "Connect data source",
  "flowId": "flow_abc",
  "sessionId": "sess_xyz",
  "userId": "user_123"
}
\`\`\`

### Mixpanel

Paste your **Project Token** from Mixpanel → Project Settings.

Event fired: \`OnboardAI Step Completed\` with the same properties above.

### HubSpot

Paste a **Private App token** with \`crm.objects.contacts.write\` scope. Go to HubSpot → Settings → Integrations → Private Apps → Create.

On step complete: upserts a contact by \`userId\` (used as email if it looks like one, otherwise stored as external ID). Adds a note with the step name.

### Webhook

Paste any HTTPS URL. OnboardAI POSTs this payload on every step completion:

\`\`\`json
{
  "userId": "user_123",
  "event": "step_completed",
  "properties": {
    "stepName": "Connect data source",
    "flowId": "flow_abc",
    "sessionId": "sess_xyz"
  },
  "timestamp": "2026-04-09T02:00:00.000Z",
  "source": "onboardai"
}
\`\`\`

Use [webhook.site](https://webhook.site) to test before pointing it at your real endpoint.

### Test connection

Click **Test connection** on any integration card before enabling it. The backend makes a live test call and returns success or failure with the error message.
    `,
  },
  {
    id: 'churn-score',
    title: 'Churn score API',
    content: `
The widget calls this automatically on session start. You can also call it from your own backend.

### \`GET /api/v1/churn/score\`

**Auth:** \`X-API-Key: org_YOUR_KEY\`

**Query params:** \`userId=user_123\`

\`\`\`bash
curl "https://api.onboardai.com/api/v1/churn/score?userId=user_123" \\
  -H "X-API-Key: org_YOUR_KEY"
\`\`\`

**Response:**

\`\`\`json
{
  "score": 62,
  "risk": "high",
  "shouldIntervene": true,
  "sessionId": "sess_xyz"
}
\`\`\`

| Field | Description |
|-------|-------------|
| \`score\` | 0–100. Higher = more likely to churn. |
| \`risk\` | \`low\` / \`medium\` / \`high\` / \`critical\` |
| \`shouldIntervene\` | \`true\` if score ≥ 50 — widget opens copilot automatically |
| \`sessionId\` | The user's current session ID |

### Scoring factors

| Factor | Weight |
|--------|--------|
| Inactivity time (hours since last active) | Up to +40 |
| Progress fraction (steps completed / total) | –25 to +18 |
| Session staleness (age vs. progress) | Up to +20 |
| Abandoned status | +25 |

Use this endpoint from your own backend to build churn dashboards, trigger email sequences, or gate features.
    `,
  },
  {
    id: 'rest-api',
    title: 'REST API',
    content: `
### Base URL

\`\`\`
https://api.onboardai.com   (production)
http://localhost:4000       (local dev)
\`\`\`

### Authentication

**Widget / customer-side** — use your org API key:

\`\`\`bash
curl -H "X-API-Key: org_YOUR_KEY" https://api.onboardai.com/api/v1/session/start \\
  -X POST -H "Content-Type: application/json" \\
  -d '{"userId":"user_123"}'
\`\`\`

**Dashboard / server-side** — use JWT from login:

\`\`\`bash
# 1. Login
TOKEN=$(curl -s -X POST https://api.onboardai.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"..."}' | jq -r .token)

# 2. Use token
curl -H "Authorization: Bearer $TOKEN" \\
  https://api.onboardai.com/api/v1/activation/funnel
\`\`\`

### Key endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | \`/api/v1/auth/register\` | — | Create org + user account |
| POST | \`/api/v1/auth/login\` | — | Get JWT |
| POST | \`/api/v1/session/start\` | API key | Start or resume a user session |
| POST | \`/api/v1/session/act\` | API key | Send a user message, get AI action |
| POST | \`/api/v1/session/event\` | API key | Fire a completion event |
| GET | \`/api/v1/churn/score\` | API key | Get churn score for a userId |
| GET | \`/api/v1/activation/funnel\` | JWT | Step-by-step funnel data |
| GET | \`/api/v1/activation/trend\` | JWT | Week-over-week delta |
| GET | \`/api/v1/benchmarks/overview\` | JWT | Activation score vs. industry |
| GET | \`/api/v1/benchmarks/steps\` | JWT | Per-step comparison |
| GET | \`/api/v1/optimize/flow\` | JWT | Step health scores |
| POST | \`/api/v1/optimize/suggest/:stepId\` | JWT | AI prompt suggestion |
| POST | \`/api/v1/optimize/apply/:stepId\` | JWT | Apply suggested prompt |
| GET | \`/api/v1/churn/at-risk\` | JWT | All at-risk users |
| GET | \`/api/v1/churn/summary\` | JWT | Breakdown by risk level |
| GET | \`/api/v1/integrations\` | JWT | List integrations |
| POST | \`/api/v1/integrations\` | JWT | Upsert integration credentials |
| POST | \`/api/v1/integrations/:type/test\` | JWT | Test a connection live |
| GET | \`/health\` | — | Health check |
    `,
  },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-zinc-900 border border-white/10 rounded-lg p-4 overflow-x-auto my-4">
      <code className="text-sm text-zinc-300 font-mono whitespace-pre">{code}</code>
    </pre>
  );
}

function Table({ rows }: { rows: string[][] }) {
  const [header, , ...body] = rows;
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {header.map((cell, i) => (
              <th key={i} className="text-left text-zinc-400 font-medium py-2 pr-6 whitespace-nowrap">
                {cell.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-6 text-zinc-400 align-top">
                  <code className="text-indigo-400 text-xs bg-indigo-500/10 px-1 rounded font-mono">
                    {cell.trim()}
                  </code>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderContent(text: string) {
  const lines = text.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<CodeBlock key={i} code={codeLines.join('\n')} />);
      i++;
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1);
        if (!cells.every(c => /^[-:\s]+$/.test(c))) {
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 1) {
        elements.push(<Table key={i} rows={tableRows} />);
      }
      continue;
    }

    // h3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold text-white mt-8 mb-3">{line.slice(4)}</h3>
      );
      i++;
      continue;
    }

    // bold heading (standalone **text**)
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(
        <p key={i} className="font-semibold text-white mt-6 mb-2">{line.slice(2, -2)}</p>
      );
      i++;
      continue;
    }

    // blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-indigo-500 pl-4 text-zinc-500 italic my-3">{line.slice(2)}</blockquote>
      );
      i++;
      continue;
    }

    // list item
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-3">
          {items.map((item, j) => (
            <li key={j} className="text-zinc-400 text-sm">
              {item.split(/(`[^`]+`)/).map((part, k) =>
                part.startsWith('`') && part.endsWith('`')
                  ? <code key={k} className="text-indigo-400 text-xs bg-indigo-500/10 px-1 rounded font-mono">{part.slice(1, -1)}</code>
                  : part
              )}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // paragraph — handle inline code and bold
    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/);
    elements.push(
      <p key={i} className="text-zinc-400 text-sm leading-relaxed">
        {parts.map((part, j) => {
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={j} className="text-indigo-400 text-xs bg-indigo-500/10 px-1 rounded font-mono">{part.slice(1, -1)}</code>;
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
          return part;
        })}
      </p>
    );
    i++;
  }

  return elements;
}

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-3">Documentation</h1>
            <p className="text-zinc-400 text-lg">
              Everything you need to embed OnboardAI, configure flows, and measure activation.
            </p>
          </div>

          {/* Sidebar + content layout */}
          <div className="flex gap-12">
            {/* Sidebar */}
            <nav className="hidden lg:block w-52 flex-shrink-0">
              <ul className="sticky top-24 space-y-1">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block text-sm text-zinc-500 hover:text-white transition-colors py-1.5 border-l border-white/5 hover:border-indigo-500 pl-3"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-16">
              {SECTIONS.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-white mb-6 pb-4 border-b border-white/10">
                    {section.title}
                  </h2>
                  <div className="space-y-1">
                    {renderContent(section.content)}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
