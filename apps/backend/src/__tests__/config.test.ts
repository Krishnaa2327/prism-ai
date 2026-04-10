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
  const org = await createTestOrg('Config Test Org');
  orgId = org.id;
  apiKey = org.apiKey;
  const user = await createTestUser(orgId);
  token = user.token;
});

afterAll(async () => {
  await cleanupOrg(orgId);
  await prisma.$disconnect();
});

describe('GET /api/v1/config', () => {
  it('returns org config with apiKey', async () => {
    const res = await request(app)
      .get('/api/v1/config')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.apiKey).toBe(apiKey);
    expect(res.body.name).toBe('Config Test Org');
  });
});

describe('PUT /api/v1/config/ai', () => {
  it('updates custom instructions', async () => {
    const res = await request(app)
      .put('/api/v1/config/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({ customInstructions: 'Always be friendly.' });

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(true);
    expect(res.body.customInstructions).toBe('Always be friendly.');
  });

  it('clears instructions when omitted', async () => {
    const res = await request(app)
      .put('/api/v1/config/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.customInstructions).toBeNull();
  });

  it('rejects instructions over 2000 chars with 400', async () => {
    const res = await request(app)
      .put('/api/v1/config/ai')
      .set('Authorization', `Bearer ${token}`)
      .send({ customInstructions: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/config/rotate-key', () => {
  it('returns a new API key', async () => {
    const res = await request(app)
      .post('/api/v1/config/rotate-key')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.apiKey).toMatch(/^org_/);
    expect(res.body.apiKey).not.toBe(apiKey); // must be different from original
  });
});
