import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { testIntegration, IntegrationType } from '../services/integrations';

const router = Router();
router.use(authenticateJWT);

const VALID_TYPES: IntegrationType[] = ['segment', 'mixpanel', 'hubspot', 'webhook'];

// ─── GET /api/v1/integrations ─────────────────────────────────────────────────
// List all integration configs for this org (credentials are masked)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.user!.organizationId;

  const configs = await prisma.integrationConfig.findMany({
    where: { organizationId: orgId },
    orderBy: { type: 'asc' },
  });

  // Mask credentials — never send secrets to the frontend
  const masked = configs.map((c) => {
    const creds = c.credentials as Record<string, string>;
    const maskedCreds: Record<string, string> = {};
    for (const [k, v] of Object.entries(creds)) {
      maskedCreds[k] = v ? maskSecret(v) : '';
    }
    return { ...c, credentials: maskedCreds };
  });

  res.json({ integrations: masked });
});

// ─── POST /api/v1/integrations ────────────────────────────────────────────────
// Create or update an integration config
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { type, enabled, credentials, settings } = req.body as {
    type: string;
    enabled?: boolean;
    credentials: Record<string, string>;
    settings?: Record<string, unknown>;
  };

  if (!VALID_TYPES.includes(type as IntegrationType)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    return;
  }

  if (!credentials || typeof credentials !== 'object') {
    res.status(400).json({ error: 'credentials object required' });
    return;
  }

  const orgId = req.user!.organizationId;

  // If any credential is the masked value "••••••••", keep the existing value
  const existing = await prisma.integrationConfig.findUnique({
    where: { organizationId_type: { organizationId: orgId, type } },
    select: { credentials: true },
  });
  const existingCreds = (existing?.credentials ?? {}) as Record<string, string>;

  const mergedCreds: Record<string, string> = {};
  for (const [k, v] of Object.entries(credentials)) {
    mergedCreds[k] = v.includes('•') ? (existingCreds[k] ?? '') : v;
  }

  const config = await prisma.integrationConfig.upsert({
    where: { organizationId_type: { organizationId: orgId, type } },
    create: {
      organizationId: orgId,
      type,
      enabled: enabled ?? true,
      credentials: mergedCreds,
      settings: settings ?? {},
    },
    update: {
      enabled: enabled ?? true,
      credentials: mergedCreds,
      settings: settings ?? {},
    },
  });

  res.json({ integration: { ...config, credentials: maskAllCreds(config.credentials as Record<string, string>) } });
});

// ─── PATCH /api/v1/integrations/:type/toggle ─────────────────────────────────
// Enable / disable without changing credentials
router.patch('/:type/toggle', async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;
  const { enabled } = req.body as { enabled: boolean };

  if (!VALID_TYPES.includes(type as IntegrationType)) {
    res.status(400).json({ error: 'Invalid type' });
    return;
  }

  const orgId = req.user!.organizationId;

  await prisma.integrationConfig.updateMany({
    where: { organizationId: orgId, type },
    data: { enabled },
  });

  res.json({ updated: true });
});

// ─── DELETE /api/v1/integrations/:type ───────────────────────────────────────
router.delete('/:type', async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;
  const orgId = req.user!.organizationId;

  await prisma.integrationConfig.deleteMany({
    where: { organizationId: orgId, type },
  });

  res.json({ deleted: true });
});

// ─── POST /api/v1/integrations/:type/test ────────────────────────────────────
// Test a connection — send a test event to verify credentials work
router.post('/:type/test', async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;
  const orgId = req.user!.organizationId;

  if (!VALID_TYPES.includes(type as IntegrationType)) {
    res.status(400).json({ error: 'Invalid type' });
    return;
  }

  // Load real credentials from DB (not masked)
  const existing = await prisma.integrationConfig.findUnique({
    where: { organizationId_type: { organizationId: orgId, type } },
    select: { credentials: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Integration not configured' });
    return;
  }

  const result = await testIntegration(type as IntegrationType, existing.credentials as Record<string, string>);
  res.json(result);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

function maskAllCreds(creds: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    masked[k] = v ? maskSecret(v) : '';
  }
  return masked;
}

export default router;
