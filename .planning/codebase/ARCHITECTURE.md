# Architecture

**Analysis Date:** 2026-04-18

## Pattern Overview

**Overall:** Multi-app monorepo — four independent apps sharing a single npm workspace. The system is a B2B SaaS where the backend is a single-tenant REST + WebSocket API, customers embed a JS widget, and internal users manage everything via a Next.js dashboard.

**Key Characteristics:**
- Strict dual-auth model: JWT for dashboard users, API key for widget/end-users
- AI agent loop runs server-side using OpenAI tool-calling (not streamed to client except via SSE/WS)
- All tenant data scoped by `organizationId` — every query filters by org
- Widget is a fully self-contained browser bundle with no framework dependency (plain TypeScript + Vite)
- No shared package between apps (the `packages/shared` directory exists but contains no compiled code)

## Apps

**`apps/backend`:**
- Purpose: REST API + WebSocket server serving both the widget and the dashboard
- Location: `apps/backend/src/`
- Entry: `apps/backend/src/index.ts`
- Port: 4000
- Auth: dual — `authenticateJWT` (dashboard), `authenticateApiKey` (widget)
- Depends on: PostgreSQL (Prisma), OpenAI, Anthropic, Stripe, Resend, Sarvam, MCP servers

**`apps/dashboard`:**
- Purpose: Next.js admin UI for org owners to configure flows, view analytics, manage billing
- Location: `apps/dashboard/app/`
- Entry: `apps/dashboard/app/layout.tsx`
- Port: 3000
- Auth: JWT stored in `localStorage`, attached by `apps/dashboard/lib/api.ts`

**`apps/landing`:**
- Purpose: Marketing site + docs
- Location: `apps/landing/app/`
- Port: 3001

**`apps/widget`:**
- Purpose: Embeddable JS snippet customers drop into their SaaS product
- Location: `apps/widget/src/`
- Entry: `apps/widget/src/index.ts` — exposes `window.OnboardAI(cmd, payload)`
- Bundle: single JS file via Vite with CSS injected at runtime

## Backend Layers

**Routes (`apps/backend/src/routes/`):**
- Purpose: Express routers — validate requests, call services, return JSON
- Contains: one file per resource domain (auth, flow, session, billing, kb, mcp, etc.)
- Depends on: services, middleware, lib
- Does NOT contain: business logic or direct Prisma calls for complex operations

**Services (`apps/backend/src/services/`):**
- Purpose: Business logic — AI agent, intent detection, knowledge base, MCP, alerting, escalation
- Key files:
  - `agent.ts` — OpenAI tool-calling agent loop, model routing, guardrails
  - `ai.ts` — Claude-based conversational AI with streaming (used by widget chat, not agent)
  - `intent.ts` — GPT-4o-mini intent classifier: page + behavior → step ID
  - `knowledge.ts` — hybrid BM25 + cosine vector search over `KnowledgeBaseArticle`
  - `mcp.ts` — JSON-RPC client for MCP server tool discovery and execution
  - `sarvam.ts` — India multilingual: translate, detect language, STT, TTS
  - `alerting.ts` — scheduled flow completion rate monitoring
  - `escalation.ts` — human handoff ticket creation + team notification
  - `apicall.ts` — step-level API call execution with template interpolation
  - `userhistory.ts` — builds user context summary for the agent prompt

**Middleware (`apps/backend/src/middleware/`):**
- `auth.ts` — `authenticateJWT()`, `authenticateApiKey()`
- `rateLimit.ts` — monthly message limit, MTU limit, agent limit, MCP connector limit enforcement
- `errorHandler.ts` — global Express error handler

**Lib (`apps/backend/src/lib/`):**
- `prisma.ts` — singleton PrismaClient
- `jwt.ts` — `signToken()`, `verifyToken()`
- `email.ts` — Resend wrapper (welcome email, alert emails)
- `stripe.ts` — Stripe client singleton
- `plans.ts` — plan definitions (limits, Stripe price IDs, INR prices)
- `websocket.ts` — WebSocket server, widget auth, dashboard subscription, streaming relay
- `ipGuard.ts` — SSRF prevention (DNS resolution check for MCP/webhook URLs)
- `logger.ts` — structured logger + `withRetry()` helper
- `apiKey.ts` — API key generation utility
- `templates.ts` — email HTML templates

## Widget Layers (`apps/widget/src/`)

**`index.ts`:** Public API — `window.OnboardAI('init' | 'event', ...)`. Replays queued calls.

**`widget.ts`:** Orchestrator — mounts DOM, manages panel show/hide, connects socket, drives UI updates.

**`copilot.ts`:** Session manager — communicates with `/api/v1/session/*`, manages flow state, local session cache (7-day localStorage TTL), URL pattern matching for trigger logic.

**`agent`-side modules:**
- `scanner.ts` — builds a live index of interactive DOM elements (inputs, buttons, links)
- `resolver.ts` — self-healing selector resolution: 8-strategy fallback chain (primary → data-testid → name → aria-label → placeholder → exact-text → fuzzy-class → fuzzy-text)
- `highlighter.ts` — spotlight, beacon, arrow callout, multi-highlight overlay modes
- `cursor.ts` — animated field fill simulation
- `formFiller.ts` — fills form fields given a `{ selector: value }` map
- `detector.ts` — idle and exit-intent detection, triggers widget open
- `socket.ts` — WebSocket client (widget ↔ backend)
- `recapture.ts` — re-engages users after navigation away mid-session
- `ui.ts` — DOM creation helpers for chat bubbles, step cards, celebration UI
- `styles.ts` — runtime CSS injection
- `api.ts` — HTTP calls for session start/act/event
- `config.ts` — widget config types and defaults
- `checklist.ts` — checklist step UI

## Data Flow

**Widget onboarding session flow:**

1. Customer page loads → `window.OnboardAI('init', { apiKey, userId, metadata })`
2. Widget boots: `copilot.start(userId, page, metadata)` → `POST /api/v1/session/start` (API key auth)
3. Backend: resolves active flow for org, finds/creates `UserOnboardingSession`, returns session + steps + trigger config
4. Widget: evaluates trigger config (delay, URL pattern, max triggers) before showing panel
5. User interacts → `POST /api/v1/session/act` or `/act/stream`
6. Backend: builds agent context (page elements, collected data, KB results, MCP tools), calls OpenAI tool-calling loop
7. Agent returns one of: `ask_clarification`, `execute_page_action`, `complete_step`, `celebrate_milestone`, `escalate_to_human`
8. Backend: logs action to `AuditLog`, updates `UserStepProgress`, returns action to widget
9. Widget: executes page action (fill, click, navigate, highlight) via `resolver.ts` + `formFiller.ts`
10. Widget: calls `POST /api/v1/session/heal` to record any selector healing that occurred
11. On step completion: `POST /api/v1/session/event` fires completion event, advances session

**Conversational chat flow (widget chat, non-agent):**

1. Widget WebSocket sends `{ type: 'auth', apiKey }` → backend validates, sets `mode: 'widget'`
2. Widget sends `{ type: 'message', conversationId, content }`
3. Backend: calls `handleMessageStreaming()` → Claude claude-sonnet-4-6 streaming
4. Backend streams tokens back over WebSocket (`stream_token` messages), closes with `stream_end`
5. Dashboard subscribers on the same `conversationId` receive `new_message` notification

**Dashboard live updates:**

1. Dashboard WebSocket sends `{ type: 'subscribe', conversationId, token: JWT }`
2. Backend verifies JWT + conversation ownership, adds WS to `subscribers` map
3. On any new message to that conversation, `notifySubscribers()` pushes event to all watchers

## Key Abstractions

**OnboardingFlow + OnboardingStep:**
- Purpose: defines a multi-step guided journey with per-step AI prompts, action configs, allowed actions, and trigger controls
- Examples: `apps/backend/prisma/schema.prisma` models `OnboardingFlow`, `OnboardingStep`
- Pattern: immutable step config; mutable session progress tracked separately

**UserOnboardingSession + UserStepProgress:**
- Purpose: tracks one end-user's journey through a flow, including collected answers and A/B experiment membership
- Pattern: `session.currentStepId` advances on each `complete_step` action; progress rows per step

**Organization (multi-tenancy root):**
- Every resource has `organizationId` FK. Queries always filter by `req.organization.id` or `req.user.organizationId`.

**Agent tool-calling loop (`apps/backend/src/services/agent.ts`):**
- Pattern: build context → select model → call OpenAI with tool list → parse tool call → execute → return action
- Guardrails: `step.allowedActions` filters the `execute_page_action` type enum before tool list is sent to OpenAI
- MCP tools appended after built-in tools; resolved via `resolveMcpCall()` before execution

**Self-healing resolver (`apps/widget/src/resolver.ts`):**
- Pattern: try original CSS selector → on miss, try 7 increasingly fuzzy fallbacks using the stored element fingerprint
- Telemetry: each heal attempt logged to `SelectorHealLog` via `POST /api/v1/session/heal`

## Entry Points

**Backend HTTP:** `apps/backend/src/index.ts` — creates Express app, attaches WebSocket server, starts cron
**Backend WebSocket:** `ws://host:4000/ws` — dual-mode (widget chat + dashboard subscriptions)
**Widget public API:** `window.OnboardAI` — defined in `apps/widget/src/index.ts`
**Dashboard root:** `apps/dashboard/app/layout.tsx` → `(auth)/login` for unauthenticated, `(app)/dashboard` for authenticated
**Landing root:** `apps/landing/app/page.tsx`

## Error Handling

**Strategy:** Centralized in `apps/backend/src/middleware/errorHandler.ts`. `express-async-errors` auto-wraps async route handlers so thrown errors propagate to the global handler without `try/catch` in every route.

**Patterns:**
- Zod `parse()` in routes — throws `ZodError` caught by error handler → 400
- `prisma.findUniqueOrThrow()` — throws `PrismaClientKnownRequestError` → 404
- `authenticateJWT` / `authenticateApiKey` — returns 401 directly (not throw)
- Agent service: `withRetry()` helper for transient OpenAI/MCP failures
- Sarvam/MCP: all external calls use `AbortSignal.timeout()` and catch/return fallback on error

## Cross-Cutting Concerns

**Logging:** `apps/backend/src/lib/logger.ts` — structured console logger. Morgan for HTTP. Widget logs to console with `[oai]` prefix.

**Validation:** Zod schemas in every mutating route. `express-async-errors` propagates validation errors to global handler.

**Authentication:** Every route is either `authenticateJWT` (dashboard) or `authenticateApiKey` (widget). No unauthenticated data access except `/health` and Stripe webhook.

**Multi-tenancy isolation:** All Prisma queries include `organizationId` filter. Ownership checks on `conversation`, `session`, `mcpConnector` before any mutation.

**SSRF protection:** `assertPublicUrl()` in `apps/backend/src/lib/ipGuard.ts` — DNS-resolves and rejects private/loopback IPs before any outbound fetch to user-supplied URLs (MCP servers, webhooks).

**Rate limiting:** Message limit, MTU limit, agent count limit, MCP connector limit all enforced in `apps/backend/src/middleware/rateLimit.ts`. Plan definitions in `apps/backend/src/lib/plans.ts`.

---

*Architecture analysis: 2026-04-18*
