import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { prisma } from './prisma';
import { handleMessageStreaming } from '../services/ai';
import { getMonthlyUsage } from '../middleware/rateLimit';

// ─── Message types the client can send ──────────────────────────────────────

interface AuthMessage {
  type: 'auth';
  apiKey: string;
}

interface SendMessage {
  type: 'message';
  conversationId: string;
  content: string;
}

interface SubscribeMessage {
  type: 'subscribe';           // dashboard: watch a conversation for live updates
  conversationId: string;
  token: string;               // JWT — dashboard uses JWT not API key
}

type ClientMessage = AuthMessage | SendMessage | SubscribeMessage;

// ─── Per-connection state ────────────────────────────────────────────────────

interface ConnectionState {
  organizationId: string | null;
  authenticated: boolean;
  mode: 'widget' | 'dashboard' | null;
  subscribedConversationId: string | null;
}

// ─── Subscription map: conversationId → set of dashboard WebSockets ──────────
// Used to push live messages to open dashboard tabs

const subscribers = new Map<string, Set<WebSocket>>();

export function notifySubscribers(conversationId: string, payload: object) {
  const subs = subscribers.get(conversationId);
  if (!subs) return;
  const msg = JSON.stringify(payload);
  subs.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

// ─── Boot the WebSocket server ────────────────────────────────────────────────

export function attachWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    const state: ConnectionState = {
      organizationId: null,
      authenticated: false,
      mode: null,
      subscribedConversationId: null,
    };

    // Send protocol version so clients can check compatibility
    ws.send(JSON.stringify({ type: 'connected', version: '1.0' }));

    ws.on('message', async (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      // ── 1. Widget auth (API key) ─────────────────────────────────────────
      if (msg.type === 'auth') {
        const org = await prisma.organization.findUnique({
          where: { apiKey: msg.apiKey },
          select: { id: true },
        });
        if (!org) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid API key' }));
          ws.close();
          return;
        }
        state.organizationId = org.id;
        state.authenticated = true;
        state.mode = 'widget';
        ws.send(JSON.stringify({ type: 'auth_ok' }));
        return;
      }

      // ── 2. Dashboard subscribe (JWT) ─────────────────────────────────────
      if (msg.type === 'subscribe') {
        // Verify JWT inline (avoid circular import with middleware)
        try {
          const jwt = await import('jsonwebtoken');
          const payload = jwt.default.verify(msg.token, process.env.JWT_SECRET!) as { organizationId: string };

          // Make sure the conversation belongs to this org
          const conv = await prisma.conversation.findFirst({
            where: { id: msg.conversationId, organizationId: payload.organizationId },
            select: { id: true },
          });
          if (!conv) {
            ws.send(JSON.stringify({ type: 'error', message: 'Conversation not found' }));
            return;
          }

          // Register subscriber
          if (!subscribers.has(msg.conversationId)) {
            subscribers.set(msg.conversationId, new Set());
          }
          subscribers.get(msg.conversationId)!.add(ws);
          state.subscribedConversationId = msg.conversationId;
          state.mode = 'dashboard';
          ws.send(JSON.stringify({ type: 'subscribed', conversationId: msg.conversationId }));
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
        }
        return;
      }

      // ── 3. Widget sends a user message → stream AI response ──────────────
      if (msg.type === 'message') {
        if (!state.authenticated || state.mode !== 'widget') {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }

        const content = msg.content?.trim();
        if (!content || content.length > 2000) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message content' }));
          return;
        }

        // Verify conversation belongs to this org
        const conv = await prisma.conversation.findFirst({
          where: { id: msg.conversationId, organizationId: state.organizationId! },
          select: { id: true, status: true },
        });
        if (!conv) {
          ws.send(JSON.stringify({ type: 'error', message: 'Conversation not found' }));
          return;
        }
        if (conv.status === 'closed') {
          ws.send(JSON.stringify({ type: 'error', message: 'Conversation is closed' }));
          return;
        }

        // Enforce monthly message limit
        const org = await prisma.organization.findUnique({
          where: { id: state.organizationId! },
          select: { monthlyMessageLimit: true },
        });
        if (org) {
          const used = await getMonthlyUsage(state.organizationId!);
          if (used >= org.monthlyMessageLimit) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Monthly message limit reached. Please upgrade your plan.',
              code: 'LIMIT_REACHED',
            }));
            return;
          }
        }

        // Let the client know streaming is starting
        ws.send(JSON.stringify({ type: 'stream_start' }));

        try {
          // Stream — tokens flow back through ws directly inside handleMessageStreaming
          await handleMessageStreaming(msg.conversationId, content, ws);

          // Also push the completed message to any dashboard subscribers watching this conversation
          notifySubscribers(msg.conversationId, {
            type: 'new_message',
            conversationId: msg.conversationId,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'AI error';
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message }));
          }
        }
        return;
      }
    });

    ws.on('close', () => {
      // Clean up dashboard subscriptions
      if (state.subscribedConversationId) {
        subscribers.get(state.subscribedConversationId)?.delete(ws);
      }
    });

    ws.on('error', (err) => {
      console.error('[ws] error:', err.message);
    });
  });

  console.log('[ws] WebSocket server attached at /ws');
  return wss;
}
