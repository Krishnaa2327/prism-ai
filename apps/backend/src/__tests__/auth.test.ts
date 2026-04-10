import request from 'supertest';
import { createApp } from './testApp';
import { prisma } from '../lib/prisma';
import { setTestEnv } from './helpers';

setTestEnv();

const app = createApp();
const TEST_EMAIL = `auth-test-${Date.now()}@example.com`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

describe('POST /api/v1/auth/register', () => {
  it('creates org + user and returns token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Alice', email: TEST_EMAIL, password: 'password123', orgName: 'My SaaS' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(TEST_EMAIL);
    expect(res.body.organization.apiKey).toMatch(/^org_/);
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Alice', email: TEST_EMAIL, password: 'password123', orgName: 'Dup' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects short password with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'short', orgName: 'Bob Co' });

    expect(res.status).toBe(400);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.organization.apiKey).toMatch(/^org_/);
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});
