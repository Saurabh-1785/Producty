/**
 * ApeAI — Embedding Routes (Layer 2)
 *
 * POST /embeddings/create  — Embed single feedback item
 * POST /embeddings/batch   — Embed all un-embedded feedback
 * POST /embeddings/search  — Similarity search
 * GET  /embeddings/stats   — Embedding statistics
 *
 * Mirrors Python routes/embeddings.py.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  createEmbeddingForFeedback,
  createEmbeddingsBatch,
  searchSimilar,
  getEmbeddingStats,
} from '../services/embeddingService';
import { EmbeddingCreate, EmbeddingBatchCreate, SimilaritySearchRequest } from '../types/storage';

export const embeddingsRouter = Router();

// POST /embeddings/create
embeddingsRouter.post(
  '/create',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as EmbeddingCreate;
    if (!body.feedback_id) {
      res.status(422).json({ detail: "'feedback_id' is required" });
      return;
    }
    try {
      const result = await createEmbeddingForFeedback(body.feedback_id);
      res.json({
        id: result['id'] ?? '',
        feedback_id: result['feedback_id'] ?? body.feedback_id,
        model: result['model'] ?? 'text-embedding-004',
        dimensions: 768,
        created_at: result['created_at'] ?? '',
        message: 'Embedding created successfully',
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// POST /embeddings/batch
embeddingsRouter.post(
  '/batch',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as EmbeddingBatchCreate;
    try {
      const result = await createEmbeddingsBatch(body.feedback_ids ?? undefined);
      res.json({
        total: result.total,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
        message: `Batch complete: ${result.created} created, ${result.skipped} skipped`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /embeddings/search
embeddingsRouter.post(
  '/search',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as SimilaritySearchRequest;

    if (!body.text && !body.feedback_id) {
      res.status(400).json({ detail: "Either 'text' or 'feedback_id' must be provided" });
      return;
    }

    try {
      const results = await searchSimilar({
        text: body.text,
        feedbackId: body.feedback_id,
        matchCount: body.match_count ?? 10,
        matchThreshold: body.match_threshold ?? 0.7,
      });

      const query = body.text
        ? body.text.slice(0, 100)
        : `feedback:${body.feedback_id}`;

      res.json({
        query,
        results: results.map((r) => ({
          feedback_id: r['feedback_id'],
          content: r['content'],
          source: r['source'],
          similarity: r['similarity'],
        })),
        count: results.length,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('must be provided')) {
        res.status(400).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// GET /embeddings/stats
embeddingsRouter.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await getEmbeddingStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },
);
