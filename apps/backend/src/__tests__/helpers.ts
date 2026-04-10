// Shared helpers: seed org+user, get token, clean up between tests

import { prisma } from '../lib/prisma';
import { generateApiKey } from '../lib/apiKey';
import { signToken } from '../lib/jwt';
import bcrypt from 'bcryptjs';

export interface TestOrg {
  id: string;
  apiKey: string;
}

export interface TestUser {
  id: string;
  token: string;
  organizationId: string;
}

export async function createTestOrg(name = 'Test Org'): Promise<TestOrg> {
  const apiKey = generateApiKey();
  const org = await prisma.organization.create({
    data: { name, apiKey, planType: 'starter', monthlyMessageLimit: 1000 },
  });
  return { id: org.id, apiKey: org.apiKey };
}

export async function createTestUser(orgId: string, role = 'owner'): Promise<TestUser> {
  const email = `test-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('password123', 4), // low rounds = fast in tests
      organizationId: orgId,
      role,
    },
  });
  const token = signToken({ userId: user.id, organizationId: orgId, role });
  return { id: user.id, token, organizationId: orgId };
}

export async function cleanupOrg(orgId: string) {
  // Cascade deletes handle children — just delete the org
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

// Sets env vars needed by auth middleware
export function setTestEnv() {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-chars-long!!';
  process.env.NODE_ENV = 'test';
}
