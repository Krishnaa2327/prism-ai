# OnboardAI — Onboarding Intelligence Platform for SaaS

> We help SaaS companies increase activation by 30% by automatically completing onboarding and benchmarking it against the best companies in the industry.

---

## What We Built

**OnboardAI** is a three-layer platform:

| Layer | What it does | Moat |
|---|---|---|
| **UI Layer** | Embeddable AI copilot widget — guides users through onboarding steps, fills forms, navigates pages | Low (replicable) |
| **Execution Layer** | AI agent with tool use — actually does setup for the user, not just explains | Medium |
| **Intelligence Layer** | Cross-customer benchmarks, prompt optimization, churn prediction, auto-improvement loop — learns from every customer | **High** |

**One-line pitch:** Embed one script tag. The AI guides every new user to their first value moment — automatically.

---

## The Core Problem

```
Without OnboardAI:
  User signs up → gets confused at step 2 → closes tab → LOST FOREVER
  (Industry average: 60% of trial users never reach first value)

With OnboardAI:
  User signs up → AI copilot opens → detects intent → asks 1 question →
  fills the form / connects the data / runs the workflow →
  User reaches first value in <8 minutes → ACTIVATED ✅
```

---

## How Customers Use It

**Step 1 — Configure a flow (10 minutes)**

Log into the dashboard. Pick a vertical template (Analytics SaaS, No-code, CRM, Dev Tools) or build from scratch. Each step has: a title, an AI prompt, up to 2 smart questions, and a page action (fill form, click button, navigate, highlight element).

**Step 2 — Embed one script tag (2 minutes)**

```html
<script src="https://cdn.onboardai.com/widget.js"></script>
<script>
  OnboardAI('init', {
    apiKey: 'org_YOUR_KEY',
    userId: currentUser.id,
    metadata: { plan: currentUser.plan }
  });
</script>

<!-- Fire this anywhere in your app when a step completes -->
<script>OnboardAI('event', 'data_connected');</script>
```

**Step 3 — AI handles every new user**

The copilot opens automatically, detects which step the user is on, asks one smart question, and executes the setup. The SaaS owner never touches it again.

**Step 4 — Track, benchmark, and improve**

The dashboard shows: sessions started, completion rate, time-to-first-value, per-step drop-off %, AI-assist rate. Benchmark against industry averages. Identify at-risk users. Let AI auto-optimize underperforming prompts.

---

## Build Status — All 4 Phases Complete ✅

| Phase | Theme | What was built | Status |
|---|---|---|---|
| **1** | Get users | AI copilot · flow builder · activation analytics · vertical templates · intelligence data pipeline | ✅ Done |
| **2** | Differentiate | Integration engine (Segment, Mixpanel, HubSpot, Webhook) · `verify_integration` agent tool | ✅ Done |
| **3** | Build moat | Cross-customer benchmarks · AI prompt optimizer with one-click apply | ✅ Done |
| **4** | Dominate | Churn risk scoring · auto-improvement loop · week-over-week trend tracking | ✅ Done |

---

## Monorepo Structure

```
onboardai/
├── apps/
│   ├── backend/      ← Express + Prisma + Claude API (tool use) + WebSocket
│   ├── widget/       ← Embeddable JS copilot (IIFE bundle, ~15KB)
│   ├── dashboard/    ← Next.js 14 admin: flow builder, activation, intelligence
│   └── landing/      ← Marketing site + /docs
├── tests/
│   ├── load/         ← k6 load tests (REST + WebSocket)
│   └── SECURITY_AUDIT.md
├── dist/widget/      ← Built widget.js (CDN-ready)
└── DEPLOY.md         ← Full production deploy guide
```

---

## Database Schema (15 tables)

```
organizations          — paying customers (API key, plan, Stripe)
users                  — dashboard admins
end_users              — users of the customer's SaaS product
conversations          — legacy chat sessions
messages               — chat message turns
events                 — behavior events (page_view, idle, rage_click, ...)
checklist_steps        — legacy checklist
follow_up_configs      — email/Slack/WhatsApp follow-up settings
onboarding_flows       — the journey to first value (per org)
onboarding_steps       — steps in a flow (AI config + page actions)
user_onboarding_sessions — where each user is in the flow
user_step_progress     — per-step completion + intelligence fields
                          (promptSnapshot, messagesCount, timeSpentMs, outcome, dropReason)
integration_configs    — Segment / Mixpanel / HubSpot / Webhook per org
auto_optimize_configs  — auto-improvement settings (enabled, threshold, minSessions)
optimization_logs      — full audit trail of all prompt optimizations (before/after)
```

---

## API Reference

### Widget endpoints (`X-API-Key` header)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/session/start` | Start/resume onboarding session, intent-detects current step |
| POST | `/api/v1/session/act` | User message → AI agent returns action |
| POST | `/api/v1/session/event` | Fire step completion event (auto-advances session, fires integrations) |
| GET  | `/api/v1/session` | Get current session state |
| POST | `/api/v1/events` | Track behavior events |
| GET  | `/api/v1/churn/score` | Get churn risk score for a userId (widget uses for proactive nudges) |

### Dashboard endpoints (`Authorization: Bearer` JWT)

**Auth**
| POST | `/api/v1/auth/register` | Create org + owner |
| POST | `/api/v1/auth/login` | Get JWT |

**Flows**
| GET/POST | `/api/v1/flow` | List / create flows |
| GET/PUT/DELETE | `/api/v1/flow/:id` | Get / update / delete flow |
| GET | `/api/v1/flow/templates` | List 4 vertical templates |
| POST | `/api/v1/flow/from-template` | Create flow from template |
| GET/POST/PUT/DELETE | `/api/v1/flow/:id/steps` | Manage steps |

**Activation**
| GET | `/api/v1/activation/overview` | Completion rate, time-to-value totals |
| GET | `/api/v1/activation/funnel` | Per-step drop-off funnel |
| GET | `/api/v1/activation/timeline` | Sessions over time (last N days) |
| GET | `/api/v1/activation/trend` | This week vs last week comparison |

**Intelligence**
| GET | `/api/v1/benchmarks/overview` | Org stats vs industry averages + activation score |
| GET | `/api/v1/benchmarks/steps` | Per-step drop-off vs industry avg by intent |
| GET | `/api/v1/optimize/flow` | Step health scores + performance data |
| POST | `/api/v1/optimize/suggest/:stepId` | Claude suggests improved prompt |
| POST | `/api/v1/optimize/apply/:stepId` | Apply suggested prompt to step |
| GET | `/api/v1/churn/at-risk` | Active sessions ranked by churn risk score |
| GET | `/api/v1/churn/summary` | Breakdown counts (critical/high/medium/low) |
| GET/PUT | `/api/v1/autooptimize/settings` | Auto-optimize config |
| POST | `/api/v1/autooptimize/run` | Manually trigger optimization scan |
| GET | `/api/v1/autooptimize/log` | Optimization history |

**Integrations**
| GET | `/api/v1/integrations` | List configured integrations (credentials masked) |
| POST | `/api/v1/integrations` | Connect / update an integration |
| PATCH | `/api/v1/integrations/:type/toggle` | Enable / disable |
| DELETE | `/api/v1/integrations/:type` | Remove integration |
| POST | `/api/v1/integrations/:type/test` | Test live connection |

**Settings / Billing**
| GET/PUT | `/api/v1/config` | Org config + AI instructions |
| POST | `/api/v1/config/rotate-key` | Rotate API key |
| GET | `/api/v1/billing/status` | Plan info + usage |
| POST | `/api/v1/billing/checkout` | Stripe checkout session |
| POST | `/api/v1/billing/portal` | Stripe customer portal |

---

## AI Agent Tools

The agent in `services/agent.ts` uses Claude `tool_use`. On every user message it picks one of 5 tools:

| Tool | What it does |
|---|---|
| `ask_clarification` | Asks one smart question with optional quick-reply chips |
| `execute_page_action` | Fills a form / clicks a button / navigates / highlights an element on the user's page |
| `complete_step` | Marks step done, advances to next, merges collected data |
| `celebrate_milestone` | Shows celebration UI when user reaches the aha moment |
| `verify_integration` | Tests an API key or webhook URL live — used when user says they connected a tool |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express.js + TypeScript + Prisma |
| Database | PostgreSQL (Supabase) |
| AI | Claude API — `claude-sonnet-4-6` (agent) + `claude-haiku-4-5` (auto-optimize batch) |
| Widget | Vanilla TypeScript + Vite (IIFE bundle) |
| Dashboard | Next.js 14 App Router + Tailwind + Recharts |
| Hosting | Railway (backend) + Vercel (frontend) |
| Payments | Stripe |
| Email | Resend |

---

## Pricing

| Plan | Price | Sessions/mo | Target |
|---|---|---|---|
| Free | $0 | 100 | Staging / evaluation |
| Starter | $99/mo | 1,000 | Early-stage SaaS |
| Growth | $299/mo | 10,000 | Scaling SaaS |
| Scale | $999/mo | Unlimited | Funded startups |

---

## Quick Start

```bash
# 1. Install all dependencies (npm workspace)
npm install

# 2. Backend
cd apps/backend
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, CLAUDE_API_KEY
../../node_modules/.bin/prisma migrate dev --name init
../../node_modules/.bin/prisma db seed
npm run dev                   # → http://localhost:4000

# 3. Widget dev server
cd apps/widget
npx vite --config vite.dev.config.ts   # → http://localhost:5173/test.html

# 4. Dashboard
cd apps/dashboard
npm run dev                   # → http://localhost:3000

# 5. Landing (optional)
cd apps/landing
npm run dev                   # → http://localhost:3001
```

See **DEPLOY.md** for full production deployment (Railway + Vercel).

---

## Fundraising Target

- **Round:** Pre-seed
- **Target:** $600K
- **Investors:** 100X.VC, Antler India, AJVC
- **Grant:** SISFS ₹50L — applying after first paying customers
- **Comparable:** RevRag AI (Bangalore, $600K Powerhouse Ventures, BFSI). We target global SaaS — 10x larger market.
