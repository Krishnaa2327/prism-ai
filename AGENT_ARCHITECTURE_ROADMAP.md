# Prism Agent Architecture Roadmap

Last updated: April 19, 2026

---

## Session Progress (April 19, 2026)

### ✅ Completed this session

#### India GTM — Phase 5
- **INR pricing** — ₹0 / ₹7,999 / ₹24,999 / ₹79,999 live in `plans.ts`
- **Plan feature gates** — `requireFeature()` middleware enforced at API level across all routes
- **5 India vertical flow templates** — Payroll (PF/ESI/TDS), GST filing, Loan origination (NBFC), Payments/KYC (Razorpay-type), MSME accounting (Hinglish)
- **Sarvam AI service** — `translateText`, `detectLanguage`, `transcribeAudio`, `synthesizeSpeech` for 9 Indian languages
- **Sarvam wired into live request path** — language detection + translation in `/act` and `/act/stream`, `POST /session/stt`, `POST /session/tts`, language instruction in agent system prompt

#### Agent Architecture — Phases 1–3
- **Phase 1: ReAct agentic loop** — `runAgentGoal()` in `agent.ts`, `POST /session/act/goal` endpoint, `sendGoalMessage()` in widget `copilot.ts`, full loop orchestration in `widget.ts`. User types a free-form goal, widget drives Reason→Act→Observe→Reason loop until `goal_complete`.
- **Phase 2: Semantic DOM layer** — `buildSemanticSummary()` in `scanner.ts` detects page type, wizard step, required/filled/optional fields, primary button state, validation errors. Sent alongside raw element list in goal-mode turns.
- **Phase 3: Evaluation pipeline** — `apps/backend/tests/evals/` with 11 scenarios (3 payroll, 3 GST, 3 payments, 2 Hinglish). Runner wired to real `runAgentGoal()`. ≥85% pass rate CI gate. Run with `cd apps/backend && npm run eval` (needs `OPENAI_API_KEY`).

### ⏳ Still to implement

#### Agent Architecture
- **Phase 4: Failure recovery stack** — retry with semantic fallback on selector failure, replan when page doesn't match expectation, graceful degradation to precise manual instruction before escalating
- **Phase 5: Latency optimization** — DOM semantic parse widget-side (already done), planning call pre-warmed on widget init, KB+MCP P95 < 800ms verified, 8s hard cap per agent turn, first token < 400ms

#### Operational (must do before any real client)
- Set env vars on Render: `OPENAI_API_KEY`, `RESEND_API_KEY`, `SARVAM_API_KEY`, `FRONTEND_URL`, `NEXT_PUBLIC_DASHBOARD_URL`, `NEXT_PUBLIC_API_URL`
- Rebuild and redeploy widget after today's changes (ReAct loop + semantic DOM are widget-side code)
- Run eval suite once `OPENAI_API_KEY` is set — establish baseline pass rate

#### Features (post-pilot)
- Voice UI in widget (mic button + audio playback using the `/stt` and `/tts` endpoints already built)
- PII masking in prompts and logs
- SSO / SAML (Scale plan, gated but not built)
- VPC / on-prem deployment option (Tier 3 BFSI requirement)
- Recommend-only / approve-before-execute safe-action modes

---

## Honest Current State (start of session)

Prism was a **flow runner with AI narration**, not a true autonomous agent.

The LLM fills in words but the structure, sequence, and decisions are all pre-programmed via `aiPrompt` scripts per step. If a user does something unexpected, there is no real recovery. This is a legitimate v0 but it is not an agent.

---

## What Industry-Ready Means

### 1. Real Agentic Loop (the hard part)

Industry standard is **ReAct: Reason → Act → Observe → Reason again.**

The agent must:
- Look at the current page state
- Decide what to do based on the goal
- Execute the action
- See what changed in the DOM
- Decide next action — or retry if it failed
- Know when it is done

**Current gap:** Prism executes one pre-defined action per step and moves on regardless of outcome. `shouldVerify` is a patch, not a loop.

---

### 2. Semantic DOM Understanding

Right now the agent receives a raw list of CSS selectors and labels and picks one.

Industry-ready means the agent understands what it is looking at semantically:

> "This is a multi-step wizard. I am on step 2 of 4. The active field is asking for a GSTIN. The submit button is disabled because the field is empty."

Not: `input[data-testid='gstin-field']`

**Current gap:** Raw element lists. If selectors change or the page structure is unfamiliar, the agent fails silently.

---

### 3. Goal-Level Planning, Not Step-Level Scripting

A user says: **"Help me set up payroll for my company."**

Industry-ready agent:
- Understands this means: company details → statutory setup → employee config → test run
- Knows which page handles each sub-goal
- Handles branching: if the user does not have a TAN yet, redirect them to get one and resume afterward
- Recovers when a page does not have what it expected

**Current gap:** None of this happens unless someone hand-writes the flow in the dashboard. Pre-built templates are hard scripts, not hints.

---

### 4. Failure Recovery Beyond Escalation

Current failure path: `escalate_to_human`. That is a dead end for the user.

Industry-ready recovery stack:
1. **Retry with different strategy** — selector failed, try semantic fallback or ask the user to point at it
2. **Replan** — this page does not have what was expected, figure out where to go instead
3. **Graceful degradation** — cannot complete this action, tell the user exactly what to do manually and why

**Current gap:** Only escalation exists. No retry, no replanning.

---

### 5. Evaluation Pipeline

Without evals you cannot answer: "Is the agent actually completing tasks correctly?"

Industry-ready means:
- 20+ test scenarios per vertical with known correct outcomes
- Automated runs that measure task completion rate, step accuracy, action success rate
- Regression detection when model, prompts, or DOM structure changes
- Separate eval sets for Hindi/Hinglish flows

**Current gap:** No evals exist. Every change ships blind.

---

### 6. Latency Budget

Industry-ready for in-app assistance: **under 1.5 seconds to first word.**

Streaming handles narration today but planning calls, DOM parsing, and tool execution chains can blow past 5 seconds for complex flows.

Needs:
- Parallel KB + MCP loading (already partly done)
- DOM parsing moved to the widget (not sent raw to the backend)
- Planning call cached or pre-warmed on page load
- Hard timeout per agent turn with graceful fallback

---

## Gap Summary

| Capability | Prism Now | Industry-Ready Bar |
|---|---|---|
| Natural language understanding | Partial — understands per-step replies | Full — understands open-ended goals |
| Agentic loop | One-shot per step | ReAct loop with DOM observation |
| DOM understanding | Raw selector list | Semantic page representation |
| Multi-page planning | Pre-built flows only | Runtime goal decomposition |
| Failure recovery | Escalate only | Retry → replan → degrade |
| Evaluation pipeline | None | Required before any real client |
| Latency | OK for scripted flows | Needs budgeting for agentic turns |

---

## Build Sequence

### Phase 1 — Real Agentic Loop (foundational, build first)

Replace the step-by-step flow runner with a proper ReAct loop.

**What changes:**
- Agent receives a **goal** (not a step) and the current page state
- Loops: reason → act → observe → reason until done or stuck
- Pre-built templates become starting hints, not hard scripts
- Each observation turn re-reads the DOM and decides next action
- Loop has a hard cap (e.g. 10 turns) to prevent runaway execution

**Files affected:**
- `apps/backend/src/services/agent.ts` — new `runAgentReAct()` function
- `apps/backend/src/routes/session.ts` — new `/act/goal` endpoint
- `apps/widget/src/` — widget must send DOM snapshots after each action

**Success criteria:**
- Agent completes a 3-step flow from a single natural language goal with no pre-built steps
- Agent retries at least once on selector failure before escalating
- Agent correctly detects task completion from DOM state

---

### Phase 2 — Semantic DOM Layer

Replace raw element lists with structured semantic representations.

**What changes:**
- Widget parses the DOM into semantic blocks before sending to backend: wizard state, form sections, required vs optional fields, disabled states, error messages
- Backend receives structured page summary, not a flat element list
- Agent reasons over semantic summary: "form has 3 required fields, 2 are filled, submit is disabled"

**Files affected:**
- `apps/widget/src/` — new DOM semantic parser
- `apps/backend/src/services/agent.ts` — updated `PageContext` type and `domSummary` builder
- `apps/backend/src/routes/session.ts` — updated request schema

**Success criteria:**
- Agent correctly identifies wizard step number and completion status
- Agent identifies required vs optional fields without being told
- Agent handles dynamically loaded form sections (async React renders)

---

### Phase 3 — Evaluation Pipeline

Before any Phase 1 or 2 changes ship to real clients, build the eval harness.

**What to build:**
- 20 test scenarios for top 3 verticals (payroll, GST, payments)
- 5 Hindi/Hinglish scenarios
- Each scenario: goal string + mock DOM state + expected action sequence
- Automated runner that scores: task completion, action accuracy, turn count, latency
- CI hook that runs evals on every prompt or model change

**Files:**
- `tests/evals/` — new directory
- `tests/evals/scenarios/` — JSON scenario definitions
- `tests/evals/runner.ts` — eval harness
- `tests/evals/report.ts` — scoring and diff output

**Success criteria:**
- Baseline pass rate established before any agentic changes merge
- Any regression >5% blocks the PR
- Hinglish scenarios run through Sarvam translation layer

---

### Phase 4 — Failure Recovery Stack (builds on Phase 1)

Replace `escalate_to_human` as the only failure path.

**What to build:**
- **Retry layer:** on selector failure, agent tries semantic fallback (find by label text, by placeholder, by proximity to heading)
- **Replan layer:** if page does not match expected state, agent re-reads DOM and replans remaining steps
- **Degradation layer:** if stuck after N retries, agent produces a precise manual instruction ("click the blue Save button in the top-right corner of the Payroll Settings page") before optionally escalating

**Files affected:**
- `apps/backend/src/services/agent.ts` — retry and replan logic inside ReAct loop
- `apps/widget/src/` — selector heal already exists, wire into retry feedback loop

**Success criteria:**
- Agent recovers from a broken selector without escalating in >80% of cases
- Agent successfully replans when landed on wrong page
- Escalation only fires after genuine retry exhaustion

---

### Phase 5 — Latency Optimization (parallel to other phases)

**Targets:**
- DOM semantic parse: widget-side, zero backend latency
- Planning call: pre-warmed on widget init using idle time before user speaks
- KB + MCP: already parallel, verify P95 < 800ms
- Agent turn hard cap: 8 seconds total, graceful fallback if exceeded
- Streaming: first token < 400ms for all turn types

---

## What NOT to Build Before Phase 1 is Done

- Voice UI (STT/TTS endpoints exist, widget UI is secondary)
- SSO / SAML (gated to Scale, not needed for first clients)
- VPC deployment (needed for BFSI tier 3, not pilots)
- More vertical templates (templates become hints once Phase 1 lands, not the product)
- PII masking (important but not blocking pilot conversations)

---

## Definition of Done for "Industry-Ready Agent"

Prism is industry-ready when:

1. A user can type "help me set up GST filing" with no pre-built flow and the agent completes it correctly
2. The agent recovers from at least one unexpected page state or broken selector per session without escalating
3. Eval pipeline passes at >85% task completion on the 20-scenario test set
4. P95 latency for first agent word is under 1.5 seconds
5. Hindi and Hinglish flows pass the same eval bar as English

---

## Notes

- Phase 1 (ReAct loop) is the foundational change. Everything else builds on it.
- Do not skip the eval pipeline. It is the difference between a demo and a product.
- Pre-built templates remain valuable as starting hints and defaults. They do not go away — they become optional scaffolding rather than required scripts.
- The India strategy (multilingual, Sarvam, vertical templates) is valid and stays. The agent architecture underneath needs to be real first.
