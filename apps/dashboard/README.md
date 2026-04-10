# OnboardAI — Dashboard

Next.js 14 admin panel. Configure onboarding flows, track activation, benchmark against the industry, manage escalations, and let AI improve your prompts automatically.

## Status: All features complete ✅

---

## Pages

```
/dashboard                    ← Home: activation metrics, week-over-week trend strip,
                                 drop-off funnel preview, churn alert banner
/flows                        ← Flow list + template picker (4 vertical templates)
/flows/[id]                   ← Step editor: title, intent, AI prompt, smart questions,
                                 action type, action config, targetUrl,
                                 completion event, milestone flag
/activation                   ← Full funnel: bar chart + step table + 30-day timeline
/benchmarks                   ← Activation score (0–100), completion rate vs industry avg,
                                 step-by-step comparison table (good / average / poor)
/optimize                     ← Prompt lab: per-step health scores, "Optimize with AI"
                                 → side-by-side diff + what-changed list → one-click apply
/churn                        ← At-risk users ranked by churn score: factors, recommendations,
                                 expandable detail with metadata + session info
/users                        ← End-user list with session counts + last-seen; click a user
                                 to open a side panel with full session history + collected data
/escalations                  ← Inbox: stat row (total/open/in_progress/resolved), filter tabs,
                                 ticket table (status, user, reason, trigger, age)
/escalations/[id]             ← Ticket detail: status actions (in-progress / resolve),
                                 reason + agent message, user context grid, collected data,
                                 conversation replay, team notes textarea
/conversations                ← Legacy conversation list
/conversations/[id]           ← Full transcript + live WebSocket indicator
/analytics                    ← Legacy conversation analytics
/settings/autooptimize        ← Auto-optimize: enable toggle, threshold + minSessions sliders,
                                 manual run with result display, optimization history log
/settings/knowledge           ← Knowledge base: article list, add/edit/delete inline,
                                 tag support, content preview expand
/settings/integrations        ← Segment · Mixpanel · HubSpot · Webhook — connect, test, toggle
/settings/ai                  ← Custom AI instructions injected into every agent call
/settings/widget              ← API key display + embed snippet + key rotation
/settings/followup            ← Email / Slack / WhatsApp follow-up config
/settings/billing             ← Stripe checkout + customer portal
```

---

## Key User Flows

### New customer (no flow yet)
1. `/dashboard` → "Create your first flow" empty state
2. Click → `/flows` → template picker shown automatically (4 vertical templates)
3. Pick template → creates flow with all steps pre-filled → redirects to step editor
4. Review / edit steps → back to dashboard → copy embed snippet → paste in product
5. First session appears in activation funnel within minutes

### Existing customer — monitoring
- `/dashboard` — headline metrics + week-over-week deltas (↑↓ arrows) + churn alert banner if users are at risk
- `/activation` — full funnel, steps with >30% drop-off highlighted red, 30-day timeline chart
- `/benchmarks` — activation score ring, stat cards with industry deltas, per-step comparison table

### Improving a lagging step
1. `/benchmarks` shows Step 2 is "poor" (drop-off 2× industry avg)
2. Click "Optimize →" → `/optimize`
3. Click "Optimize with AI" → Claude analyzes sessions → suggests improved prompt
4. Review diff (before / after) + reasoning
5. Click "Apply" → prompt updates live for all future sessions

### At-risk users
1. Red banner on `/dashboard`: "3 users at risk of churning"
2. Click → `/churn` → table sorted by risk score
3. Expand a user → see risk factors + recommended action ("send personalized re-engagement")
4. Filter by Critical / High / Medium

### Handling escalations
1. `/escalations` — inbox shows open tickets sorted by age
2. Click a ticket → `/escalations/[id]` — full context: conversation replay, collected data, user info
3. Add notes, click "Mark in progress" → notify user you're on it
4. Resolve issue externally, click "Resolve" → ticket archived

### Inspecting a specific user
1. `/users` → click any user → side panel opens
2. See all sessions, step-by-step progress, collected data per session
3. Click a step to see timing, message count, AI prompt snapshot

### Enabling auto-optimization
1. `/settings/autooptimize` → toggle "Auto-optimization" on
2. Set threshold (e.g. 50% — optimize steps below this completion rate)
3. Set minSessions (e.g. 10 — wait for enough data first)
4. System scans weekly, applies improved prompts, logs every change
5. View history: optimization log shows before/after diff per step

---

## Sidebar Navigation

```
Dashboard
Onboarding Flows
Activation
Benchmarks
Optimize
Churn Risk
Users
Escalations        ← Human handoff inbox
Conversations
Analytics
─────────────
Auto-Optimize
Knowledge Base     ← Docs/FAQs for AI context
Integrations
AI Config
Widget
Follow-up
Billing
```

---

## Local Dev

```bash
# from repo root
npm run dev:dashboard   # → http://localhost:3000

# env vars (.env.local):
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Tech

| Library | Purpose |
|---|---|
| Next.js 14 App Router | Framework, file-based routing |
| Tailwind CSS | Styling |
| Zustand | Auth store (token, user, org) |
| Recharts | Activation funnel bar chart + timeline line chart |
| `lib/api.ts` | Typed fetch wrapper — all API calls, auto-attaches JWT, handles 401 redirect |

All API types are co-located in `lib/api.ts` — `OnboardingFlow`, `FunnelStep`, `BenchmarkOverview`, `ChurnUser`, `OptimizationLogEntry`, `KnowledgeArticle`, `EndUserSummary`, `EscalationTicket`, `EscalationTicketDetail`, etc.
