/**
 * ApeAI — TypeScript Types for Layer 2 Storage
 *
 * Mirrors Python Pydantic models in models/storage.py.
 * Covers clusters, documents, approvals, integrations,
 * embeddings, and ticket links.
 */

// ─── Enums ────────────────────────────────────────────────────

export type ClusterStatus =
  | 'new'
  | 'clustered'
  | 'brd_generated'
  | 'prd_generated'
  | 'stories_generated'
  | 'tasks_generated'
  | 'approved'
  | 'tickets_created'
  | 'archived';

export type DocumentType = 'brd' | 'prd' | 'epic' | 'story' | 'task' | 'sprint_plan';

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'published';

export type IntegrationType = 'jira' | 'github' | 'linear' | 'notion';

// ─── Embedding Types ─────────────────────────────────────────

export interface EmbeddingCreate {
  feedback_id: string;
}

export interface EmbeddingResponse {
  id: string;
  feedback_id: string;
  model: string;
  dimensions: number;
  created_at: string;
  message: string;
}

export interface EmbeddingBatchCreate {
  feedback_ids?: string[];
}

export interface EmbeddingBatchResponse {
  total: number;
  created: number;
  skipped: number;
  errors: Array<Record<string, unknown>>;
  message: string;
}

export interface SimilaritySearchRequest {
  text?: string;
  feedback_id?: string;
  match_count?: number;
  match_threshold?: number;
}

export interface SimilarFeedback {
  feedback_id: string;
  content: string;
  source: string;
  similarity: number;
}

export interface SimilaritySearchResponse {
  query: string;
  results: SimilarFeedback[];
  count: number;
}

// ─── Cluster Types ────────────────────────────────────────────

export interface ClusterCreate {
  title: string;
  summary?: string;
  feedback_ids?: string[];
  confidence_score?: number;
}

export interface ClusterUpdate {
  title?: string;
  summary?: string;
  status?: ClusterStatus;
  confidence_score?: number;
}

export interface ClusterAddFeedback {
  feedback_ids: string[];
  similarity_scores?: number[];
}

export interface ClusterResponse {
  id: string;
  title?: string;
  summary?: string;
  feedback_count: number;
  confidence_score: number;
  status: string;
  created_at: string;
  updated_at: string;
  feedback_items: Array<Record<string, unknown>>;
}

export interface ClusterListResponse {
  clusters: ClusterResponse[];
  total: number;
}

// ─── Document Types ───────────────────────────────────────────

export interface DocumentCreate {
  cluster_id: string;
  type: DocumentType;
  title?: string;
  content?: Record<string, unknown>;
  parent_id?: string;
}

export interface DocumentUpdate {
  title?: string;
  content?: Record<string, unknown>;
  status?: DocumentStatus;
}

export interface DocumentResponse {
  id: string;
  cluster_id: string;
  type: string;
  title?: string;
  content: Record<string, unknown>;
  version: number;
  parent_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
}

// ─── Approval Types ───────────────────────────────────────────

export interface ApprovalCreate {
  document_id: string;
  approved: boolean;
  reviewed_by: string;
  review_notes?: string;
  edited_content?: Record<string, unknown>;
}

export interface ApprovalResponse {
  id: string;
  document_id: string;
  approved: boolean;
  reviewed_by: string;
  review_notes?: string;
  has_edits: boolean;
  reviewed_at: string;
  message: string;
}

export interface ApprovalListResponse {
  approvals: ApprovalResponse[];
  total: number;
}

// ─── Integration Types ────────────────────────────────────────

export interface IntegrationCreate {
  type: IntegrationType;
  name: string;
  api_key: string;
  api_url?: string;
  project_id?: string;
  config?: Record<string, unknown>;
}

export interface IntegrationUpdate {
  name?: string;
  api_key?: string;
  api_url?: string;
  project_id?: string;
  config?: Record<string, unknown>;
  is_active?: boolean;
}

export interface IntegrationResponse {
  id: string;
  type: string;
  name: string;
  api_url?: string;
  project_id?: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationListResponse {
  integrations: IntegrationResponse[];
  total: number;
}

// ─── Ticket Link Types ────────────────────────────────────────

export interface TicketLinkCreate {
  document_id: string;
  integration_id: string;
  external_id: string;
  external_url?: string;
  external_status?: string;
}

export interface TicketLinkResponse {
  id: string;
  document_id: string;
  integration_id: string;
  external_id: string;
  external_url?: string;
  external_status?: string;
  synced_at: string;
}

// ─── Pipeline Status ──────────────────────────────────────────

export interface PipelineStatus {
  total_feedback: number;
  total_embedded: number;
  total_unembedded: number;
  total_clusters: number;
  clusters_by_status: Record<string, number>;
  total_documents: number;
  documents_by_type: Record<string, number>;
  documents_by_status: Record<string, number>;
  total_approvals: number;
  pending_reviews: number;
}
