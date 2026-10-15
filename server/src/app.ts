import express from 'express';
import session from 'express-session';
import type MongoStore from 'connect-mongo';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { authRoutes } from './routes/authRoutes.js';
import { activityRoutes } from './routes/activityRoutes.js';
import { recordRoutes } from './routes/recordRoutes.js';
import { analyticsRoutes } from './routes/analyticsRoutes.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';

// Startup supplies an initialized store; importing this module opens no connections.
export function createApp(sessionStore: MongoStore) {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet());
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please wait a minute.' } }));
  // Cookie authentication is same-origin only. Require both trusted Origin and JSON
  // on mutations, including login/logout, to prevent cross-site request forgery.
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('origin') !== env.APP_ORIGIN || !req.is('application/json')) {
        res.status(403).json({ message: 'Request origin or content type is not allowed.' });
        return;
      }
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', session({
    name: 'daymark.sid', secret: env.SESSION_SECRET, resave: false, saveUninitialized: false,
    store: sessionStore,
    cookie: { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' },
  }));
  app.use('/api/auth', authRoutes);
  app.use('/api/activities', requireAuth, activityRoutes);
  app.use('/api/records', requireAuth, recordRoutes);
  app.use('/api/analytics', requireAuth, analyticsRoutes);
  app.use('/api', (_req, res) => { res.status(404).json({ message: 'API endpoint not found.' }); });
  if (env.NODE_ENV === 'production') {
    const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => { res.sendFile(path.join(clientDist, 'index.html')); });
  }
  app.use(errorMiddleware);
  return app;
}
