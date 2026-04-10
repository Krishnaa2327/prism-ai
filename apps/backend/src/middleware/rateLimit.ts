// Simple in-memory rate limiter per org, per month.
// Counts how many AI messages an org has used this calendar month.
// When Redis (Upstash) is configured, swap the Map for Redis INCR + EXPIREAT.

import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';

// In-memory fallback: { orgId_YYYY-MM → count }
const counts = new Map<string, number>();

function monthKey(orgId: string): string {
  const now = new Date();
  return `${orgId}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function enforceMessageLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const org = req.organization;
  if (!org) { next(); return; }

  const key = monthKey(org.id);
  const used = counts.get(key) ?? 0;

  if (used >= org.monthlyMessageLimit) {
    res.status(429).json({
      error: 'Monthly message limit reached',
      limit: org.monthlyMessageLimit,
      used,
      upgradeUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/settings/billing`,
    });
    return;
  }

  // Increment — do this after the response succeeds in the route,
  // but for simplicity we increment here (worst case: 1 free message on error)
  counts.set(key, used + 1);
  next();
}

// Called by analytics routes to get current usage for the dashboard
export async function getMonthlyUsage(orgId: string): Promise<number> {
  // Count from DB — accurate even after server restarts
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return prisma.message.count({
    where: {
      role: 'assistant',          // one per AI response
      conversation: { organizationId: orgId },
      createdAt: { gte: start },
    },
  });
}
