// k6 load test — runs against the local backend
// Install: https://k6.io/docs/get-started/installation/
// Run:     k6 run tests/load/k6.js
//
// What it tests:
//   Stage 1: Ramp to 10 VUs over 30s  → warm up
//   Stage 2: Hold 20 VUs for 1 minute → sustained load
//   Stage 3: Ramp to 50 VUs for 30s   → stress
//   Stage 4: Ramp down over 30s        → cool down

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom metrics ──────────────────────────────────────────────────────────
const errorRate    = new Rate('error_rate');
const convCreate   = new Trend('conversation_create_ms');
const eventTrack   = new Trend('event_track_ms');

// ─── Test config ─────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10  },   // ramp up
    { duration: '60s', target: 20  },   // sustained
    { duration: '30s', target: 50  },   // stress
    { duration: '30s', target: 0   },   // ramp down
  ],
  thresholds: {
    http_req_duration:        ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed:          ['rate<0.01'],   // <1% request errors
    error_rate:               ['rate<0.05'],   // <5% business logic errors
    conversation_create_ms:   ['p(95)<300'],
    event_track_ms:           ['p(95)<200'],
  },
};

// ─── Shared test data ─────────────────────────────────────────────────────────
// Replace with a real API key from: npx prisma db seed
const API_KEY   = __ENV.API_KEY   || 'org_replace_with_real_key';
const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:4000';

const HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// ─── Scenarios ────────────────────────────────────────────────────────────────

export default function () {
  const userId = `load_user_${__VU}_${__ITER}`;

  // 1. Track a page view event (most frequent in production)
  {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/events`,
      JSON.stringify({ endUserId: userId, eventType: 'page_view', properties: { path: '/signup' } }),
      { headers: HEADERS }
    );
    eventTrack.add(Date.now() - start);
    const ok = check(res, { 'event 201': (r) => r.status === 201 });
    errorRate.add(!ok);
  }

  sleep(0.5);

  // 2. Start a conversation (triggered by idle)
  let conversationId = null;
  {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/conversations`,
      JSON.stringify({ endUserId: userId, triggeredBy: 'idle', metadata: { plan: 'trial' } }),
      { headers: HEADERS }
    );
    convCreate.add(Date.now() - start);
    const ok = check(res, { 'conv 201': (r) => r.status === 201 });
    errorRate.add(!ok);

    if (ok) {
      try { conversationId = JSON.parse(res.body).conversationId; } catch (_) {}
    }
  }

  sleep(1);

  // 3. Health check (should always be fast)
  {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'tests/load/results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

// Inline text summary (avoids external import requirement)
function textSummary(data, _opts) {
  const metrics = data.metrics;
  return [
    '',
    '─── Load Test Summary ─────────────────────────────────',
    `  Requests total:     ${metrics.http_reqs?.values?.count ?? 'N/A'}`,
    `  Error rate:         ${((metrics.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    `  p95 response time:  ${Math.round(metrics.http_req_duration?.values?.['p(95)'] ?? 0)}ms`,
    `  p95 conv create:    ${Math.round(metrics.conversation_create_ms?.values?.['p(95)'] ?? 0)}ms`,
    `  p95 event track:    ${Math.round(metrics.event_track_ms?.values?.['p(95)'] ?? 0)}ms`,
    '────────────────────────────────────────────────────────',
  ].join('\n');
}
