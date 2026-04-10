import 'dotenv/config';
import 'express-async-errors';
import http from 'http';
import express from 'express';
import cron from 'node-cron';
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
import followupRoutes from './routes/followup';
import flowRoutes from './routes/flow';
import sessionRoutes from './routes/session';
import activationRoutes from './routes/activation';
import integrationRoutes from './routes/integrations';
import benchmarkRoutes from './routes/benchmarks';
import optimizeRoutes from './routes/optimize';
import churnRoutes from './routes/churn';
import autoOptimizeRoutes from './routes/autooptimize';
import kbRoutes from './routes/kb';
import alertConfigRoutes from './routes/alertconfig';
import experimentsRoutes from './routes/experiments';
import usersRoutes from './routes/users';
import escalationsRoutes from './routes/escalations';
import { healWidgetRouter, healDashboardRouter } from './routes/heal';
import { prisma } from './lib/prisma';
import { runAutoOptimization } from './services/autooptimize';
import { errorHandler } from './middleware/errorHandler';
import { attachWebSocketServer } from './lib/websocket';

// ─── Startup env validation ───────────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] Missing required env vars: ${missing.join(', ')}`);
  console.error('[startup] Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT ?? 4000;

// ─── Stripe webhook — MUST be before express.json() ─────────────────────────
// Stripe requires the raw request body to verify the signature.
app.post(
  '/api/v1/billing/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// ─── Global middleware ───────────────────────────────────────────────────────
app.use(helmet());

// CORS: dashboard needs explicit origin; widget is embedded on any customer site
// API key + JWT are the real auth mechanism — CORS is defence-in-depth only
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server / curl
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
    ].filter(Boolean);
    if (allowed.includes(origin!)) return cb(null, true);
    // Allow any origin for widget endpoints (API-key protected)
    cb(null, true);
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
app.use('/api/v1/followup', followupRoutes);
app.use('/api/v1/flow', flowRoutes);
app.use('/api/v1/session', sessionRoutes);
app.use('/api/v1/activation', activationRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/benchmarks', benchmarkRoutes);
app.use('/api/v1/optimize', optimizeRoutes);
app.use('/api/v1/churn', churnRoutes);
app.use('/api/v1/autooptimize', autoOptimizeRoutes);
app.use('/api/v1/kb', kbRoutes);
app.use('/api/v1/config/alerts', alertConfigRoutes);
app.use('/api/v1/experiments', experimentsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/escalations', escalationsRoutes);
app.use('/api/v1/session/heal', healWidgetRouter);
app.use('/api/v1/flow/health', healDashboardRouter);

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

// ─── Cron: weekly auto-optimize (Sunday 2:00 AM UTC) ─────────────────────────
// Scans every org that has auto-optimize enabled and applies improved prompts
// to underperforming steps. All activity is logged to optimization_logs.
cron.schedule('0 2 * * 0', async () => {
  console.log('[cron] Weekly auto-optimize starting…');
  try {
    const configs = await prisma.autoOptimizeConfig.findMany({
      where: { enabled: true },
      select: { organizationId: true },
    });
    console.log(`[cron] Found ${configs.length} org(s) with auto-optimize enabled`);
    for (const { organizationId } of configs) {
      try {
        const result = await runAutoOptimization(organizationId, 'auto');
        console.log(`[cron] org=${organizationId} → scanned=${result.stepsScanned} optimized=${result.stepsOptimized}`);
      } catch (err) {
        console.error(`[cron] org=${organizationId} failed:`, err);
      }
    }
    console.log('[cron] Weekly auto-optimize complete');
  } catch (err) {
    console.error('[cron] Auto-optimize scan failed:', err);
  }
}, { timezone: 'UTC' });

export default app;
