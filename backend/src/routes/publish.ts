/**
 * ApeAI — Publish Routes (Layer 4)
 *
 * POST /publish/jira/:documentId — Publish to Jira
 *
 * This is a thin wrapper that mounts the Jira router
 * under /publish for easy extension to future integrations.
 */

import { Router } from 'express';
import { jiraRouter } from '../integrations/jira/routes';

export const publishRouter = Router();

// Mount Jira publish routes under /publish
publishRouter.use('/', jiraRouter);
