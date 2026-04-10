// ─── Knowledge Base routes (JWT-protected, dashboard only) ───────────────────
// Customers manage docs/FAQs the AI agent searches during onboarding.
//
// GET    /api/v1/kb          — list articles (no embedding)
// POST   /api/v1/kb          — create article (auto-embeds)
// PUT    /api/v1/kb/:id      — update article (re-embeds)
// DELETE /api/v1/kb/:id      — delete article

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth';
import { embedText } from '../services/knowledge';
import { AuthenticatedRequest } from '../types';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/v1/kb ───────────────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: { organizationId: req.user!.organizationId },
    select: { id: true, title: true, content: true, tags: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ articles });
});

// ─── POST /api/v1/kb ──────────────────────────────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { title, content, tags } = req.body as { title: string; content: string; tags?: string[] };

  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ error: 'title and content required' });
    return;
  }

  const embedding = await embedText(`${title}\n\n${content}`);

  const article = await prisma.knowledgeBaseArticle.create({
    data: {
      organizationId: req.user!.organizationId,
      title: title.trim(),
      content: content.trim(),
      tags: tags ?? [],
      embedding,
    },
    select: { id: true, title: true, content: true, tags: true, createdAt: true, updatedAt: true },
  });

  res.status(201).json({ article });
});

// ─── PUT /api/v1/kb/:id ───────────────────────────────────────────────────────
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { title, content, tags } = req.body as { title?: string; content?: string; tags?: string[] };

  const existing = await prisma.knowledgeBaseArticle.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  const newTitle = title?.trim() ?? existing.title;
  const newContent = content?.trim() ?? existing.content;

  // Re-embed only if content actually changed
  const contentChanged = newTitle !== existing.title || newContent !== existing.content;
  const embedding = contentChanged
    ? await embedText(`${newTitle}\n\n${newContent}`)
    : (existing.embedding as number[]);

  const article = await prisma.knowledgeBaseArticle.update({
    where: { id: req.params.id },
    data: {
      title: newTitle,
      content: newContent,
      tags: tags ?? existing.tags,
      embedding,
    },
    select: { id: true, title: true, content: true, tags: true, createdAt: true, updatedAt: true },
  });

  res.json({ article });
});

// ─── DELETE /api/v1/kb/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const existing = await prisma.knowledgeBaseArticle.findFirst({
    where: { id: req.params.id, organizationId: req.user!.organizationId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }

  await prisma.knowledgeBaseArticle.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

export default router;
