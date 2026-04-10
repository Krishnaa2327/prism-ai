# OnboardAI — Backend

Express.js REST API + WebSocket server. Powers the embeddable widget and the admin dashboard.

## Status: All features complete ✅

---

## Architecture

```
src/
├── index.ts                      ← App entry: middleware, route registration, cron, WebSocket
│
├── lib/
│   ├── prisma.ts                 ← Singleton Prisma client
│   ├── jwt.ts                    ← signToken() / verifyToken()
│   ├── templates.ts              ← 4 built-in vertical flow templates with benchmarks
│   ├── websocket.ts              ← WS server: auth + streaming + dashboard live view
│   ├── stripe.ts                 ← Stripe client singleton
│   ├── plans.ts                  ← Plan limits: free / starter / growth / scale
│   ├── email.ts                  ← Welcome email via Resend
│   └── followup.ts               ← Email / Slack / WhatsApp follow-up triggers
│
├── middleware/
│   ├── auth.ts                   ← authenticateApiKey (widget) + authenticateJWT (dashboard)
│   ├── errorHandler.ts           ← Zod → 400, unhandled → 500
│   └── rateLimit.ts              ← enforceMessageLimit() per org/month
│
├── routes/
│   ├── auth.ts                   ← POST /register /login
│   ├── flow.ts                   ← CRUD flows + steps + /templates + /from-template
│   ├── session.ts                ← Widget: /start /act /event — runs the AI agent
│   ├── activation.ts             ← GET /overview /funnel /timeline /trend
│   ├── integrations.ts           ← GET / POST / PATCH /:type/toggle / DELETE /:type / POST /:type/test
│   ├── benchmarks.ts             ← GET /overview /steps — org vs industry comparison
│   ├── optimize.ts               ← GET /flow / POST /suggest/:id / POST /apply/:id
│   ├── churn.ts                  ← GET /at-risk /score /summary
│   ├── autooptimize.ts           ← GET+PUT /settings / POST /run / GET /log
│   ├── kb.ts                     ← Knowledge base CRUD (JWT): list / create / update / delete
│   ├── users.ts                  ← End-user list + per-user session history (JWT)
│   ├── escalations.ts            ← Escalation ticket list / get / patch status+notes (JWT)
│   ├── config.ts                 ← Org config + AI instructions + key rotation
│   ├── billing.ts                ← Stripe checkout / portal / webhook
│   ├── events.ts                 ← Behavior event tracking
│   ├── checklist.ts              ← Legacy checklist steps (admin-defined)
│   ├── followup.ts               ← Follow-up channel config
│   ├── onboarding.ts             ← Dashboard onboarding checklist status
│   └── admin.ts                  ← /orgs list (X-Admin-Secret)
│
└── services/
    ├── agent.ts                  ← Goal-aware AI agent (OpenAI tool_use, 7 tools)
    ├── apicall.ts                ← executeApiCall() — server-side HTTP for the call_api tool
    ├── knowledge.ts              ← embedText() / cosineSimilarity() / searchKnowledgeBase()
    ├── userhistory.ts            ← getUserHistory() — formats returning-user context for agent
    ├── escalation.ts             ← createEscalationTicket() + notifyTeam() (email + Slack)
    ├── intent.ts                 ← Detects which flow step from page URL + behavior
    ├── integrations.ts           ← Fires events to Segment / Mixpanel / HubSpot / Webhook
    ├── churn.ts                  ← scoreChurnRisk() + buildSignals() — rule-based 0–100
    ├── autooptimize.ts           ← runAutoOptimization() — scans, calls Haiku, applies, logs
    └── ai.ts                     ← Legacy streaming chat (pre-pivot)
```

---

## Key Concepts

### AI Agent (`services/agent.ts`)

OpenAI `tool_use` with `tool_choice: 'required'` — always calls a tool, never plain text. Given the current step config + user message, picks one of 7 tools:

| Tool | What it does |
|---|---|
| `ask_clarification` | One question + optional quick-reply chips |
| `execute_page_action` | Fills form / clicks button / navigates (cross-domain) / highlights element (4 modes) |
| `complete_step` | Advances session to next step, merges collected data |
| `celebrate_milestone` | Shows celebration UI at the aha moment |
| `verify_integration` | Tests a user-provided API key / webhook URL live |
| `escalate_to_human` | Creates support ticket, notifies team via email + Slack, locks widget input |
| `call_api` | Makes a server-side HTTP request and feeds the response back for a follow-up decision |

**`call_api` two-turn loop:** executes the request → result returned as `role: 'tool'` → agent calls one of the other 6 tools as its final action. `AGENT_TOOLS_NO_API` array prevents infinite loops. Private/loopback addresses are blocked. `{{variable}}` placeholders in request bodies are interpolated from `collectedData`.

**Knowledge base context:** On every non-`__init__` message, the top-3 most relevant KB articles (by cosine similarity) are injected into the system prompt automatically.

**User history context:** Returning users get a compact history summary injected into the system prompt — total sessions, completed steps, merged collected data.

**Live DOM context:** The widget scans the page and sends real CSS selectors. The agent only uses selectors from this live list — never invents them.

### Knowledge Base (`services/knowledge.ts`)

Customer uploads articles/FAQs via the dashboard. Each article is embedded with `text-embedding-3-small` (1536-dim). On every agent message, the KB is searched using cosine similarity in application code — no pgvector extension needed. Top-3 results above a 0.3 similarity threshold are injected into the agent's system prompt.

### Human Escalation (`services/escalation.ts`)

When the agent calls `escalate_to_human`, a ticket is created and the team is notified concurrently:
- **Email** (Resend): rich HTML with conversation replay, collected data, direct resolve link
- **Slack** (webhook): attachment with user/step/reason fields

The dashboard `/escalations` inbox shows all tickets with status (open / in_progress / resolved), filtering, and a detail view with notes, conversation replay, and one-click resolve.

### Intelligence Pipeline (`user_step_progress`)

Every step interaction captures:
- `promptSnapshot` — exact AI prompt used at completion time
- `messagesCount` — how many turns it took
- `timeSpentMs` — wall-clock time on the step
- `outcome` — `completed` | `dropped` | `skipped`
- `dropReason` — `idle` | `exit` | `explicit_skip`

### Integration Engine (`services/integrations.ts`)

On every step completion, fires `Step Completed` / `Onboarding Completed` to all connected tools in parallel. Failures are swallowed — integration errors never interrupt onboarding.

Supported: **Segment** (HTTP track), **Mixpanel** (HTTP track), **HubSpot** (contacts upsert by email), **Custom Webhook** (POST).

### Benchmark Engine (`routes/benchmarks.ts`)

Aggregates anonymized data across all orgs. Blends real cross-org rates with research baselines (weighted by data maturity). Per-intent drop-off benchmarks (e.g. `data_connection` → 48% industry avg).

### Churn Scoring (`services/churn.ts`)

Rule-based 0–100 risk score per active session:
- **0–40 pts** — inactivity time (8h / 24h / 72h / 7d thresholds)
- **±25 pts** — progress fraction (penalty for <25% done, bonus for >85% done)
- **0–20 pts** — session staleness vs progress
- **+25 pts** — explicit abandonment

Risk bands: **low** (0–24) · **medium** (25–49) · **high** (50–74) · **critical** (75–100)

### Auto-Optimization Loop (`services/autooptimize.ts`)

Scans active flow, finds steps below completion threshold with enough data, calls GPT-4o-mini for a replacement prompt, applies it, and logs the before/after to `optimization_logs`. Runs manually or on a weekly schedule (Sunday 2AM UTC) when enabled.

### Vertical Templates (`lib/templates.ts`)

4 pre-built flows: **Analytics SaaS** (8 min benchmark) · **No-code Tool** (12 min) · **CRM** (6 min) · **Dev Tool** (5 min). Each has full step configs: intent, AI prompt, smart questions, page actions, completion events, milestone flag.

---

## Running Locally

```bash
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY

../../node_modules/.bin/prisma migrate dev --name init
../../node_modules/.bin/prisma db seed   # prints your API key

npm run dev     # → http://localhost:4000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase free tier works) |
| `JWT_SECRET` | ✅ | Any 32-char random string |
| `OPENAI_API_KEY` | ✅ | From platform.openai.com — used for agent, optimizer, embeddings |
| `RESEND_API_KEY` | Optional | Welcome + follow-up + escalation notification emails |
| `SLACK_WEBHOOK_URL` | Optional | Escalation notifications to your team Slack channel |
| `STRIPE_SECRET_KEY` | Optional | Payments |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe event verification |
| `ADMIN_SECRET` | Optional | Protects `/api/v1/admin/*` |
| `FRONTEND_URL` | Optional | CORS origin (default: `*`) |
| `PORT` | Optional | HTTP port (default: `4000`) |

---

## Database Schema (18 tables)

```
organizations          — paying customers (API key, plan, Stripe)
users                  — dashboard admins (email + password)
end_users              — users of the customer's SaaS product
conversations          — legacy chat sessions (pre-pivot)
messages               — legacy message turns
events                 — behavior events (page_view, idle, rage_click, ...)
checklist_steps        — legacy admin-defined checklist
follow_up_configs      — email / Slack / WhatsApp follow-up settings
onboarding_flows       — the journey to first value (per org)
onboarding_steps       — steps in a flow (AI config, page actions, targetUrl, milestone flag)
user_onboarding_sessions — where each end-user is in the flow
user_step_progress     — per-step intelligence data (timing, message count, prompt snapshot)
integration_configs    — Segment / Mixpanel / HubSpot / Webhook credentials
auto_optimize_configs  — per-org auto-improvement settings
optimization_logs      — full audit trail of all prompt changes (before/after)
knowledge_base_articles — uploaded docs/FAQs with embeddings for semantic search
escalation_tickets     — human handoff requests (status, context, notes, conversation)
```

---

## Testing

```bash
npm test              # Jest unit + integration tests
npm run test:load     # k6 load tests (requires running server)
```

Test files live in `src/__tests__/`. Uses a real test database — no mocks.
