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
  Check,
  Eye,
  Edit2,
  Target,
  TrendingUp,
  Users,
  Shield,
  CheckSquare,
  Activity,
  FileText,
  Layout,
  Server
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
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');

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

  const renderCleanView = () => {
    let data: any = null;
    try {
      data = JSON.parse(editContentText);
    } catch (err) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Invalid JSON Format
          </div>
          <p className="text-xs">
            The editor currently contains invalid JSON. Please switch back to the <strong>Edit JSON</strong> tab to correct syntax errors before previewing.
          </p>
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Open Editor
          </button>
        </div>
      );
    }

    if (!data) return <p className="text-slate-400 italic text-sm text-center py-12">No content available.</p>;

    switch (activeTab) {
      case 'brd':
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{data.title || 'Business Requirements Document'}</h3>
            </div>

            {data.problem_statement && (
              <div className="bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-indigo-100 rounded-xl p-5 shadow-xs">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4" />
                  Problem Statement
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">{data.problem_statement}</p>
              </div>
            )}

            {data.business_impact && (
              <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-100 rounded-xl p-5 shadow-xs">
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Business Impact
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">{data.business_impact}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  Business Goals
                </h4>
                <ul className="space-y-2">
                  {Array.isArray(data.goals) && data.goals.map((goal: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-600 font-semibold flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">{idx + 1}</span>
                      <span className="pt-0.5">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-500" />
                  Target Stakeholders
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(data.target_stakeholders) && data.target_stakeholders.map((sh: string, idx: number) => (
                    <span key={idx} className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full shadow-xs">
                      {sh}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-500" />
                  Success Metrics
                </h4>
                <ul className="space-y-2">
                  {Array.isArray(data.success_metrics) && data.success_metrics.map((metric: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-600 font-semibold flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-600 text-[10px] font-bold">✓</span>
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'prd':
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{data.title || 'Product Requirements Document'}</h3>
            </div>

            {Array.isArray(data.user_flows) && data.user_flows.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Experience Flows</h4>
                <div className="relative border-l border-blue-100 ml-3 pl-6 space-y-4">
                  {data.user_flows.map((flow: string, idx: number) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-[11px] font-bold shadow-md shadow-blue-500/20 border-2 border-white">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-semibold text-slate-700 pt-0.5">{flow}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(data.milestones) && data.milestones.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Milestones</h4>
                <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-4">
                  {data.milestones.map((ms: string, idx: number) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[30px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold border-2 border-white">
                        ★
                      </span>
                      <p className="text-xs font-semibold text-slate-600 pt-0.5">{ms}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layout className="w-4 h-4 text-blue-500" />
                  Functional Req.
                </h4>
                <ul className="space-y-2">
                  {Array.isArray(data.functional_requirements) && data.functional_requirements.map((req: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-600 font-semibold flex items-start gap-2">
                      <span className="text-blue-500 font-bold shrink-0">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Non-Functional Req.
                </h4>
                <ul className="space-y-2">
                  {Array.isArray(data.non_functional_requirements) && data.non_functional_requirements.map((req: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-600 font-semibold flex items-start gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Tech Constraints
                </h4>
                <ul className="space-y-2">
                  {Array.isArray(data.technical_constraints) && data.technical_constraints.map((req: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-600 font-semibold flex items-start gap-2 bg-amber-50/50 p-2 rounded border border-amber-100/50">
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'story':
        const getPriorityColor = (prio: string) => {
          const lower = String(prio).toLowerCase();
          if (lower.includes('must')) return 'bg-rose-50 border-rose-200 text-rose-700';
          if (lower.includes('should')) return 'bg-blue-50 border-blue-200 text-blue-700';
          return 'bg-emerald-50 border-emerald-200 text-emerald-700';
        };

        return (
          <div className="max-w-2xl mx-auto py-2">
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded">Agile User Story</span>
                  <h3 className="text-base font-extrabold text-slate-800 mt-2">{data.title || 'Draft Story Details'}</h3>
                </div>
                {data.priority && (
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-xs ${getPriorityColor(data.priority)}`}>
                    {data.priority}
                  </span>
                )}
              </div>

              <div className="space-y-3.5 bg-slate-50/80 p-5 rounded-xl border border-slate-100/50">
                {data.user_role && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest shrink-0 w-20">As a</span>
                    <span className="text-xs font-bold text-slate-800 leading-snug">{String(data.user_role).replace(/^As a /i, '')}</span>
                  </div>
                )}
                {data.requirement && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest shrink-0 w-20">I want to</span>
                    <span className="text-xs font-bold text-indigo-700 leading-snug">{String(data.requirement).replace(/^I want to /i, '')}</span>
                  </div>
                )}
                {data.benefit && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest shrink-0 w-20">So that</span>
                    <span className="text-xs font-bold text-emerald-700 leading-snug">{String(data.benefit).replace(/^so that /i, '')}</span>
                  </div>
                )}
              </div>

              {Array.isArray(data.acceptance_criteria) && data.acceptance_criteria.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                    Acceptance Criteria
                  </h4>
                  <div className="space-y-2">
                    {data.acceptance_criteria.map((criteria: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50/80 transition-colors">
                        <input
                          type="checkbox"
                          checked
                          readOnly
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-3.5 h-3.5 shrink-0"
                        />
                        <span className="text-xs font-semibold text-slate-600">{criteria}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'task':
        const getComplexityColor = (comp: string) => {
          const lower = String(comp).toLowerCase();
          if (lower.includes('large')) return 'bg-rose-50 border-rose-200 text-rose-700';
          if (lower.includes('medium')) return 'bg-amber-50 border-amber-200 text-amber-700';
          return 'bg-blue-50 border-blue-200 text-blue-700';
        };

        return (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-1 rounded">Technical Task Breakdown</span>
                <h3 className="text-base font-extrabold text-slate-800 mt-2">{data.story_title || 'Story Development Tasks'}</h3>
              </div>
              {data.estimated_complexity && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-bold">Complexity:</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-xs ${getComplexityColor(data.estimated_complexity)}`}>
                    {data.estimated_complexity}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Layout className="w-4 h-4 text-sky-500" />
                  Frontend Tasks
                  {Array.isArray(data.frontend_tasks) && (
                    <span className="ml-auto bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{data.frontend_tasks.length}</span>
                  )}
                </h4>
                <div className="space-y-2">
                  {Array.isArray(data.frontend_tasks) && data.frontend_tasks.map((task: string, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-xs hover:shadow-sm transition-shadow">
                      <p className="text-xs font-semibold text-slate-700 leading-snug">{task}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Server className="w-4 h-4 text-purple-500" />
                  Backend Tasks
                  {Array.isArray(data.backend_tasks) && (
                    <span className="ml-auto bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{data.backend_tasks.length}</span>
                  )}
                </h4>
                <div className="space-y-2">
                  {Array.isArray(data.backend_tasks) && data.backend_tasks.map((task: string, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-xs hover:shadow-sm transition-shadow">
                      <p className="text-xs font-semibold text-slate-700 leading-snug">{task}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Testing Tasks
                  {Array.isArray(data.testing_tasks) && (
                    <span className="ml-auto bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{data.testing_tasks.length}</span>
                  )}
                </h4>
                <div className="space-y-2">
                  {Array.isArray(data.testing_tasks) && data.testing_tasks.map((task: string, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-xs hover:shadow-sm transition-shadow">
                      <p className="text-xs font-semibold text-slate-700 leading-snug">{task}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {Array.isArray(data.dependencies) && data.dependencies.length > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  📌 Tech Dependencies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.dependencies.map((dep: string, idx: number) => (
                    <span key={idx} className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto leading-relaxed">
            {editContentText}
          </pre>
        );
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
            className="text-xs font-semibold text-slate-800 hover:text-black dark:text-zinc-200 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
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
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-sm' 
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <span className="capitalize">{tab.toUpperCase()}</span>
                  {doc ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      isActive ? 'bg-slate-800 dark:bg-zinc-200 text-white dark:text-black' : 'bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400'
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
                className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
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
                          <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
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
                    className="w-full text-sm font-semibold border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-800 dark:focus:border-zinc-700"
                  />
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {viewMode === 'edit' ? 'Document Content (JSON Format)' : 'Document Clean View'}
                    </label>
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/80 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                          viewMode === 'preview'
                            ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Clean View
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('edit')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                          viewMode === 'edit'
                            ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit JSON
                      </button>
                    </div>
                  </div>

                  {viewMode === 'edit' ? (
                    <textarea
                      value={editContentText}
                      onChange={(e) => setEditContentText(e.target.value)}
                      rows={16}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-800 dark:focus:border-zinc-700 bg-slate-50 dark:bg-zinc-900/40 focus:bg-white dark:focus:bg-zinc-950 leading-relaxed"
                    />
                  ) : (
                    <div className="border border-slate-100 rounded-xl bg-slate-50/20 p-6 min-h-[400px]">
                      {renderCleanView()}
                    </div>
                  )}
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
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-150 text-white dark:text-black text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
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
