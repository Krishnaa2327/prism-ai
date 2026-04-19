# Agent Architecture Phases 4 & 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add failure recovery (degrade_to_manual, DOM observation, replan) and latency guardrails (8s hard cap, P95 eval gate, first-token logging) to the Prism ReAct agent.

**Architecture:** The ReAct loop stays widget-driven. Recovery layers are added via: (1) DOM fingerprint observation in `widget.ts` detecting soft failures and injecting `observe` turns into `turnHistory`, (2) `runAgentGoal()` reading those turns and appending a failure-context block to the system prompt, and (3) a new `degrade_to_manual` tool that produces precise manual instructions instead of escalating.

**Tech Stack:** TypeScript, OpenAI gpt-4o, Vite (widget), ts-node (backend evals), Prisma/PostgreSQL

---

## File Map

| File | Change |
|------|--------|
| `apps/backend/src/services/agent.ts` | Extend `AgentAction` + `GoalTurn` types; add `degrade_to_manual` tool + `parseToolCall` case; add failure-context system prompt block; add 8s `Promise.race` hard cap |
| `apps/widget/src/copilot.ts` | Extend widget-side `AgentAction` type; add public `reportSoftFailure()` method |
| `apps/widget/src/widget.ts` | Add `goalFailureCount` state; add `domFingerprint()` + `waitForDomChange()` helpers; modify `runGoalTurn()` to observe DOM after actions; add `degrade_to_manual` cases to `handleAgentAction()` + `describeAction()` |
| `apps/backend/src/routes/session.ts` | Add first-token `Date.now()` log in `/act/stream` handler |
| `apps/backend/tests/evals/runner.ts` | Add per-turn `hrtime` latency tracking; add `latencies` field to `EvalResult` |
| `apps/backend/tests/evals/report.ts` | Add P95 calculation and CI gate (exit 1 if P95 > 8000ms) |
| `apps/backend/tests/evals/scenarios/recovery.ts` | New: 3 failure-recovery eval scenarios |

---

## Task 1: Extend `AgentAction` and `GoalTurn` types

**Files:**
- Modify: `apps/backend/src/services/agent.ts`
- Modify: `apps/widget/src/copilot.ts`

- [ ] **Step 1: Add `degrade_to_manual` to `AgentAction` in `agent.ts`**

In `apps/backend/src/services/agent.ts`, find the `AgentAction` export (line 136) and add the new variant:

```ts
export type AgentAction =
  | { type: 'ask_clarification'; question: string; options?: string[] }
  | { type: 'execute_page_action'; actionType: string; payload: Record<string, unknown>; message: string; shouldVerify?: boolean }
  | { type: 'complete_step'; message: string; collectedData?: Record<string, unknown> }
  | { type: 'celebrate_milestone'; headline: string; insight: string }
  | { type: 'call_api'; url: string; method: string; reason: string }
  | { type: 'escalate_to_human'; reason: string; trigger: string; message: string }
  | { type: 'chat'; content: string }
  | { type: 'goal_complete'; summary: string }
  | { type: 'degrade_to_manual'; instruction: string; reason: string };
```

- [ ] **Step 2: Extend `GoalTurn` to include `observe` role**

In `apps/backend/src/services/agent.ts`, find `GoalTurn` (line 826) and update:

```ts
export interface GoalTurn {
  role: 'user' | 'assistant' | 'observe';
  content: string;
}
```

- [ ] **Step 3: Add `degrade_to_manual` to `AgentAction` in `copilot.ts`**

In `apps/widget/src/copilot.ts`, find the `AgentAction` export (line 48) and add:

```ts
export type AgentAction =
  | { type: 'ask_clarification'; question: string; options?: string[] }
  | { type: 'execute_page_action'; actionType: string; payload: Record<string, unknown>; message: string; shouldVerify?: boolean }
  | { type: 'complete_step'; message: string }
  | { type: 'celebrate_milestone'; headline: string; insight: string }
  | { type: 'verify_integration'; integType: string; success: boolean; message: string }
  | { type: 'escalate_to_human'; reason: string; trigger: string; message: string }
  | { type: 'chat'; content: string }
  | { type: 'goal_complete'; summary: string }
  | { type: 'degrade_to_manual'; instruction: string; reason: string };
```

- [ ] **Step 4: Update `sendGoalMessage` turn history type in `copilot.ts`**

In `apps/widget/src/copilot.ts`, find `sendGoalMessage` (line 403) and update the `turnHistory` parameter type:

```ts
async sendGoalMessage(opts: {
  goal: string;
  turnHistory: Array<{ role: 'user' | 'assistant' | 'observe'; content: string }>;
  turnCount: number;
  onText?: (word: string) => void;
}): Promise<{ action: AgentAction; done: boolean; turnCount: number } | null> {
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/backend && npx tsc --noEmit
cd apps/widget && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/services/agent.ts apps/widget/src/copilot.ts
git commit -m "feat: extend AgentAction with degrade_to_manual and GoalTurn with observe role"
```

---

## Task 2: Add `degrade_to_manual` tool and `parseToolCall` case to backend

**Files:**
- Modify: `apps/backend/src/services/agent.ts`

- [ ] **Step 1: Add `degrade_to_manual` tool definition inside `runAgentGoal()`**

In `apps/backend/src/services/agent.ts`, inside `runAgentGoal()` (after `goalCompleteTool` definition, before building the `tools` array), add:

```ts
const degradeToManualTool: OpenAI.Chat.ChatCompletionTool = {
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
          description: 'Exact step-by-step manual instruction, e.g. "Click the blue Save button in the top-right of the Payroll Settings page"',
        },
        reason: {
          type: 'string',
          description: 'One sentence explaining why automation failed, e.g. "The page element changed since this flow was configured."',
        },
      },
      required: ['instruction', 'reason'],
    },
  },
};
```

Then update the `tools` array (currently `const tools = [...AGENT_TOOLS, goalCompleteTool].filter(...)`) to include it:

```ts
const tools = [...AGENT_TOOLS, goalCompleteTool, degradeToManualTool].filter(
  (t) => t.function.name !== 'call_api'
);
```

- [ ] **Step 2: Add `degrade_to_manual` case to `parseToolCall()`**

In `apps/backend/src/services/agent.ts`, inside `parseToolCall()` (after the `goal_complete` case, before the final `return null`):

```ts
if (name === 'degrade_to_manual') {
  return {
    type: 'degrade_to_manual',
    instruction: input.instruction as string,
    reason: input.reason as string,
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/agent.ts
git commit -m "feat: add degrade_to_manual tool to goal mode — scoped to runAgentGoal only"
```

---

## Task 3: Add failure-context system prompt block and 8s hard cap

**Files:**
- Modify: `apps/backend/src/services/agent.ts`

- [ ] **Step 1: Add failure-context block to `runAgentGoal()` system prompt**

In `apps/backend/src/services/agent.ts`, inside `runAgentGoal()`, find where `historyText` is built (line 864). After it, add:

```ts
const observeCount = turnHistory.filter((t) => t.role === 'observe').length;

const failureContextBlock = observeCount > 0 ? `

FAILURE CONTEXT:
A previous action did not change the page (${observeCount} failed attempt${observeCount > 1 ? 's' : ''}).
The selector may be stale or the element may have moved.

Recovery strategy (in order):
1. Try selecting by visible label text instead of CSS selector
2. Try selecting by input placeholder or aria-label attribute
3. Try selecting by proximity to the nearest heading or section title
4. If you have tried 2+ different approaches and all failed, call degrade_to_manual — do NOT call escalate_to_human

Never repeat a selector that appears in a failed observe turn.
${observeCount >= 3 ? '\nYou have reached 3 failures. You MUST call degrade_to_manual now.' : ''}` : '';
```

Then append `failureContextBlock` to the `systemPrompt` string (add it before the closing backtick of the template literal):

```ts
const systemPrompt = `You are Prism, an AI agent inside "${org.name}".
...
${org.customInstructions ?? ''}${failureContextBlock}`.trim();
```

- [ ] **Step 2: Add 8s hard cap with `Promise.race`**

In `apps/backend/src/services/agent.ts`, inside `runAgentGoal()`, replace the `await withRetry(...)` OpenAI call with:

```ts
const GOAL_TURN_TIMEOUT_MS = 8_000;

const timeoutPromise = new Promise<null>((resolve) =>
  setTimeout(() => resolve(null), GOAL_TURN_TIMEOUT_MS)
);

const rawResponse = await withRetry(
  () => Promise.race([
    openai().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0,
      tools,
      tool_choice: 'required',
      messages: [{ role: 'system', content: systemPrompt }],
    }),
    timeoutPromise,
  ]),
  { retries: 2, delayMs: 800, label: `agent.goal org=${org.id}` }
);

if (!rawResponse) {
  logger.warn({ event: 'agent.goal.timeout', orgId: org.id, sessionId: opts.sessionId });
  return {
    type: 'ask_clarification',
    question: 'This is taking longer than expected. Want to continue or try a simpler approach?',
    options: ['Continue', 'Try a simpler approach'],
  };
}

const response = rawResponse;
```

Then update the rest of the function to use `response` instead of the old variable name.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/agent.ts
git commit -m "feat: failure-context system prompt + 8s hard cap in runAgentGoal"
```

---

## Task 4: Add `reportSoftFailure()` to `CopilotManager`

**Files:**
- Modify: `apps/widget/src/copilot.ts`

- [ ] **Step 1: Add `reportSoftFailure()` public method**

In `apps/widget/src/copilot.ts`, after the `reportHeal()` private method (line 107), add:

```ts
reportSoftFailure(opts: { selector: string | null; actionType: string }): void {
  if (!this.session) return;
  fetch(`${this.apiUrl}/api/v1/session/heal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
    body: JSON.stringify({
      sessionId: this.session.id,
      stepId: this.session.currentStep?.id ?? null,
      originalSelector: opts.selector ?? 'unknown',
      usedSelector: null,
      strategy: 'failed' as HealStrategy,
      actionType: opts.actionType,
      page: window.location.pathname,
      reason: 'dom_unchanged_after_action',
    }),
  }).catch(() => {}); // never interrupt the flow
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/widget && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/widget/src/copilot.ts
git commit -m "feat: add reportSoftFailure() to CopilotManager for DOM observation failures"
```

---

## Task 5: DOM observation and soft-failure injection in `widget.ts`

**Files:**
- Modify: `apps/widget/src/widget.ts`

- [ ] **Step 1: Add `goalFailureCount` state field**

In `apps/widget/src/widget.ts`, in the class body after `private goalRunning = false;` (line 34), add:

```ts
private goalFailureCount = 0;
```

- [ ] **Step 2: Add `domFingerprint()` and `waitForDomChange()` helpers**

In `apps/widget/src/widget.ts`, add these two private methods anywhere in the class body (e.g. after `describeAction()`):

```ts
private domFingerprint(): string {
  const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
    .slice(0, 8)
    .map((el) => `${(el as HTMLInputElement).name ?? el.id}=${(el as HTMLInputElement).value ?? ''}`)
    .join('|');
  const count = document.querySelectorAll('button, a, input, select, textarea').length;
  return `${count}::${inputs}`;
}

private waitForDomChange(before: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      if (this.domFingerprint() !== before) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      setTimeout(poll, 100);
    };
    setTimeout(poll, 100);
  });
}
```

- [ ] **Step 3: Modify `runGoalTurn()` to observe DOM after `execute_page_action`**

In `apps/widget/src/widget.ts`, replace the `runGoalTurn()` method (line 366) with:

```ts
private async runGoalTurn() {
  if (!this.goalRunning) return;

  const streamDiv = createStreamingBubble(this.messagesEl);
  this.isSending = true;
  this.sendBtn.disabled = true;

  const result = await this.copilot.sendGoalMessage({
    goal: this.goalText,
    turnHistory: this.goalTurnHistory,
    turnCount: this.goalTurnCount,
  });

  streamDiv.remove();
  this.isSending = false;
  this.sendBtn.disabled = false;

  if (!result) {
    addMessage(this.messagesEl, 'Something went wrong. Please try again.', 'assistant');
    this.goalRunning = false;
    return;
  }

  const { action, done, turnCount } = result;
  this.goalTurnCount = turnCount;

  const actionDesc = this.describeAction(action);
  this.goalTurnHistory.push({ role: 'assistant', content: actionDesc });

  if (action.type === 'execute_page_action') {
    // Capture fingerprint BEFORE dispatching the action
    const before = this.domFingerprint();
    this.handleAgentAction(action, document.createElement('div'), null);

    // Observe whether the DOM changed within 1500ms
    const changed = await this.waitForDomChange(before, 1500);

    if (!changed) {
      // Soft failure: DOM unchanged after action
      const selector = (action.payload.selector as string | undefined) ??
        Object.keys((action.payload.fields as Record<string, string> | undefined) ?? {})[0] ?? null;

      this.goalTurnHistory.push({
        role: 'observe',
        content: `Action attempted on selector "${selector ?? 'unknown'}" but page did not change. Selector may be stale.`,
      });
      this.goalFailureCount++;

      this.copilot.reportSoftFailure({ selector, actionType: action.actionType });

      if (!done) {
        // Small delay then re-enter the loop — backend will see observe turns and replan
        setTimeout(() => this.runGoalTurn(), 200);
      } else {
        this.goalRunning = false;
        this.goalMode = false;
      }
      return;
    }

    // DOM changed — success, reset failure count
    this.goalFailureCount = 0;
  } else {
    this.handleAgentAction(action, document.createElement('div'), null);
  }

  if (done) {
    this.goalRunning = false;
    this.goalMode = false;
    return;
  }

  const delay = action.type === 'execute_page_action' ? 500 : 500;
  setTimeout(() => this.runGoalTurn(), delay);
}
```

- [ ] **Step 4: Reset `goalFailureCount` when goal mode starts**

In `apps/widget/src/widget.ts`, find where `goalTurnHistory` and `goalTurnCount` are reset (line 358) and add:

```ts
this.goalFailureCount = 0;
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/widget && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/widget/src/widget.ts
git commit -m "feat: DOM observation in runGoalTurn — inject observe turns on soft failure"
```

---

## Task 6: Degradation card UI in `widget.ts`

**Files:**
- Modify: `apps/widget/src/widget.ts`

- [ ] **Step 1: Add `degrade_to_manual` case to `describeAction()`**

In `apps/widget/src/widget.ts`, inside `describeAction()` (line 410), add before the `default` case:

```ts
case 'degrade_to_manual':
  return `Manual step required: ${action.instruction}`;
```

- [ ] **Step 2: Add `degrade_to_manual` case to `handleAgentAction()`**

In `apps/widget/src/widget.ts`, inside `handleAgentAction()` (line 427), add after the `escalate_to_human` case:

```ts
case 'degrade_to_manual': {
  // Render a prominent manual-step card, not a chat bubble
  const card = document.createElement('div');
  card.className = 'oai-degrade-card';
  card.innerHTML = `
    <div class="oai-degrade-header">⚠ Manual step required</div>
    <div class="oai-degrade-instruction">${action.instruction}</div>
    <div class="oai-degrade-reason">Why: ${action.reason}</div>
    <div class="oai-degrade-actions">
      <button class="oai-degrade-done">✓ Done, continue</button>
      <button class="oai-degrade-escalate">Get human help</button>
    </div>
  `;
  this.messagesEl.appendChild(card);
  this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

  card.querySelector('.oai-degrade-done')?.addEventListener('click', () => {
    card.remove();
    this.goalFailureCount = 0;
    this.goalTurnHistory.push({ role: 'user', content: 'Manual step completed. Please continue.' });
    this.goalRunning = true;
    this.runGoalTurn();
  });

  card.querySelector('.oai-degrade-escalate')?.addEventListener('click', () => {
    card.remove();
    this.goalRunning = false;
    this.goalMode = false;
    addMessage(this.messagesEl, 'Connecting you with the team…', 'assistant');
    this.copilot.sendMessage('__escalate__');
  });
  break;
}
```

- [ ] **Step 3: Add degradation card CSS**

In `apps/widget/src/styles.ts`, find the `injectStyles()` function and append the following CSS inside the injected `<style>` block:

```css
.oai-degrade-card {
  background: #fff8e1;
  border: 1.5px solid #f59e0b;
  border-radius: 10px;
  padding: 14px 16px;
  margin: 8px 0;
  font-size: 13px;
}
.oai-degrade-header {
  font-weight: 700;
  color: #92400e;
  margin-bottom: 8px;
}
.oai-degrade-instruction {
  color: #1a1a1a;
  margin-bottom: 6px;
  line-height: 1.5;
}
.oai-degrade-reason {
  color: #6b7280;
  font-size: 11px;
  margin-bottom: 12px;
}
.oai-degrade-actions {
  display: flex;
  gap: 8px;
}
.oai-degrade-done {
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}
.oai-degrade-escalate {
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 12px;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/widget && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Build widget**

```bash
cd apps/widget && npm run build
```

Expected: `dist/` updated with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/widget/src/widget.ts apps/widget/src/styles.ts
git commit -m "feat: degradation card UI for degrade_to_manual — manual step with continue/escalate"
```

---

## Task 7: First-token latency logging in `/act/stream`

**Files:**
- Modify: `apps/backend/src/routes/session.ts`

- [ ] **Step 1: Add timing variables before the stream loop**

In `apps/backend/src/routes/session.ts`, find the `/act/stream` handler (search for `act/stream`). Before the `for await (const chunk of stream)` loop, add:

```ts
const streamStart = Date.now();
let firstTokenLogged = false;
```

- [ ] **Step 2: Log first token inside the loop**

Inside the `for await (const chunk of stream)` loop, add as the first statement:

```ts
if (!firstTokenLogged && chunk.choices[0]?.delta?.content) {
  logger.info({
    event: 'agent.stream.first_token_ms',
    ms: Date.now() - streamStart,
    orgId: req.organization?.id,
  });
  firstTokenLogged = true;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/session.ts
git commit -m "feat: log first-token latency in /act/stream — baseline for <400ms target"
```

---

## Task 8: P95 latency tracking in eval runner and report

**Files:**
- Modify: `apps/backend/tests/evals/runner.ts`
- Modify: `apps/backend/tests/evals/report.ts`

- [ ] **Step 1: Add `latencyMs` field to `EvalResult`**

In `apps/backend/tests/evals/runner.ts`, update the `EvalResult` interface:

```ts
export interface EvalResult {
  scenarioId: string;
  description: string;
  passed: boolean;
  turns: number;
  actionsProduced: string[];
  expectedActions: string[];
  firstActionMatch: boolean;
  containsExpected: boolean;
  reachedCompletion: boolean;
  error?: string;
  durationMs: number;
  turnLatenciesMs: number[];  // per-turn latency in ms
}
```

- [ ] **Step 2: Capture per-turn latency in `runScenario()`**

In `apps/backend/tests/evals/runner.ts`, update `runScenario()` to track latency per turn:

```ts
export async function runScenario(scenario: EvalScenario): Promise<EvalResult> {
  const start = Date.now();
  const actionsProduced: string[] = [];
  const turnLatenciesMs: number[] = [];

  try {
    const turnHistory: GoalTurn[] = [];

    for (let turn = 0; turn < scenario.maxTurns; turn++) {
      const t0 = process.hrtime.bigint();

      const action = await runAgentGoal({
        org: MOCK_ORG as Organization,
        goal: scenario.goal,
        pageContext: scenario.mockDom,
        turnHistory,
        sessionId: `eval-${scenario.id}-turn-${turn}`,
      });

      const turnMs = Number(process.hrtime.bigint() - t0) / 1_000_000;
      turnLatenciesMs.push(turnMs);

      actionsProduced.push(action.type);
      turnHistory.push({ role: 'assistant', content: `Turn ${turn + 1}: executed ${action.type}` });

      if (action.type === 'goal_complete' || action.type === 'escalate_to_human') break;
      if (action.type === 'ask_clarification') break;
    }

    const firstActionMatch = actionsProduced[0] === scenario.expectedActions[0];
    const containsExpected = scenario.expectedActions.every((exp) => actionsProduced.includes(exp));
    const reachedCompletion = actionsProduced.includes('goal_complete');
    const passed = firstActionMatch && (containsExpected || reachedCompletion);

    return {
      scenarioId: scenario.id,
      description: scenario.description,
      passed,
      turns: actionsProduced.length,
      actionsProduced,
      expectedActions: scenario.expectedActions,
      firstActionMatch,
      containsExpected,
      reachedCompletion,
      durationMs: Date.now() - start,
      turnLatenciesMs,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      description: scenario.description,
      passed: false,
      turns: 0,
      actionsProduced,
      expectedActions: scenario.expectedActions,
      firstActionMatch: false,
      containsExpected: false,
      reachedCompletion: false,
      error: (err as Error).message,
      durationMs: Date.now() - start,
      turnLatenciesMs,
    };
  }
}
```

- [ ] **Step 3: Add P95 calculation and CI gate to `report.ts`**

In `apps/backend/tests/evals/report.ts`, replace `printReport()` with:

```ts
import { EvalResult } from './runner';

export function printReport(results: EvalResult[]): void {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const passRate = Math.round((passed / total) * 100);

  // P95 latency across all turns in all scenarios
  const allLatencies = results.flatMap((r) => r.turnLatenciesMs).sort((a, b) => a - b);
  const p95Index = Math.floor(allLatencies.length * 0.95);
  const p95Ms = allLatencies[p95Index] ?? 0;

  console.log('\n' + '═'.repeat(60));
  console.log('  PRISM AGENT EVAL REPORT');
  console.log('═'.repeat(60));
  console.log(`  Pass rate: ${passed}/${total} (${passRate}%)`);
  console.log(`  P95 turn latency: ${Math.round(p95Ms)}ms`);
  console.log(`  Total duration: ${results.reduce((s, r) => s + r.durationMs, 0)}ms`);
  console.log('─'.repeat(60));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    const avgMs = r.turnLatenciesMs.length > 0
      ? Math.round(r.turnLatenciesMs.reduce((s, v) => s + v, 0) / r.turnLatenciesMs.length)
      : 0;
    console.log(`\n${icon} ${r.scenarioId}`);
    console.log(`   ${r.description}`);
    console.log(`   Expected: [${r.expectedActions.join(', ')}]`);
    console.log(`   Got:      [${r.actionsProduced.join(', ')}]`);
    console.log(`   Turns: ${r.turns} | First match: ${r.firstActionMatch} | Completion: ${r.reachedCompletion} | ${r.durationMs}ms (avg turn: ${avgMs}ms)`);
    if (r.error) console.log(`   ERROR: ${r.error}`);
  }

  console.log('\n' + '═'.repeat(60));

  // Pass rate gate
  if (passRate >= 85) {
    console.log(`  ✅ PASS — ${passRate}% meets the ≥85% bar`);
  } else {
    console.log(`  ❌ FAIL — ${passRate}% is below the ≥85% bar`);
    process.exitCode = 1;
  }

  // P95 latency gate
  if (p95Ms <= 8000) {
    console.log(`  ✅ LATENCY — P95 ${Math.round(p95Ms)}ms within 8000ms cap`);
  } else {
    console.log(`  ❌ LATENCY — P95 ${Math.round(p95Ms)}ms exceeds 8000ms cap`);
    process.exitCode = 1;
  }

  console.log('═'.repeat(60) + '\n');
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/tests/evals/runner.ts apps/backend/tests/evals/report.ts
git commit -m "feat: per-turn latency tracking and P95 CI gate in eval report"
```

---

## Task 9: Failure-recovery eval scenarios

**Files:**
- Create: `apps/backend/tests/evals/scenarios/recovery.ts`
- Modify: `apps/backend/tests/evals/index.ts`

- [ ] **Step 1: Create `recovery.ts` with 3 scenarios**

Create `apps/backend/tests/evals/scenarios/recovery.ts`:

```ts
import { EvalScenario } from '../runner';

export const recoveryScenarios: EvalScenario[] = [
  {
    id: 'recovery-stale-selector',
    description: 'Agent must replan after stale selector — observe turns injected',
    goal: 'Click the Save button to submit the payroll form',
    mockDom: {
      url: 'https://app.example.com/payroll/settings',
      title: 'Payroll Settings',
      headings: ['Payroll Settings', 'Save Changes'],
      elements: [
        { tag: 'button', selector: 'button[data-action="save-payroll"]', text: 'Save Changes', type: 'button' },
        { tag: 'input', selector: 'input#company-name', text: 'Company Name', type: 'text', value: 'Acme Corp' },
      ],
      semanticSummary: 'Payroll Settings page. Primary action: Save Changes button.',
    },
    expectedActions: ['execute_page_action', 'degrade_to_manual'],
    maxTurns: 5,
    tags: ['recovery', 'stale-selector'],
  },
  {
    id: 'recovery-wrong-page',
    description: 'Agent must replan when page context does not match goal',
    goal: 'Set up GST filing by entering the GSTIN number',
    mockDom: {
      url: 'https://app.example.com/dashboard',
      title: 'Dashboard',
      headings: ['Welcome back', 'Recent Activity'],
      elements: [
        { tag: 'a', selector: 'a[href="/settings/gst"]', text: 'GST Settings', type: undefined },
        { tag: 'a', selector: 'a[href="/reports"]', text: 'Reports', type: undefined },
      ],
      semanticSummary: 'Dashboard page. No GST input fields visible. Navigation links present.',
    },
    expectedActions: ['execute_page_action'],
    maxTurns: 3,
    tags: ['recovery', 'wrong-page'],
  },
  {
    id: 'recovery-repeated-failure-degrades',
    description: 'After 3 observe turns agent must call degrade_to_manual not escalate_to_human',
    goal: 'Fill in the company PAN number',
    mockDom: {
      url: 'https://app.example.com/compliance',
      title: 'Compliance Setup',
      headings: ['Compliance Setup', 'PAN Details'],
      elements: [
        { tag: 'input', selector: 'input[name="pan_number"]', text: 'PAN Number', type: 'text', value: '' },
      ],
      semanticSummary: 'Compliance Setup page. PAN Number field visible and empty.',
    },
    expectedActions: ['execute_page_action', 'degrade_to_manual'],
    maxTurns: 6,
    tags: ['recovery', 'degrade'],
  },
];
```

> Note: The `recovery-repeated-failure-degrades` scenario tests the system prompt's failure-context block. You will need to pre-populate `turnHistory` with 3 `observe` turns before calling `runAgentGoal()` for this scenario. Update `runScenario()` in `runner.ts` to support a `seedTurnHistory?: GoalTurn[]` field on `EvalScenario`, applied before the loop.

- [ ] **Step 2: Add `seedTurnHistory` support to `EvalScenario` and `runScenario()`**

In `apps/backend/tests/evals/runner.ts`, add to `EvalScenario`:

```ts
export interface EvalScenario {
  id: string;
  description: string;
  goal: string;
  mockDom: { ... }; // unchanged
  expectedActions: string[];
  maxTurns: number;
  tags: string[];
  seedTurnHistory?: GoalTurn[]; // pre-populated turns (e.g. observe turns for failure scenarios)
}
```

In `runScenario()`, replace `const turnHistory: GoalTurn[] = [];` with:

```ts
const turnHistory: GoalTurn[] = scenario.seedTurnHistory ? [...scenario.seedTurnHistory] : [];
```

Update `recovery-repeated-failure-degrades` in `recovery.ts` to include:

```ts
seedTurnHistory: [
  { role: 'observe', content: 'Action attempted on selector "input[name=pan_number]" but page did not change.' },
  { role: 'observe', content: 'Action attempted on selector "input[name=pan_number]" but page did not change.' },
  { role: 'observe', content: 'Action attempted on selector "input[name=pan_number]" but page did not change.' },
],
```

- [ ] **Step 3: Register recovery scenarios in `index.ts`**

In `apps/backend/tests/evals/index.ts`, import and spread the new scenarios:

```ts
import { recoveryScenarios } from './scenarios/recovery';
// ... existing imports ...

const allScenarios = [
  ...existingScenarios,
  ...recoveryScenarios,
];
```

(Match the exact pattern used in `index.ts` for the existing scenarios.)

- [ ] **Step 4: Run the eval suite**

```bash
cd apps/backend && npm run eval
```

Expected:
- `recovery-stale-selector`: passes (agent uses `execute_page_action` then `degrade_to_manual` is available)
- `recovery-wrong-page`: passes (agent navigates toward the goal page)
- `recovery-repeated-failure-degrades`: passes (`degrade_to_manual` called, not `escalate_to_human`)
- Overall pass rate ≥85%
- P95 latency ≤8000ms

If any recovery scenario fails, check: (1) `degrade_to_manual` tool is in the goal-mode tools array, (2) failure-context block appears in the system prompt when observe turns are present.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/tests/evals/scenarios/recovery.ts apps/backend/tests/evals/runner.ts apps/backend/tests/evals/index.ts
git commit -m "test: failure-recovery eval scenarios — stale selector, wrong page, degrade path"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `degrade_to_manual` tool (goal mode only) | Task 2 |
| `GoalTurn.role: 'observe'` | Task 1 |
| Failure-context system prompt block | Task 3 |
| 8s hard cap with `Promise.race` | Task 3 |
| DOM fingerprint + `waitForDomChange` | Task 5 |
| Observe turn injection on soft failure | Task 5 |
| `failureCount` reset on DOM change | Task 5 |
| `reportSoftFailure()` to heal endpoint | Task 4 |
| Degradation card UI | Task 6 |
| "Done, continue" resets and resumes goal loop | Task 6 |
| "Get human help" fires escalation | Task 6 |
| First-token latency log | Task 7 |
| Per-turn `hrtime` in eval runner | Task 8 |
| P95 calculation in report | Task 8 |
| P95 CI gate (exit 1 if >8s) | Task 8 |
| Recovery eval scenarios | Task 9 |

All spec requirements covered. No placeholders. Type names consistent across tasks (`AgentAction.degrade_to_manual`, `GoalTurn.role: 'observe'`, `EvalResult.turnLatenciesMs`, `EvalScenario.seedTurnHistory`).
