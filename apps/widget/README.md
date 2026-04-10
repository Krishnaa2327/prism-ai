# OnboardAI — Embeddable Widget

The AI onboarding copilot. One script tag. Guides every new user to their first value moment.

## Status: Complete ✅

---

## What it does

1. Calls `/api/v1/session/start` to start or resume the user's onboarding session
2. Renders instantly from a local cache — no blank state while the API call is in-flight
3. Detects which step the user is on via intent detection from the page URL
4. Opens the copilot panel with the current step context + progress bar
5. Sends user messages to the AI agent (`/api/v1/session/act`) with a live DOM scan attached
6. Renders agent actions: question chips, page fills, element highlights, celebrations
7. Fires completion events to auto-advance steps (`/api/v1/session/event`)
8. Checks churn risk score — shows proactive nudge if `shouldIntervene: true`
9. Persists session state across page navigations (same-domain and cross-domain)

---

## Customer Integration

```html
<!-- Step 1: load the widget -->
<script src="https://cdn.onboardai.com/widget.js"></script>

<!-- Step 2: init with your API key + current user -->
<script>
  OnboardAI('init', {
    apiKey: 'org_YOUR_KEY',       // from dashboard → Settings → Widget
    userId: currentUser.id,        // your own user ID (string)
    metadata: { plan: 'trial' },   // optional — passed to AI as context
    primaryColor: '#6366f1',       // optional — hex accent color
    position: 'bottom-right',      // optional — 'bottom-right' | 'bottom-left'
  });
</script>

<!-- Step 3: fire events when users complete steps in your product -->
<script>
  // Call this wherever the step actually completes in your app
  OnboardAI('event', 'data_connected');     // advances session if step has this completionEvent
  OnboardAI('event', 'dashboard_created');
  OnboardAI('event', 'insight_viewed');
</script>
```

---

## Config Options

| Option | Default | Description |
|---|---|---|
| `apiKey` | — | **Required.** Your organization API key from the dashboard. |
| `userId` | auto | Your user's ID. Auto-generated if omitted. |
| `metadata` | `{}` | Extra context passed to the AI (plan, role, current page, etc.) |
| `idleThreshold` | `30000` | Ms of inactivity before the copilot opens (default 30s). |
| `primaryColor` | `#6366f1` | Widget accent color (hex). |
| `position` | `bottom-right` | `'bottom-right'` or `'bottom-left'`. |

---

## File Structure

```
src/
├── index.ts       ← Public API: OnboardAI('init'|'event', ...) + replay queue
├── widget.ts      ← OnboardAIWidget class — orchestrates all managers
├── copilot.ts     ← CopilotManager — session API, page action execution, localStorage cache
├── scanner.ts     ← Auto-DOM scanner: maps all interactive elements to CSS selectors
├── highlighter.ts ← 4 highlight modes: spotlight / beacon / arrow / multi
├── config.ts      ← WidgetConfig interface + defaults
├── detector.ts    ← Idle / exit-intent / rage-click / form-abandon / scroll-depth
├── ui.ts          ← DOM: bubble, chat window, progress bar, message rendering
├── styles.ts      ← All CSS injected as JS string (zero external dependencies)
├── api.ts         ← trackEvent() — behavior event logging
└── socket.ts      ← WebSocket client (legacy streaming)
```

---

## Agent Actions the Widget Handles

| Action type | What the widget does |
|---|---|
| `ask_clarification` | Renders question text + quick-reply chip buttons |
| `execute_page_action: fill_form` | Spotlights first field (ring only), fills all DOM inputs matching CSS selectors |
| `execute_page_action: click` | Full spotlight (backdrop + ring + tooltip) for 1.8s, then auto-clicks |
| `execute_page_action: navigate` | Saves session to `localStorage._oai_resume`, redirects to URL (cross-domain supported) |
| `execute_page_action: highlight` | Visual highlight — see Highlight Modes below |
| `complete_step` | Shows confirmation message, refreshes progress bar |
| `celebrate_milestone` | Renders gradient celebration card + pulses the bubble |
| `verify_integration` | Shows success/failure badge for the API key the user just entered |
| `escalate_to_human` | Shows message, locks input, shows amber support ticket pill |
| `call_api` | Handled entirely server-side — widget sees only the AI's follow-up action |

---

## Highlight Modes

The AI chooses a highlight mode based on the context. All modes auto-remove after a configurable duration.

| Mode | Triggered by | Visual |
|---|---|---|
| `spotlight` | Critical actions — user must click something | Dark backdrop with cutout + pulsing ring + colored tooltip |
| `beacon` | Passive hints — draw attention without blocking | Pulsing dot badge on element corner + dark tooltip |
| `arrow` | Explanatory callouts — describe what an element does | Auto-positioned speech bubble with directional arrow + ring |
| `multi` | Tour overview — point out a sequence | Numbered rings + step labels on multiple elements simultaneously |

The AI specifies `highlightMode`, `highlightLabel`, and (for `multi`) `highlightSelectors[]` + `highlightLabels[]` in its tool call.

---

## Multi-page Flow Behavior

When the AI calls `navigate`, the widget saves `{ sessionId, flowId, userId }` to `localStorage._oai_resume` before redirecting. On the next page:

- Widget detects the resume token on init → opens the copilot **immediately** (no `triggerDelay`)
- Session resumes at the correct step (fetched from backend by `userId`)
- If the current step has a `targetUrl` configured and the user is on a different page, the widget shows a "Take me there" chip instead of running the agent loop

Works across subdomains and different domains as long as the widget is embedded on both pages with the same `apiKey` and `userId`.

---

## Session Progress Caching

The widget caches the latest session in `localStorage` (`_oai_s_{apiKey8}_{userId}`) so it can render instantly on every page load without waiting for a network round-trip:

- On mount, cache is read **synchronously** and the progress bar/step title renders immediately
- The `/session/start` API call runs in the background; when it returns, the UI reconciles any changes
- If the network is unavailable, the widget falls back to cached state so it stays functional
- Cache expires after 7 days of inactivity
- Cache is evicted when the session is completed or the flow is removed

Returning users (who have a cached session) also skip `triggerDelay` — the widget opens instantly.

---

## Churn Intervention

On session start, the widget checks `/api/v1/churn/score?userId=...`. If `shouldIntervene: true` (score ≥ 50), the copilot opens automatically with a re-engagement message — even if the user hasn't been idle.

---

## Build for Production

```bash
npm run build
# → ../../dist/widget/widget.iife.js  (CDN-ready IIFE bundle, ~15KB)
```

## Dev Server

```bash
npx vite --config vite.dev.config.ts
# → http://localhost:5173/test.html
# Paste your API key from seed output into test.html
```

`test.html` is a full analytics SaaS demo page with 3 sections. Navigating between them fires the correct completion events and advances the session step-by-step.

---

## How Integration Events Flow

```
User completes step in your app
  → your code calls OnboardAI('event', 'data_connected')
  → widget calls POST /api/v1/session/event
  → backend advances the session
  → backend fires integrations (Segment, Mixpanel, HubSpot, Webhook) in parallel
  → widget re-fetches session state, updates progress bar + cache
```
