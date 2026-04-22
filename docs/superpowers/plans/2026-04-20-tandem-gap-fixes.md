# Tandem Gap Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three feature gaps vs Tandem: role/segment targeting for flows, per-flow completion metrics on the dashboard, and instant deploy (WebSocket hot-reload for live widget sessions).

**Architecture:** Gap 1 adds a `targetRoles` field to `OnboardingFlow` and filters at session start. Gap 2 adds a backend endpoint + dashboard card reusing existing `activation` data. Gap 3 extends the existing WS server to broadcast `flow_updated` events to widget clients, which evict cache and reload.

**Tech Stack:** Node.js + Express + Prisma (backend), Next.js + Tailwind + shadcn/ui (dashboard), Vanilla TS (widget), `ws` library (WebSocket)

---

## File Map

| File | Change |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Add `targetRoles String[] @default([])` to `OnboardingFlow` |
| `apps/backend/prisma/migrations/20260420_add_target_roles/migration.sql` | CREATE migration |
| `apps/backend/src/routes/flow.ts` | Accept `targetRoles` in PUT; call `broadcastToOrgWidgets` after update |
| `apps/backend/src/routes/session.ts` | Filter flows by `targetRoles` at `/start` |
| `apps/backend/src/routes/activation.ts` | Add `GET /flows` endpoint |
| `apps/backend/src/lib/websocket.ts` | Track org-level widget connections; export `broadcastToOrgWidgets` |
| `apps/dashboard/lib/api.ts` | Add `targetRoles` to `OnboardingFlow` type; update `flow.update()`; add `activation.flows()` |
| `apps/dashboard/app/(app)/flows/[id]/page.tsx` | Add "Target roles" input in trigger config section |
| `apps/dashboard/app/(app)/dashboard/page.tsx` | Add "Flow completion" stats card |
| `apps/widget/src/socket.ts` | Accept `onServerPush` callback; dispatch `flow_updated` to it |
| `apps/widget/src/copilot.ts` | Add `reloadSession()` method |
| `apps/widget/src/widget.ts` | Register `onServerPush` handler; call `copilot.reloadSession()` on `flow_updated` |

---

## Task 1: Schema — add targetRoles to OnboardingFlow

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260420_add_target_roles/migration.sql`

- [ ] **Step 1: Add field to schema**

In `apps/backend/prisma/schema.prisma`, inside the `OnboardingFlow` model, after the `maxTriggersPerUser` line, add:

```prisma
  targetRoles         String[] @default([]) @map("target_roles")  // empty = all roles
```

The model block around that area should look like:

```prisma
  triggerDelayMs      Int    @default(30000) @map("trigger_delay_ms")
  urlPattern          String @default("") @map("url_pattern")
  maxTriggersPerUser  Int    @default(0)   @map("max_triggers_per_user")
  targetRoles         String[] @default([]) @map("target_roles")
  createdAt      DateTime @default(now()) @map("created_at")
```

- [ ] **Step 2: Write the migration SQL**

Create file `apps/backend/prisma/migrations/20260420_add_target_roles/migration.sql`:

```sql
-- AddColumn
ALTER TABLE "onboarding_flows" ADD COLUMN "target_roles" TEXT[] NOT NULL DEFAULT '{}';
```

- [ ] **Step 3: Apply the migration**

```bash
cd apps/backend
npx prisma migrate deploy
```

Expected output: `1 migration applied.`

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd apps/backend
npx prisma generate
```

Expected output: `Generated Prisma Client`

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/20260420_add_target_roles/
git commit -m "feat: add targetRoles field to OnboardingFlow schema"
```

---

## Task 2: Backend — accept targetRoles in flow PUT route

**Files:**
- Modify: `apps/backend/src/routes/flow.ts`

- [ ] **Step 1: Update the PUT /:id handler to accept targetRoles**

In `apps/backend/src/routes/flow.ts`, find the `PUT /:id` handler. Replace the destructuring and type annotation:

```typescript
  const { name, description, isActive, triggerDelayMs, urlPattern, maxTriggersPerUser } = req.body as {
    name?: string;
    description?: string;
    isActive?: boolean;
    triggerDelayMs?: number;
    urlPattern?: string;
    maxTriggersPerUser?: number;
  };
```

with:

```typescript
  const { name, description, isActive, triggerDelayMs, urlPattern, maxTriggersPerUser, targetRoles } = req.body as {
    name?: string;
    description?: string;
    isActive?: boolean;
    triggerDelayMs?: number;
    urlPattern?: string;
    maxTriggersPerUser?: number;
    targetRoles?: string[];
  };
```

- [ ] **Step 2: Pass targetRoles to the prisma update**

In the same handler, find the `data:` object passed to `prisma.onboardingFlow.updateMany`. Add the targetRoles line:

```typescript
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      ...(triggerDelayMs !== undefined && { triggerDelayMs }),
      ...(urlPattern !== undefined && { urlPattern }),
      ...(maxTriggersPerUser !== undefined && { maxTriggersPerUser }),
      ...(targetRoles !== undefined && { targetRoles }),
    },
```

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
cd apps/backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/flow.ts
git commit -m "feat: accept targetRoles in flow PUT route"
```

---

## Task 3: Backend — filter flows by targetRoles at session/start

**Files:**
- Modify: `apps/backend/src/routes/session.ts`

- [ ] **Step 1: Update flow lookup in /start to filter by role**

In `apps/backend/src/routes/session.ts`, find the `POST /start` handler. Locate this block (~line 191):

```typescript
  // find the org's active flow
  const baseFlow = await prisma.onboardingFlow.findFirst({
    where: { organizationId: req.organization!.id, isActive: true },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
```

Replace it with:

```typescript
  // find the org's active flow — prefer one that targets this user's role, fall back to global
  const userRole = (metadata?.role as string | undefined) ?? '';
  
  // Try role-targeted flow first
  const baseFlow = await (async () => {
    if (userRole) {
      const roleFlow = await prisma.onboardingFlow.findFirst({
        where: {
          organizationId: req.organization!.id,
          isActive: true,
          targetRoles: { has: userRole },
        },
        include: { steps: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      });
      if (roleFlow) return roleFlow;
    }
    // Fall back to a flow with no role restriction (targetRoles is empty)
    return prisma.onboardingFlow.findFirst({
      where: {
        organizationId: req.organization!.id,
        isActive: true,
        targetRoles: { isEmpty: true },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  })();
```

- [ ] **Step 2: Also update the test-mode flow lookup to use same logic**

In the same file, find the testMode block that calls `prisma.onboardingFlow.findFirst`. That preview doesn't need role filtering (it's admin-only), so leave it as-is.

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
cd apps/backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/session.ts
git commit -m "feat: filter onboarding flows by targetRoles at session start"
```

---

## Task 4: Backend — add GET /activation/flows endpoint

**Files:**
- Modify: `apps/backend/src/routes/activation.ts`

- [ ] **Step 1: Add the /flows route before the export**

In `apps/backend/src/routes/activation.ts`, before `export default router;`, add:

```typescript
// ─── GET /api/v1/activation/flows ────────────────────────────────────────────
// Per-flow completion stats: completionRate, totalSessions, completedSessions
router.get('/flows', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const flows = await prisma.onboardingFlow.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const stats = await Promise.all(
    flows.map(async (flow) => {
      const [total, completed] = await Promise.all([
        prisma.userOnboardingSession.count({ where: { organizationId: orgId, flowId: flow.id } }),
        prisma.userOnboardingSession.count({ where: { organizationId: orgId, flowId: flow.id, status: 'completed' } }),
      ]);
      return {
        flowId: flow.id,
        flowName: flow.name,
        isActive: flow.isActive,
        totalSessions: total,
        completedSessions: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
      };
    })
  );

  res.json({ flows: stats });
});
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
cd apps/backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/routes/activation.ts
git commit -m "feat: add GET /activation/flows per-flow completion stats endpoint"
```

---

## Task 5: Backend — WebSocket org-level broadcast for flow_updated

**Files:**
- Modify: `apps/backend/src/lib/websocket.ts`

- [ ] **Step 1: Add orgWidgets map and broadcastToOrgWidgets export**

In `apps/backend/src/lib/websocket.ts`, after the `subscribers` map declaration (around line 41), add:

```typescript
// ── Org-level widget connections — for pushing flow updates to live widgets ───
const orgWidgets = new Map<string, Set<WebSocket>>();

export function broadcastToOrgWidgets(orgId: string, payload: object) {
  const conns = orgWidgets.get(orgId);
  if (!conns) return;
  const msg = JSON.stringify(payload);
  conns.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}
```

- [ ] **Step 2: Register widget connections in orgWidgets on auth_ok**

In the same file, inside the `msg.type === 'auth'` handler, after `state.mode = 'widget';`, add:

```typescript
        // Track this connection so we can broadcast flow updates
        if (!orgWidgets.has(org.id)) orgWidgets.set(org.id, new Set());
        orgWidgets.get(org.id)!.add(ws);
```

- [ ] **Step 3: Clean up orgWidgets on close**

In the `ws.on('close', ...)` handler, after the existing subscriber cleanup, add:

```typescript
      // Clean up widget org-broadcast registration
      if (state.organizationId && state.mode === 'widget') {
        orgWidgets.get(state.organizationId)?.delete(ws);
      }
```

- [ ] **Step 4: Confirm TypeScript compiles**

```bash
cd apps/backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/lib/websocket.ts
git commit -m "feat: add org-level widget broadcast for instant flow deploy"
```

---

## Task 6: Backend — broadcast flow_updated after flow PUT

**Files:**
- Modify: `apps/backend/src/routes/flow.ts`

- [ ] **Step 1: Import broadcastToOrgWidgets**

At the top of `apps/backend/src/routes/flow.ts`, add this import after the existing imports:

```typescript
import { broadcastToOrgWidgets } from '../lib/websocket';
```

- [ ] **Step 2: Call broadcast after successful PUT**

In the `PUT /:id` handler, after `res.json({ updated: flow.count > 0 });`, add the broadcast call. The full handler ending should look like:

```typescript
  const flow = await prisma.onboardingFlow.updateMany({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      ...(triggerDelayMs !== undefined && { triggerDelayMs }),
      ...(urlPattern !== undefined && { urlPattern }),
      ...(maxTriggersPerUser !== undefined && { maxTriggersPerUser }),
      ...(targetRoles !== undefined && { targetRoles }),
    },
  });

  if (flow.count > 0) {
    broadcastToOrgWidgets(req.user!.organizationId, {
      type: 'flow_updated',
      flowId: req.params.id,
    });
  }

  res.json({ updated: flow.count > 0 });
```

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
cd apps/backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/routes/flow.ts
git commit -m "feat: broadcast flow_updated to widget clients on flow save"
```

---

## Task 7: Widget — accept server push messages and reload on flow_updated

**Files:**
- Modify: `apps/widget/src/socket.ts`
- Modify: `apps/widget/src/copilot.ts`
- Modify: `apps/widget/src/widget.ts`

### 7a — socket.ts: add onServerPush callback

- [ ] **Step 1: Add ServerPushCallback type and onServerPush field to WidgetSocket**

In `apps/widget/src/socket.ts`, after the `PendingMessage` interface, add:

```typescript
type ServerPushCallback = (msg: Record<string, unknown>) => void;
```

In the `WidgetSocket` class, add a private field after `private queue`:

```typescript
  private onServerPushCallback: ServerPushCallback | null = null;
```

- [ ] **Step 2: Add onServerPush() registration method**

In the `WidgetSocket` class, after the constructor, add:

```typescript
  onServerPush(cb: ServerPushCallback) {
    this.onServerPushCallback = cb;
  }
```

- [ ] **Step 3: Dispatch unknown message types to onServerPush**

In the `ws.onmessage` handler switch statement, add a `default` case after `case 'error':`:

```typescript
          default:
            if (this.onServerPushCallback) {
              this.onServerPushCallback(msg);
            }
            break;
```

### 7b — copilot.ts: add reloadSession()

- [ ] **Step 4: Add reloadSession to CopilotManager**

In `apps/widget/src/copilot.ts`, after the `start()` method, add:

```typescript
  async reloadSession(): Promise<CopilotSession | null> {
    if (!this.userId) return null;
    this.evictCache(this.userId);
    return this.start(this.userId, window.location.pathname, {});
  }
```

### 7c — widget.ts: wire up the server push handler

- [ ] **Step 5: Register the flow_updated handler after socket connect**

In `apps/widget/src/widget.ts`, find where `this.socket` is initialized and `connect()` is called. After the `await this.socket.connect()` line (or wherever the socket is connected), add:

```typescript
    this.socket.onServerPush((msg) => {
      if (msg.type === 'flow_updated') {
        const currentFlowId = this.copilot.getSession()?.flow?.id;
        if (!currentFlowId || msg.flowId === currentFlowId) {
          this.copilot.reloadSession().then((session) => {
            if (session) this.handleSessionUpdate(session);
          });
        }
      }
    });
```

Note: `handleSessionUpdate` is the existing method that re-renders the widget when session data changes. Verify its exact name in widget.ts and use the correct method.

- [ ] **Step 6: Confirm TypeScript compiles (widget)**

```bash
cd apps/widget
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/widget/src/socket.ts apps/widget/src/copilot.ts apps/widget/src/widget.ts
git commit -m "feat: widget hot-reloads flow config when flow_updated received via WebSocket"
```

---

## Task 8: Dashboard — update OnboardingFlow type and api client

**Files:**
- Modify: `apps/dashboard/lib/api.ts`

- [ ] **Step 1: Add targetRoles to OnboardingFlow type**

In `apps/dashboard/lib/api.ts`, find the `OnboardingFlow` interface/type. Add `targetRoles: string[]` to it. Look for the existing fields like `triggerDelayMs`, `urlPattern`, `maxTriggersPerUser` and add after them:

```typescript
  targetRoles: string[];
```

- [ ] **Step 2: Add targetRoles to flow.update() signature**

Find:

```typescript
    update: (id: string, data: Partial<Pick<OnboardingFlow, 'name' | 'description' | 'isActive' | 'triggerDelayMs' | 'urlPattern' | 'maxTriggersPerUser'>>) =>
```

Replace with:

```typescript
    update: (id: string, data: Partial<Pick<OnboardingFlow, 'name' | 'description' | 'isActive' | 'triggerDelayMs' | 'urlPattern' | 'maxTriggersPerUser' | 'targetRoles'>>) =>
```

- [ ] **Step 3: Add FlowCompletionStat type and activation.flows() method**

After the existing `activation` section (if it exists) or near the other api methods, add the type:

```typescript
export interface FlowCompletionStat {
  flowId: string;
  flowName: string;
  isActive: boolean;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
}
```

Add the api method. Find the `activation:` key in the `api` object (or add it after `analytics:`):

```typescript
  activation: {
    overview: () => apiFetch<{ totalSessions: number; completedSessions: number; completionRate: number; firstValueCount: number; avgTimeToValueMins: number | null }>('/api/v1/activation/overview'),
    flows: () => apiFetch<{ flows: FlowCompletionStat[] }>('/api/v1/activation/flows'),
  },
```

If `activation` already exists in the api object, just add `flows:` to it.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/lib/api.ts
git commit -m "feat: add targetRoles to OnboardingFlow type; add activation.flows() API method"
```

---

## Task 9: Dashboard — role targeting UI in flow editor

**Files:**
- Modify: `apps/dashboard/app/(app)/flows/[id]/page.tsx`

- [ ] **Step 1: Add targetRoles state**

In `FlowEditorPage`, after the `maxTriggers` state declaration, add:

```typescript
  const [targetRoles, setTargetRoles] = useState<string>('');
  const [targetRolesSaved, setTargetRolesSaved] = useState(false);
```

- [ ] **Step 2: Initialize from flow data**

In the `api.flow.get(id).then(...)` callback, after `setMaxTriggers(...)`, add:

```typescript
      setTargetRoles((d.flow.targetRoles ?? []).join(', '));
```

- [ ] **Step 3: Include targetRoles in saveTriggerConfig**

In `saveTriggerConfig`, update the `api.flow.update` call:

```typescript
  async function saveTriggerConfig() {
    setSavingTrigger(true);
    await api.flow.update(id, {
      triggerDelayMs: triggerDelaySec * 1000,
      urlPattern,
      maxTriggersPerUser: maxTriggers,
      targetRoles: targetRoles.split(',').map((r) => r.trim()).filter(Boolean),
    });
    setSavingTrigger(false);
    setTriggerSaved(true);
    setTimeout(() => setTriggerSaved(false), 2000);
  }
```

- [ ] **Step 4: Add UI input for target roles**

In the JSX, in the trigger config section (find the section that has `triggerDelaySec`, `urlPattern`, `maxTriggers` inputs), add a new row after the URL pattern input:

```tsx
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Target audience
              <span className="ml-1 text-slate-400 font-normal">(comma-separated roles — leave blank for all users)</span>
            </label>
            <input
              type="text"
              value={targetRoles}
              onChange={(e) => setTargetRoles(e.target.value)}
              placeholder="e.g. admin, sales, hr"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <p className="text-xs text-slate-400 mt-1">
              Matches the <code className="bg-slate-100 px-1 rounded">role</code> field in the metadata your widget install passes via <code className="bg-slate-100 px-1 rounded">PrismConfig.metadata</code>.
            </p>
          </div>
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/app/(app)/flows/[id]/page.tsx
git commit -m "feat: add target audience (role) selector in flow editor trigger config"
```

---

## Task 10: Dashboard — per-flow completion card on dashboard home

**Files:**
- Modify: `apps/dashboard/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Import FlowCompletionStat type and update state**

At the top of `apps/dashboard/app/(app)/dashboard/page.tsx`, the import from `@/lib/api` already exists. Add `FlowCompletionStat` to it:

```typescript
import { api, OverviewStats, TimelinePoint, EndUserSummary, Insight, FlowCompletionStat } from '@/lib/api';
```

Add state:

```typescript
  const [flowStats, setFlowStats] = useState<FlowCompletionStat[]>([]);
```

- [ ] **Step 2: Fetch flow stats on mount**

In the `Promise.all` inside `useEffect`, add `api.activation.flows().catch(() => ({ flows: [] }))` to the array:

```typescript
    Promise.all([
      api.analytics.overview(),
      api.analytics.timeline(30),
      api.users.list({ limit: 10 }),
      api.insights.list().catch(() => null),
      api.activation.flows().catch(() => ({ flows: [] as FlowCompletionStat[] })),
    ]).then(([o, t, u, ins, af]) => {
      setOverview(o);
      setTimeline(t);
      setUsers(u);
      if (ins && ins.insights.length > 0) setTopInsight(ins.insights[0]);
      setFlowStats(af.flows);
    }).finally(() => setLoading(false));
```

- [ ] **Step 3: Add the FlowCompletion card to JSX**

In the `return (...)` JSX, after the `{topInsight && ...}` block and before the users table, add:

```tsx
      {/* Flow completion rates */}
      {flowStats.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Flow completion rates</p>
            <span className="text-xs text-slate-400">{flowStats.length} flow{flowStats.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {flowStats.map((f) => (
              <div key={f.flowId} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.isActive ? 'bg-green-400' : 'bg-slate-300'}`} />
                  <span className="text-sm text-slate-700 truncate max-w-[220px]">{f.flowName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
                  <span>{f.totalSessions} sessions</span>
                  <span className={`font-semibold tabular-nums ${
                    f.completionRate >= 70 ? 'text-green-600' :
                    f.completionRate >= 40 ? 'text-amber-600' :
                    f.totalSessions === 0 ? 'text-slate-400' : 'text-red-600'
                  }`}>
                    {f.totalSessions === 0 ? '—' : `${f.completionRate}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Update PageSkeleton to include a placeholder for the flow card**

In `PageSkeleton`, add a skeleton line after the existing `h-48` div:

```tsx
      <div className="h-32 bg-slate-200 rounded-xl" />
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/app/(app)/dashboard/page.tsx
git commit -m "feat: add per-flow completion rate card to dashboard home"
```

---

## Self-Review

### Spec Coverage
- ✅ Role targeting — schema, route (PUT + session/start), dashboard UI
- ✅ Per-flow completion metrics — backend endpoint + dashboard card
- ✅ Instant deploy — WS broadcast server-side + widget reload
- ✅ targetRoles filtering uses metadata.role (already passed by widget in `start()` body)

### Type Consistency
- `targetRoles: string[]` matches in schema.prisma, flow.ts PUT body, session.ts Prisma query, api.ts OnboardingFlow type, and flow editor `split(',')` → `string[]`
- `FlowCompletionStat.completionRate` returned as `number` from backend, rendered as `${f.completionRate}%` in JSX — consistent
- `broadcastToOrgWidgets` exported from websocket.ts, imported in flow.ts — import path `'../lib/websocket'` is correct relative to `routes/`

### Edge Cases Covered
- `targetRoles: []` (empty) = global flow — handled by `isEmpty: true` query in session/start
- No active widget connections → `broadcastToOrgWidgets` is a no-op (Map returns undefined)
- Widget reload when `msg.flowId` doesn't match current session → skip (prevents unnecessary reloads)
- `reloadSession()` called when userId is null → returns null safely
