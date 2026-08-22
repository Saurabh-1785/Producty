'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/services/api';
import { Cluster, Document, Integration } from '@/types/models';
import { useToast } from '@/components/ui/ToastProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  ExternalLink, 
  Layers, 
  Loader2, 
  AlertTriangle,
  Github,
  GitPullRequest,
  Check,
  Send
} from 'lucide-react';

type DocType = 'brd' | 'prd' | 'story' | 'task';

export default function DocumentReviewPage() {
  const params = useParams();
  const { toast } = useToast();
  const clusterId = params.cluster_id as string;

  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<DocType>('brd');
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states for the currently selected active document
  const [editTitle, setEditTitle] = useState('');
  const [editContentText, setEditContentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [clustersRes, docsRes, integrationsRes] = await Promise.all([
        api.getClusters(),
        api.getDocuments(clusterId),
        api.getIntegrations()
      ]);

      const current = clustersRes.clusters.find((c) => c.id === clusterId);
      if (!current) {
        throw new Error('Cluster not found');
      }
      setCluster(current);
      setDocuments(docsRes.documents || []);
      setIntegrations(integrationsRes.integrations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load document workspace');
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    if (clusterId) {
      loadData();
    }
  }, [clusterId, loadData]);

  // Track the active document
  const activeDocument = documents.find((d) => d.type === activeTab);

  // Sync edit states when active tab changes
  useEffect(() => {
    if (activeDocument) {
      setEditTitle(activeDocument.title || '');
      
      // Document content is stored as JSONB. Render it formatted in the edit textarea
      try {
        setEditContentText(JSON.stringify(activeDocument.content, null, 2));
      } catch {
        setEditContentText(String(activeDocument.content));
      }
    } else {
      setEditTitle('');
      setEditContentText('');
    }
  }, [activeTab, activeDocument]);

  const handleSave = async () => {
    if (!activeDocument) return;
    setSaving(true);
    try {
      let parsedContent = activeDocument.content;
      try {
        parsedContent = JSON.parse(editContentText);
      } catch {
        toast('Content is not valid JSON. Saving as plain text.', 'info');
        parsedContent = { text: editContentText };
      }

      await api.updateDocument(activeDocument.id, {
        title: editTitle,
        content: parsedContent,
      });

      toast('Document changes saved successfully!', 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to save document changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!activeDocument) return;
    setApproving(true);
    try {
      await api.approveDocument(activeDocument.id);
      // Wait a moment for webhook updates to sync
      await api.updateDocument(activeDocument.id, { status: 'approved' });
      toast('Document marked as approved! Publishing is now unlocked.', 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to approve document', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handlePublish = async (platform: 'github' | 'jira' | 'linear') => {
    if (!activeDocument) return;
    setPublishingPlatform(platform);
    toast(`Publishing issue to ${platform}...`, 'info');
    
    try {
      let res;
      if (platform === 'github') {
        res = await api.publishToGitHub(activeDocument.id);
      } else if (platform === 'jira') {
        res = await api.publishToJira(activeDocument.id);
      } else {
        res = await api.publishToLinear(activeDocument.id);
      }

      toast(`Successfully published to ${platform}!`, 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || `Failed to publish to ${platform}`, 'error');
      loadData(); // Reload to pick up 'failed' status transition
    } finally {
      setPublishingPlatform(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading document workspace...</p>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl space-y-2">
          <h3 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Workspace Error
          </h3>
          <p className="text-sm">{error || 'Cluster not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back & Title */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Inbox
          </Link>
          <Link 
            href={`/pipeline/${clusterId}`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            Open Stepper Pipeline
          </Link>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{cluster.title}</h2>
          <p className="text-sm text-slate-500 mt-1">Review & Edit AI draft specifications and publish them to external operational trackers.</p>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Document Tabs Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Document Stages</h3>
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5">
            {(['brd', 'prd', 'story', 'task'] as DocType[]).map((tab) => {
              const doc = documents.find((d) => d.type === tab);
              const isActive = activeTab === tab;
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 lg:flex-initial flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left whitespace-nowrap lg:whitespace-normal ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <span className="capitalize">{tab.toUpperCase()}</span>
                  {doc ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      v{doc.version}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-60 italic">Draft pending</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Document Editor Workspace */}
        <div className="lg:col-span-3 space-y-6">
          {!activeDocument ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-4">
              <AlertTriangle className="w-12 h-12 text-slate-300" />
              <div>
                <h4 className="font-bold text-slate-700">Document Draft Missing</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  This workflow document has not been generated by the AI client yet. Navigate to the Stepper Pipeline to trigger the creation of this document.
                </p>
              </div>
              <Link
                href={`/pipeline/${clusterId}`}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Go to Stepper Pipeline
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              {/* Card Header: Metadata Info */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-slate-800 text-base">Editing: {activeTab.toUpperCase()}</h4>
                    <StatusBadge status={activeDocument.status} />
                  </div>
                  <p className="text-xs text-slate-400">Last updated: {new Date(activeDocument.updated_at).toLocaleString()}</p>
                </div>
                
                {/* Integration Publishing Toolbar (Only active if approved, publishing, published, or failed) */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status checks */}
                  {['approved', 'publishing', 'published', 'failed'].includes(activeDocument.status) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 mr-1">Publish to:</span>
                      
                      {/* Jira */}
                      <button
                        onClick={() => handlePublish('jira')}
                        disabled={publishingPlatform !== null || activeDocument.status === 'publishing'}
                        className="flex items-center justify-center px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 disabled:opacity-50 transition-colors"
                        title="Publish to Jira Cloud"
                      >
                        {publishingPlatform === 'jira' ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-500" />
                        ) : (
                          <span>JIRA</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body: Text Editor Forms */}
              <div className="p-6 space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Content (JSON Format)</label>
                  <textarea
                    value={editContentText}
                    onChange={(e) => setEditContentText(e.target.value)}
                    rows={16}
                    className="w-full text-xs font-mono border border-slate-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 focus:bg-white leading-relaxed"
                  />
                </div>
              </div>

              {/* Card Footer: Save & Approve Buttons */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  {activeDocument.ticket_links && activeDocument.ticket_links.length > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-bold text-emerald-800">
                        Published ticket: 
                      </span>
                      <a 
                        href={activeDocument.ticket_links[0].external_url || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-0.5"
                      >
                        {activeDocument.ticket_links[0].external_id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">Draft changes will auto-increment version records.</p>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>

                  {activeDocument.status === 'draft' && (
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {approving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve & Publish Gate
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
