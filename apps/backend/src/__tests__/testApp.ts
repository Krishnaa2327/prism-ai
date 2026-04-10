// Creates a fresh Express app for each test suite — no HTTP server, no WebSocket.
// Tests use supertest which calls the app directly without binding to a port.

import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';

import authRoutes from '../routes/auth';
import conversationsRoutes from '../routes/conversations';
import messagesRoutes from '../routes/messages';
import eventsRoutes from '../routes/events';
import analyticsRoutes from '../routes/analytics';
import configRoutes from '../routes/config';
import billingRoutes, { stripeWebhookHandler } from '../routes/billing';
import { errorHandler } from '../middleware/errorHandler';

export function createApp() {
  const app = express();

  // Webhook needs raw body before JSON parser
  app.post('/api/v1/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/conversations', conversationsRoutes);
  app.use('/api/v1/messages', messagesRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/config', configRoutes);
  app.use('/api/v1/billing', billingRoutes);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(errorHandler);

  return app;
}
