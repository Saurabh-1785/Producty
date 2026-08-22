/**
 * ApeAI — Pipeline Routes (Layer 3 — AI Orchestration)
 *
 * GET  /pipeline/status                       — Full pipeline overview
 * POST /pipeline/cluster                      — Cluster all unprocessed feedback
 * POST /pipeline/summarize/:clusterId         — Generate AI summary
 * POST /pipeline/generate-brd/:clusterId      — Generate BRD
 * POST /pipeline/generate-prd/:clusterId      — Generate PRD
 * POST /pipeline/generate-stories/:clusterId  — Generate User Stories
 * POST /pipeline/generate-tasks/:storyId      — Generate Tasks
 *
 * Mirrors Python routes/pipeline.py exactly.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { getPipelineStatus } from '../services/documentService';
import { clusterUnprocessedFeedback } from '../ai/clusteringService';
import {
  summarizeCluster,
  generateBrd,
  generatePrd,
  generateStories,
  generateTasks,
} from '../ai/generationService';

export const pipelineRouter = Router();

// GET /pipeline/status
pipelineRouter.get(
  '/status',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await getPipelineStatus();
      res.json(status);
    } catch (err) {
      next(err);
    }
  },
);

// POST /pipeline/cluster  (auth required)
pipelineRouter.post(
  '/cluster',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await clusterUnprocessedFeedback(req.userId);
      res.json(result);
    } catch (err) {
      console.error('Clustering failed:', err);
      next(err);
    }
  },
);

// POST /pipeline/summarize/:clusterId
pipelineRouter.post(
  '/summarize/:clusterId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await summarizeCluster(req.params['clusterId']!);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      console.error('Summarization failed:', err);
      next(err);
    }
  },
);

// POST /pipeline/generate-brd/:clusterId
pipelineRouter.post(
  '/generate-brd/:clusterId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await generateBrd(req.params['clusterId']!);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && (err.message.includes('must be summarized') || err.message.includes('not found'))) {
        res.status(400).json({ detail: err.message });
        return;
      }
      console.error('BRD generation failed:', err);
      next(err);
    }
  },
);

// POST /pipeline/generate-prd/:clusterId?brd_id=
pipelineRouter.post(
  '/generate-prd/:clusterId',
  async (req: Request, res: Response, next: NextFunction) => {
    const brdId = req.query['brd_id'] as string;
    if (!brdId) {
      res.status(400).json({ detail: "'brd_id' query parameter is required" });
      return;
    }
    try {
      const result = await generatePrd(req.params['clusterId']!, brdId);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(400).json({ detail: err.message });
        return;
      }
      console.error('PRD generation failed:', err);
      next(err);
    }
  },
);

// POST /pipeline/generate-stories/:clusterId?prd_id=
pipelineRouter.post(
  '/generate-stories/:clusterId',
  async (req: Request, res: Response, next: NextFunction) => {
    const prdId = req.query['prd_id'] as string;
    if (!prdId) {
      res.status(400).json({ detail: "'prd_id' query parameter is required" });
      return;
    }
    try {
      const result = await generateStories(req.params['clusterId']!, prdId);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(400).json({ detail: err.message });
        return;
      }
      console.error('Stories generation failed:', err);
      next(err);
    }
  },
);

// POST /pipeline/generate-tasks/:storyId?cluster_id=
pipelineRouter.post(
  '/generate-tasks/:storyId',
  async (req: Request, res: Response, next: NextFunction) => {
    const clusterId = req.query['cluster_id'] as string;
    if (!clusterId) {
      res.status(400).json({ detail: "'cluster_id' query parameter is required" });
      return;
    }
    try {
      const result = await generateTasks(clusterId, req.params['storyId']!);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(400).json({ detail: err.message });
        return;
      }
      console.error('Task generation failed:', err);
      next(err);
    }
  },
);
