import request from 'supertest';
import { createApp } from './testApp';
import { prisma } from '../lib/prisma';
import { createTestOrg, createTestUser, cleanupOrg, setTestEnv } from './helpers';

setTestEnv();

const app = createApp();

let orgId: string;
let token: string;

beforeAll(async () => {
  const org = await createTestOrg('Analytics Test Org');
  orgId = org.id;
  const user = await createTestUser(orgId);
  token = user.token;
});

afterAll(async () => {
  await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe('GET /api/v1/analytics/overview', () => {
  it('returns overview stats', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.totalConversations).toBe('number');
    expect(typeof res.body.activeUsers).toBe('number');
    expect(typeof res.body.avgMessagesPerConv).toBe('number');
    expect(typeof res.body.conversionRate).toBe('number');
  });

  it('rejects without JWT', async () => {
    const res = await request(app).get('/api/v1/analytics/overview');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/analytics/timeline', () => {
  it('returns 30 data points by default', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/timeline')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(30);
    expect(res.body[0]).toHaveProperty('date');
    expect(res.body[0]).toHaveProperty('conversations');
  });

  it('respects ?days param', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/timeline?days=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(7);
  });
});

describe('GET /api/v1/analytics/triggers', () => {
  it('returns trigger breakdown array', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/triggers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
