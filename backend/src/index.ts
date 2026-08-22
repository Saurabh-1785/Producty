/**
 * ApeAI — Express Application Entry Point
 *
 * This is the main file that:
 *   - Creates the Express app instance
 *   - Mounts all route modules (Layer 1 + Layer 2 + Layer 3 + Layer 4)
 *   - Configures CORS middleware
 *   - Provides health check and stats endpoints
 *   - Starts the server on port 8000
 *
 * Run with:
 *   cd /home/Saurabh/apeai/backend
 *   npm run dev
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import settings from './config';
import { checkSupabaseConnection } from './db/supabase';
import { getFeedbackStats } from './services/saveFeedback';
import { errorHandler } from './middleware/errorHandler';

// ─── Route Imports ────────────────────────────────────────────
// Layer 1 — Ingestion
import { feedbackRouter } from './routes/feedback';
import { ingestionRouter } from './routes/ingestion';

// Layer 1 — Scheduler (background polling)
import { startScheduler } from './services/scheduler';

// Layer 2 — Storage
import { embeddingsRouter } from './routes/embeddings';
import { clustersRouter } from './routes/clusters';
import { documentsRouter } from './routes/documents';
import { approvalsRouter } from './routes/approvals';
import { integrationsRouter } from './routes/integrations';
import { ticketLinksRouter } from './routes/ticketLinks';

// Layer 3 — AI Pipeline
import { pipelineRouter } from './routes/pipeline';

// Layer 4 — Publishing
import { publishRouter } from './routes/publish';

// ─── App Setup ────────────────────────────────────────────────

const app = express();

// ─── Startup Logging ──────────────────────────────────────────

console.info('='.repeat(60));
console.info('🦍 ApeAI — Starting up (Node.js + Express + TypeScript)');
console.info('='.repeat(60));
console.info(`  Supabase:  ${settings.supabaseConfigured ? '✅ configured' : '❌ not configured'}`);
console.info(`  Google AI: ${settings.googleConfigured ? '✅ configured' : '⏭️  not configured (needed for embeddings)'}`);
console.info(`  Ingestion: ✅ manual, csv, and multi-source connectors ready`);
console.info('-'.repeat(60));

// ─── CORS ─────────────────────────────────────────────────────

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://apeai-nine.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Core / System Routes ─────────────────────────────────────

app.get('/', (_req: Request, res: Response) => {
  res.json({
    app: 'ApeAI Product Operations API',
    version: '0.2.0',
    docs: 'N/A (use /health to check status)',
    health: '/health',
    layers: {
      layer_1_ingestion: {
        manual_feedback: 'POST /feedback/manual',
        csv_upload: 'POST /feedback/csv',
        stats: 'GET /feedback/stats',
        appstore: 'POST /api/ingestion/appstore',
        reddit: 'POST /api/ingestion/reddit',
        support_webhook: 'POST /api/ingestion/webhooks/support',
        transcript_webhook: 'POST /api/ingestion/webhooks/transcript',
        observability_webhook: 'POST /api/ingestion/webhooks/observability',
        simulate: 'POST /api/ingestion/simulate/:source',
        ingestion_status: 'GET /api/ingestion/status',
      },
      layer_2_storage: {
        embeddings: '/embeddings/*',
        clusters: '/clusters/*',
        documents: '/documents/*',
        approvals: '/approvals/*',
        integrations: '/integrations/*',
        ticket_links: '/ticket-links/*',
        pipeline: 'GET /pipeline/status',
      },
    },
  });
});

app.get('/health', async (_req: Request, res: Response) => {
  let supabaseStatus = 'not_configured';
  if (settings.supabaseConfigured) {
    supabaseStatus = (await checkSupabaseConnection()) ? 'connected' : 'disconnected';
  }
  res.json({
    status: 'ok',
    supabase: supabaseStatus,
    version: '0.2.0',
  });
});

app.get('/feedback/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getFeedbackStats();
    res.json({
      total: stats.total,
      by_source: stats.by_source,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Layer 1 Routes (Ingestion) ───────────────────────────────

app.use('/feedback', feedbackRouter);
app.use('/api/ingestion', ingestionRouter);

// ─── Layer 2 Routes (Storage) ─────────────────────────────────

app.use('/embeddings', embeddingsRouter);
app.use('/clusters', clustersRouter);
app.use('/documents', documentsRouter);
app.use('/approvals', approvalsRouter);
app.use('/integrations', integrationsRouter);
app.use('/ticket-links', ticketLinksRouter);

// ─── Layer 3 Routes (AI Pipeline) ────────────────────────────

app.use('/pipeline', pipelineRouter);

// ─── Layer 4 Routes (Publishing) ─────────────────────────────

app.use('/publish', publishRouter);

// ─── 404 Handler ──────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ detail: 'Not found' });
});

// ─── Global Error Handler ─────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────

const PORT = settings.appPort;
const HOST = settings.appHost;

app.listen(PORT, HOST, () => {
  console.info(`🚀 ApeAI Node.js backend running at http://${HOST}:${PORT}`);
  console.info(`   Health: http://localhost:${PORT}/health`);
  console.info(`   Root:   http://localhost:${PORT}/`);
  console.info(`   Ingestion: http://localhost:${PORT}/api/ingestion/status`);

  // Start background scheduler (opt-in via SCHEDULER_ENABLED=true)
  startScheduler();
});

export default app;
