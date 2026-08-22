/**
 * ApeAI — Cluster Routes (Layer 2)
 *
 * Full CRUD for feedback clusters + feedback linking.
 * Mirrors Python routes/clusters.py exactly.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createCluster,
  getCluster,
  listClusters,
  updateCluster,
  deleteCluster,
  addFeedbackToCluster,
  removeFeedbackFromCluster,
  getClusterStats,
} from '../services/clusterService';
import { ClusterCreate, ClusterUpdate, ClusterAddFeedback } from '../types/storage';

export const clustersRouter = Router();

function clusterToResponse(cluster: Record<string, unknown>) {
  return {
    id: cluster['id'] ?? '',
    title: cluster['title'] ?? null,
    summary: cluster['summary'] ?? null,
    feedback_count: cluster['feedback_count'] ?? 0,
    confidence_score: cluster['confidence_score'] ?? 0.0,
    status: cluster['status'] ?? 'new',
    created_at: String(cluster['created_at'] ?? ''),
    updated_at: String(cluster['updated_at'] ?? ''),
    feedback_items: (cluster['feedback_items'] as unknown[]) ?? [],
  };
}

// POST /clusters  (auth required)
clustersRouter.post(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as ClusterCreate;
    if (!body.title) {
      res.status(422).json({ detail: "'title' is required" });
      return;
    }
    try {
      const cluster = await createCluster({
        title: body.title,
        summary: body.summary,
        feedbackIds: body.feedback_ids,
        confidenceScore: body.confidence_score,
        userId: req.userId,
      });
      res.status(201).json(clusterToResponse(cluster));
    } catch (err) {
      next(err);
    }
  },
);

// GET /clusters/stats  (auth required) — must come before /:clusterId
clustersRouter.get(
  '/stats',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getClusterStats(req.userId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },
);

// GET /clusters  (auth required)
clustersRouter.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, limit = '50', offset = '0' } = req.query as Record<string, string>;
    try {
      const result = await listClusters({
        status,
        userId: req.userId,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
      res.json({
        clusters: result.clusters.map(clusterToResponse),
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /clusters/:clusterId
clustersRouter.get(
  '/:clusterId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cluster = await getCluster(req.params['clusterId']!, true);
      res.json(clusterToResponse(cluster));
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// PATCH /clusters/:clusterId
clustersRouter.patch(
  '/:clusterId',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as ClusterUpdate;
    try {
      const cluster = await updateCluster(req.params['clusterId']!, {
        title: body.title,
        summary: body.summary,
        status: body.status,
        confidenceScore: body.confidence_score,
      });
      res.json(clusterToResponse(cluster));
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// DELETE /clusters/:clusterId
clustersRouter.delete(
  '/:clusterId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteCluster(req.params['clusterId']!);
      res.json({ message: `Cluster ${req.params['clusterId']} deleted` });
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// POST /clusters/:clusterId/feedback
clustersRouter.post(
  '/:clusterId/feedback',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as ClusterAddFeedback;
    if (!body.feedback_ids || body.feedback_ids.length === 0) {
      res.status(422).json({ detail: "'feedback_ids' is required" });
      return;
    }
    try {
      const result = await addFeedbackToCluster(
        req.params['clusterId']!,
        body.feedback_ids,
        body.similarity_scores,
      );
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// DELETE /clusters/:clusterId/feedback
clustersRouter.delete(
  '/:clusterId/feedback',
  async (req: Request, res: Response, next: NextFunction) => {
    const feedbackIds = req.query['feedback_ids'];
    const ids: string[] = Array.isArray(feedbackIds)
      ? (feedbackIds as string[])
      : feedbackIds
      ? [feedbackIds as string]
      : [];

    if (ids.length === 0) {
      res.status(422).json({ detail: "'feedback_ids' query param is required" });
      return;
    }
    try {
      const result = await removeFeedbackFromCluster(req.params['clusterId']!, ids);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);
