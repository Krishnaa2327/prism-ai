// ─── Knowledge Base Service ──────────────────────────────────────────────────
// Embeds text using OpenAI text-embedding-3-small, stores float[] in Postgres
// as JSON, and performs cosine similarity search in application code.

import OpenAI from 'openai';
import { prisma } from '../lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // stay well within token limit
  });
  return res.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export interface KBResult {
  title: string;
  content: string;
  score: number;
}

/**
 * Search the org's knowledge base for the most relevant articles.
 * Returns empty array if no articles exist (skips embeddings API call).
 */
export async function searchKnowledgeBase(
  orgId: string,
  query: string,
  topK = 3,
  minScore = 0.3,
): Promise<KBResult[]> {
  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: { organizationId: orgId },
    select: { title: true, content: true, embedding: true },
  });

  if (articles.length === 0) return [];

  const queryEmbedding = await embedText(query);

  return articles
    .map((a) => ({
      title: a.title,
      content: a.content,
      score: cosineSimilarity(queryEmbedding, a.embedding as number[]),
    }))
    .filter((a) => a.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
