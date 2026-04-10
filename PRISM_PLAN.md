# Prism — Execution Plan

> One-line pitch: **Prism is the AI agent that lives inside your SaaS and guides every user to their first value moment.**

---

## 1. Tandem Analysis (what they nailed)

| Dimension | What Tandem does |
|-----------|-----------------|
| **Problem** | Users churn before activating — onboarding is static, broken, or skipped |
| **Core insight** | An AI that *executes actions* (fills forms, clicks buttons, navigates) beats tooltips/guides every time |
| **Target buyer** | Growth / Product / CS teams at B2B SaaS |
| **Moat** | In-context DOM execution + analytics proving activation lift |
| **GTM** | Free deploy → self-serve → usage-based upsell |

Tandem is the closest comp. The gap to exploit: **they have no flow builder, no benchmarking, and no open pricing.** Prism ships all three.

---

## 2. What to Cut from OnboardAI → Prism

These features exist in the codebase. **Remove from the product surface** (keep code, just don't expose in dashboard or docs) until you have 20+ paying customers:

| Feature | Why Cut |
|---------|---------|
| Cross-org benchmarks (`routes/benchmarks.ts`) | Needs data at scale — meaningless with <50 orgs |
| Auto-optimize cron (`services/autooptimize.ts`) | Runs unsupervised — creates trust risk with new customers |
| Churn scoring (`services/churn.ts`) | Downstream metric; no usage data yet to score against |
| Segment / Mixpanel / HubSpot integrations | Adds onboarding friction; not a day-1 blocker for buyers |
| Multi-page cross-domain flows | Edge case — complicates QA and support |
| Vertical flow templates | Distraction; one good universal template beats five mediocre ones |
| User history across sessions | Nice to have; session context is enough for MVP |

**Keep (core product):**
- Widget + AI agent (DOM scanner, action execution, 4 highlight modes)
- Flow builder + step editor in dashboard
- Activation funnel analytics
- Human escalation with context
- Knowledge base (inject product docs into agent context)
- Org API key + embed snippet

---

## 3. Rebrand Checklist: OnboardAI → Prism

Do these in one pass before any deployment:

- [ ] `package.json` `name` fields in all 4 apps → `prism-*`
- [ ] `.env` / `.env.example` — rename `ONBOARDAI_*` vars to `PRISM_*`
- [ ] Dashboard `<title>` + sidebar logo text → "Prism"
- [ ] Widget embed snippet URL → `cdn.useprism.ai/widget.js`
- [ ] Backend `X-App` headers, email "from" name, Slack notif prefix
- [ ] `apps/landing` — swap all "OnboardAI" text to "Prism" (you said you'll handle the marketing site)
- [ ] Prisma schema: no changes needed (table names are generic)
- [ ] New domains to register: `useprism.ai`, `cdn.useprism.ai`

---

## 4. Core Architecture (what Prism actually is)

```
┌─────────────────────────────────────┐
│  SaaS Customer's App                │
│                                     │
│  <script src="cdn.useprism.ai/..."> │
│       │                             │
│       ▼                             │
│  Prism Widget (iframe/shadow DOM)   │
│   ├─ scanner.ts  (live DOM → ctx)   │
│   ├─ highlighter.ts  (4 modes)      │
│   └─ copilot.ts  (session mgr)      │
└──────────────┬──────────────────────┘
               │ HTTPS  (org API key)
               ▼
┌─────────────────────────────────────┐
│  Prism Backend (Railway)            │
│   ├─ Agent (GPT-4o, 6 tools)        │
│   ├─ Session / step tracking        │
│   ├─ KB search (cosine sim)         │
│   └─ Escalation (Resend + Slack)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Prism Dashboard (Vercel)           │
│   ├─ Flow builder                   │
│   ├─ Activation analytics           │
│   ├─ Escalation inbox               │
│   └─ Settings (KB, API key)         │
└─────────────────────────────────────┘
```

---

## 5. Step-by-Step Execution Plan

### MILESTONE 0 — Strip & Rebrand  *(Day 1)*
**Goal:** Clean repo, Prism name everywhere, nothing exposed that isn't core.

- [ ] Hide benchmark, churn, auto-optimize routes from dashboard nav
- [ ] Comment out `/settings/integrations` nav link (keep code, don't expose)
- [ ] Run full rebrand checklist from §3
- [ ] Register `useprism.ai` domain
- [ ] `npx tsc --noEmit` in backend + widget — confirm no new errors

**Exit criteria:** App loads as "Prism," no OnboardAI references in UI.

---

### MILESTONE 1 — Deploy  *(Days 2–4)*
**Goal:** Live product, real embed snippet, end-to-end working.

- [ ] Supabase project → `prisma migrate deploy` → `prisma db seed`
- [ ] Railway → deploy backend, set all env vars
- [ ] Vercel → deploy dashboard + landing
- [ ] Build widget → upload to CDN as `cdn.useprism.ai/widget.js`
- [ ] End-to-end test: embed in test HTML → full session → check dashboard
- [ ] Stripe: 3 price IDs wired (Starter / Growth / Scale)

**Exit criteria:** You can embed Prism on any webpage and complete an AI-guided session.

---

### MILESTONE 2 — First 5 Users  *(Week 2)*
**Goal:** Real SaaS founders installing the widget on a live product.

**Who to target:** No-code / automation SaaS founders (Bubble, Glide, Make ecosystem)
- They have active users, care about activation, can install a script tag themselves

**Outreach script (cold DM, Twitter/LinkedIn):**
> "Your onboarding is leaking users before they hit their aha moment. I built an AI agent that lives in your app and guides them there. Takes 2 min to install. Want early access?"

**Channels:**
- [ ] Loom walkthrough (3 min) — record on your own test app
- [ ] 15 cold DMs (Indie Hackers, Twitter, Peerlist)
- [ ] 1 Indie Hackers post: "I built Tandem's competitor in 3 weeks — here's the widget"
- [ ] Post in 2 Slack communities (Makerpad, No Code Founders)

**Exit criteria:** 5 installs, at least 1 session completed per install.

---

### MILESTONE 3 — First $1K MRR  *(Week 3–4)*
**Goal:** 2–3 paying customers at $299–$499/mo (Starter or Growth tier).

- [ ] Get on a call with every active free user
- [ ] Show them their activation funnel in the dashboard
- [ ] Ask: "What % of users reach [key action]?" → show them Prism's data
- [ ] Offer to lock in founding price if they upgrade this week
- [ ] Wire Stripe billing + upgrade flow in dashboard

**Pricing anchor:**
| Tier | Price | Limit |
|------|-------|-------|
| Starter | $149/mo | 500 MAU |
| Growth | $399/mo | 5K MAU |
| Scale | $999/mo | 25K MAU |

**Exit criteria:** 3 paying orgs, $1K+ MRR, at least 1 written testimonial.

---

### MILESTONE 4 — Retention & Proof  *(Month 2)*
**Goal:** No churn among paying customers. Build the case for Series A conversations.

- [ ] Weekly activation report email (auto-generated, send via Resend)
- [ ] In-app prompt: "Your users took 40% less time to activate this week"
- [ ] Re-enable benchmarks for paying orgs (anonymized, industry average only)
- [ ] Add Segment integration back — it's the #1 ask from growth teams
- [ ] Customer interviews → 2 case studies with activation % numbers

**Exit criteria:** 0 churn in Month 2, 2 case studies with hard numbers.

---

### MILESTONE 5 — Scale  *(Month 3+)*
**Goal:** $10K MRR, inbound pipeline, pre-seed raise.

- [ ] Product Hunt launch (after 5 paying customers + 1 case study)
- [ ] Re-enable auto-optimize (with customer consent toggle)
- [ ] Add churn scoring back — now you have enough usage data
- [ ] Enterprise tier: SSO, SOC2, SLA, dedicated Slack channel
- [ ] Raise: target $600K pre-seed at $3–4M cap (YC / Antler / angels in SaaS tooling)

---

## 6. Tech Decisions (locked)

| Decision | Choice | Reason |
|----------|--------|--------|
| AI provider | OpenAI GPT-4o / 4o-mini | Working, key exists |
| Backend | Node/Express + Railway | Already deployed |
| DB | Supabase + Prisma | 18-table schema ready |
| Widget | Vanilla TS + Vite | No framework dep = universal embed |
| Dashboard | Next.js + Vercel | Zero-config deploy |
| Billing | Stripe | Already wired |
| Email | Resend | Already wired |

No changes to the stack. Ship with what works.

---

## 7. What Makes Prism Defensible vs Tandem

| Moat | How to build it |
|------|----------------|
| **Flow builder** | Tandem has no visual editor — yours is a product differentiator |
| **Benchmarks** | Cross-org anonymized data becomes unique as you scale |
| **Open pricing** | Tandem hides pricing — Prism is self-serve, frictionless |
| **Founder speed** | You ship in days; Tandem moves like a funded startup |

---

## Iteration Protocol

For every session, pick one problem from this list and solve it completely before moving on:

```
[ ] Can a founder install Prism in under 5 minutes?
[ ] Does the AI agent complete a step on the first try, 80% of the time?
[ ] Does the dashboard show activation clearly enough that a non-technical founder understands it?
[ ] Will a customer pay for this before they see it "scale"?
[ ] Is there one customer who would be upset if Prism disappeared tomorrow?
```

When all 5 are yes → you have product-market fit. Raise.
