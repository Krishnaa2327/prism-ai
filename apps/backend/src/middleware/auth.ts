import { Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';

// Used by the JS widget — validates X-API-Key header
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  const org = await prisma.organization.findUnique({ where: { apiKey } });

  if (!org) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  req.organization = org;
  next();
}

// Used by the admin dashboard — validates Authorization: Bearer <JWT>
export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
