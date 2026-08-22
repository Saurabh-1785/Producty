/**
 * ApeAI — Publish Service
 *
 * Orchestrates publishing approved documents to external platforms.
 * Mirrors Python services/publish_service.py.
 */

import { getSupabaseClient } from '../db/supabase';
import { getDocument, createTicketLink } from './documentService';

type DbRow = Record<string, unknown>;

export function toUniversalFormat(doc: DbRow): DbRow {
  const docType = doc['type'] as string;
  const content = (doc['content'] ?? {}) as DbRow;

  if (docType === 'story') {
    const title = (doc['title'] ?? content['title'] ?? 'Unnamed Story') as string;
    const userRole = (content['user_role'] ?? '') as string;
    const req = (content['requirement'] ?? '') as string;
    const benefit = (content['benefit'] ?? '') as string;
    const acList = (content['acceptance_criteria'] ?? []) as string[];
    const priority = (content['priority'] ?? 'Medium') as string;

    let description = `${userRole}\n${req}\n${benefit}\n\n### Acceptance Criteria\n`;
    for (const ac of acList) {
      description += `- ${ac}\n`;
    }

    return {
      title,
      description: description.trim(),
      priority,
      labels: ['user-story', 'story'],
      assignee: null,
    };
  }

  if (docType === 'task') {
    const title = (doc['title'] ?? 'Unnamed Task') as string;
    const storyTitle = (content['story_title'] ?? '') as string;
    const frontendTasks = (content['frontend_tasks'] ?? []) as string[];
    const backendTasks = (content['backend_tasks'] ?? []) as string[];
    const testingTasks = (content['testing_tasks'] ?? []) as string[];
    const complexity = (content['estimated_complexity'] ?? 'Medium') as string;
    const dependencies = (content['dependencies'] ?? []) as string[];

    let description = `**Story Ref:** ${storyTitle}\n\n`;
    if (frontendTasks.length) {
      description += '### Frontend Tasks\n';
      frontendTasks.forEach((t) => (description += `- [ ] ${t}\n`));
      description += '\n';
    }
    if (backendTasks.length) {
      description += '### Backend Tasks\n';
      backendTasks.forEach((t) => (description += `- [ ] ${t}\n`));
      description += '\n';
    }
    if (testingTasks.length) {
      description += '### Testing Tasks\n';
      testingTasks.forEach((t) => (description += `- [ ] ${t}\n`));
      description += '\n';
    }
    description += `**Complexity:** ${complexity}\n`;
    if (dependencies.length) {
      description += `**Dependencies:** ${dependencies.join(', ')}\n`;
    }

    return {
      title,
      description: description.trim(),
      priority: 'Medium',
      labels: ['technical-task', 'task'],
      assignee: null,
    };
  }

  // Generic fallback
  return {
    title: (doc['title'] ?? 'AI Document') as string,
    description: (content['summary'] ?? doc['summary'] ?? JSON.stringify(content)) as string,
    priority: 'Medium',
    labels: docType ? [docType] : [],
    assignee: null,
  };
}

export async function publishDocument(
  documentId: string,
  integrationId: string,
): Promise<DbRow> {
  const db = getSupabaseClient();

  // 1. Fetch document
  const doc = await getDocument(documentId);

  // 2. Fetch integration
  const { data: intData, error: intError } = await db
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .single();
  if (intError || !intData) throw new Error(`Integration not found: ${integrationId}`);
  const integration = intData as DbRow;

  // 3. Prevent duplicate publishing
  const { data: existing } = await db
    .from('ticket_links')
    .select('*')
    .eq('document_id', documentId)
    .eq('integration_id', integrationId);
  if (existing && existing.length > 0) {
    throw new Error(
      `Document ${documentId} has already been published to integration ${integrationId}`,
    );
  }

  // 4. Must be approved or published
  if (doc['status'] !== 'approved' && doc['status'] !== 'published') {
    throw new Error(
      `Only approved or published documents can be published. Current status: ${doc['status']}`,
    );
  }

  console.info(`🔄 Publishing document ${documentId} to integration ${integrationId}...`);

  try {
    const universalTask = toUniversalFormat(doc);
    const intType = integration['type'] as string;
    let result: DbRow;

    if (intType === 'jira') {
      const { publishToJira } = await import('../integrations/jira/client');
      result = await publishToJira(universalTask, integration);
    } else if (intType === 'github' || intType === 'linear') {
      throw new Error(`${intType} integration is not yet implemented`);
    } else {
      throw new Error(`Unsupported integration type: ${intType}`);
    }

    // Create ticket link
    const link = await createTicketLink({
      documentId,
      integrationId,
      externalId: result['external_id'] as string,
      externalUrl: result['external_url'] as string | undefined,
      externalStatus: (result['external_status'] as string | undefined) ?? 'Open',
    });

    // Transition to published
    await db.from('documents').update({ status: 'published' }).eq('id', documentId);
    console.info(
      `✅ Successfully published document ${documentId} as ticket ${result['external_id']}`,
    );

    return {
      success: true,
      ticket_link: link,
      external_url: result['external_url'],
      external_id: result['external_id'],
    };
  } catch (err) {
    console.error(`❌ Failed to publish document ${documentId}:`, err);
    // Revert to approved so user can retry
    try {
      await db.from('documents').update({ status: 'approved' }).eq('id', documentId);
    } catch (re) {
      console.error('Failed to reset document status:', re);
    }
    throw err;
  }
}
