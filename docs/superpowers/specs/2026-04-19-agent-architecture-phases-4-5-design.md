# Prism Agent Architecture — Phases 4 & 5 Design

**Date:** 2026-04-19  
**Status:** Approved for implementation  
**Scope:** Failure Recovery Stack (Phase 4) + Latency Optimization (Phase 5)

---

## Context

Phases 1–3 are complete:
- Phase 1: `runAgentGoal()` — ReAct loop, widget-driven, `/act/goal` endpoint
- Phase 2: Semantic DOM layer — `semanticSummary` in `PageContext`, widget-side parsing
- Phase 3: Eval pipeline — 11 scenarios across payroll, GST, payments, Hinglish, ≥85% CI gate

The current failure path is `escalate_to_human` — a dead end for the user. Every silent selector failure, every wrong-page state, every stuck loop ends in escalation. This is the primary cause of user drop-off in agentic onboarding flows.

Phases 4 and 5 complete the industry-ready bar.

---

## Architecture: Hybrid Recovery Loop

The ReAct loop stays widget-driven. Recovery layers sit on top without changing the widget–backend contract.

```
Widget executes page action
        │
        ├─ DOM changed within 1500ms? ──YES──▶ next normal turn
        │
        └─ NO (soft failure)
                │
                ▶ push ObserveTurn into turnHistory
                ▶ increment failureCount
                ▶ re-call POST /act/goal
                        │
                        ├─ failureCount 1–2 ──▶ backend replans (alt selector strategy)
                        └─ failureCount ≥ 3  ──▶ backend calls degrade_to_manual
                                                  widget renders manual-step card
                                                  (NOT escalate_to_human)

escalate_to_human fires ONLY when:
  - degrade_to_manual was shown AND user explicitly requests human help
  - OR a hard exception occurs after backend retry exhaustion
```

**Key principle:** `escalate_to_human` is a last resort. Users get a precise manual instruction before any escalation. This keeps them in the product.

---

## Phase 4: Failure Recovery Stack

### 4.1 New Tool — `degrade_to_manual`

Added to the **goal-mode tools array inside `runAgentGoal()`** — not to the global `AGENT_TOOLS` constant (which is shared with flow mode). Defined alongside `goalCompleteTool`:

**File:** `apps/backend/src/services/agent.ts` — inside `runAgentGoal()`:

```ts
{
  type: 'function',
  function: {
    name: 'degrade_to_manual',
    description:
      'When you cannot complete an action after multiple attempts, produce a precise manual instruction for the user. Do NOT escalate — instruct. Use specific visual landmarks: color, position, label text.',
    parameters: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: 'Exact step-by-step instruction: "Click the blue Save button in the top-right of the Payroll Settings page"',
        },
        reason: {
          type: 'string',
          description: 'One sentence explaining why automation could not complete this: "The page element changed since this flow was configured."',
        },
      },
      required: ['instruction', 'reason'],
    },
  },
}
```

**Parsed in `parseToolCall()`** → returns `{ type: 'degrade_to_manual', instruction, reason }`.

**Added to `AgentAction` union type:**
```ts
| { type: 'degrade_to_manual'; instruction: string; reason: string }
```

### 4.2 Failure Context in System Prompt (`runAgentGoal`)

When `turnHistory` contains any `observe` role turns, append to the system prompt:

```
FAILURE CONTEXT:
A previous action did not change the page. This means the selector may be stale or the element may have moved.

Recovery strategy (in order):
1. Try selecting by visible label text instead of CSS selector
2. Try selecting by input placeholder or aria-label
3. Try selecting by proximity to the nearest heading or section title
4. If you have tried 2+ different approaches and all failed, call degrade_to_manual — do NOT call escalate_to_human

Never repeat a selector that appears in a failed observe turn.
```

Detection: `turnHistory.some(t => t.role === 'observe')`  
Failure count: `turnHistory.filter(t => t.role === 'observe').length`  
Auto-trigger `degrade_to_manual` prompt when count ≥ 3.

### 4.3 Hard Failure Retry (Backend)

`runAgentGoal()` wraps the OpenAI call in `withRetry()` (already available):
- Retries: 2
- Delay: 800ms
- Catches: network errors, 500s, JSON parse failures
- On exhaustion: returns `{ type: 'ask_clarification', question: 'Having trouble — want to continue or try a different approach?', options: ['Continue', 'Try differently'] }`

JSON parse errors inside `parseToolCall` already return `{ type: 'chat', content: 'Let me help you with that.' }` — this stays but gets logged with `logger.agentError`.

### 4.4 Widget: DOM Observation + ObserveTurn Injection

**File:** `apps/widget/src/copilot.ts`

After sending `execute_page_action` to the host page:

```ts
// Capture pre-action DOM fingerprint
const before = domFingerprint();

// Execute action
await executeAction(action);

// Wait up to 1500ms for DOM to change
const changed = await waitForDomChange(before, 1500);

if (!changed) {
  // Soft failure — inject observe turn
  turnHistory.push({
    role: 'observe',
    content: `Action attempted on selector "${action.selector ?? 'fill_form'}" but page did not change.`,
  });
  failureCount++;
  
  // Log broken selector for selectorHealLog
  await api.post('/api/v1/failures', {
    sessionId,
    selector: action.selector,
    reason: 'dom_unchanged_after_action',
  });
  
  // Re-call goal endpoint (failureCount derived server-side from observe turn count)
  return callGoalEndpoint({ goal, turnHistory });
}

// Success — reset failure count
failureCount = 0;
```

**`domFingerprint()`:** Returns `{ elementCount: number, inputValues: string }` — shallow hash of interactive element count + first 5 input values. Cheap to compute, sufficient to detect most DOM changes.

**`waitForDomChange(before, ms)`:** Polls every 100ms for up to `ms`. Returns `true` on change, `false` on timeout.

### 4.5 Widget: Degradation Card UI

**File:** `apps/widget/src/widget.ts`

When `action.type === 'degrade_to_manual'`, render a dedicated card instead of a chat bubble:

```
┌─────────────────────────────────────────┐
│ ⚠  Manual step required                 │
│                                         │
│ [instruction text — full detail]        │
│                                         │
│ Why: [reason text]                      │
│                                         │
│ [✓ Done, continue]   [Get human help]  │
└─────────────────────────────────────────┘
```

- "Done, continue" → clears `failureCount`, pushes `{ role: 'user', content: 'Manual step completed' }`, re-calls goal
- "Get human help" → fires `escalate_to_human` (the only remaining escalation trigger from a degradation)

### 4.6 Selector Heal Integration

No new routes. After soft failure, widget calls existing `POST /api/v1/failures` with `{ selector, reason: 'dom_unchanged_after_action' }`. This feeds the existing `SelectorHealLog` table. Future: dashboard surfaces top broken selectors per flow.

---

## Phase 5: Latency Optimization

### 5.1 Hard Cap — 8s Per Agent Turn

**File:** `apps/backend/src/services/agent.ts` — inside `runAgentGoal()`

```ts
const GOAL_TURN_TIMEOUT_MS = 8_000;

const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('agent_turn_timeout')), GOAL_TURN_TIMEOUT_MS)
);

const response = await Promise.race([
  openai().chat.completions.create({ ... }),
  timeoutPromise,
]).catch((err) => {
  if ((err as Error).message === 'agent_turn_timeout') {
    logger.warn({ event: 'agent.goal.timeout', orgId: org.id, sessionId: opts.sessionId });
    return null;
  }
  throw err;
});

if (!response) {
  return {
    type: 'ask_clarification',
    question: 'This is taking longer than expected. Want to continue or try a simpler approach?',
    options: ['Continue', 'Try a simpler approach'],
  };
}
```

### 5.2 First-Token Latency Logging

**File:** `apps/backend/src/routes/session.ts` — inside `/act/stream` handler

```ts
const streamStart = Date.now();
let firstTokenLogged = false;

for await (const chunk of stream) {
  if (!firstTokenLogged && chunk.choices[0]?.delta?.content) {
    logger.info({ event: 'agent.stream.first_token_ms', ms: Date.now() - streamStart, orgId });
    firstTokenLogged = true;
  }
  // ... existing chunk forwarding
}
```

Baseline established from Render logs. Target: <400ms. No code change enforces the target now — logs surface when it's violated.

### 5.3 P95 Timing in Eval Suite

**File:** `apps/backend/tests/evals/runner.ts`

```ts
const t0 = process.hrtime.bigint();
const result = await runAgentGoal(opts);
const turnMs = Number(process.hrtime.bigint() - t0) / 1_000_000;
scenario.latencies.push(turnMs);
```

**File:** `apps/backend/tests/evals/report.ts`

```ts
const allLatencies = scenarios.flatMap(s => s.latencies).sort((a, b) => a - b);
const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)];
report.p95TurnMs = p95;

// CI gate
if (p95 > 8000) {
  console.error(`FAIL: P95 latency ${p95}ms exceeds 8000ms cap`);
  process.exit(1);
}
```

### 5.4 Pre-warm: Deferred

Not built now. Widget init pre-warm adds compute cost before any real client shows P95 > 8s in production. Render logs from the first real client will surface whether this is needed. Add it then.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/backend/src/services/agent.ts` | `degrade_to_manual` tool, failure context system prompt block, 8s hard cap, `AgentAction` type update |
| `apps/widget/src/copilot.ts` | DOM fingerprint, `waitForDomChange`, `failureCount`, `ObserveTurn` injection, `/api/v1/failures` call |
| `apps/widget/src/widget.ts` | Degradation card UI component |
| `apps/backend/src/routes/session.ts` | First-token timing log in `/act/stream` |
| `apps/backend/tests/evals/runner.ts` | Per-turn `hrtime` latency capture |
| `apps/backend/tests/evals/report.ts` | P95 calculation + CI gate |

---

## Success Criteria

| Metric | Target | How Measured |
|--------|--------|--------------|
| Soft failure recovery (no escalation) | >80% of broken-selector scenarios | Eval: inject stale selector, assert `degrade_to_manual` fires before `escalate_to_human` |
| Replan success | >70% of wrong-page scenarios | Eval: send goal with mismatched page context |
| `escalate_to_human` rate | <10% of goal sessions | Eval suite |
| Agent turn hard cap | 8s enforced | `Promise.race` in code — no test needed |
| P95 turn latency | <8s confirmed | Eval runner CI gate |
| First token baseline | Established | Render log `agent.stream.first_token_ms` |

---

## Definition of Done

Phase 4 is done when:
1. A broken selector triggers `degrade_to_manual` (not `escalate_to_human`) in the eval suite
2. Widget renders the degradation card with "Done, continue" and "Get human help" options
3. `failureCount` resets correctly after successful DOM change

Phase 5 is done when:
1. `runAgentGoal()` cannot hang beyond 8s
2. Eval report emits P95 and CI gate blocks on >8s
3. `/act/stream` logs first-token latency on every request

---

## What This Does Not Include

- Voice UI (STT/TTS endpoints exist, widget UI is post-pilot)
- PII masking (important, not blocking pilot)
- Pre-warm (build when Render logs show >8s P95 in prod)
- SSO/SAML (gated on Scale plan, not needed for first clients)
- VPC/on-prem (Tier 3 BFSI requirement, post-₹5L MRR)
