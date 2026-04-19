# Technology Stack

**Analysis Date:** 2026-04-18

## Languages

**Primary:**
- TypeScript 5.3 — all apps (backend, dashboard, landing, widget)

**Secondary:**
- CSS (Tailwind) — dashboard and landing styling

## Runtime

**Environment:**
- Node.js 20.x (inferred from `@types/node ^20`)

**Package Manager:**
- npm workspaces (monorepo)
- Lockfile: `package-lock.json` present at root

## Frameworks

**Backend:**
- Express 4.18 — REST API + WebSocket HTTP server (`apps/backend/src/index.ts`)
- `express-async-errors` — async error propagation
- `ws` 8.16 — WebSocket server attached to the HTTP server at `/ws`

**Dashboard (admin UI):**
- Next.js 14.1 — App Router, runs on port 3000 (`apps/dashboard`)
- React 18.2

**Landing page:**
- Next.js 14.1 — App Router, runs on port 3001 (`apps/landing`)
- React 18.2

**Widget (customer-embedded JS):**
- Vite 5.1 — bundles `apps/widget/src/index.ts` into a single distributable JS file
- `vite-plugin-css-injected-by-js` — CSS injected at runtime, no separate stylesheet

## Key Dependencies

**AI / LLM:**
- `openai ^4.47.0` — GPT-4o / GPT-4o-mini for the onboarding agent and intent classifier (`apps/backend/src/services/agent.ts`, `intent.ts`)
- `@anthropic-ai/sdk` — Claude Sonnet 4.6 for the conversational AI layer (`apps/backend/src/services/ai.ts`)
- Model routing: `gpt-4o-mini` for verification/init fast paths; `gpt-4o` default; Claude Sonnet 4.6 for the chat/streaming layer

**Database:**
- `@prisma/client ^5.10.0` — ORM; PostgreSQL (`apps/backend/prisma/schema.prisma`)
- `prisma ^5.10.0` — CLI for migrations and code generation

**Payments:**
- `stripe ^14.21.0` — checkout, webhooks, subscription management (`apps/backend/src/lib/stripe.ts`)

**Email:**
- `resend ^3.2.0` — transactional email (`apps/backend/src/lib/email.ts`)

**Caching / Rate-limiting:**
- `@upstash/redis ^1.28.0` — optional Redis layer for rate limiting; in-memory `Map` fallback when not configured

**Validation:**
- `zod ^3.22.4` — request schema validation in all backend routes

**Auth:**
- `jsonwebtoken ^9.0.2` — JWT issuance/verification for dashboard sessions (`apps/backend/src/lib/jwt.ts`)
- `bcryptjs ^2.4.3` — password hashing

**Dashboard state:**
- `zustand ^4.5.2` — client-side auth store (`apps/dashboard/store/auth.ts`)
- `react-hook-form ^7.50.1` + `@hookform/resolvers ^3.3.4`
- `recharts ^2.12.0` — analytics charts

**Dashboard testing:**
- `@playwright/test ^1.42.0` — E2E tests (`apps/dashboard/e2e/`)

**Backend testing:**
- `jest ^29.7.0` + `ts-jest ^29.1.2` + `supertest ^6.3.4`

**Build / Dev:**
- `ts-node-dev ^2.0.0` — backend hot reload in development
- `concurrently ^8.2.0` — runs all apps simultaneously from root
- `typescript ^5.3.3` — all apps
- `tailwindcss ^3.4.1` — dashboard + landing

## Configuration

**Environment (backend):**
- Required at startup: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY` (process exits if missing — `apps/backend/src/index.ts:34-39`)
- Optional: `CLAUDE_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/GROWTH/SCALE`, `SARVAM_API_KEY`, `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, `ADMIN_SECRET`, `FRONTEND_URL`, `PORT`
- In production, missing paid plan Stripe price IDs cause a hard exit (`apps/backend/src/lib/plans.ts:validatePricingConfig`)

**Environment (dashboard):**
- `NEXT_PUBLIC_API_URL` — backend URL (defaults to `http://localhost:4000`)

**Environment (landing):**
- `NEXT_PUBLIC_DASHBOARD_URL` — dashboard URL

**Build:**
- Backend: `tsc` → `dist/`, entry `dist/index.js`
- Widget: `vite build` → single bundle

## Platform Requirements

**Development:**
- Node 20.x, npm workspaces
- Run all: `npm run dev` from root (concurrent: backend:4000, dashboard:3000, landing:3001, widget:5173)

**Production:**
- Backend: Railway (Node, `npm run build && npm start`)
- Dashboard + Landing: Vercel (Next.js preset)
- Database: Supabase (PostgreSQL)
- Widget CDN: `https://cdn.useprism.ai/widget.js`

---

*Stack analysis: 2026-04-18*
