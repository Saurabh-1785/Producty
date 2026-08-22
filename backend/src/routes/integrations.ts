/**
 * ApeAI — Integration Routes
 *
 * POST   /integrations       — Create integration
 * GET    /integrations       — List integrations
 * PATCH  /integrations/:id  — Update integration
 * DELETE /integrations/:id  — Delete integration
 *
 * Mirrors Python routes/documents.py (integration_router).
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  createIntegration,
  listIntegrations,
  updateIntegration,
  deleteIntegration,
} from '../services/documentService';
import { IntegrationCreate, IntegrationUpdate } from '../types/storage';

export const integrationsRouter = Router();

type DbRow = Record<string, unknown>;

function integrationToResponse(i: DbRow) {
  return {
    id: i['id'] ?? '',
    type: i['type'] ?? '',
    name: i['name'] ?? '',
    api_url: i['api_url'] ?? null,
    project_id: i['project_id'] ?? null,
    config: (i['config'] ?? {}) as Record<string, unknown>,
    is_active: i['is_active'] ?? true,
    created_at: String(i['created_at'] ?? ''),
    updated_at: String(i['updated_at'] ?? ''),
  };
}

// POST /integrations
integrationsRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as IntegrationCreate;
    try {
      const integration = await createIntegration({
        intType: body.type,
        name: body.name,
        apiKey: body.api_key,
        apiUrl: body.api_url,
        projectId: body.project_id,
        config: body.config,
      });
      res.status(201).json(integrationToResponse(integration));
    } catch (err) {
      next(err);
    }
  },
);

// GET /integrations
integrationsRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const q = req.query as Record<string, string>;
    const activeOnly = q['active_only'] !== 'false'; // default true
    try {
      const result = await listIntegrations({
        intType: q['type'],
        activeOnly,
      });
      res.json({
        integrations: result.integrations.map(integrationToResponse),
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /integrations/:integrationId
integrationsRouter.patch(
  '/:integrationId',
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as IntegrationUpdate;
    try {
      const integration = await updateIntegration(req.params['integrationId']!, {
        name: body.name,
        apiKey: body.api_key,
        apiUrl: body.api_url,
        projectId: body.project_id,
        config: body.config,
        isActive: body.is_active,
      });
      res.json(integrationToResponse(integration));
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);

// DELETE /integrations/:integrationId
integrationsRouter.delete(
  '/:integrationId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteIntegration(req.params['integrationId']!);
      res.json({ message: `Integration ${req.params['integrationId']} deleted` });
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        res.status(404).json({ detail: err.message });
        return;
      }
      next(err);
    }
  },
);
