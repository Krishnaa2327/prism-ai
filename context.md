# OnboardAI — Session Context

> Last updated: April 10, 2026  
> Working directory: `D:/period ai` (npm workspace monorepo)

---

## What This Product Is

**OnboardAI** — Embeddable AI onboarding copilot for SaaS.  
**Pitch:** "We help SaaS companies increase activation by 30% by automatically completing onboarding and benchmarking it against the best companies in the industry."  
**Stack:** Express + TypeScript + Prisma + PostgreSQL (backend) · Vanilla TS widget · Next.js 14 dashboard · Next.js landing  
**AI:** OpenAI `gpt-4o` (agent, optimizer) · `gpt-4o-mini` (auto-optimize, intent) · `text-embedding-3-small` (KB embeddings)

---

## Monorepo Structure

```
D:/period ai/
├── apps/
│   ├── backend/       → Express API (port 4000)
│   ├── widget/        → Embeddable TS widget (Vite, port 5173)
│   ├── dashboard/     → Next.js 14 admin (port 3000)
│   └── landing/       → Next.js marketing + docs (port 3001)
├── packages/          → Shared types
└── package.json       → npm workspaces root
```

---

## All Features Built (Complete)

### Core Phases
| Phase | Feature | Status |
|---|---|---|
| 1 | AI copilot widget + session agent + flow builder + activation analytics | ✅ |
| 2 | Integration engine (Segment, Mixpanel, HubSpot, Webhook) + verify_integration tool | ✅ |
| 3 | Cross-customer benchmarks + AI prompt optimizer | ✅ |
| 4 | Churn prediction + auto-optimization loop (weekly cron) | ✅ |
| Post | Multi-page/cross-domain flows | ✅ |
| Post | MCP/API server calls from agent (`call_api` tool) | ✅ |
| Post | Knowledge base with semantic search | ✅ |
| Post | User history across sessions | ✅ |
| Post | Human escalation (ticket + email + Slack + dashboard inbox) | ✅ |
| Post | 4-mode on-screen highlighting (spotlight/beacon/arrow/multi) | ✅ |
| Post | Client-side session progress caching (localStorage, instant render) | ✅ |

---

## Architecture — Key Decisions

### AI Agent (`apps/backend/src/services/agent.ts`)
- **Provider:** OpenAI (swapped from Anthropic — user has OpenAI key only)
- **Model:** `gpt-4o`, `tool_choice: 'required'` — always calls a tool, never plain text
- **7 tools total:**
  1. `ask_clarification` — question + chips
  2. `execute_page_action` — fill_form / click / navigate / highlight (4 modes)
  3. `complete_step` — advance session + merge collectedData
  4. `celebrate_milestone` — aha moment UI
  5. `verify_integration` — live API key/webhook test
  6. `escalate_to_human` — ticket + notify team
  7. `call_api` — server-side HTTP, two-turn result loop
- **`__init__` trigger:** widget auto-fires on open → AI acts immediately, no user typing needed
- **`AGENT_TOOLS_NO_API`:** `call_api` excluded from follow-up turn to prevent infinite loops
- **System prompt injections:** live DOM map (real CSS selectors) + KB results (top-3, cosine similarity) + user history (returning users)

### Widget (`apps/widget/src/`)
- **`copilot.ts` — CopilotManager:**
  - Session cache: `_oai_s_{apiKey8}_{userId}` in localStorage, 7-day expiry
  - Pre-warms `this.session` from cache **synchronously** (before first `await` in `start()`)
  - `onSessionUpdate` must be registered **before** calling `start()` in widget.ts for cache pre-warm to fire callback
  - `navigate` action saves `{ sessionId, flowId, userId }` to `localStorage._oai_resume` (cross-domain)
- **`highlighter.ts` — 4 modes:**
  - `spotlight(selector, label, durationMs, color)` — dark backdrop + cutout + ring + tooltip
  - `beacon(selector, label, durationMs)` — pulsing dot badge on corner + dark tooltip
  - `arrowCallout(selector, label, durationMs, color)` — auto-positioned speech bubble + arrow + ring
  - `multiHighlight(selectors[], labels[], durationMs, color)` — numbered rings, staggered animation
- **`scanner.ts`:** scans live DOM → `PageContext { url, title, headings, elements[] }` — sent on every `sendMessage`
- **`widget.ts`:** registers `onSessionUpdate` BEFORE `start()`, checks `hasCached` to skip `triggerDelay`

### DB Schema (18 tables)
```
organizations, users, end_users, events,
checklist_steps, follow_up_configs,
onboarding_flows, onboarding_steps (+ target_url),
user_onboarding_sessions, user_step_progress,
integration_configs, auto_optimize_configs, optimization_logs,
conversations, messages,
knowledge_base_articles,   ← embeddings as JSON float[]
escalation_tickets         ← trigger, status, context JSON, notes
```

### Key Service Files
```
backend/src/services/
├── agent.ts          ← Main AI agent (7 tools)
├── apicall.ts        ← executeApiCall() — blocks private IPs, {{variable}} interpolation
├── knowledge.ts      ← embedText(), cosineSimilarity(), searchKnowledgeBase()
├── userhistory.ts    ← getUserHistory() — merges past sessions, formats context string
├── escalation.ts     ← createEscalationTicket() + notifyTeam() (Resend + Slack)
├── integrations.ts   ← Segment/Mixpanel/HubSpot/Webhook parallel firing
├── churn.ts          ← scoreChurnRisk() — rule-based 0-100
└── autooptimize.ts   ← runAutoOptimization() — scan → GPT-4o-mini → apply → log
```

### Dashboard Pages
```
/dashboard, /flows, /flows/[id], /activation, /benchmarks, /optimize,
/churn, /users, /escalations, /escalations/[id], /conversations, /analytics,
/settings/autooptimize, /settings/knowledge, /settings/integrations,
/settings/ai, /settings/widget, /settings/followup, /settings/billing
```

---

## Constraints & Notes

### TypeScript
- **Widget:** compiles clean (`tsc --noEmit` → 0 errors)
- **Backend:** pre-existing errors in `__tests__/` (missing `@types/jest`), `stripe.ts` (API version string), old routes (Prisma JSON type mismatch) — **none introduced by our changes, safe to ignore**

### DB Migrations
Three manual SQL migration files exist:
- `20260410000000_step_target_url` — adds `target_url TEXT` to `onboarding_steps`
- `20260410000002_knowledge_base` — creates `knowledge_base_articles`
- `20260410000003_escalations` — creates `escalation_tickets`

Run with: `prisma migrate deploy`

### Environment Variables Needed
```
DATABASE_URL          ← PostgreSQL (Supabase)
JWT_SECRET            ← 32-char random string
OPENAI_API_KEY        ← gpt-4o + text-embedding-3-small
RESEND_API_KEY        ← escalation emails + welcome emails
SLACK_WEBHOOK_URL     ← escalation Slack notifications
STRIPE_SECRET_KEY     ← payments (optional for now)
STRIPE_WEBHOOK_SECRET ← Stripe events (optional for now)
ADMIN_SECRET          ← /api/v1/admin/* protection
FRONTEND_URL          ← CORS (set to http://localhost:5173 for widget dev)
```

### Seeded Test Data
- API key: `org_c6816bf636ae147eda98717e86a52a008424317cd07ca857c7363e73eafc0e24`
- Test userId: `fresh_test_2` (hardcoded in `apps/widget/test.html`)

### AI Provider Note
**OpenAI only** — user does not have an Anthropic key. All references to Claude/Anthropic in old code were replaced with OpenAI equivalents. Do not add any Anthropic SDK calls.

### GPT-4o Tool Call Shape
GPT-4o does NOT nest fields into a `payload` sub-object. The `execute_page_action` tool uses flat top-level params (`selector`, `url`, `fields`, `highlightMode`, etc.). Backend builds the payload object from these flat fields.

---

## Deployment Plan (Not Done Yet)

1. `npm install` in all 4 apps
2. Fill `.env` values
3. `prisma migrate deploy` → all 18 tables
4. `prisma db seed` → prints API key
5. Push to GitHub
6. Railway → backend (`npm run build && npm start`, root: `apps/backend`)
7. Stripe CLI → webhook → copy `whsec_`
8. Vercel → dashboard (`apps/dashboard`, env: `NEXT_PUBLIC_API_URL`)
9. Vercel → landing (`apps/landing`, env: `NEXT_PUBLIC_DASHBOARD_URL`)
10. Widget: `npm run build` → host `widget.iife.js` as `cdn.onboardai.com/widget.js`
11. End-to-end test
12. OG image (`apps/landing/public/og.png`, 1200×630px)

---

## What Was Done This Session (Session 12)

1. **Escalations sidebar** — added `🚨 Escalations` entry to `Sidebar.tsx`
2. **4-mode highlighting** — `highlighter.ts` rewritten with `spotlight`, `beacon`, `arrowCallout`, `multiHighlight`; agent tool expanded with `highlightMode`/`highlightLabel`/`highlightSelectors`/`highlightLabels` params
3. **Session progress caching** — localStorage cache in `CopilotManager`; synchronous pre-warm before API round-trip; `triggerDelay` skipped for cached users
4. **Memory updated** — `diary.md` + `project_onboardai.md` in `~/.claude/projects/D--period-ai/memory/`
5. **All 4 READMEs updated** — widget, backend, dashboard, landing

## Pending / Next Session

- **Competitive analysis of Tandem AI** (usetandem.ai) — attempted but Agent tool was rejected by user permissions. Do this by fetching https://usetandem.ai directly with WebFetch + WebSearch tools instead of spawning a subagent.
- **Deployment** — no code changes needed, only infrastructure setup
- **Go-to-market** — Loom demo, cold DMs to no-code/analytics founders, IndieHackers, Product Hunt (after 5 paying users)

---

## How to Continue

If picking up a new session, read this file first, then check `~/.claude/projects/D--period-ai/memory/` for:
- `MEMORY.md` — index
- `project_onboardai.md` — full feature inventory + deploy plan
- `diary.md` — chronological session log with all decisions

To do the Tandem AI analysis in the next session, use `WebFetch` + `WebSearch` tools directly (not Agent tool) — fetch `https://usetandem.ai` and search for reviews, Reddit posts, pricing.
