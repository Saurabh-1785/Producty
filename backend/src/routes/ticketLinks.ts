/**
 * ApeAI — Ticket Link Routes
 *
 * POST /ticket-links  — Create ticket link
 * GET  /ticket-links  — List ticket links
 *
 * Mirrors Python routes/documents.py (ticket_router).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createTicketLink, listTicketLinks } from '../services/documentService';
import { TicketLinkCreate } from '../types/storage';

export const ticketLinksRouter = Router();

type DbRow = Record<string, unknown>;

// POST /ticket-links
ticketLinksRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as TicketLinkCreate;
    try {
      const link = await createTicketLink({
        documentId: body.document_id,
        integrationId: body.integration_id,
        externalId: body.external_id,
        externalUrl: body.external_url,
        externalStatus: body.external_status,
      });
      res.status(201).json({
        id: link['id'] ?? '',
        document_id: link['document_id'] ?? '',
        integration_id: link['integration_id'] ?? '',
        external_id: link['external_id'] ?? '',
        external_url: link['external_url'] ?? null,
        external_status: link['external_status'] ?? null,
        synced_at: String(link['synced_at'] ?? ''),
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /ticket-links
ticketLinksRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const documentId = req.query['document_id'] as string | undefined;
    try {
      const links = await listTicketLinks(documentId);
      res.json({ ticket_links: links, total: links.length });
    } catch (err) {
      next(err);
    }
  },
);
