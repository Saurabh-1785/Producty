/**
 * ApeAI — Ingestion Routes (Layer 1 Multi-Source)
 *
 * RESTful ingestion router for all connector sources:
 *   POST /api/ingestion/appstore      — App Store & Google Play reviews
 *   POST /api/ingestion/reddit        — Reddit posts & comments
 *   POST /api/ingestion/webhooks/support    — Intercom / Zendesk tickets
 *   POST /api/ingestion/webhooks/transcript — Fireflies / Zoom transcripts
 *   POST /api/ingestion/webhooks/observability — Sentry / PostHog alerts
 *   POST /api/ingestion/simulate/:source    — Connector simulator (test payloads)
 *   GET  /api/ingestion/status        — Ingestion engine status
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';

// Normalizers
import {
  normalizeAppStoreReview,
  normalizeRedditPost,
  normalizeSupportTicket,
  normalizeTranscript,
  normalizeObservabilityAlert,
} from '../services/normalize';

// Validation
import {
  validateIngestionPayload,
  validateWebhookPayload,
} from '../services/validate';

// Connector clients (for simulate endpoints)
import { getMockAppStoreReviews, getMockGooglePlayReviews } from '../services/appStoreClient';
import { getMockRedditPosts } from '../services/redditClient';
import { getMockIntercomTickets } from '../services/intercomClient';
import { getMockSentryIssues, getMockPostHogEvents, getSentryWebhookSecret } from '../services/sentryClient';
import { getMockTranscripts, getTranscriptWebhookSecret } from '../services/transcriptStorage';

// Persistence
import { saveFeedback, saveFeedbackBatch } from '../services/saveFeedback';

// Scheduler
import { getSchedulerStatus } from '../services/scheduler';

// Types
import {
  AppStoreReviewInput,
  RedditPostInput,
  SupportTicketWebhookInput,
  TranscriptWebhookInput,
  ObservabilityAlertInput,
  FeedbackItem,
} from '../types/feedback';

export const ingestionRouter = Router();

// ─── POST /appstore — App Store & Google Play Review Ingestion ─

ingestionRouter.post(
  '/appstore',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;

      // Accept single review or array of reviews
      const reviews: AppStoreReviewInput[] = Array.isArray(body) ? body : [body];

      if (reviews.length === 0) {
        res.status(400).json({ detail: 'No reviews provided' });
        return;
      }

      const feedbackItems: FeedbackItem[] = [];
      const errors: Array<Record<string, unknown>> = [];

      for (let i = 0; i < reviews.length; i++) {
        const review = reviews[i];
        const validation = validateIngestionPayload(
          review as unknown as Record<string, unknown>,
          ['content', 'author', 'review_id'],
        );

        if (!validation.valid) {
          errors.push({ index: i, errors: validation.errors });
          continue;
        }

        const item = normalizeAppStoreReview(review);
        item.userId = req.userId;
        feedbackItems.push(item);
      }

      if (feedbackItems.length === 0) {
        res.status(422).json({
          detail: 'No valid reviews to ingest',
          errors,
        });
        return;
      }

      const saved = await saveFeedbackBatch(feedbackItems);

      res.json({
        source: 'appstore',
        total: reviews.length,
        saved: saved.length,
        errors,
        message: `Successfully ingested ${saved.length} app store review(s)`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /reddit — Reddit Posts & Comments Ingestion ─────────

ingestionRouter.post(
  '/reddit',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const posts: RedditPostInput[] = Array.isArray(body) ? body : [body];

      if (posts.length === 0) {
        res.status(400).json({ detail: 'No posts provided' });
        return;
      }

      const feedbackItems: FeedbackItem[] = [];
      const errors: Array<Record<string, unknown>> = [];

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const validation = validateIngestionPayload(
          post as unknown as Record<string, unknown>,
          ['content', 'author', 'post_id'],
        );

        if (!validation.valid) {
          errors.push({ index: i, errors: validation.errors });
          continue;
        }

        const item = normalizeRedditPost(post);
        item.userId = req.userId;
        feedbackItems.push(item);
      }

      if (feedbackItems.length === 0) {
        res.status(422).json({
          detail: 'No valid posts to ingest',
          errors,
        });
        return;
      }

      const saved = await saveFeedbackBatch(feedbackItems);

      res.json({
        source: 'reddit',
        total: posts.length,
        saved: saved.length,
        errors,
        message: `Successfully ingested ${saved.length} Reddit post(s)`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /webhooks/support — Intercom / Zendesk Webhook ──────

ingestionRouter.post(
  '/webhooks/support',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as SupportTicketWebhookInput;

      const validation = validateWebhookPayload(
        body as unknown as Record<string, unknown>,
        {
          requiredFields: ['content', 'author', 'ticket_id', 'platform'],
        },
      );

      if (!validation.valid) {
        res.status(422).json({
          detail: 'Invalid support ticket payload',
          errors: validation.errors,
        });
        return;
      }

      const item = normalizeSupportTicket(body);
      const saved = await saveFeedback(item);

      res.json({
        source: body.platform || 'support',
        id: (saved as Record<string, unknown>)['id'],
        message: `Support ticket ${body.ticket_id} ingested successfully`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /webhooks/transcript — Fireflies / Zoom Webhook ────

ingestionRouter.post(
  '/webhooks/transcript',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as TranscriptWebhookInput;

      // Optional signature verification
      const secret = body.platform ? getTranscriptWebhookSecret(body.platform) : undefined;
      const signature = req.headers['x-webhook-signature'] as string | undefined;

      const validation = validateWebhookPayload(
        body as unknown as Record<string, unknown>,
        {
          requiredFields: ['content', 'meeting_title', 'transcript_id'],
          secret,
          signature,
          rawBody: JSON.stringify(req.body),
        },
      );

      if (!validation.valid) {
        res.status(422).json({
          detail: 'Invalid transcript payload',
          errors: validation.errors,
        });
        return;
      }

      const item = normalizeTranscript(body);
      const saved = await saveFeedback(item);

      console.info(
        `🎙️ Transcript ingested: "${body.meeting_title}" — Layer 3 trigger emitted`,
      );

      res.json({
        source: 'transcript',
        id: (saved as Record<string, unknown>)['id'],
        platform: body.platform,
        message: `Transcript "${body.meeting_title}" ingested successfully`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /webhooks/observability — Sentry / PostHog Webhook ──

ingestionRouter.post(
  '/webhooks/observability',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as ObservabilityAlertInput;

      // Sentry webhook signature verification
      const sentrySecret = getSentryWebhookSecret();
      const signature = req.headers['sentry-hook-signature'] as string | undefined;

      const validation = validateWebhookPayload(
        body as unknown as Record<string, unknown>,
        {
          requiredFields: ['content', 'title', 'alert_id', 'platform'],
          secret: body.platform === 'sentry' ? sentrySecret : undefined,
          signature,
          rawBody: JSON.stringify(req.body),
          signaturePrefix: '',
        },
      );

      if (!validation.valid) {
        res.status(422).json({
          detail: 'Invalid observability alert payload',
          errors: validation.errors,
        });
        return;
      }

      const item = normalizeObservabilityAlert(body);
      const saved = await saveFeedback(item);

      res.json({
        source: body.platform || 'observability',
        id: (saved as Record<string, unknown>)['id'],
        message: `Observability alert ${body.alert_id} ingested successfully`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /simulate/:source — Connector Simulator ────────────

ingestionRouter.post(
  '/simulate/:source',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const source = req.params.source;
      let feedbackItems: FeedbackItem[] = [];

      switch (source) {
        case 'appstore': {
          const reviews = [...getMockAppStoreReviews(), ...getMockGooglePlayReviews()];
          feedbackItems = reviews.map(normalizeAppStoreReview);
          break;
        }
        case 'reddit': {
          const posts = getMockRedditPosts();
          feedbackItems = posts.map(normalizeRedditPost);
          break;
        }
        case 'intercom': {
          const tickets = getMockIntercomTickets();
          feedbackItems = tickets.map(normalizeSupportTicket);
          break;
        }
        case 'transcript': {
          const transcripts = getMockTranscripts();
          feedbackItems = transcripts.map(normalizeTranscript);
          break;
        }
        case 'sentry': {
          const issues = [...getMockSentryIssues(), ...getMockPostHogEvents()];
          feedbackItems = issues.map(normalizeObservabilityAlert);
          break;
        }
        default:
          res.status(400).json({
            detail: `Unknown source: "${source}". Valid sources: appstore, reddit, intercom, transcript, sentry`,
          });
          return;
      }

      // Assign userId to all simulated items
      feedbackItems.forEach(item => {
        item.userId = req.userId;
      });

      const saved = await saveFeedbackBatch(feedbackItems);

      res.json({
        source,
        simulated: true,
        total: feedbackItems.length,
        saved: saved.length,
        message: `Simulated ${saved.length} ${source} feedback item(s) ingested successfully`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /status — Ingestion Engine Status ────────────────────

ingestionRouter.get(
  '/status',
  async (_req: Request, res: Response) => {
    const scheduler = getSchedulerStatus();

    res.json({
      engine: 'Layer 1 Multi-Source Ingestion',
      version: '1.0.0',
      connectors: {
        appstore: { available: true, type: 'poll' },
        google_play: { available: true, type: 'poll' },
        reddit: { available: true, type: 'poll' },
        intercom: { available: true, type: 'webhook' },
        zendesk: { available: true, type: 'webhook' },
        fireflies: { available: true, type: 'webhook' },
        zoom: { available: true, type: 'webhook' },
        sentry: { available: true, type: 'webhook' },
        posthog: { available: true, type: 'webhook' },
      },
      scheduler,
      endpoints: {
        appstore: 'POST /api/ingestion/appstore',
        reddit: 'POST /api/ingestion/reddit',
        support_webhook: 'POST /api/ingestion/webhooks/support',
        transcript_webhook: 'POST /api/ingestion/webhooks/transcript',
        observability_webhook: 'POST /api/ingestion/webhooks/observability',
        simulate: 'POST /api/ingestion/simulate/:source',
      },
    });
  },
);
