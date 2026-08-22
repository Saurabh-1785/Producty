/**
 * ApeAI — Approval Routes
 *
 * POST /approvals  — Submit review (approve/reject)
 * GET  /approvals  — List approvals
 *
 * Mirrors Python routes/documents.py (approval_router).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createApproval, listApprovals } from '../services/documentService';
import { ApprovalCreate } from '../types/storage';

export const approvalsRouter = Router();

type DbRow = Record<string, unknown>;

function approvalToResponse(a: DbRow) {
  return {
    id: a['id'] ?? '',
    document_id: a['document_id'] ?? '',
    approved: a['approved'] ?? false,
    reviewed_by: a['reviewed_by'] ?? '',
    review_notes: a['review_notes'] ?? null,
    has_edits: a['edited_content'] != null,
    reviewed_at: String(a['reviewed_at'] ?? ''),
    message: a['approved'] ? 'approved' : 'rejected',
  };
}

// POST /approvals
approvalsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as ApprovalCreate;
    if (!body.document_id || !body.reviewed_by) {
      res.status(422).json({ detail: "'document_id' and 'reviewed_by' are required" });
      return;
    }
    try {
      const approval = await createApproval({
        documentId: body.document_id,
        approved: body.approved,
        reviewedBy: body.reviewed_by,
        reviewNotes: body.review_notes,
        editedContent: body.edited_content,
      });
      res.status(201).json(approvalToResponse(approval));
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// GET /approvals
approvalsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const q = req.query as Record<string, string>;
    try {
      const result = await listApprovals({
        documentId: q['document_id'],
        limit: parseInt(q['limit'] ?? '50', 10),
        offset: parseInt(q['offset'] ?? '0', 10),
      });
      res.json({
        approvals: result.approvals.map(approvalToResponse),
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);
