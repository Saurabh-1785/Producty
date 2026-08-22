/**
 * ApeAI — Jira Integration Routes
 *
 * POST /publish/jira/:documentId
 * Mirrors Python integrations/jira/routes.py.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../../db/supabase';
import { publishDocument } from '../../services/publishService';

export const jiraRouter = Router();

jiraRouter.post(
  '/jira/:documentId',
  async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.params;
    let { integration_id: integrationId } = req.query as Record<string, string | undefined>;

    // Auto-resolve the active Jira integration if not specified
    if (!integrationId) {
      try {
        const db = getSupabaseClient();
        const { data } = await db
          .from('integrations')
          .select('id')
          .eq('type', 'jira')
          .eq('is_active', true)
          .limit(1);

        if (!data || data.length === 0) {
          res.status(400).json({
            detail:
              'No active Jira integration configured. Please configure one or supply integration_id.',
          });
          return;
        }
        integrationId = (data[0] as Record<string, string>)['id'];
      } catch (err) {
        return next(err);
      }
    }

    try {
      const result = await publishDocument(documentId, integrationId!);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && (err.message.includes('not found') || err.message.includes('Only approved') || err.message.includes('already been published'))) {
        res.status(400).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);
