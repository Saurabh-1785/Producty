/**
 * ApeAI — Document Service
 *
 * Manages AI-generated documents (BRD, PRD, epics, stories, tasks).
 * Also handles the human review/approval workflow and integrations.
 * Mirrors Python services/document_service.py exactly.
 */

import { getSupabaseClient } from '../db/supabase';

type DbRow = Record<string, unknown>;

// ─── Document CRUD ─────────────────────────────────────────────

export async function createDocument(params: {
  clusterId: string;
  docType: string;
  title?: string;
  content?: DbRow;
  parentId?: string;
}): Promise<DbRow> {
  const db = getSupabaseClient();
  const { clusterId, docType, title, content, parentId } = params;

  const docData = {
    cluster_id: clusterId,
    type: docType,
    title: title ?? null,
    content: content ?? {},
    parent_id: parentId ?? null,
    status: 'draft',
    version: 1,
  };

  const { data, error } = await db.from('documents').insert(docData).select().single();
  if (error || !data) throw new Error(`Failed to create document: ${error?.message}`);

  const doc = data as DbRow;
  console.info(`✅ Document created: ${doc['id']} — type=${docType}, cluster=${clusterId}`);
  return doc;
}

export async function getDocument(documentId: string): Promise<DbRow> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error || !data) throw new Error(`Document not found: ${documentId}`);
  return data as DbRow;
}

export async function listDocuments(params: {
  clusterId?: string;
  docType?: string;
  status?: string;
  parentId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ documents: DbRow[]; total: number }> {
  const db = getSupabaseClient();
  const { clusterId, docType, status, parentId, limit = 50, offset = 0 } = params;

  let query = db
    .from('documents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (clusterId) query = query.eq('cluster_id', clusterId);
  if (docType) query = query.eq('type', docType);
  if (status) query = query.eq('status', status);
  if (parentId) query = query.eq('parent_id', parentId);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list documents: ${error.message}`);

  return {
    documents: (data ?? []) as DbRow[],
    total: count ?? (data ?? []).length,
  };
}

export async function updateDocument(
  documentId: string,
  updates: { title?: string; content?: DbRow; status?: string },
): Promise<DbRow> {
  const db = getSupabaseClient();
  const updateData: DbRow = {};

  if (updates.title !== undefined) updateData['title'] = updates.title;
  if (updates.content !== undefined) updateData['content'] = updates.content;
  if (updates.status !== undefined) updateData['status'] = updates.status;

  if (Object.keys(updateData).length === 0) throw new Error('No fields to update');

  // Increment version if content changes
  if (updates.content !== undefined) {
    const current = await getDocument(documentId);
    updateData['version'] = ((current['version'] as number) ?? 1) + 1;
  }

  const { data, error } = await db
    .from('documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single();

  if (error || !data) throw new Error(`Document not found: ${documentId}`);
  console.info(`✅ Document updated: ${documentId}`);
  return data as DbRow;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('documents')
    .delete()
    .eq('id', documentId)
    .select();

  if (error) throw new Error(`Failed to delete document: ${error.message}`);
  if (!data || (data as DbRow[]).length === 0)
    throw new Error(`Document not found: ${documentId}`);
  console.info(`🗑️  Document deleted: ${documentId}`);
}

// ─── Approval / Review Gate ────────────────────────────────────

export async function createApproval(params: {
  documentId: string;
  approved: boolean;
  reviewedBy: string;
  reviewNotes?: string;
  editedContent?: DbRow;
}): Promise<DbRow> {
  const db = getSupabaseClient();
  const { documentId, approved, reviewedBy, reviewNotes, editedContent } = params;

  const doc = await getDocument(documentId);
  const originalContent = doc['content'];

  const approvalData = {
    document_id: documentId,
    approved,
    reviewed_by: reviewedBy,
    review_notes: reviewNotes ?? null,
    original_content: originalContent,
    edited_content: editedContent ?? null,
  };

  const { data, error } = await db.from('approvals').insert(approvalData).select().single();
  if (error || !data) throw new Error(`Failed to create approval: ${error?.message}`);

  // Update document status
  const newStatus = approved ? 'approved' : 'rejected';
  await db.from('documents').update({ status: newStatus }).eq('id', documentId);

  // If approved with edits, update document content
  if (approved && editedContent) {
    await updateDocument(documentId, { content: editedContent, status: 'approved' });
    console.info(`📝 Document ${documentId} content updated with reviewer edits`);
  }

  // Update cluster status if this is a significant approval
  if (approved) {
    const docType = doc['type'] as string;
    const statusMap: Record<string, string> = {
      brd: 'brd_generated',
      prd: 'prd_generated',
      story: 'stories_generated',
      task: 'tasks_generated',
    };
    if (statusMap[docType] && doc['cluster_id']) {
      await db
        .from('clusters')
        .update({ status: statusMap[docType] })
        .eq('id', doc['cluster_id']);
    }
  }

  const action = approved ? 'approved' : 'rejected';
  console.info(`✅ Document ${documentId} ${action} by ${reviewedBy}`);
  return data as DbRow;
}

export async function listApprovals(params: {
  documentId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ approvals: DbRow[]; total: number }> {
  const db = getSupabaseClient();
  const { documentId, limit = 50, offset = 0 } = params;

  let query = db
    .from('approvals')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (documentId) query = query.eq('document_id', documentId);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list approvals: ${error.message}`);

  return {
    approvals: (data ?? []) as DbRow[],
    total: count ?? (data ?? []).length,
  };
}

// ─── Integration Config ────────────────────────────────────────

export async function createIntegration(params: {
  intType: string;
  name: string;
  apiKey: string;
  apiUrl?: string;
  projectId?: string;
  config?: DbRow;
}): Promise<DbRow> {
  const db = getSupabaseClient();

  const intData = {
    type: params.intType,
    name: params.name,
    api_key: params.apiKey,
    api_url: params.apiUrl ?? null,
    project_id: params.projectId ?? null,
    config: params.config ?? {},
    is_active: true,
  };

  const { data, error } = await db.from('integrations').insert(intData).select().single();
  if (error || !data) throw new Error(`Failed to create integration: ${error?.message}`);

  const row = data as DbRow;
  console.info(`✅ Integration created: ${row['id']} — type=${params.intType}, name=${params.name}`);
  return row;
}

export async function listIntegrations(params: {
  intType?: string;
  activeOnly?: boolean;
}): Promise<{ integrations: DbRow[]; total: number }> {
  const db = getSupabaseClient();
  const { intType, activeOnly = true } = params;

  let query = db.from('integrations').select('*').order('created_at', { ascending: false });

  if (intType) query = query.eq('type', intType);
  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list integrations: ${error.message}`);

  // Mask API keys
  const integrations = (data ?? []).map((row) => ({
    ...(row as DbRow),
    api_key: '***masked***',
  }));

  return { integrations, total: integrations.length };
}

export async function updateIntegration(
  integrationId: string,
  updates: {
    name?: string;
    apiKey?: string;
    apiUrl?: string;
    projectId?: string;
    config?: DbRow;
    isActive?: boolean;
  },
): Promise<DbRow> {
  const db = getSupabaseClient();
  const updateData: DbRow = {};

  if (updates.name !== undefined) updateData['name'] = updates.name;
  if (updates.apiKey !== undefined) updateData['api_key'] = updates.apiKey;
  if (updates.apiUrl !== undefined) updateData['api_url'] = updates.apiUrl;
  if (updates.projectId !== undefined) updateData['project_id'] = updates.projectId;
  if (updates.config !== undefined) updateData['config'] = updates.config;
  if (updates.isActive !== undefined) updateData['is_active'] = updates.isActive;

  if (Object.keys(updateData).length === 0) throw new Error('No fields to update');

  const { data, error } = await db
    .from('integrations')
    .update(updateData)
    .eq('id', integrationId)
    .select()
    .single();

  if (error || !data) throw new Error(`Integration not found: ${integrationId}`);
  console.info(`✅ Integration updated: ${integrationId}`);
  return data as DbRow;
}

export async function deleteIntegration(integrationId: string): Promise<void> {
  const db = getSupabaseClient();

  const { data, error } = await db
    .from('integrations')
    .delete()
    .eq('id', integrationId)
    .select();

  if (error) throw new Error(`Failed to delete integration: ${error.message}`);
  if (!data || (data as DbRow[]).length === 0)
    throw new Error(`Integration not found: ${integrationId}`);
  console.info(`🗑️  Integration deleted: ${integrationId}`);
}

// ─── Ticket Links ──────────────────────────────────────────────

export async function createTicketLink(params: {
  documentId: string;
  integrationId: string;
  externalId: string;
  externalUrl?: string;
  externalStatus?: string;
}): Promise<DbRow> {
  const db = getSupabaseClient();

  const linkData = {
    document_id: params.documentId,
    integration_id: params.integrationId,
    external_id: params.externalId,
    external_url: params.externalUrl ?? null,
    external_status: params.externalStatus ?? null,
  };

  const { data, error } = await db.from('ticket_links').insert(linkData).select().single();
  if (error || !data) throw new Error(`Failed to create ticket link: ${error?.message}`);

  // Update cluster status to 'tickets_created'
  const doc = await getDocument(params.documentId);
  if (doc['cluster_id']) {
    await db
      .from('clusters')
      .update({ status: 'tickets_created' })
      .eq('id', doc['cluster_id']);
  }

  console.info(`✅ Ticket link created: doc=${params.documentId} → ${params.externalUrl ?? params.externalId}`);
  return data as DbRow;
}

export async function listTicketLinks(documentId?: string): Promise<DbRow[]> {
  const db = getSupabaseClient();

  let query = db
    .from('ticket_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (documentId) query = query.eq('document_id', documentId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list ticket links: ${error.message}`);
  return (data ?? []) as DbRow[];
}

// ─── Pipeline Overview ─────────────────────────────────────────

export async function getPipelineStatus(): Promise<DbRow> {
  const db = getSupabaseClient();

  const { count: feedbackCount } = await db
    .from('feedback')
    .select('id', { count: 'exact', head: true });

  const { count: embeddedCount } = await db
    .from('embeddings')
    .select('id', { count: 'exact', head: true });

  const { data: clusters } = await db.from('clusters').select('status');
  const clustersByStatus: Record<string, number> = {};
  for (const row of (clusters ?? []) as DbRow[]) {
    const s = (row['status'] as string) ?? 'unknown';
    clustersByStatus[s] = (clustersByStatus[s] ?? 0) + 1;
  }

  const { data: documents } = await db.from('documents').select('type, status');
  const docsByType: Record<string, number> = {};
  const docsByStatus: Record<string, number> = {};
  for (const row of (documents ?? []) as DbRow[]) {
    const t = (row['type'] as string) ?? 'unknown';
    const s = (row['status'] as string) ?? 'unknown';
    docsByType[t] = (docsByType[t] ?? 0) + 1;
    docsByStatus[s] = (docsByStatus[s] ?? 0) + 1;
  }

  const { count: approvalCount } = await db
    .from('approvals')
    .select('id', { count: 'exact', head: true });

  const fc = feedbackCount ?? 0;
  const ec = embeddedCount ?? 0;

  return {
    total_feedback: fc,
    total_embedded: ec,
    total_unembedded: fc - ec,
    total_clusters: (clusters ?? []).length,
    clusters_by_status: clustersByStatus,
    total_documents: (documents ?? []).length,
    documents_by_type: docsByType,
    documents_by_status: docsByStatus,
    total_approvals: approvalCount ?? 0,
    pending_reviews: docsByStatus['review'] ?? 0,
  };
}
