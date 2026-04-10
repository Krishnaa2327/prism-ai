import request from 'supertest';
import { createApp } from './testApp';
import { prisma } from '../lib/prisma';
import { createTestOrg, createTestUser, cleanupOrg, setTestEnv } from './helpers';

setTestEnv();

const app = createApp();

let orgId: string;
let token: string;

beforeAll(async () => {
  const org = await createTestOrg('Billing Test Org');
  orgId = org.id;
  const user = await createTestUser(orgId);
  token = user.token;
});

afterAll(async () => {
  await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe('GET /api/v1/billing/status', () => {
  it('returns plan info, usage, and all plan options', async () => {
    const res = await request(app)
      .get('/api/v1/billing/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('starter');
    expect(typeof res.body.messagesUsedThisMonth).toBe('number');
    expect(typeof res.body.monthlyMessageLimit).toBe('number');
    expect(Array.isArray(res.body.plans)).toBe(true);
    expect(res.body.plans.length).toBe(4); // free, starter, growth, scale

    const currentPlan = res.body.plans.find((p: { current: boolean }) => p.current);
    expect(currentPlan).toBeTruthy();
    expect(currentPlan.key).toBe('starter');
  });

  it('rejects without JWT', async () => {
    const res = await request(app).get('/api/v1/billing/status');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/billing/portal', () => {
  it('returns 400 when no Stripe customer exists yet', async () => {
    const res = await request(app)
      .post('/api/v1/billing/portal')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No active subscription/);
  });
});

describe('POST /api/v1/billing/checkout', () => {
  it('rejects invalid priceId with 400', async () => {
    const res = await request(app)
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ priceId: 'price_fake_unknown' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid price/);
  });
});
