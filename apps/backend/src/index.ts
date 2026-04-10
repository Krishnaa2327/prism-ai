import 'dotenv/config';
import 'express-async-errors';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth';
import conversationsRoutes from './routes/conversations';
import messagesRoutes from './routes/messages';
import eventsRoutes from './routes/events';
import analyticsRoutes from './routes/analytics';
import configRoutes from './routes/config';
import billingRoutes, { stripeWebhookHandler } from './routes/billing';
import onboardingRoutes from './routes/onboarding';
import adminRoutes from './routes/admin';
import checklistRoutes from './routes/checklist';
import flowRoutes from './routes/flow';
import sessionRoutes from './routes/session';
import activationRoutes from './routes/activation';
import kbRoutes from './routes/kb';
import usersRoutes from './routes/users';
import escalationsRoutes from './routes/escalations';
import failuresRoutes from './routes/failures';
import { prisma } from './lib/prisma';
import { errorHandler } from './middleware/errorHandler';
import { attachWebSocketServer } from './lib/websocket';

// ─── Startup env validation ───────────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT ?? 4000;

// ─── Stripe webhook — MUST be before express.json() ─────────────────────────
app.post(
  '/api/v1/billing/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// ─── Global middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
    ].filter(Boolean);
    if (allowed.includes(origin!)) return cb(null, true);
    cb(null, true); // widget endpoints are API-key protected — CORS is defence-in-depth
  },
  credentials: false,
}));

app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── REST routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/conversations', conversationsRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/checklist', checklistRoutes);
app.use('/api/v1/flow', flowRoutes);
app.use('/api/v1/session', sessionRoutes);
app.use('/api/v1/activation', activationRoutes);
app.use('/api/v1/kb', kbRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/escalations', escalationsRoutes);
app.use('/api/v1/failures', failuresRoutes);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', ts: new Date() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable', ts: new Date() });
  }
});

app.use(errorHandler);

// ─── HTTP server + WebSocket ──────────────────────────────────────────────────
const httpServer = http.createServer(app);
attachWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] HTTP → http://localhost:${PORT}`);
  console.log(`[server] WS   → ws://localhost:${PORT}/ws`);
  console.log(`[server] Env  → ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
