import { Cluster, Document, Integration, IngestedFeedback } from '../types/models';
import { supabase } from '../lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      errMsg = data.detail || data.message || errMsg;
    } catch {
      // Ignored if not JSON
    }
    throw new Error(errMsg);
  }

  // Handle empty bodies (e.g. 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  // --- INGESTION (Layer 1) ---
  async ingestManualFeedback(content: string, author: string = 'anonymous'): Promise<any> {
    return request<any>('/feedback/manual', {
      method: 'POST',
      body: JSON.stringify({ content, author }),
    });
  },

  async ingestCSVFeedback(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}/feedback/csv`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status}`;
      try {
        const data = await response.json();
        errMsg = data.detail || data.message || errMsg;
      } catch {
        // Ignored
      }
      throw new Error(errMsg);
    }
    return response.json();
  },

  async getFeedbackStats(): Promise<any> {
    return request<any>('/feedback/stats');
  },

  async getRecentFeedbacks(limit: number = 50): Promise<any> {
    return request<any>(`/feedback/recent?limit=${limit}`);
  },

  // --- MULTI-SOURCE INGESTION (Layer 1) ---
  async simulateIngestion(source: string): Promise<any> {
    return request<any>(`/api/ingestion/simulate/${source}`, { method: 'POST' });
  },

  async getIngestionStatus(): Promise<any> {
    return request<any>('/api/ingestion/status');
  },

  async ingestAppStoreReviews(reviews: any[]): Promise<any> {
    return request<any>('/api/ingestion/appstore', {
      method: 'POST',
      body: JSON.stringify(reviews),
    });
  },

  async ingestRedditPosts(posts: any[]): Promise<any> {
    return request<any>('/api/ingestion/reddit', {
      method: 'POST',
      body: JSON.stringify(posts),
    });
  },

  // --- CLUSTERING & PIPELINE (Layer 3) ---
  async getClusters(): Promise<{ clusters: Cluster[] }> {
    return request<{ clusters: Cluster[] }>('/clusters');
  },

  async triggerClustering(): Promise<any> {
    return request<any>('/pipeline/cluster', { method: 'POST' });
  },

  async getPipelineStatus(): Promise<any> {
    return request<any>('/pipeline/status');
  },

  async triggerSummarization(clusterId: string): Promise<any> {
    return request<any>(`/pipeline/summarize/${clusterId}`, { method: 'POST' });
  },

  async triggerBRD(clusterId: string): Promise<any> {
    return request<any>(`/pipeline/generate-brd/${clusterId}`, { method: 'POST' });
  },

  async triggerPRD(clusterId: string, brdId: string): Promise<any> {
    return request<any>(`/pipeline/generate-prd/${clusterId}?brd_id=${brdId}`, { method: 'POST' });
  },

  async triggerStories(clusterId: string, prdId: string): Promise<any> {
    return request<any>(`/pipeline/generate-stories/${clusterId}?prd_id=${prdId}`, { method: 'POST' });
  },

  async triggerTasks(storyId: string, clusterId: string): Promise<any> {
    return request<any>(`/pipeline/generate-tasks/${storyId}?cluster_id=${clusterId}`, { method: 'POST' });
  },

  // --- DOCUMENTS (Human-in-the-Loop) ---
  async getDocuments(clusterId?: string, type?: string): Promise<{ documents: Document[] }> {
    const params = new URLSearchParams();
    if (clusterId) params.append('cluster_id', clusterId);
    if (type) params.append('type', type);
    return request<{ documents: Document[] }>(`/documents?${params.toString()}`);
  },

  async getDocument(documentId: string): Promise<Document> {
    return request<Document>(`/documents/${documentId}`);
  },

  async updateDocument(documentId: string, payload: { title?: string; content?: any; status?: string }): Promise<Document> {
    return request<Document>(`/documents/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async approveDocument(documentId: string, approvedBy: string = 'Human Admin'): Promise<any> {
    // Creates an approval entry
    return request<any>('/approvals', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        approved: true,
        reviewed_by: approvedBy,
        review_notes: 'Approved via human review portal'
      }),
    });
  },

  // --- INTEGRATIONS & PUBLISHING (Layer 4) ---
  async getIntegrations(): Promise<{ integrations: Integration[] }> {
    return request<{ integrations: Integration[] }>('/integrations');
  },

  async createIntegration(payload: Partial<Integration>): Promise<Integration> {
    return request<Integration>('/integrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteIntegration(integrationId: string): Promise<any> {
    return request<any>(`/integrations/${integrationId}`, {
      method: 'DELETE',
    });
  },

  async publishToGitHub(documentId: string, integrationId?: string): Promise<any> {
    const url = `/publish/github/${documentId}${integrationId ? `?integration_id=${integrationId}` : ''}`;
    return request<any>(url, { method: 'POST' });
  },

  async publishToJira(documentId: string, integrationId?: string): Promise<any> {
    const url = `/publish/jira/${documentId}${integrationId ? `?integration_id=${integrationId}` : ''}`;
    return request<any>(url, { method: 'POST' });
  },

  async publishToLinear(documentId: string, integrationId?: string): Promise<any> {
    const url = `/publish/linear/${documentId}${integrationId ? `?integration_id=${integrationId}` : ''}`;
    return request<any>(url, { method: 'POST' });
  },
};
