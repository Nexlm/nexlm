import { createRequire } from 'node:module';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { runDueJobs } from './jobs/runDueJobs.js';
import { asyncHandler } from './lib/asyncHandler.js';
import { unauthorized } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import apiRoutes from './routes/index.js';
import { UPLOAD_DIR } from './services/upload.service.js';

// Lets an operator confirm which build answered a request.
const { version: VERSION } = createRequire(import.meta.url)('../package.json');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  // Uploaded images are embedded by the frontend on another origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));

  app.get('/', (_req, res) => {
    res.json({ name: 'Nexlm API', status: 'ok', version: VERSION, docs: 'https://github.com/Nexlm/nexlm-docs', health: '/health' });
  });

  app.get(
    '/health',
    asyncHandler(async (req, res) => {
      const body = {
        status: 'ok',
        version: VERSION,
        network: env.STELLAR_NETWORK,
        runtime: env.isServerless ? 'serverless' : 'server',
        realtime: !env.isServerless,
        time: new Date().toISOString(),
      };

      // /health?deep=1 also checks the database is reachable and migrated.
      if (req.query.deep !== undefined) {
        try {
          await prisma.user.findFirst({ select: { id: true } });
          body.database = 'ok';
        } catch (err) {
          body.status = 'degraded';
          body.database = err?.code === 'P2021' ? 'migrations missing' : 'unreachable';
          logger.error('Deep health check failed', { err });
        }
      }

      res.status(body.status === 'ok' ? 200 : 503).json(body);
    }),
  );

  // Serverless has no background timers: settle due work as traffic arrives
  // (throttled to once every 15 s per instance) and on the cron endpoint.
  if (env.isServerless) {
    app.use('/api', async (_req, _res, next) => {
      await runDueJobs();
      next();
    });
  }

  app.get(
    '/api/cron/tick',
    asyncHandler(async (req, res) => {
      if (!env.CRON_SECRET || req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
        throw unauthorized('Invalid cron secret');
      }
      res.json({ ok: true, ran: await runDueJobs({ force: true }) });
    }),
  );

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
