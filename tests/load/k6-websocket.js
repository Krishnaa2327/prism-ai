// WebSocket load test — tests concurrent widget connections
// Run: k6 run tests/load/k6-websocket.js

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const wsAuthTime   = new Trend('ws_auth_ms');
const wsErrorRate  = new Rate('ws_error_rate');

export const options = {
  stages: [
    { duration: '20s', target: 20  },  // ramp to 20 concurrent WS connections
    { duration: '40s', target: 20  },  // hold
    { duration: '20s', target: 0   },  // ramp down
  ],
  thresholds: {
    ws_auth_ms:    ['p(95)<1000'],   // auth should complete under 1s
    ws_error_rate: ['rate<0.05'],
  },
};

const API_KEY  = __ENV.API_KEY  || 'org_replace_with_real_key';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL   = BASE_URL.replace('http', 'ws') + '/ws';
const REST_HDR = { 'Content-Type': 'application/json', 'X-API-Key': API_KEY };

export default function () {
  const userId = `ws_user_${__VU}_${__ITER}`;

  // Create a conversation via REST first (widget always does this before WS)
  const convRes = http.post(
    `${BASE_URL}/api/v1/conversations`,
    JSON.stringify({ endUserId: userId, triggeredBy: 'idle' }),
    { headers: REST_HDR }
  );

  if (convRes.status !== 201) {
    wsErrorRate.add(1);
    return;
  }

  const { conversationId } = JSON.parse(convRes.body);

  // Open WebSocket and authenticate
  const authStart = Date.now();
  let authOk = false;

  const res = ws.connect(WS_URL, {}, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'auth', apiKey: API_KEY }));
    });

    socket.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }

      if (msg.type === 'auth_ok') {
        wsAuthTime.add(Date.now() - authStart);
        authOk = true;
        // Hold connection for a moment to simulate a real user session
        sleep(2);
        socket.close();
      }

      if (msg.type === 'error') {
        wsErrorRate.add(1);
        socket.close();
      }
    });

    socket.on('error', () => {
      wsErrorRate.add(1);
    });

    // Timeout — close if auth doesn't complete in 5s
    socket.setTimeout(() => { socket.close(); }, 5000);
  });

  check(res, { 'ws connected': (r) => r && r.status === 101 });
  wsErrorRate.add(!authOk ? 1 : 0);

  sleep(1);
}
