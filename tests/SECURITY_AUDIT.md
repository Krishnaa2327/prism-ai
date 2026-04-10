# OnboardAI — Security Audit Checklist

Run through this before each release. Mark ✅ when verified, ⚠ when needs attention, ❌ when broken.

---

## Authentication & Authorization

| Check | Status | Where |
|-------|--------|-------|
| API keys are `org_` + 64 hex chars (256-bit entropy) | ✅ | `lib/apiKey.ts` |
| Passwords hashed with bcrypt, cost factor 12 | ✅ | `routes/auth.ts` |
| JWT signed with HS256, expires in 7 days | ✅ | `lib/jwt.ts` |
| JWT secret must be 32+ chars (enforced by env check) | ⚠ | Add startup validation |
| Rotating an API key immediately invalidates the old one | ✅ | `routes/config.ts` — DB unique constraint |
| Dashboard endpoints require JWT (not just API key) | ✅ | All dashboard routes use `authenticateJWT` |
| Widget endpoints require API key (not JWT) | ✅ | All widget routes use `authenticateApiKey` |
| Cross-org isolation: org A cannot read org B's data | ✅ | All queries filter by `organizationId` from JWT |
| WebSocket auth uses API key message (not HTTP header) | ✅ | `lib/websocket.ts` |

---

## Input Validation

| Check | Status | Where |
|-------|--------|-------|
| All request bodies validated with Zod | ✅ | Every route file |
| Zod errors return 400, not 500 | ✅ | `middleware/errorHandler.ts` |
| Message content max 2000 chars | ✅ | `routes/messages.ts` |
| Custom AI instructions max 2000 chars | ✅ | `routes/config.ts` |
| JSON body size limit 10KB | ✅ | `express.json({ limit: '10kb' })` in `index.ts` |
| SQL injection impossible (Prisma parameterises all queries) | ✅ | Prisma ORM — no raw string interpolation |
| UUID validation on conversationId in messages | ✅ | `z.string().uuid()` |

---

## Stripe & Billing

| Check | Status | Where |
|-------|--------|-------|
| Webhook signature verified with `stripe.webhooks.constructEvent` | ✅ | `routes/billing.ts` |
| Webhook endpoint uses `express.raw()` (not parsed JSON) | ✅ | `index.ts` — mounted before `express.json()` |
| `priceId` validated against known plans before checkout | ✅ | `routes/billing.ts` — `PLANS` lookup |
| Stripe secret key not exposed to client | ✅ | Server-only env var |
| Customer portal only opens for orgs with a Stripe customer | ✅ | 400 guard in `/billing/portal` |

---

## HTTP Security Headers

| Header | Status | Set by |
|--------|--------|--------|
| `X-Content-Type-Options: nosniff` | ✅ | Helmet |
| `X-Frame-Options: SAMEORIGIN` | ✅ | Helmet |
| `X-XSS-Protection` | ✅ | Helmet |
| `Strict-Transport-Security` | ✅ (prod) | Helmet (auto on HTTPS) |
| `Content-Security-Policy` | ⚠ | Helmet default — tighten for dashboard |
| CORS origin restricted to `FRONTEND_URL` | ✅ | `index.ts` |

---

## Widget Security

| Check | Status | Notes |
|-------|--------|-------|
| Widget injects text content, not HTML (no XSS) | ✅ | `ui.ts` uses `.textContent =` not `.innerHTML` |
| API key exposed to browser (by design) | ⚠ | Widget API key is semi-public — key rotation mitigates |
| `trackEvent()` failures are silently swallowed | ✅ | Never crashes the host app |
| Widget CSS scoped under `#oai-root` | ✅ | `styles.ts` — no global style pollution |
| Anonymous user IDs stored in localStorage (not cookies) | ✅ | No CSRF risk |

---

## Rate Limiting

| Check | Status | Notes |
|-------|--------|-------|
| Monthly message limit enforced per org | ✅ | `middleware/rateLimit.ts` |
| 429 response includes `upgradeUrl` | ✅ | Points to billing page |
| Rate limit works on both REST and WebSocket paths | ✅ | Both call `enforceMessageLimit` / `getMonthlyUsage` |
| In-memory counter resets on server restart | ⚠ | Upgrade to Redis for production reliability |

---

## Data & Privacy

| Check | Status | Notes |
|-------|--------|-------|
| User passwords never returned in API responses | ✅ | `passwordHash` never in select |
| End user `metadata` is arbitrary JSON (customer's data) | ⚠ | Document that customer must not send PII unless needed |
| Conversation messages stored indefinitely | ⚠ | Add retention policy / TTL before launch |
| `DATABASE_URL` not in version control | ✅ | `.gitignore` covers `.env` |
| Stripe keys not in version control | ✅ | `.env.example` has placeholders only |

---

## Action Items Before Beta Launch

1. **Add startup validation** — check `JWT_SECRET.length >= 32`, crash early if not
2. **Switch rate limiter to Redis** — Upstash free tier, prevents reset on deploy
3. **Tighten CSP headers** — restrict `script-src` on the dashboard
4. **Add message retention policy** — soft-delete conversations older than 90 days
5. **Document PII guidance** — warn customers not to put sensitive data in `metadata`
6. **Enable Stripe webhook retries** — verify idempotency on `checkout.session.completed`

---

## How to run all tests

```bash
# Backend unit/integration tests
cd apps/backend
npm install
npm test                  # all test suites
npm run test:coverage     # with coverage report

# E2E tests (requires backend + dashboard running)
cd apps/dashboard
npm install
npx playwright install chromium
npm run test:e2e

# Load test (requires k6 + running backend)
# Install k6: https://k6.io/docs/get-started/installation/
API_KEY=org_your_key k6 run tests/load/k6.js
API_KEY=org_your_key k6 run tests/load/k6-websocket.js
```
