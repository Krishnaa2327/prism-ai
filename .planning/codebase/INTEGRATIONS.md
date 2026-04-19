# External Integrations

**Analysis Date:** 2026-04-18

## AI / LLM APIs

**OpenAI:**
- Used for: onboarding agent tool-calling loop (GPT-4o / GPT-4o-mini), intent classification, knowledge base embeddings (`text-embedding-3-small`)
- SDK: `openai ^4.47.0`
- Auth env var: `OPENAI_API_KEY`
- Files: `apps/backend/src/services/agent.ts`, `apps/backend/src/services/intent.ts`, `apps/backend/src/services/knowledge.ts`

**Anthropic (Claude):**
- Used for: conversational AI assistant — streaming chat on the widget's free-chat mode
- SDK: `@anthropic-ai/sdk`
- Model: `claude-sonnet-4-6`
- Auth env var: `CLAUDE_API_KEY`
- Files: `apps/backend/src/services/ai.ts`

**Sarvam AI (India multilingual layer):**
- Used for: translation between 10 Indian languages, STT (speech-to-text), TTS (text-to-speech) for India market
- Transport: Direct HTTP fetch to `https://api.sarvam.ai`
- Models: `mayura:v2` (translation), `saaras:v2` (STT), `bulbul:v2` (TTS)
- Auth env var: `SARVAM_API_KEY`
- File: `apps/backend/src/services/sarvam.ts`
- Graceful degradation: all calls return original text/throw only if key is set

## Data Storage

**Databases:**
- PostgreSQL (Supabase-hosted in production)
  - Connection env var: `DATABASE_URL`
  - ORM: Prisma 5.10 with Prisma Client
  - Schema: `apps/backend/prisma/schema.prisma` (15 models, 15 migration files)
  - Local dev: `prisma migrate dev`; production: `prisma migrate deploy`

**File Storage:**
- Not detected. Knowledge base articles stored as text/markdown in the `knowledge_base_articles` table with vector embeddings serialised as JSON. No S3/GCS bucket integration.

**Caching:**
- Upstash Redis (optional)
  - Used for: rate-limit counters (planned upgrade path; in-memory `Map` fallback currently used in `apps/backend/src/middleware/rateLimit.ts`)
  - SDK: `@upstash/redis ^1.28.0`
  - Auth env vars: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`
- MCP tool list: 5-minute in-memory `Map` cache per connector (`apps/backend/src/services/mcp.ts`)

## Authentication & Identity

**Custom JWT auth (dashboard users):**
- Endpoint: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
- Token storage: `localStorage` (`oai_token`)
- Middleware: `apps/backend/src/middleware/auth.ts` — `authenticateJWT()`
- JWT lib: `jsonwebtoken ^9.0.2`, secret: `JWT_SECRET` env var
- Password hashing: `bcryptjs`

**API Key auth (widget / end-user traffic):**
- Header: `X-API-Key`
- Middleware: `apps/backend/src/middleware/auth.ts` — `authenticateApiKey()`
- Keys stored as `Organization.apiKey` in DB (UUID-based, generated at registration)
- WebSocket auth: `{ type: 'auth', apiKey }` message handshake

## Payments

**Stripe:**
- Used for: subscription checkout, plan upgrades, billing portal, webhook-driven plan activation
- SDK: `stripe ^14.21.0`
- File: `apps/backend/src/lib/stripe.ts`, `apps/backend/src/routes/billing.ts`
- Auth env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Price ID env vars: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_SCALE`
- Webhook endpoint: `POST /api/v1/billing/webhook` (raw body, before `express.json()`)
- Plan definitions (including INR pricing): `apps/backend/src/lib/plans.ts`

## Email

**Resend:**
- Used for: welcome email with API key snippet, zero-completion flow alerts
- SDK: `resend ^3.2.0`
- Auth env var: `RESEND_API_KEY`
- Sender: `Prism <hello@useprism.ai>`
- File: `apps/backend/src/lib/email.ts`
- Graceful degradation: logs warning and skips when key is not set

## External Tool Connections (MCP)

**Model Context Protocol servers:**
- Used for: connecting the AI agent to arbitrary external APIs, databases, and internal services during onboarding
- Transport: JSON-RPC 2.0 over HTTP (stateless; no SSE session)
- Methods: `tools/list`, `tools/call`
- Auth modes: `none`, `bearer`, `api_key`
- SSRF protection: all MCP server URLs pass through `assertPublicUrl()` before any request (`apps/backend/src/lib/ipGuard.ts`)
- Tool list cache: 5 min in-memory per connector
- Files: `apps/backend/src/services/mcp.ts`, `apps/backend/src/routes/mcp.ts`

## Outbound Integrations (Customer-configured)

Stored in `IntegrationConfig` table per org. Supported types (configured via dashboard at `/settings/integrations`):

- **Segment** — event tracking (write key)
- **Mixpanel** — event tracking (token)
- **HubSpot** — CRM contact sync (API key)
- **Webhook** — generic outbound HTTP webhook (URL)

File: `apps/backend/src/routes/config.ts` area; model defined in `apps/backend/prisma/schema.prisma`

## Follow-up Channels (Customer-configured)

Stored in `FollowUpConfig` table per org:

- **Email** (via Resend) — abandoned session follow-ups
- **Slack** — incoming webhook URL
- **WhatsApp** — via Twilio (`twilioAccountSid`, `twilioAuthToken`, `twilioFromNumber`)

## Monitoring & Observability

**Error Tracking:** Not detected (no Sentry/Bugsnag/Datadog SDK).

**Logs:**
- Morgan HTTP request logger (`morgan ^1.10.0`) — `combined` format in production, `dev` in development
- Custom logger utility: `apps/backend/src/lib/logger.ts` — wraps `console` with structured output and a `withRetry` helper

**Alerting:**
- Internal flow completion alerts fired via Resend email when a flow hits 0% completion in 24h
- In-memory dedup (24h cooldown per flow) — single instance only
- Scheduler: `setTimeout` + `setInterval` started at server boot (`apps/backend/src/index.ts:114-120`)

## CI/CD & Deployment

**Hosting:**
- Backend: Railway (auto-deploy from `main` branch, `apps/backend` root)
- Dashboard: Vercel (`apps/dashboard`, Next.js preset, `app.useprism.ai`)
- Landing: Vercel (`apps/landing`, Next.js preset, `useprism.ai`)
- Widget: CDN distribution (`cdn.useprism.ai/widget.js`) — build artifact from `apps/widget`

**CI Pipeline:** Not detected (no `.github/workflows/` or CI config files found).

## Webhooks & Callbacks

**Incoming:**
- `POST /api/v1/billing/webhook` — Stripe subscription events (`checkout.session.completed`, `customer.subscription.updated/deleted`)
- `POST /api/v1/config/alerts` — external webhook URL stored per-org for broken selector alerts

**Outgoing:**
- Resend email (welcome, flow alerts)
- Slack webhook (follow-up notifications)
- Twilio WhatsApp (follow-up)
- Customer-configured webhooks via `IntegrationConfig`
- MCP tool calls to customer-hosted servers

---

*Integration audit: 2026-04-18*
