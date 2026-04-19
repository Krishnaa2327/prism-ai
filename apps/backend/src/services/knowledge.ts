// ─── Knowledge Base Service — hybrid BM25 + vector search with RRF ───────────

import OpenAI from 'openai';
import { prisma } from '../lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

// ─── Cosine similarity ────────────────────────────────────────────────────────
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

// ─── BM25 scorer ─────────────────────────────────────────────────────────────
// k1=1.2, b=0.75 — standard defaults
const BM25_K1 = 1.2;
const BM25_B  = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function bm25Score(
  queryTerms: string[],
  docTokens: string[],
  avgDocLen: number,
  idf: Map<string, number>,
): number {
  const docLen = docTokens.length;
  const tf = new Map<string, number>();
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);

  let score = 0;
  for (const term of queryTerms) {
    const f = tf.get(term) ?? 0;
    if (f === 0) continue;
    const termIdf = idf.get(term) ?? 0;
    const numerator = f * (BM25_K1 + 1);
    const denominator = f + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / avgDocLen));
    score += termIdf * (numerator / denominator);
  }
  return score;
}

function buildIdf(queryTerms: string[], corpus: string[][]): Map<string, number> {
  const N = corpus.length;
  const idf = new Map<string, number>();
  for (const term of queryTerms) {
    const docsWithTerm = corpus.filter((doc) => doc.includes(term)).length;
    // smoothed IDF
    idf.set(term, Math.log((N - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1));
  }
  return idf;
}

// ─── Reciprocal Rank Fusion ───────────────────────────────────────────────────
const RRF_K = 60;

function rrfCombine(
  vectorRanks: Map<string, number>,
  bm25Ranks: Map<string, number>,
): Map<string, number> {
  const scores = new Map<string, number>();
  const allIds = new Set([...vectorRanks.keys(), ...bm25Ranks.keys()]);
  for (const id of allIds) {
    const vRank = vectorRanks.get(id) ?? Infinity;
    const bRank = bm25Ranks.get(id) ?? Infinity;
    const score = 1 / (RRF_K + vRank) + 1 / (RRF_K + bRank);
    scores.set(id, score);
  }
  return scores;
}

// ─── Rank map from sorted array ───────────────────────────────────────────────
function toRankMap(sortedIds: string[]): Map<string, number> {
  const m = new Map<string, number>();
  sortedIds.forEach((id, i) => m.set(id, i + 1));
  return m;
}

export interface KBResult {
  title: string;
  content: string;
  score: number;
}

/**
 * Hybrid BM25 + vector search with Reciprocal Rank Fusion.
 * Falls back to pure vector if only one article exists.
 */
export async function searchKnowledgeBase(
  orgId: string,
  query: string,
  topK = 3,
  minVectorScore = 0.25,
): Promise<KBResult[]> {
  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: { organizationId: orgId },
    select: { id: true, title: true, content: true, embedding: true },
    take: 500,
  });

  if (articles.length === 0) return [];

  // ── Vector search ─────────────────────────────────────────────────────────
  const queryEmbedding = await embedText(query);

  const vectorScored = articles.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    vectorScore: cosineSimilarity(queryEmbedding, a.embedding as number[]),
  }));

  // Filter out articles with no semantic overlap
  const vectorFiltered = vectorScored.filter((a) => a.vectorScore >= minVectorScore);
  if (vectorFiltered.length === 0) return [];

  const vectorSorted = [...vectorFiltered].sort((a, b) => b.vectorScore - a.vectorScore);
  const vectorRanks = toRankMap(vectorSorted.map((a) => a.id));

  if (articles.length === 1) {
    return vectorSorted.slice(0, topK).map((a) => ({
      title: a.title,
      content: a.content,
      score: a.vectorScore,
    }));
  }

  // ── BM25 search ───────────────────────────────────────────────────────────
  const queryTerms = tokenize(query);
  const corpus = articles.map((a) => tokenize(`${a.title} ${a.content}`));
  const avgDocLen = corpus.reduce((s, d) => s + d.length, 0) / corpus.length;
  const idf = buildIdf(queryTerms, corpus);

  const bm25Scored = articles.map((a, i) => ({
    id: a.id,
    bm25Score: bm25Score(queryTerms, corpus[i], avgDocLen, idf),
  }));

  const bm25Sorted = [...bm25Scored]
    .filter((a) => a.bm25Score > 0)
    .sort((a, b) => b.bm25Score - a.bm25Score);
  const bm25Ranks = toRankMap(bm25Sorted.map((a) => a.id));

  // ── RRF combine ───────────────────────────────────────────────────────────
  const rrfScores = rrfCombine(vectorRanks, bm25Ranks);

  const articleMap = new Map(vectorScored.map((a) => [a.id, a]));
  return [...rrfScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => {
      const a = articleMap.get(id)!;
      return { title: a.title, content: a.content, score };
    });
}
