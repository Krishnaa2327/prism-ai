# Codebase Structure

**Analysis Date:** 2026-04-18

## Directory Layout

```
prism/                              # Monorepo root
├── apps/
│   ├── backend/                    # Express API + WebSocket server
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Full DB schema (15 models)
│   │   │   ├── migrations/         # 15 Prisma migration folders
│   │   │   └── seed.ts             # Demo org + flow seed data
│   │   ├── src/
│   │   │   ├── index.ts            # App entry — Express setup, route mounting, WS attach
│   │   │   ├── routes/             # One file per resource domain
│   │   │   ├── services/           # Business logic + AI
│   │   │   ├── middleware/         # Auth, rate limiting, error handling
│   │   │   ├── lib/                # Singletons and utilities
│   │   │   └── types/              # Express augmentation (AuthenticatedRequest)
│   │   └── package.json
│   ├── dashboard/                  # Next.js admin UI (port 3000)
│   │   ├── app/
│   │   │   ├── (app)/              # Authenticated route group
│   │   │   │   ├── dashboard/      # Overview metrics
│   │   │   │   ├── flows/          # Flow list + [id] editor
│   │   │   │   ├── activation/     # Activation funnel
│   │   │   │   ├── sessions/       # Session list + [id] detail
│   │   │   │   ├── conversations/  # Chat conversation list + [id]
│   │   │   │   ├── users/          # End-user list
│   │   │   │   ├── failures/       # Failure inbox
│   │   │   │   ├── escalations/    # Escalation ticket list + [id]
│   │   │   │   └── settings/       # ai | alerts | audit | autooptimize | billing | followup | integrations | knowledge | widget
│   │   │   ├── (auth)/             # Unauthenticated route group
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── layout.tsx          # Root layout
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Nav sidebar
│   │   │   ├── MetricCard.tsx      # Reusable metric card
│   │   │   ├── OnboardingChecklist.tsx
│   │   │   └── charts/             # Recharts wrappers
│   │   ├── lib/
│   │   │   └── api.ts              # Typed fetch wrapper + all API methods
│   │   ├── store/
│   │   │   └── auth.ts             # Zustand auth store (token, user, org)
│   │   └── e2e/                    # Playwright E2E tests
│   ├── landing/                    # Next.js marketing site (port 3001)
│   │   ├── app/
│   │   │   ├── page.tsx            # Home page
│   │   │   ├── docs/               # Documentation pages
│   │   │   └── legal/              # Privacy + terms
│   │   └── components/             # Hero, Navbar, Pricing, Testimonials, etc.
│   └── widget/                     # Embeddable JS bundle (Vite)
│       ├── src/
│       │   ├── index.ts            # window.OnboardAI public API entry
│       │   ├── widget.ts           # Side-panel orchestrator
│       │   ├── copilot.ts          # Session + flow state manager
│       │   ├── scanner.ts          # Live DOM element indexer
│       │   ├── resolver.ts         # Self-healing CSS selector resolver
│       │   ├── highlighter.ts      # Spotlight/beacon/arrow/multi overlays
│       │   ├── cursor.ts           # Animated field fill cursor
│       │   ├── formFiller.ts       # Form field value injector
│       │   ├── detector.ts         # Idle + exit-intent detection
│       │   ├── socket.ts           # WebSocket client
│       │   ├── recapture.ts        # Re-engagement after navigation
│       │   ├── ui.ts               # DOM creation helpers
│       │   ├── styles.ts           # Runtime CSS injection
│       │   ├── api.ts              # HTTP API calls
│       │   ├── config.ts           # Config types + defaults
│       │   └── checklist.ts        # Checklist step UI
│       ├── vite.config.ts          # Production bundle config
│       └── vite.dev.config.ts      # Dev server config (port 5173)
├── packages/
│   └── shared/                     # Placeholder — no shared code yet
├── .planning/
│   └── codebase/                   # Codebase analysis docs (this directory)
├── package.json                    # Workspace root
├── DEPLOY.md                       # Production deploy guide
├── ROADMAP.md                      # Feature roadmap
└── PRISM_INDIA_STRATEGY.md         # India GTM strategy
```

## Directory Purposes

**`apps/backend/src/routes/`:**
- Purpose: Express router files, one per resource domain
- Contains: request parsing, Zod validation, auth middleware attachment, response shaping
- Key files: `session.ts` (widget-facing agent endpoints), `flow.ts`, `billing.ts`, `mcp.ts`, `sessions.ts` (dashboard-facing), `kb.ts`, `escalations.ts`
- Does NOT contain business logic — delegates to `services/`

**`apps/backend/src/services/`:**
- Purpose: All business logic and external AI/API calls
- Key files:
  - `agent.ts` — OpenAI tool-calling agent loop
  - `ai.ts` — Claude streaming chat (conversational, not agentic)
  - `intent.ts` — step intent classifier
  - `knowledge.ts` — hybrid BM25 + vector search
  - `mcp.ts` — MCP JSON-RPC client
  - `sarvam.ts` — India multilingual layer

**`apps/backend/src/lib/`:**
- Purpose: Singletons, utilities, and adapters for external services
- Key files: `prisma.ts`, `jwt.ts`, `stripe.ts`, `email.ts`, `plans.ts`, `websocket.ts`, `ipGuard.ts`, `logger.ts`

**`apps/backend/src/middleware/`:**
- Purpose: Express middleware — auth, rate limiting, error handling
- Key files: `auth.ts`, `rateLimit.ts`, `errorHandler.ts`

**`apps/dashboard/app/(app)/`:**
- Purpose: All authenticated dashboard pages using Next.js App Router route groups
- Each subdirectory is a page: `flows/[id]/page.tsx` = flow editor

**`apps/dashboard/lib/api.ts`:**
- Purpose: Single typed API client used by all dashboard pages — all HTTP calls go through here
- Contains: `apiFetch()` wrapper, `api.*` namespace with typed methods for every backend resource

**`apps/dashboard/store/auth.ts`:**
- Purpose: Zustand store for JWT token, user, and org — persisted to `localStorage` with keys `oai_token`, `oai_user`, `oai_org`

**`apps/widget/src/`:**
- Purpose: Self-contained browser bundle — no React, no framework; plain TypeScript classes
- Each file is a focused module; `widget.ts` is the central coordinator

## Key File Locations

**Entry Points:**
- `apps/backend/src/index.ts` — backend server
- `apps/widget/src/index.ts` — widget public API
- `apps/dashboard/app/layout.tsx` — dashboard root
- `apps/landing/app/page.tsx` — landing root

**Configuration:**
- `apps/backend/prisma/schema.prisma` — database schema
- `apps/backend/src/lib/plans.ts` — plan limits and Stripe price IDs
- `apps/backend/.env` (not committed) — all backend secrets

**Core Logic:**
- `apps/backend/src/services/agent.ts` — AI agent tool-calling loop
- `apps/backend/src/services/ai.ts` — Claude streaming chat
- `apps/widget/src/copilot.ts` — widget session management
- `apps/widget/src/resolver.ts` — self-healing selector engine

**Database:**
- `apps/backend/prisma/schema.prisma` — canonical schema
- `apps/backend/prisma/migrations/` — migration history (15 migrations from 2026-04-09 to 2026-04-16)
- `apps/backend/prisma/seed.ts` — dev seed data

**Testing:**
- `apps/backend/src/__tests__/` — Jest unit/integration tests
- `apps/dashboard/e2e/` — Playwright E2E tests

## Naming Conventions

**Files:**
- Backend routes: `camelCase.ts` matching the resource name (`flow.ts`, `sessions.ts`, `mcp.ts`)
- Backend services: `camelCase.ts` matching the capability (`agent.ts`, `knowledge.ts`, `sarvam.ts`)
- Dashboard pages: Next.js convention — `page.tsx` in named route directory
- Dashboard components: `PascalCase.tsx` (`Sidebar.tsx`, `MetricCard.tsx`)
- Widget modules: `camelCase.ts` describing the DOM/browser concern (`resolver.ts`, `highlighter.ts`)

**Directories:**
- Route groups in Next.js: `(app)`, `(auth)` — parentheses = not a URL segment
- Dynamic segments: `[id]` — standard Next.js pattern

## Where to Add New Code

**New API endpoint:**
1. Create or extend a router file in `apps/backend/src/routes/[resource].ts`
2. Add business logic to a service in `apps/backend/src/services/[capability].ts`
3. Mount the router in `apps/backend/src/index.ts` under `/api/v1/[resource]`
4. Add typed API method to `apps/dashboard/lib/api.ts`

**New database model:**
1. Add model to `apps/backend/prisma/schema.prisma`
2. Run `cd apps/backend && npx prisma migrate dev --name <migration_name>`
3. Prisma Client auto-regenerated; use via `apps/backend/src/lib/prisma.ts`

**New dashboard page:**
1. Create directory `apps/dashboard/app/(app)/[feature]/`
2. Add `page.tsx` with `'use client'` directive if it uses hooks/state
3. Add nav link in `apps/dashboard/components/Sidebar.tsx`

**New widget capability:**
1. Create `apps/widget/src/[capability].ts`
2. Import and wire in `apps/widget/src/widget.ts` or `copilot.ts`
3. No external dependencies — widget bundle must stay self-contained

**New plan tier:**
- Edit `apps/backend/src/lib/plans.ts` — add to `PLANS` object with Stripe price ID env var
- Add env var to Railway deployment

**New backend service:**
1. Create `apps/backend/src/services/[name].ts`
2. Import in relevant route file
3. If it needs an external secret, add env var name to `REQUIRED_ENV` list in `apps/backend/src/index.ts` if mandatory, or document as optional

## Special Directories

**`apps/backend/dist/`:**
- Purpose: TypeScript compiled output
- Generated: Yes (`tsc`)
- Committed: No

**`apps/backend/node_modules/`:**
- Generated: Yes (npm)
- Committed: No

**`apps/landing/.next/`:**
- Generated: Yes (Next.js build cache)
- Committed: No

**`.planning/`:**
- Purpose: Phase plans, codebase analysis docs — consumed by GSD planning tools
- Generated: By GSD map/plan commands
- Committed: Yes

**`packages/shared/`:**
- Purpose: Intended shared types/utilities across apps
- Status: Empty/placeholder — no shared code implemented yet

---

*Structure analysis: 2026-04-18*
