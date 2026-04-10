import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { generateApiKey } from '../lib/apiKey';
import { sendWelcomeEmail } from '../lib/email';

const router = Router();

// ─── Schema validation ──────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  orgName: z.string().min(1, 'Organization name is required'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/v1/auth/register ─────────────────────────────────────────────
// Creates a new Organization + owner User in one step
router.post('/register', async (req: Request, res: Response) => {
  const body = RegisterSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const apiKey = generateApiKey();

  // Create org + user in a transaction so both succeed or both fail
  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: body.orgName,
        apiKey,
      },
    });

    const user = await tx.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        role: 'owner',
        organizationId: organization.id,
      },
    });

    return { user, organization };
  });

  const token = signToken({
    userId: user.id,
    organizationId: organization.id,
    role: user.role,
  });

  // Fire-and-forget — don't block the response if email fails
  sendWelcomeEmail({
    to: body.email,
    name: body.name,
    orgName: body.orgName,
    apiKey,
  }).catch((err) => console.error('[email] welcome email failed:', err));

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    organization: { id: organization.id, name: organization.name, apiKey: organization.apiKey },
  });
});

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const body = LoginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: { organization: true },
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      apiKey: user.organization.apiKey,
      planType: user.organization.planType,
    },
  });
});

export default router;
