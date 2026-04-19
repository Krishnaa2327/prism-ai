import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { PLANS, PlanFeatures } from '../lib/plans';
import { AuthenticatedRequest } from '../types';

const UPGRADE_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/settings/billing`
  : 'https://prism-dashboard.onrender.com/settings/billing';

export function requireFeature(feature: keyof PlanFeatures) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const orgId = req.user?.organizationId;
    if (!orgId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { planType: true },
    });

    const plan = PLANS[org?.planType ?? 'free'] ?? PLANS.free;

    if (!plan.gates[feature]) {
      res.status(403).json({
        error: `This feature requires a higher plan`,
        feature,
        currentPlan: org?.planType ?? 'free',
        upgradeUrl: UPGRADE_URL,
        code: 'PLAN_FEATURE_LOCKED',
      });
      return;
    }

    next();
  };
}
