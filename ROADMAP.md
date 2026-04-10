# Prism — 30-Day Build Roadmap

> Rule: ship first, improve second. Nothing on this list matters until the product is live.

---

## What's already done (don't rebuild)
- ✅ AI agent + DOM execution (fill, click, navigate, highlight)
- ✅ Flow builder + step editor
- ✅ Session tracking + activation funnel
- ✅ Escalation to human
- ✅ Knowledge base
- ✅ User history across sessions
- ✅ Billing (Stripe)
- ✅ Auth + org API keys
- ✅ Widget builds + deploys as a single JS file
- ✅ Backend + dashboard build clean
- ✅ Stripped 4,800+ lines of non-core features (benchmarks, churn, autooptimize, integrations, etc.)
- ✅ Dashboard rebranded to Prism (sidebar, widget page CDN URL, snippet builder)
- ✅ Structured JSON logging + withRetry() utility (Day 4/6)
- ✅ Fallback mode — AI crash → manual step instructions (Day 7)
- ✅ Test mode — `testMode: true` runs flow without DB writes (Day 8)
- ✅ Failure inbox — `/failures` page shows stuck sessions + open escalations (Day 9)
- ✅ Trigger controls — delay, URL pattern, max-per-user (schema + backend + widget + dashboard UI) (Day 10)

---

## Phase 1 — Ship (Days 1–5)
> Goal: product is live, one real person can use it end-to-end

| Day | What | Why | Output |
|-----|------|-----|--------|
| 1 | Push to GitHub → Railway → Vercel | Nothing matters until it's live | Backend + dashboard live at real URLs |
| 2 | Widget on Vercel CDN → end-to-end test | Verify the full loop works on a real browser | `cdn.useprism.ai/widget.js` loads + completes a session |
| 3 | Register `useprism.ai` → wire domains | Professional URL for outreach | `app.useprism.ai` and `api.useprism.ai` working |
| ~~4~~ | ~~Add structured logging to backend~~ | ✅ Done | `lib/logger.ts` — JSON logs with orgId, sessionId, withRetry() |
| ~~5~~ | ~~Fix empty `dist/` dirs in dashboard~~ | ✅ Done | Deleted benchmarks/, churn/, experiments/, optimize/ dirs |

---

## Phase 2 — Make It Reliable (Days 6–12)
> Goal: when something breaks, you know immediately and users don't hit dead ends

| Day | What | Why | Output |
|-----|------|-----|--------|
| ~~6~~ | ~~Retry logic~~ | ✅ Done | `runAgentSafe()` wraps OpenAI call with `withRetry(2, 800ms)` |
| ~~7~~ | ~~Fallback mode~~ | ✅ Done | `runAgentSafe()` falls back to step.description as manual guide |
| ~~8~~ | ~~Test mode~~ | ✅ Done | `testMode: true` in session/start + session/act — no DB writes |
| ~~9~~ | ~~Failure inbox~~ | ✅ Done | `/failures` — stuck sessions (inactive >30min) + open escalations |
| ~~10~~ | ~~Trigger controls~~ | ✅ Done | DB schema + backend PUT + widget enforcement + dashboard UI panel |
| 11 | **Agent health status** — dashboard widget showing: last 10 sessions, success rate, avg response time | Right now no way to know if AI is working | Health indicator on dashboard home: green/yellow/red |
| 12 | **Error alerts** — email you when a flow's completion rate drops to 0% for 24h | You'll find out from customers, not before | Resend email to org owner: "Flow X has had 0 completions today" |

---

## Phase 3 — First Users (Days 13–18)
> Goal: 5 real installs, at least 1 paying customer

| Day | What | Why | Output |
|-----|------|-----|--------|
| 13 | **Session detail view** — click any session → see every message, action, result | Right now you can only see aggregate funnel | `/conversations/[id]` already exists, make sure it shows full agent action log |
| 14 | **ROI metrics on dashboard home** — "X% of users completed onboarding this week (+Y% vs last week)" | Right now metrics exist but aren't framed as value | Dashboard home: activation rate, avg time-to-value, sessions this week |
| 15 | **Loom recording** — record 3 min: install snippet → AI guides user → dashboard shows data | This is your sales tool | Loom link ready to send in DMs |
| 16 | **Cold outreach — 15 DMs** | You need real users | 15 DMs sent to no-code/automation SaaS founders on Twitter + IH |
| 17 | **Get on calls** — 3 calls with anyone who replies | You learn more in 1 call than 100 analytics events | 3 calls booked |
| 18 | **First paying customer** — offer $99 founding price, this week only | Validation that the product has real value | $99 in Stripe |

---

## Phase 4 — Trust + Control (Days 19–25)
> Goal: customers trust the AI enough to leave it on permanently

| Day | What | Why | Output |
|-----|------|-----|--------|
| 19 | **Guardrails** — per-step config: allowed action types (read-only vs execute) | Enterprise orgs won't install AI that can click anything | Step settings: `allowedActions: ['highlight', 'navigate']` vs `['fill_form', 'click']` |
| 20 | **Sensitive field masking** — agent can't read inputs flagged as `type=password`, `autocomplete=cc-*` | Security baseline, needed for any fintech/healthcare customer | Scanner automatically excludes sensitive fields from page context |
| 21 | **Audit log** — every action the AI took, logged per org | "What did your AI do on my site?" — operators need this | `/settings/audit` page: timestamp, user, action, result |
| 22 | **Time-to-value metric** — track how long from first session to milestone step | This is your headline number for sales conversations | Dashboard: "Average time to activation: 4m 32s" |
| 23 | **Docs page** — "Deploy in 5 minutes" guide with copy-paste code for React, Next.js, plain HTML, Webflow | Reduces support load, increases install rate | `/docs` at `useprism.ai/docs` |
| 24 | **Remove checklist feature** (`/settings/checklist`, `routes/checklist.ts`) | Overlaps with flows, creates confusion | Cleaner product |
| 25 | **Remove generic `/analytics` page** — replace with actionable metrics on dashboard home | Current analytics page shows raw numbers, not insights | One less page, cleaner nav |

---

## Phase 5 — Scale (Days 26–30)
> Goal: $1K MRR, Product Hunt ready

| Day | What | Why | Output |
|-----|------|-----|--------|
| 26 | **"Users stuck on step X" insight** — automatically surface which step has highest drop-off | Operators don't know where to fix their flow | Dashboard alert: "68% of users drop off at Step 2: Connect your data source" |
| 27 | **Case study** — turn your best active user into a 1-page case study with numbers | Social proof for Product Hunt and cold outreach | "Acme SaaS went from 23% to 61% activation in 2 weeks" |
| 28 | **Performance pass** — measure agent response time, optimize slow paths | Slow AI = users close the widget | P95 response time under 3 seconds |
| 29 | **Product Hunt prep** — tagline, description, screenshots, GIF demo | PH launch is your first big distribution moment | PH draft ready |
| 30 | **Launch** — Product Hunt + IH post + Twitter thread | Distribution | 500+ upvotes target, 20+ signups day-of |

---

## What to REMOVE (do in parallel, not as separate days)

| Remove | When | Why |
|--------|------|-----|
| `/settings/checklist` + `routes/checklist.ts` | Day 24 | Overlaps with flow steps, confuses new users |
| `/analytics` page | Day 25 | Replace with actionable metrics on dashboard home |
| `routes/onboarding.ts` | Check if used — if not, delete | Likely dead code from early build |
| `apps/dashboard/app/(app)/benchmarks` dir (empty) | Now | Leftover empty directory |
| `apps/dashboard/app/(app)/churn` dir (empty) | Now | Leftover empty directory |
| `apps/dashboard/app/(app)/experiments` dir (empty) | Now | Leftover empty directory |
| `apps/dashboard/app/(app)/optimize` dir (empty) | Now | Leftover empty directory |

---

## Priority stack rank (if you run out of time)

If you can only do 10 things, do these in order:

1. Deploy (Day 1–2)
2. Retry + fallback (Day 6–7)
3. Test mode (Day 8)
4. Failure inbox (Day 9)
5. Loom + outreach (Day 15–16)
6. First paying customer (Day 18)
7. Guardrails (Day 19)
8. Audit log (Day 21)
9. Docs (Day 23)
10. Launch (Day 30)

---

## Daily discipline

Before writing any code, answer:
> "Will this help a customer trust, install, or pay for Prism?"

If no → skip it.
