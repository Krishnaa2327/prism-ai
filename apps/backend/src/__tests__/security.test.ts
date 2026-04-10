// Security-focused tests: input sanitisation, auth edge cases, header checks

import request from 'supertest';
import { createApp } from './testApp';
import { prisma } from '../lib/prisma';
import { createTestOrg, createTestUser, cleanupOrg, setTestEnv } from './helpers';
import { signToken } from '../lib/jwt';

setTestEnv();

const app = createApp();

let orgId: string;
let apiKey: string;
let token: string;

beforeAll(async () => {
  const org = await createTestOrg('Security Test Org');
  orgId = org.id;
  apiKey = org.apiKey;
  const user = await createTestUser(orgId);
  token = user.token;
});

afterAll(async () => {
  await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe('Auth security', () => {
  it('rejects tampered JWT', async () => {
    const tampered = token.slice(0, -5) + 'XXXXX';
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  it('rejects JWT signed with wrong secret', async () => {
    // Manually sign with a different secret
    const jwt = await import('jsonwebtoken');
    const fakeToken = jwt.default.sign(
      { userId: 'fake', organizationId: orgId, role: 'owner' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects expired JWT', async () => {
    const jwt = await import('jsonwebtoken');
    const expiredToken = jwt.default.sign(
      { userId: 'u', organizationId: orgId, role: 'owner' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1s' }  // already expired
    );
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });
});

describe('Input validation', () => {
  it('rejects oversized message content (>2000 chars)', async () => {
    // Create a conversation first
    const convRes = await request(app)
      .post('/api/v1/conversations')
      .set('X-API-Key', apiKey)
      .send({ endUserId: 'sec_user', triggeredBy: 'manual' });

    const res = await request(app)
      .post('/api/v1/messages')
      .set('X-API-Key', apiKey)
      .send({ conversationId: convRes.body.conversationId, content: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
  });

  it('rejects non-UUID conversationId in messages', async () => {
    const res = await request(app)
      .post('/api/v1/messages')
      .set('X-API-Key', apiKey)
      .send({ conversationId: 'not-a-uuid', content: 'hello' });

    expect(res.status).toBe(400);
  });

  it('rejects SQL-injection-style strings gracefully (Prisma parameterises)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: "' OR 1=1; --", password: 'anything' });

    // Should return 401 (not found), not 500 (SQL error)
    expect(res.status).toBe(401);
  });
});

describe('Cross-org isolation', () => {
  it('cannot read another org\'s conversation by ID', async () => {
    // Create a second org
    const org2 = await createTestOrg('Other Org');
    const user2 = await createTestUser(org2.id);

    // Create conversation in org2
    const convRes = await request(app)
      .post('/api/v1/conversations')
      .set('X-API-Key', org2.apiKey)
      .send({ endUserId: 'other_user', triggeredBy: 'idle' });

    // Try to read it with org1's token
    const res = await request(app)
      .get(`/api/v1/conversations/${convRes.body.conversationId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404); // not 200, not 403 — we don't reveal it exists

    await cleanupOrg(org2.id);
  });
});

describe('Health endpoint', () => {
  it('returns 200 without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
