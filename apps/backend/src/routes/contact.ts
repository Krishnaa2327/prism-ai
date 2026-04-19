import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sendContactEmail } from '../lib/email';

const router = Router();

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  useCase: z.string().max(100).optional(),
  message: z.string().min(1).max(2000),
});

router.post('/', async (req: Request, res: Response) => {
  const body = schema.parse(req.body);
  await sendContactEmail(body);
  res.json({ ok: true });
});

export default router;
