# OnboardAI — Production Deploy Guide

Full end-to-end deployment. Total time: ~1 hour on first run.

---

## Services You Need

| Service | Purpose | Free tier |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL database | 500MB, 2 projects |
| [Railway](https://railway.app) | Backend hosting | $5/mo starter |
| [Vercel](https://vercel.com) | Dashboard + landing hosting | Free |
| [Anthropic](https://console.anthropic.com) | Claude API (AI agent) | Pay-as-you-go |
| [Resend](https://resend.com) | Transactional email | 3,000 emails/mo free |
| [Stripe](https://stripe.com) | Payments | Free until you charge |

Upstash Redis (rate limiting) is optional for early stage — the rate limiter degrades gracefully without it.

---

## Step 1 — Set up Supabase

1. Create a project at supabase.com
2. Go to **Settings → Database → Connection string → URI**
3. Copy the URI — this is your `DATABASE_URL`

---

## Step 2 — Run database migrations locally

```bash
cd apps/backend
cp .env.example .env

# Fill these in .env:
# DATABASE_URL=postgresql://...  ← from Supabase
# JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
# CLAUDE_API_KEY=sk-ant-...       ← from console.anthropic.com
```

```bash
# Run all migrations (creates all 15 tables)
DATABASE_URL="your-supabase-url" ../../node_modules/.bin/prisma migrate deploy

# Seed the demo analytics SaaS flow + a test org
DATABASE_URL="your-supabase-url" ../../node_modules/.bin/prisma db seed
# → prints: API Key: org_xxxxxxxxxxxx   ← save this for widget test
```

---

## Step 3 — Deploy backend to Railway

1. Push the monorepo to GitHub
2. Go to railway.app → **New Project → Deploy from GitHub**
3. Set root directory: `apps/backend`
4. Set start command: `npm run build && npm start`
5. Add environment variables under **Settings → Variables**:

```
DATABASE_URL              = (Supabase URI)
JWT_SECRET                = (32-char random hex)
CLAUDE_API_KEY            = (from console.anthropic.com)
RESEND_API_KEY            = re_...  (from resend.com — for welcome emails)
STRIPE_SECRET_KEY         = sk_live_...  (use sk_test_... during testing)
STRIPE_WEBHOOK_SECRET     = whsec_...  (see Step 5)
STRIPE_PRICE_STARTER      = price_...  (create in Stripe dashboard)
STRIPE_PRICE_GROWTH       = price_...
STRIPE_PRICE_SCALE        = price_...
ADMIN_SECRET              = (any random string — for /admin/* endpoints)
NODE_ENV                  = production
FRONTEND_URL              = https://app.onboardai.com
PORT                      = 4000

# Optional — for rate limiting:
UPSTASH_REDIS_URL         = https://...
UPSTASH_REDIS_TOKEN       = ...
```

6. Railway auto-deploys on every push to main
7. Note your Railway URL: `https://xxxx.railway.app`

---

## Step 4 — Deploy dashboard to Vercel

1. vercel.com → **New Project → Import** `apps/dashboard`
2. Set root directory: `apps/dashboard`
3. Framework preset: **Next.js**
4. Add environment variable:

```
NEXT_PUBLIC_API_URL = https://xxxx.railway.app
```

5. Deploy → add custom domain `app.onboardai.com`

---

## Step 5 — Deploy landing page to Vercel

1. vercel.com → **New Project → Import** `apps/landing`
2. Set root directory: `apps/landing`
3. Add environment variable:

```
NEXT_PUBLIC_DASHBOARD_URL = https://app.onboardai.com
```

4. Deploy → add custom domain `onboardai.com`

---

## Step 6 — Set up Stripe webhooks

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login

stripe webhooks create \
  --url https://xxxx.railway.app/api/v1/billing/webhook \
  --events \
    customer.subscription.created,\
    customer.subscription.updated,\
    customer.subscription.deleted,\
    invoice.payment_succeeded,\
    invoice.payment_failed
```

Copy the `whsec_...` signing secret → add as `STRIPE_WEBHOOK_SECRET` in Railway → redeploy.

---

## Step 7 — Host widget JS on CDN

The embed snippet loads from `https://cdn.onboardai.com/widget.js`.

**Option A — Vercel (easiest):**
```bash
cd apps/widget && npm run build
# → dist/widget/widget.iife.js
```
Create a Vercel project pointing at `dist/widget/`, add custom domain `cdn.onboardai.com`.

**Option B — Cloudflare R2:**
1. Build: `cd apps/widget && npm run build`
2. Upload `dist/widget/widget.iife.js` to R2 bucket as `widget.js`
3. Enable public access + point `cdn.onboardai.com` CNAME to R2 URL

---

## Step 8 — Verify everything works

```bash
# 1. Health check
curl https://xxxx.railway.app/health
# Expected: {"status":"ok","ts":"..."}

# 2. Register a test account
curl -X POST https://xxxx.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123","orgName":"Test Co"}'
# Expected: {"token":"...","user":{...},"organization":{"apiKey":"org_..."}}

# 3. Check admin panel
curl -H "X-Admin-Secret: YOUR_ADMIN_SECRET" \
  https://xxxx.railway.app/api/v1/admin/orgs
# Expected: list of all orgs

# 4. Verify seeded flow
curl -H "X-API-Key: org_FROM_SEED" \
  "https://xxxx.railway.app/api/v1/session/start" \
  -X POST -H "Content-Type: application/json" \
  -d '{"userId":"demo_user_1"}'
# Expected: session object with flow + steps
```

---

## Step 9 — Full end-to-end test

1. Log in to `app.onboardai.com` with the seeded account
2. Go to **Flows** — you should see "Analytics SaaS Onboarding" pre-seeded
3. Go to **Settings → Widget** — copy your API key
4. Open `apps/widget/test.html` locally, paste your API key
5. Run the widget dev server: `cd apps/widget && npx vite --config vite.dev.config.ts`
6. Open `http://localhost:5173/test.html`
7. The copilot should open → guide you through 3 steps → celebrate milestone
8. Go back to dashboard → **Activation** → session should appear in funnel

---

## Step 10 — Integrations setup (optional)

Connect your analytics tools in **Dashboard → Settings → Integrations**:

- **Segment** — paste your Source write key → "Test connection" should return ✓
- **Mixpanel** — paste your project token → test
- **HubSpot** — paste your Private App token (needs `crm.objects.contacts.write` scope) → test
- **Webhook** — paste any URL (use webhook.site for testing) → test

Once connected, every step completion fires automatically to all enabled tools.

---

## Step 11 — Auto-optimize cron

The weekly auto-optimize cron runs every **Sunday at 2:00 AM UTC** automatically (implemented in `index.ts` with `node-cron`). No setup needed.

To enable it for your org:
1. Dashboard → **Settings → Auto-Optimize**
2. Toggle on, set threshold (default 50%), set minSessions (default 10)
3. Or trigger manually: **Run optimization scan**

---

## Step 12 — Launch checklist

```
Infrastructure
[ ] Backend deployed — /health returns 200
[ ] Database migrated — all 15 tables exist
[ ] Demo flow seeded — API key printed
[ ] Dashboard live at app.onboardai.com
[ ] Landing page live at onboardai.com
[ ] Widget JS on CDN at cdn.onboardai.com/widget.js
[ ] Stripe webhook delivering events

End-to-end test
[ ] Register account → welcome email arrives
[ ] Create flow from template → step editor loads
[ ] Embed widget → copilot opens → completes 3 steps
[ ] Activation funnel shows session data
[ ] Benchmarks page shows activation score
[ ] Integration → connect Segment → test fires successfully

Go-to-market
[ ] Record 3-min Loom: flow setup → embed → widget guiding user → funnel
[ ] Write cold DM: "Built this in 4 weeks — increases onboarding completion by 30%"
[ ] DM 10 no-code/analytics SaaS founders on Twitter + LinkedIn
[ ] Post on IndieHackers: "Show IH: AI that guides users to first value"
[ ] Post on Product Hunt (when you have 5+ real users)
```

---

## Monitoring customers

```bash
# All orgs (admin only)
curl -H "X-Admin-Secret: $ADMIN_SECRET" https://api.onboardai.com/api/v1/admin/orgs

# At-risk users across all sessions (pick an org's JWT)
curl -H "Authorization: Bearer $JWT" \
  https://api.onboardai.com/api/v1/churn/summary

# Auto-optimize log
curl -H "Authorization: Bearer $JWT" \
  https://api.onboardai.com/api/v1/autooptimize/log
```
