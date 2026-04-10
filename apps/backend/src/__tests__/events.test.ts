import request from 'supertest';
import { createApp } from './testApp';
import { prisma } from '../lib/prisma';
import { createTestOrg, cleanupOrg, setTestEnv } from './helpers';

setTestEnv();

const app = createApp();

let orgId: string;
let apiKey: string;

beforeAll(async () => {
  const org = await createTestOrg('Events Test Org');
  orgId = org.id;
  apiKey = org.apiKey;
});

afterAll(async () => {
  await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe('POST /api/v1/events', () => {
  it('records a page_view event', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('X-API-Key', apiKey)
      .send({
        endUserId: 'evt_user',
        eventType: 'page_view',
        properties: { path: '/dashboard' },
      });

    expect(res.status).toBe(201);
    expect(res.body.eventId).toBeTruthy();
  });

  it('records an idle event', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('X-API-Key', apiKey)
      .send({ endUserId: 'evt_user', eventType: 'idle', properties: {} });

    expect(res.status).toBe(201);
  });

  it('rejects invalid eventType with 400', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('X-API-Key', apiKey)
      .send({ endUserId: 'evt_user', eventType: 'invalid_type' });

    expect(res.status).toBe(400);
  });

  it('rejects missing API key with 401', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .send({ endUserId: 'evt_user', eventType: 'page_view' });

    expect(res.status).toBe(401);
  });
});
