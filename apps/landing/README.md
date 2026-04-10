# OnboardAI — Landing Page + Docs Site

Marketing landing page and /docs for OnboardAI — the onboarding intelligence platform for SaaS.

Runs on port **3001** (dashboard is 3000, backend is 4000).

---

## Pages

| Route | Description |
|---|---|
| `/` | Single-scroll marketing landing page |
| `/docs` | API reference + quick-start guide |
| `/legal/privacy` | Privacy policy |
| `/legal/terms` | Terms of service |

---

## Landing Page Sections (in order)

1. **Navbar** — Fixed top bar with links (How it works / Pricing / Docs), Sign in + Start free CTAs, mobile hamburger menu

2. **Hero** — Primary headline: *"Get every user to their first value moment"* · Sub-headline about AI copilot · Two CTAs (Start free / See it in action) · Embed code snippet · 3 key stats (23% activation lift, <15KB bundle, <1s P95)

3. **LogoBar** — "Trusted by" placeholder logos — replace with real customer logos after beta

4. **HowItWorks** — 4 steps with gradient borders:
   - Configure your onboarding flow (pick a template or build from scratch)
   - Embed one script tag
   - AI guides every user to first value
   - Track, benchmark, and auto-improve

5. **UseCases** — 6 SaaS verticals, each showing a 3-step flow example:
   - Analytics SaaS · No-code / Automation · CRM · Dev Tools / API · Project Management · E-commerce

6. **Testimonials** — 3 placeholder quotes — replace with real customer quotes after first 5 paying customers

7. **Pricing** — 4 plan cards (Free / Starter $99 / Growth $299 / Scale $999) matching backend plan definitions, "Most popular" badge on Growth

8. **Footer** — Product / Company / Legal columns with real links to `/docs`, `/legal/privacy`, `/legal/terms`

---

## Docs Site (`/docs`)

Sidebar-nav single page:

- **Quick start** — 3-step embed guide with code
- **Widget API** — full init options table + completion events + session caching + churn intervention
- **Onboarding flows** — step fields, intent tags, `targetUrl`, session lifecycle
- **AI agent actions** — all 7 tools table, highlight modes, prompt writing tips
- **Integrations** — Segment / Mixpanel / HubSpot / Webhook with exact payloads
- **Churn score API** — endpoint, response fields, scoring factors
- **REST API** — auth patterns, 20-endpoint reference table

---

## File Structure

```
app/
├── layout.tsx          ← Root layout, OG metadata
├── page.tsx            ← Imports and composes all landing sections
├── docs/
│   └── page.tsx        ← /docs — sidebar-nav documentation
└── legal/
    ├── privacy/
    │   └── page.tsx    ← /legal/privacy — 10-section privacy policy
    └── terms/
        └── page.tsx    ← /legal/terms — 16-section terms of service

components/
├── Navbar.tsx          ← Fixed top nav with mobile menu
├── Hero.tsx            ← Above-fold hero section
├── LogoBar.tsx         ← Customer logo strip
├── HowItWorks.tsx      ← 4-step explainer
├── UseCases.tsx        ← 6 vertical use cases with step flows
├── Pricing.tsx         ← Plan card grid
├── Testimonials.tsx    ← Quote cards
├── DocsCTA.tsx         ← Doc shortcuts + final CTA block
└── Footer.tsx          ← Site footer with legal links
```

---

## Running Locally

```bash
npm run dev   # → http://localhost:3001
```

`.env.local`:
```
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000
```

In production set this to your deployed dashboard URL (e.g. `https://app.onboardai.com`).

---

## Deployment

```bash
vercel --prod
```

Set `NEXT_PUBLIC_DASHBOARD_URL` to the production dashboard URL in Vercel environment settings.

---

## TODO Before Launch

- Replace placeholder logo names in `LogoBar.tsx` with real SVG customer logos
- Replace placeholder testimonials in `Testimonials.tsx` with real customer quotes
- Add real OG image for social sharing (`public/og.png` — 1200×630px)
- Wire `/docs` navigation to anchor IDs with smooth scroll
