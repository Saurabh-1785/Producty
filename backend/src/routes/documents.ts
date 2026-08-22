/**
 * ApeAI — Document Routes (Layer 2)
 *
 * POST   /documents        — Create document
 * GET    /documents        — List documents (filters)
 * GET    /documents/:id    — Get document
 * PATCH  /documents/:id    — Update document
 * DELETE /documents/:id    — Delete document
 *
 * Mirrors Python routes/documents.py.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
} from '../services/documentService';
import { DocumentCreate, DocumentUpdate } from '../types/storage';

export const documentsRouter = Router();

type DbRow = Record<string, unknown>;

function docToResponse(doc: DbRow) {
  return {
    id: doc['id'] ?? '',
    cluster_id: doc['cluster_id'] ?? '',
    type: doc['type'] ?? '',
    title: doc['title'] ?? null,
    content: (doc['content'] ?? {}) as Record<string, unknown>,
    version: doc['version'] ?? 1,
    parent_id: doc['parent_id'] ?? null,
    status: doc['status'] ?? 'draft',
    created_at: String(doc['created_at'] ?? ''),
    updated_at: String(doc['updated_at'] ?? ''),
  };
}

// POST /documents
documentsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as DocumentCreate;
    try {
      const doc = await createDocument({
        clusterId: body.cluster_id,
        docType: body.type,
        title: body.title,
        content: body.content,
        parentId: body.parent_id,
      });
      res.status(201).json(docToResponse(doc));
    } catch (err) {
      next(err);
    }
  },
);

// GET /documents
documentsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const q = req.query as Record<string, string>;
    try {
      const result = await listDocuments({
        clusterId: q['cluster_id'],
        docType: q['type'],
        status: q['status'],
        parentId: q['parent_id'],
        limit: parseInt(q['limit'] ?? '50', 10),
        offset: parseInt(q['offset'] ?? '0', 10),
      });
      res.json({
        documents: result.documents.map(docToResponse),
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /documents/:documentId
documentsRouter.get(
  '/:documentId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await getDocument(req.params['documentId']!);
      res.json(docToResponse(doc));
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// PATCH /documents/:documentId
documentsRouter.patch(
  '/:documentId',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as DocumentUpdate;
    try {
      const doc = await updateDocument(req.params['documentId']!, {
        title: body.title,
        content: body.content,
        status: body.status,
      });
      res.json(docToResponse(doc));
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// DELETE /documents/:documentId
documentsRouter.delete(
  '/:documentId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteDocument(req.params['documentId']!);
      res.json({ message: `Document ${req.params['documentId']} deleted` });
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);
