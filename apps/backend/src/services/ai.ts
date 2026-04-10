import Anthropic from '@anthropic-ai/sdk';
import { WebSocket } from 'ws';
import { prisma } from '../lib/prisma';
import { Organization, EndUser } from '@prisma/client';

const claude = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ─── Build the system prompt for each organization ───────────────────────────
function buildSystemPrompt(org: Organization, endUser: EndUser): string {
  const metadata = endUser.metadata as Record<string, unknown>;

  return `You are an AI onboarding assistant embedded inside "${org.name}".

Your job is to help users who are stuck or about to drop off during their onboarding flow.
Act like a knowledgeable product guide — friendly, direct, and action-oriented.

User context:
- User ID: ${endUser.externalId ?? 'Anonymous'}
- First seen: ${endUser.firstSeenAt.toISOString()}
- Current page: ${(metadata.page as string) ?? 'unknown'}
- Trigger: ${(metadata.triggeredBy as string) ?? 'manual'}
- Metadata: ${JSON.stringify(metadata)}

Rules:
1. Be concise — under 80 words for plain replies
2. Guide users to complete the step they're on — don't jump ahead
3. If you don't know a product-specific answer, say "Let me connect you with support"
4. Never mention competitors or make pricing promises
5. Always end with a clear next action

STEP-BY-STEP FORMAT:
When a user asks "how do I…" or needs a multi-step guide, respond with ONLY this JSON (no other text):
{"type":"steps","title":"<short action title>","items":["<step 1>","<step 2>","<step 3>"]}
Use 2-5 steps. Keep each step under 15 words. Start each with a verb (Click, Enter, Select, etc.).
Only use the steps format when it genuinely helps — plain text is fine for simple answers.

${org.customInstructions ?? ''}`.trim();
}

// ─── Main handler called from the messages route ─────────────────────────────
export async function handleMessage(
  conversationId: string,
  userMessage: string
): Promise<{ messageId: string; content: string; tokensUsed: number }> {
  // 1. Load conversation with last 10 messages (context window)
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 10,
      },
      endUser: true,
      organization: true,
    },
  });

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(
    conversation.organization,
    conversation.endUser
  );

  // 3. Format history + new message
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // 4. Call Claude API
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  const assistantContent =
    response.content[0].type === 'text' ? response.content[0].text : '';
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

  // 5. Persist both messages atomically
  const [, assistantMsg] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, role: 'user', content: userMessage },
    }),
    prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantContent,
        tokensUsed,
      },
    }),
  ]);

  return {
    messageId: assistantMsg.id,
    content: assistantContent,
    tokensUsed,
  };
}

// ─── Streaming variant — sends tokens over WebSocket as they arrive ──────────
// Called by the WebSocket server instead of the REST route
export async function handleMessageStreaming(
  conversationId: string,
  userMessage: string,
  ws: WebSocket
): Promise<void> {
  // 1. Save user message immediately so the dashboard sees it right away
  await prisma.message.create({
    data: { conversationId, role: 'user', content: userMessage },
  });

  // 2. Load conversation context
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: 'asc' }, take: 10 },
      endUser: true,
      organization: true,
    },
  });

  const systemPrompt = buildSystemPrompt(conversation.organization, conversation.endUser);

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // 3. Stream from Claude — emit each text delta to the widget in real time
  let fullContent = '';

  const stream = claude.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  stream.on('text', (delta) => {
    fullContent += delta;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'token', content: delta }));
    }
  });

  const finalMsg = await stream.finalMessage();
  const tokensUsed = finalMsg.usage.input_tokens + finalMsg.usage.output_tokens;

  // 4. Persist the complete assistant message
  const assistantMsg = await prisma.message.create({
    data: { conversationId, role: 'assistant', content: fullContent, tokensUsed },
  });

  // 5. Tell the client the stream is done
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'done', messageId: assistantMsg.id, tokensUsed }));
  }
}
