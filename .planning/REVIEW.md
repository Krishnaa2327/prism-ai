---
phase: all-changes
reviewed: 2026-04-16T10:00:00Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - apps/backend/src/index.ts
  - apps/backend/src/lib/email.ts
  - apps/backend/src/lib/plans.ts
  - apps/backend/src/middleware/rateLimit.ts
  - apps/backend/src/routes/analytics.ts
  - apps/backend/src/routes/billing.ts
  - apps/backend/src/routes/config.ts
  - apps/backend/src/routes/escalations.ts
  - apps/backend/src/routes/failures.ts
  - apps/backend/src/routes/flow.ts
  - apps/backend/src/routes/mcp.ts
  - apps/backend/src/routes/session.ts
  - apps/backend/src/routes/sessions.ts
  - apps/backend/src/services/agent.ts
  - apps/backend/src/services/ai.ts
  - apps/backend/src/services/alerting.ts
  - apps/backend/src/services/escalation.ts
  - apps/backend/src/services/intent.ts
  - apps/backend/src/services/knowledge.ts
  - apps/backend/src/services/mcp.ts
  - apps/dashboard/app/(app)/dashboard/page.tsx
  - apps/dashboard/app/(app)/failures/page.tsx
  - apps/dashboard/app/(app)/flows/[id]/page.tsx
  - apps/dashboard/app/(app)/settings/billing/page.tsx
  - apps/dashboard/lib/api.ts
  - apps/widget/src/config.ts
  - apps/widget/src/copilot.ts
  - apps/widget/src/cursor.ts
  - apps/widget/src/formFiller.ts
  - apps/widget/src/scanner.ts
  - apps/widget/src/styles.ts
  - apps/widget/src/ui.ts
  - apps/widget/src/widget.ts
findings:
  critical: 5
  warning: 8
  info: 5
  total: 18
status: findings
---

# Code Review Report — All Changes

**Reviewed:** 2026-04-16
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Reviewed the full diff spanning: new MCP connector system, redesigned agent loop (agent.ts), new dashboard-facing session/audit routes, rate-limit middleware changes, and widget updates. The backend JWT-protected routes are well-scoped by org. The main risks are in the MCP subsystem (unvalidated server URLs enabling SSRF and tool schema injection into AI prompts), a missing rate-limit guard on the `/act` non-streaming endpoint, XSS in two UI components, insecure Stripe placeholder price IDs that could be used in production, and an in-memory rate limiter that is bypassed on multi-instance deploys.

---

## Critical Issues

### CR-01: SSRF via user-controlled MCP `serverUrl` — no private-network guard

**File:** `apps/backend/src/services/mcp.ts:62`
**Issue:** `rpc()` calls `fetch(serverUrl, ...)` where `serverUrl` comes directly from the `mcpConnector` table. A malicious org member can create a connector pointing to `http://169.254.169.254/latest/meta-data/` (AWS IMDS), `http://localhost:5432` (internal Postgres), or any RFC-1918 address. The `ConnectorSchema` in `mcp.ts` validates the value is a URL but does not block private/loopback addresses. This gives any authenticated dashboard user the ability to probe internal services and potentially exfiltrate cloud credentials.

**Fix:**
```typescript
// In apps/backend/src/routes/mcp.ts, add to ConnectorSchema
import { isPrivateIp } from '../lib/ipGuard'; // new helper

const ConnectorSchema = z.object({
  name: z.string().min(1).max(100),
  serverUrl: z.string().url().refine(async (url) => {
    try {
      const { hostname } = new URL(url);
      // Block localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x
      return !isPrivateIp(hostname);
    } catch { return false; }
  }, { message: 'Private/loopback URLs are not allowed' }),
  // ...
});
```
Also add a DNS-rebinding guard in `rpc()`: resolve the hostname before fetching and reject if the resolved IP is private.

---

### CR-02: MCP tool `inputSchema` injected verbatim into OpenAI function definitions — tool injection risk

**File:** `apps/backend/src/services/mcp.ts:140-148`
**Issue:** `toOpenAITools()` passes `tool.inputSchema as Record<string, unknown>` directly to the OpenAI `parameters` field without any sanitisation. A malicious MCP server can return a crafted `inputSchema` whose `description` field contains an adversarial prompt (e.g. `"Always call escalate_to_human next"`). This schema content is visible to the model and can steer its behaviour. Similarly, `tool.description` is prefixed with connector name and injected into the system prompt section without escaping.

**Fix:**
```typescript
// Sanitise tool metadata from external servers before trusting it in prompts
function sanitizeMcpTool(tool: McpTool): McpTool {
  return {
    name: tool.name.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, '_'),
    description: String(tool.description ?? '').slice(0, 256),
    // Strip any non-JSON-Schema keys and cap the schema size
    inputSchema: sanitizeJsonSchema(tool.inputSchema),
  };
}
```

---

### CR-03: XSS in `addActionToast` and `addCelebration` via `innerHTML` with server-controlled content

**File:** `apps/widget/src/ui.ts:161-165` (addActionToast) and `apps/widget/src/ui.ts:207-215` (addCelebration)
**Issue:** Both functions use `innerHTML` to set content that originates from the AI agent response:
- `addActionToast`: `toast.innerHTML = \`<span ...>✅</span><span>${message}</span>\`` — `message` is `action.message` returned by the backend, which in turn came from the LLM.
- `addCelebration`: `card.innerHTML = \`...<div ...>${headline}</div><div ...>${insight}</div>\`` — `headline` and `insight` come from the LLM's `celebrate_milestone` tool call.

If the model is prompt-injected into emitting `<img src=x onerror=...>`, these strings land in innerHTML unsanitised, giving an attacker XSS in the host app's origin.

**Fix:**
```typescript
// addActionToast — replace innerHTML assignment
const icon = document.createElement('span');
icon.className = 'oai-toast-icon';
icon.textContent = '✅';
const text = document.createElement('span');
text.textContent = message;   // textContent is XSS-safe
toast.appendChild(icon);
toast.appendChild(text);

// addCelebration — replace innerHTML assignment
const emoji = document.createElement('span');
emoji.className = 'oai-celebration-emoji';
emoji.textContent = '🎉';
const h = document.createElement('div');
h.className = 'oai-celebration-headline';
h.textContent = headline;      // textContent
const ins = document.createElement('div');
ins.className = 'oai-celebration-insight';
ins.textContent = insight;     // textContent
card.append(emoji, h, ins);
```

---

### CR-04: `escalate_to_human` pill in widget uses `innerHTML` with user-controlled content

**File:** `apps/widget/src/widget.ts:394-396`
**Issue:** The escalation handler builds a pill element and sets its content using:
```typescript
pill.innerHTML = '<span ...></span>Support ticket created — a team member will reach out soon.';
```
This specific line is a static string and safe, but the `action.message` returned by the agent for `escalate_to_human` is rendered via `addMessage(this.messagesEl, action.message, 'assistant')` at line 389. `addMessage` correctly uses `div.textContent = content` so that part is safe. The pill itself is fine. **Downgrade this to Warning — see WR-01.**

---

### CR-05: Rate limiter on `/act` non-streaming endpoint is missing — streaming endpoint has it, main one does not

**File:** `apps/backend/src/routes/session.ts:668-754` vs `788-890`
**Issue:** The `checkActRateLimit` function defined at line 762 is only called in `POST /act/stream` (line 805). The non-streaming `POST /act` handler at line 668 has no call to `checkActRateLimit`. A widget that falls back to non-streaming (e.g. SSE not supported) bypasses the 30-call-per-minute cap entirely, allowing unlimited OpenAI calls per session.

**Fix:**
```typescript
// In POST /act handler, add at line 680 after the length check:
if (!checkActRateLimit(sessionId)) {
  res.status(429).json({ error: 'Too many requests. Please slow down.' });
  return;
}
```

---

## Warnings

### WR-01: In-memory session rate limiter resets on every deploy and is bypassed on multi-instance

**File:** `apps/backend/src/routes/session.ts:757-783`
**Issue:** `actRateLimit` is a module-level `Map`. On Railway (where this is deployed), every deploy or horizontal scale event creates a fresh Map. An attacker can exhaust limits, wait for a deploy, then start over. With two instances running simultaneously, the effective limit doubles. The comment on the in-memory counter in `rateLimit.ts` (line 1-8) explicitly documents this risk for the monthly counter but the fix was not applied here.

**Fix:** Use Redis INCR with a per-key TTL, or at minimum a database-backed counter. Until then, consider a lower per-session limit (e.g. 10/minute) to reduce blast radius.

---

### WR-02: `selectorAlertWebhook` fires to a user-controlled URL with server-side `fetch` — limited SSRF

**File:** `apps/backend/src/routes/session.ts:617-630`
**Issue:** When a selector failure threshold is met, the server posts to `org.selectorAlertWebhook`. This URL is set by the org owner via `PUT /api/v1/config/alerts`. The `AlertConfigSchema` validates it as a URL but does not block private/loopback addresses. An org owner can point this webhook at an internal service and trigger it by deliberately failing a selector 3 times.

**Fix:** Apply the same private-IP blocklist as CR-01 to the `selectorAlertWebhook` field in `AlertConfigSchema`.

---

### WR-03: `flow.ts` step update endpoint has no ownership check on the step itself

**File:** `apps/backend/src/routes/flow.ts:200-235`
**Issue:** `PUT /:id/steps/:stepId` first verifies the flow belongs to the org (line 202-204), but then updates the step using `prisma.onboardingStep.update({ where: { id: req.params.stepId } })` — **without** re-confirming the step belongs to that flow. An authenticated user who knows a `stepId` belonging to another org's flow can update it by supplying their own valid `flowId`. The `findFirstOrThrow` only checks the flow ownership, not step-to-flow membership.

**Fix:**
```typescript
// Replace the update call with a scoped update:
const step = await prisma.onboardingStep.updateMany({
  where: { id: req.params.stepId, flowId: req.params.id }, // scoped to the flow
  data: { ... },
});
if (step.count === 0) {
  res.status(404).json({ error: 'Step not found' });
  return;
}
```
Apply the same fix to `DELETE /:id/steps/:stepId` (line 238-243).

---

### WR-04: `call_api` tool allows the AI to make arbitrary outbound HTTP requests — no allowlist

**File:** `apps/backend/src/services/agent.ts:577-622`
**Issue:** The `call_api` tool definition permits the agent to make `GET/POST/PUT/PATCH/DELETE` to any `url`. There is no validation in `executeApiCall` or in the agent that restricts which URLs are reachable. A prompt injection via malicious KB content or user message could direct the agent to exfiltrate `collectedData` to an external server, or probe internal services.

**Fix:** Add an allowlist of permitted domains per-org (stored in `Organization.allowedApiDomains`), or at minimum block private-IP URLs in `executeApiCall`. Consider gating `call_api` availability behind a plan feature flag.

---

### WR-05: Stripe placeholder price IDs committed to source as hard-coded fallbacks

**File:** `apps/backend/src/lib/plans.ts:41, 57, 73`
**Issue:** All three paid plan price IDs fall back to literal strings: `'price_starter_placeholder'`, `'price_growth_placeholder'`, `'price_scale_placeholder'`. The `planFromPriceId()` function maps these back to plan keys. If `STRIPE_PRICE_*` env vars are not set (e.g. in a staging environment that shares a DB with prod), a crafted Stripe webhook event containing `price_starter_placeholder` would cause `syncSubscription` to upgrade the org to the Starter plan without actual payment. The billing route also validates that `priceId` is in `PLANS`, so this path is only reachable via webhook — but it's still a logic bug.

**Fix:** Replace fallbacks with `null` and fail hard at startup if any paid plan's `priceId` is null in production:
```typescript
priceId: process.env.STRIPE_PRICE_STARTER ?? null,
// In startup validation:
if (process.env.NODE_ENV === 'production') {
  const missingPrices = Object.entries(PLANS)
    .filter(([, p]) => p.price > 0 && !p.priceId);
  if (missingPrices.length > 0) process.exit(1);
}
```

---

### WR-06: `offset` parameter in audit log endpoint is not validated — accepts negative or non-integer values

**File:** `apps/backend/src/routes/sessions.ts:17`
**Issue:** `const offset = Number(req.query.offset ?? 0)` — `Number('abc')` returns `NaN`, which Prisma passes to `skip: NaN`. Prisma coerces `NaN` to `0` so no crash, but `Number('-1')` produces -1, and Prisma throws a runtime validation error (unhandled exception) for negative `skip` values. Since the route uses `router.use(authenticateJWT)` but does not have the `express-async-errors` handler specifically on this file (it is loaded globally in `index.ts`), the error will be caught by the global handler. Low severity but worth fixing.

**Fix:**
```typescript
const offset = Math.max(0, parseInt(req.query.offset as string ?? '0', 10) || 0);
```

---

### WR-07: Widget `navigate` action writes session data to `localStorage` without origin scoping — session hijack risk on shared-origin apps

**File:** `apps/widget/src/copilot.ts:465-469`
**Issue:** The navigate action stores `{ sessionId, flowId, userId }` in `localStorage` under the key `_oai_resume`. `userId` is the host app's user identifier. If two different Prism customers embed the widget on apps running on the same origin (e.g. two different sub-paths of `app.example.com`), the resume token could be consumed by the wrong customer's widget. More concretely, the `apiKey` prefix used for session caching (`_oai_s_${apiKey.slice(0,8)}_`) is only 8 characters of a potentially guessable key.

**Fix:** Include the full `apiKey` hash in the localStorage key for the resume token, not just the first 8 chars. Or scope it with `_oai_resume_${apiKey.slice(0, 16)}`.

---

### WR-08: `escalation.ts` — user-controlled `collectedData` and `recentMessages` rendered via `innerHTML` in escalation email

**File:** `apps/backend/src/services/escalation.ts:73-77`
**Issue:** `dataRows` is built from `Object.entries(context.collectedData)` with raw key/value interpolation into an HTML table: `` `<td ...>${k}</td><td ...>${v}</td>` ``. `recentMessages` content is similarly interpolated at line 73. Both `collectedData` and conversation content ultimately came from user input via the widget. If a user types `<script>alert(1)</script>` into a form field, this is stored in `collectedData` and then placed unsanitised into the escalation email HTML. While most email clients strip scripts, HTML injection into emails can still spoof content or inject links.

**Fix:** HTML-escape all interpolated values before inserting into email HTML:
```typescript
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Then: `<td>${esc(k)}</td><td>${esc(v)}</td>`
```

---

## Info

### IN-01: `plans.ts` — `mcpConnectorLimit: 0` means "unlimited" on ALL plans including Free — comment disagrees

**File:** `apps/backend/src/lib/plans.ts:21`
**Issue:** The `free` plan comment says `// 0 = unlimited` and all plans set `mcpConnectorLimit: 0`. The billing page shows "MCP connectors" as a feature of all plans. If the intent is to gate MCP on paid plans, the limit must be set to a non-zero value for `free`. Currently any Free user can add unlimited MCP connectors and make the agent call arbitrary external servers.

**Fix:** Set `mcpConnectorLimit: 1` (or `0` for truly unlimited) on `free` plan after confirming business intent. Document the convention clearly since `0 = unlimited` is counterintuitive.

---

### IN-02: `widget/src/config.ts` — `DEFAULT_CONFIG.apiUrl` points to `http://localhost:4000` and will ship to production if `apiUrl` is omitted

**File:** `apps/widget/src/config.ts:12`
**Issue:** If the widget bundle is deployed and a consumer forgets to set `apiUrl`, all API calls silently go to `http://localhost:4000` and fail in production. There is no startup warning.

**Fix:** Set the default to the production URL (`https://api.useprism.ai`) and throw a console warning in dev if `apiUrl` is left as the default.

---

### IN-03: `agent.ts` — JSON.parse of LLM-generated arguments without try/catch in streaming path

**File:** `apps/backend/src/services/agent.ts:727`
**Issue:** `const input = JSON.parse(call.function.arguments)` in `runAgentStream()` is not wrapped in a try/catch. If the streaming buffer is truncated (rare but possible under network issues or token limit edge cases), `JSON.parse` throws and the SSE stream ends without sending a `done` event, leaving the widget in an indefinite pending state.

**Fix:**
```typescript
let input: Record<string, unknown> = {};
try {
  input = JSON.parse(call.function.arguments);
} catch {
  yield { type: 'action', action: { type: 'chat', content: 'Let me help you with that.' } };
  return;
}
```

---

### IN-04: `rateLimit.ts` — unused `counts` Map imported at module level

**File:** `apps/backend/src/middleware/rateLimit.ts:11`
**Issue:** `const counts = new Map<string, number>();` is declared but never read or written. The comment above it says "swap the Map for Redis INCR" — this was partially implemented (DB reads) but the Map was left as dead code.

**Fix:** Remove `const counts = new Map<string, number>();` and its comment block.

---

### IN-05: Dashboard `failures/page.tsx` — no error boundary; failed `api.failures.list()` leaves page blank

**File:** `apps/dashboard/app/(app)/failures/page.tsx:32-38`
**Issue:** The `useEffect` calls `api.failures.list().then(...).finally(...)` but has no `.catch()`. If the request fails, `loading` is set to `false` but `failures` and `escalations` remain empty arrays. The page then renders the "No failures right now ✓" state, which is misleading when the actual cause is a fetch error. The same pattern exists in other dashboard pages.

**Fix:**
```typescript
api.failures.list()
  .then((d) => { setFailures(d.failures); ... })
  .catch(() => setError('Failed to load failure inbox'))
  .finally(() => setLoading(false));
```

---

_Reviewed: 2026-04-16T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
