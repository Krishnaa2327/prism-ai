import { Request } from 'express';
import { Organization, User } from '@prisma/client';

// Extend Express Request so TypeScript knows about our custom fields
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    role: string;
  };
  organization?: Organization;
}
