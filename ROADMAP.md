# Prism — Roadmap (Competitive Edition)

> Rule: ship first, improve second. Nothing on this list matters until the product is live.
> Updated: competitive reprioritization vs. Tandem (April 2026)

---

## Competitive context (why this roadmap changed)

Tandem is the primary competitor. Their moat is not technical — it's GTM:

| Tandem has | Prism has | Gap |
|---|---|---|
| "Contact Sales" pricing — opaque | **Free tier live** (3 agents, 100 MTU) | **Prism ahead** |
| No free tier | Free tier with MCP connectors | **Prism ahead** |
| Failure inbox — not surfaced | Failure inbox + health panel | **Prism ahead** |
| Case studies: Aircall 20%, Sellsy 18%, Qonto 100K | Zero case studies | **Critical gap** |
| 25 SEO pages targeting competitors | Zero content | **Large gap** |
| 10 integrations (Slack, Salesforce, Zendesk…) | Zero integrations | **Gap — build post-launch** |
| "Contact Sales" enterprise pricing | Transparent public pricing page | Build Day 26 |

The free tier and MCP connectors shipped today. The remaining gap is **distribution** — case studies, content, and one integration that unblocks enterprise deals.

---

## What's already done (don't rebuild)

- ✅ AI agent + DOM execution (fill, click, navigate, highlight)
- ✅ Flow builder + step editor
- ✅ Session tracking + activation funnel
- ✅ Escalation to human (with full context handoff)
- ✅ Knowledge base (BM25 + vector hybrid search)
- ✅ User history across sessions
- ✅ Billing (Stripe — free + starter + growth + scale)
- ✅ **Free tier** — 3 agents, 100 MTU, MCP connectors, enforced at API level
- ✅ **MCP connectors** — `McpConnector` model, CRUD routes, settings page
- ✅ Auth + org API keys
- ✅ Widget builds + deploys as a single JS file
- ✅ Structured JSON logging + `withRetry()` utility
- ✅ Fallback mode — AI crash → manual step instructions
- ✅ Test mode — `testMode: true` — no DB writes
- ✅ Failure inbox — stuck sessions + open escalations
- ✅ Trigger controls — delay, URL pattern, max-per-user
- ✅ Agent health panel — green/yellow/red, success rate, last 10 sessions
- ✅ Hourly error alerts — Resend email when flow hits 0% in 24h
- ✅ Session detail view — step-by-step action log with AI-assist badge
- ✅ ROI metrics on dashboard home — this-week framing with deltas
- ✅ Guardrails — `allowedActions` per step, enforced before LLM tool call
- ✅ Sensitive field masking — password, cc-*, auto-excluded from page context
- ✅ Audit log — `AuditLog` table, fire-and-forget, `/settings/audit` page
- ✅ Time-to-value metric — avg minutes from first session to milestone step
- ✅ Docs page — Plain HTML / React / Next.js / Webflow tabs
- ✅ Removed checklist feature
- ✅ Removed raw `/analytics` page (replaced by dashboard home)
- ✅ SSE streaming, session message history, thumbs up/down feedback
- ✅ Rate limiting (30 req/60s per org), SPA navigation tracking

---

## Phase 3 — First Users (Days 15–18)
> Goal: 5 real installs, at least 1 paying customer
> **Status: in progress**

| Day | What | Why | Output |
|-----|------|-----|--------|
| 15 | **Loom recording** — 3 min: install snippet → AI guides user → dashboard shows activation data | This is your sales tool. Tandem's website is polished — yours needs motion. | Loom link ready to paste into DMs |
| 16 | **Cold outreach — 15 DMs** — no-code/automation SaaS founders on Twitter + IH. Lead with free tier: "no credit card, 3 agents, install in 5 min" | Tandem is enterprise-priced, inaccessible to SMB founders | 15 DMs sent |
| 17 | **3 discovery calls** with anyone who replies | One call teaches you more than 100 analytics events. Ask: what's breaking in their onboarding today? | 3 calls booked |
| 18 | **First paying customer** — $99 founding price, this week only. Measure their activation rate before and after. | You need the number. Everything after this converts better with "X% lift at [Company]". | $99 in Stripe + baseline activation rate recorded |

---

## Phase 5 — Competitive Positioning (Days 26–30)
> Goal: close the three gaps that let Tandem win deals you should be winning
> **Tandem's moat is not technical. These days build the equivalent.**

| Day | What | Why vs. Tandem | Output |
|-----|------|----------------|--------|
| 26 | **Public pricing page** — `useprism.ai/pricing` with free/starter/growth/scale tiers, MTU + agent limits per tier, feature comparison table | Tandem hides pricing ("Contact Sales"). Transparent pricing is the clearest differentiator for self-serve buyers. Every cold DM ends with "check pricing at useprism.ai/pricing" | Pricing page live, linked from dashboard and docs |
| 27 | **"Users stuck on step X" drop-off insight** — auto-surface the highest drop-off step on dashboard home. "68% of users abandon at Step 2: Connect your data source" | No competitor shows operators this. Tandem shows aggregate lift numbers but not where their flow is broken. This becomes your sales demo centerpiece. | Drop-off alert card on dashboard home. Top stuck step highlighted in red. |
| 28 | **First case study with real numbers** — instrument your first customer's activation rate before/after. One-page write-up: "Acme SaaS went from 23% to 41% activation in 11 days." | Tandem's entire sales machine runs on "Aircall 20% lift". You need your equivalent. Without a number, you're asking buyers to trust you over a named case study. | 1-page case study, PDF + web version. Screenshot of dashboard showing the lift. |
| 29 | **Slack integration** — when AI escalates to human, post to a Slack channel with full session context | Highest-value single integration. Enterprise CS teams manage tickets in Slack. Zendesk has it, Tandem has it. Blocking enterprise deals without it. | `POST escalation → Slack webhook` — configurable in Settings. Escalation tickets show "Slack notified" badge. |
| 30 | **Product Hunt prep** — tagline, description, screenshots, GIF demo, competitive angle | PH is your first real distribution moment. Angle: "The only in-app AI agent with a free tier, transparent pricing, and operational visibility." | PH draft ready, first comment written, hunter lined up |

---

## Phase 6 — Launch + SEO Moat (Days 31–45)
> Goal: $1K MRR, start the content flywheel that compounds for 12 months

| Day | What | Why | Output |
|-----|------|-----|--------|
| 31 | **Launch** — Product Hunt + IH post + Twitter thread | Distribution moment | 500+ upvotes target, 20+ signups day-of |
| 32 | **SEO post 1: "Best Tandem alternatives for B2B SaaS (2026)"** | Tandem has 25 SEO pages targeting their competitors. You need pages that intercept buyers evaluating Tandem. This one post alone will generate trial signups in 4–6 months. | 1,500-word post, live at `useprism.ai/blog/tandem-alternatives` |
| 33 | **SEO post 2: "In-app AI agent for SaaS onboarding — build vs. buy (2026)"** | Second-highest intent query in the category. Tandem owns this with their build-vs-buy guide. Own the conversation before buyers reach them. | 1,500-word post with TCO calculator embed |
| 34 | **Performance pass** — measure P95 agent response time, optimize slow OpenAI call paths | Slow AI = widget closed. Sub-3s response is table stakes. Tandem claims fast responses in their case studies. | P95 < 3s confirmed. Bottleneck identified and fixed. |
| 35 | **Second case study** — if you have a second customer with a number, write it up | Two case studies = pattern, not coincidence. Buyers need to see their industry reflected. | Second 1-pager. Use a different vertical than the first. |
| 36–45 | **Zendesk + Intercom integrations** — escalation tickets sync to existing helpdesk | Tandem has both. Enterprise procurement requires at least one helpdesk integration. Build the one your first enterprise prospect uses. | Zendesk: `POST /escalations → Zendesk ticket` with session context as internal note |

---

## Competitive gap tracker

Track these monthly. Each one closed removes a reason to choose Tandem over Prism.

| Gap | Status | Target |
|-----|--------|--------|
| Free tier | ✅ Shipped | Done |
| MCP connectors | ✅ Shipped | Done |
| Audit log | ✅ Shipped | Done |
| Guardrails | ✅ Shipped | Done |
| Transparent public pricing | Day 26 | — |
| Drop-off insight (unique) | Day 27 | — |
| First case study with number | Day 28 | — |
| Slack integration | Day 29 | — |
| SEO content (2 posts) | Days 32–33 | — |
| Zendesk / Intercom integration | Days 36–45 | — |
| Second case study | Day 35 | — |

---

## Priority stack rank (if you run out of time)

If you can only do 5 more things before launch, do these in order:

1. **Pricing page** (Day 26) — every outreach email needs somewhere to send people
2. **Drop-off insight** (Day 27) — this is your live demo centerpiece
3. **Case study with number** (Day 28) — closes deals that your Loom can't
4. **Slack integration** (Day 29) — unblocks every enterprise evaluation
5. **Launch** (Day 31) — distribution

---

## What NOT to build before $5K MRR

| Item | Why to skip |
|------|-------------|
| Salesforce integration | No SMB founder uses Salesforce |
| Google Analytics / Segment | Buyers want activation lift, not more analytics |
| SSO / SAML | Gate on first enterprise contract |
| A/B testing in-product | You have `FlowExperiment` already. Stop there. |
| More AI models / providers | OpenAI is fine. Latency is the only model problem worth solving. |
| Mobile widget | B2B SaaS is 90% desktop. Don't build for the 10% yet. |

---

## Daily discipline

Before writing any code, answer:
> "Will this help a customer trust, install, or pay for Prism — or will it close a gap that Tandem uses to beat us?"

If neither → skip it.
