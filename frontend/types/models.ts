export interface Cluster {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  feedback_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  cluster_id: string;
  type: 'brd' | 'prd' | 'epic' | 'story' | 'task' | 'sprint_plan';
  title: string | null;
  content: any;
  version: number;
  parent_id: string | null;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'publishing' | 'published' | 'failed';
  created_at: string;
  updated_at: string;
  ticket_links?: TicketLink[];
}

export interface Integration {
  id: string;
  type: 'github' | 'jira' | 'linear';
  name: string;
  api_key?: string;
  project_id: string | null;
  api_url: string | null;
  config: any;
  is_active: boolean;
  created_at: string;
}

export interface TicketLink {
  id: string;
  document_id: string;
  integration_id: string;
  external_id: string;
  external_url: string | null;
  external_status: string | null;
  created_at: string;
  integration?: Integration;
}

export interface IngestedFeedback {
  id: string;
  content: string;
  source: string;
  customer_id?: string;
  cluster_id?: string;
  created_at: string;
}
