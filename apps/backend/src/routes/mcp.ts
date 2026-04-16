import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { checkMcpConnectorLimit } from '../middleware/rateLimit';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

const ConnectorSchema = z.object({
  name: z.string().min(1).max(100),
  serverUrl: z.string().url(),
  authType: z.enum(['none', 'bearer', 'api_key']).default('none'),
  authValue: z.string().optional(),
  enabled: z.boolean().default(true),
});

// ─── GET /api/v1/mcp — list connectors ───────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const connectors = await prisma.mcpConnector.findMany({
    where: { organizationId: req.user!.organizationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, serverUrl: true,
      authType: true, enabled: true, createdAt: true, updatedAt: true,
      // never return authValue in list responses
    },
  });
  res.json({ connectors });
});

// ─── POST /api/v1/mcp — create connector ─────────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const data = ConnectorSchema.parse(req.body);
  const orgId = req.user!.organizationId;

  const limitErr = await checkMcpConnectorLimit(orgId);
  if (limitErr) {
    res.status(403).json({ error: limitErr, code: 'MCP_LIMIT_REACHED' });
    return;
  }

  const connector = await prisma.mcpConnector.create({
    data: { organizationId: orgId, ...data },
    select: {
      id: true, name: true, serverUrl: true,
      authType: true, enabled: true, createdAt: true, updatedAt: true,
    },
  });
  res.status(201).json({ connector });
});

// ─── PUT /api/v1/mcp/:id — update connector ──────────────────────────────────
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const data = ConnectorSchema.partial().parse(req.body);
  const orgId = req.user!.organizationId;

  const result = await prisma.mcpConnector.updateMany({
    where: { id: req.params.id, organizationId: orgId },
    data,
  });

  if (result.count === 0) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  const connector = await prisma.mcpConnector.findFirst({
    where: { id: req.params.id, organizationId: orgId },
    select: {
      id: true, name: true, serverUrl: true,
      authType: true, enabled: true, createdAt: true, updatedAt: true,
    },
  });
  res.json({ connector });
});

// ─── DELETE /api/v1/mcp/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  await prisma.mcpConnector.deleteMany({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });
  res.json({ deleted: true });
});

export default router;
