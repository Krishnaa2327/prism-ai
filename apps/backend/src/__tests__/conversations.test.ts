import request from 'supertest';
import { createApp } from './testApp';
import { prisma } from '../lib/prisma';
import { createTestOrg, createTestUser, cleanupOrg, setTestEnv } from './helpers';

setTestEnv();

const app = createApp();

let orgId: string;
let apiKey: string;
let token: string;

beforeAll(async () => {
  const org = await createTestOrg('Conv Test Org');
  orgId = org.id;
  apiKey = org.apiKey;
  const user = await createTestUser(orgId);
  token = user.token;
});

afterAll(async () => {
  await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe('POST /api/v1/conversations', () => {
  it('creates conversation with X-API-Key', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('X-API-Key', apiKey)
      .send({ endUserId: 'user_1', metadata: { page: '/signup' }, triggeredBy: 'idle' });

    expect(res.status).toBe(201);
    expect(res.body.conversationId).toBeTruthy();
    expect(res.body.status).toBe('active');
  });

  it('rejects missing API key with 401', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .send({ endUserId: 'user_1' });

    expect(res.status).toBe(401);
  });

  it('rejects invalid API key with 401', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('X-API-Key', 'org_invalid_key')
      .send({ endUserId: 'user_1' });

    expect(res.status).toBe(401);
  });

  it('upserts the same end user on repeated calls', async () => {
    await request(app)
      .post('/api/v1/conversations')
      .set('X-API-Key', apiKey)
      .send({ endUserId: 'repeat_user', triggeredBy: 'idle' });

    const res = await request(app)
      .post('/api/v1/conversations')
      .set('X-API-Key', apiKey)
      .send({ endUserId: 'repeat_user', triggeredBy: 'manual' });

    expect(res.status).toBe(201); // no duplicate key error

    const endUsers = await prisma.endUser.count({
      where: { organizationId: orgId, externalId: 'repeat_user' },
    });
    expect(endUsers).toBe(1); // only one record
  });
});

describe('GET /api/v1/conversations', () => {
  it('returns conversation list with JWT', async () => {
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('rejects missing JWT with 401', async () => {
    const res = await request(app).get('/api/v1/conversations');
    expect(res.status).toBe(401);
  });

  it('paginates correctly', async () => {
    const res = await request(app)
      .get('/api/v1/conversations?limit=1&offset=0')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations.length).toBeLessThanOrEqual(1);
  });
});

describe('GET /api/v1/conversations/:id', () => {
  let convId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('X-API-Key', apiKey)
      .send({ endUserId: 'detail_user', triggeredBy: 'manual' });
    convId = res.body.conversationId;
  });

  it('returns conversation detail with messages', async () => {
    const res = await request(app)
      .get(`/api/v1/conversations/${convId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(convId);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('returns 404 for non-existent conversation', async () => {
    const res = await request(app)
      .get('/api/v1/conversations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
