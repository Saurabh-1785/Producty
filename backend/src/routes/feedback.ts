/**
 * ApeAI — Feedback Routes (Layer 1)
 *
 * POST /feedback/manual   — Submit single text feedback
 * GET  /feedback/recent   — Get recent feedback
 * POST /feedback/csv      — Upload CSV file with multiple feedback items
 *
 * Mirrors Python routes/manual.py exactly.
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { requireAuth } from '../middleware/auth';
import { normalizeManual, normalizeCsvRow } from '../services/normalize';
import {
  saveFeedback,
  saveFeedbackBatch,
  getRecentFeedbacks,
} from '../services/saveFeedback';
import { ManualFeedbackInput } from '../types/feedback';

export const feedbackRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /feedback/manual
feedbackRouter.post(
  '/manual',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as ManualFeedbackInput;

    if (!body.content || body.content.trim().length === 0) {
      res.status(422).json({ detail: "'content' field is required and must not be empty" });
      return;
    }
    if (body.content.length > 10000) {
      res.status(422).json({ detail: "'content' must be at most 10000 characters" });
      return;
    }

    try {
      const feedbackItem = normalizeManual(body);
      feedbackItem.userId = req.userId;

      const saved = await saveFeedback(feedbackItem);
      res.json({
        id: saved['id'] ?? '',
        source: saved['source'] ?? 'manual',
        author: saved['author'] ?? 'anonymous',
        content: saved['content'] ?? '',
        timestamp: saved['timestamp'] ?? '',
        message: 'Feedback saved successfully',
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Failed to save')) {
        res.status(503).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// GET /feedback/recent
feedbackRouter.get(
  '/recent',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt((req.query['limit'] as string) ?? '50', 10);

    try {
      const items = await getRecentFeedbacks(req.userId, limit);
      res.json({ feedbacks: items });
    } catch (err) {
      next(err);
    }
  },
);

// POST /feedback/csv
feedbackRouter.post(
  '/csv',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      res.status(400).json({ detail: 'No file uploaded. Send a CSV as multipart form-data field "file".' });
      return;
    }

    const { originalname, mimetype, buffer } = req.file;

    // Validate content type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/octet-stream'];
    if (!validTypes.includes(mimetype) && !originalname.endsWith('.csv')) {
      res.status(400).json({ detail: `Expected a CSV file, got: ${mimetype}` });
      return;
    }

    try {
      // Decode buffer
      let textContent: string;
      try {
        textContent = buffer.toString('utf-8');
      } catch {
        textContent = buffer.toString('latin1');
      }

      // Parse CSV
      let records: Array<Record<string, string>>;
      try {
        records = parse(textContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as Array<Record<string, string>>;
      } catch (parseErr) {
        res.status(400).json({ detail: `CSV parse error: ${parseErr}` });
        return;
      }

      if (records.length === 0 || !records[0] || !Object.keys(records[0]).includes('content')) {
        const cols = records[0] ? Object.keys(records[0]) : [];
        res.status(400).json({
          detail: `CSV must have a 'content' column. Found columns: ${cols.join(', ')}`,
        });
        return;
      }

      const feedbackItems = [];
      const errors: Array<Record<string, unknown>> = [];

      for (let i = 0; i < records.length; i++) {
        const rowNumber = i + 1;
        try {
          const item = normalizeCsvRow(records[i], rowNumber);
          item.userId = req.userId;
          feedbackItems.push(item);
        } catch (err) {
          errors.push({ row: rowNumber, error: String(err) });
        }
      }

      if (feedbackItems.length === 0) {
        res.status(400).json({ detail: 'No valid rows found in CSV' });
        return;
      }

      const saved = await saveFeedbackBatch(feedbackItems);
      const totalRows = feedbackItems.length + errors.length;

      res.json({
        total_rows: totalRows,
        saved: saved.length,
        errors,
        message: `Successfully saved ${saved.length} of ${totalRows} rows`,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Batch save failed')) {
        res.status(503).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);
