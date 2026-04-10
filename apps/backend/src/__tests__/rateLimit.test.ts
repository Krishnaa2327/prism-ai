// Tests the enforceMessageLimit middleware in isolation —
// no Claude API calls needed, we mock the AI service.

import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { authenticateApiKey } from '../middleware/auth';
import { enforceMessageLimit } from '../middleware/rateLimit';
import { createTestOrg, cleanupOrg, setTestEnv } from './helpers';
import { prisma } from '../lib/prisma';
import { errorHandler } from '../middleware/errorHandler';

setTestEnv();

// Minimal test app — just auth + rate limit + a dummy handler
function makeApp(limitedHandler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post('/test', authenticateApiKey, enforceMessageLimit, limitedHandler);
  app.use(errorHandler);
  return app;
}

let orgId: string;
let apiKey: string;

beforeAll(async () => {
  const org = await createTestOrg('RateLimit Org');
  orgId = org.id;
  apiKey = org.apiKey;
  // Set a very low limit so we can hit it in tests
  await prisma.organization.update({
    where: { id: orgId },
    data: { monthlyMessageLimit: 2 },
  });
});

afterAll(async () => {
  await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe('enforceMessageLimit middleware', () => {
  it('allows requests within the limit', async () => {
    const app = makeApp((_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .post('/test')
      .set('X-API-Key', apiKey)
      .send({});

    expect(res.status).toBe(200);
  });

  it('blocks requests that exceed the monthly limit', async () => {
    // The limit is 2; after the test above used 1, use it once more then check blocked
    const app = makeApp((_req, res) => res.json({ ok: true }));

    // Second request (hits limit=2)
    await request(app).post('/test').set('X-API-Key', apiKey).send({});

    // Third request (over limit)
    const res = await request(app).post('/test').set('X-API-Key', apiKey).send({});

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/limit/i);
    expect(res.body.upgradeUrl).toBeTruthy();
  });
});
