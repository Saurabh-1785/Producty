'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { Cluster, Document } from '@/types/models';
import { useToast } from '@/components/ui/ToastProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  ArrowLeft, 
  Check, 
  Play, 
  Layers, 
  FileText, 
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface Step {
  title: string;
  description: string;
  status: 'complete' | 'active' | 'pending';
  actionLabel?: string;
  action?: () => Promise<void>;
  loading?: boolean;
}

export default function PipelineTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clusterId = params.cluster_id as string;

  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Triggering loading states
  const [summarizing, setSummarizing] = useState(false);
  const [generatingBRD, setGeneratingBRD] = useState(false);
  const [generatingPRD, setGeneratingPRD] = useState(false);
  const [generatingStories, setGeneratingStories] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const clustersRes = await api.getClusters();
      const current = clustersRes.clusters.find((c) => c.id === clusterId);
      if (!current) {
        throw new Error('Cluster not found');
      }
      setCluster(current);

      const docsRes = await api.getDocuments(clusterId);
      const docs = docsRes.documents || [];
      setDocuments(docs);
      return { cluster: current, documents: docs };
    } catch (err: any) {
      setError(err.message || 'Failed to load pipeline tracker');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    if (clusterId) {
      loadData();
    }
  }, [clusterId, loadData]);

  // Stage executors
  const triggerSummary = async () => {
    setSummarizing(true);
    try {
      await api.triggerSummarization(clusterId);
      toast('AI Summary generated successfully!', 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Summarization failed', 'error');
    } finally {
      setSummarizing(false);
    }
  };

  const triggerBRD = async () => {
    setGeneratingBRD(true);
    try {
      const res = await api.triggerBRD(clusterId);
      toast('BRD Document drafted successfully!', 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'BRD drafting failed', 'error');
    } finally {
      setGeneratingBRD(false);
    }
  };

  const triggerPRD = async () => {
    const brd = documents.find((d) => d.type === 'brd');
    if (!brd) {
      toast('Please generate BRD first!', 'error');
      return;
    }
    setGeneratingPRD(true);
    try {
      await api.triggerPRD(clusterId, brd.id);
      toast('PRD Document drafted successfully!', 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'PRD drafting failed', 'error');
    } finally {
      setGeneratingPRD(false);
    }
  };

  const triggerStories = async () => {
    const prd = documents.find((d) => d.type === 'prd');
    if (!prd) {
      toast('Please generate PRD first!', 'error');
      return;
    }
    setGeneratingStories(true);
    try {
      await api.triggerStories(clusterId, prd.id);
      toast('Agile User Stories generated successfully!', 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'User stories drafting failed', 'error');
    } finally {
      setGeneratingStories(false);
    }
  };

  const triggerTasks = async () => {
    const story = documents.find((d) => d.type === 'story');
    if (!story) {
      toast('Please generate stories first!', 'error');
      return;
    }
    setGeneratingTasks(true);
    try {
      await api.triggerTasks(story.id, clusterId);
      toast('Technical Tasks broken down successfully!', 'success');
      loadData();
    } catch (err: any) {
      toast(err.message || 'Tasks breakdown failed', 'error');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const triggerGenerateAll = async () => {
    if (generatingAll) return;
    setGeneratingAll(true);
    try {
      let currentData = { cluster: cluster, documents: documents };

      // Step 1: Summary
      if (!currentData.cluster?.summary) {
        toast('Generating AI Summary...', 'info');
        await api.triggerSummarization(clusterId);
        currentData = await loadData();
      }

      // Step 2: BRD
      let brd = currentData.documents.find((d) => d.type === 'brd');
      if (!brd) {
        toast('Drafting Business Requirements (BRD)...', 'info');
        await api.triggerBRD(clusterId);
        currentData = await loadData();
        brd = currentData.documents.find((d) => d.type === 'brd');
      }

      // Step 3: PRD
      let prd = currentData.documents.find((d) => d.type === 'prd');
      if (!prd) {
        if (!brd) throw new Error('Failed to locate generated BRD');
        toast('Drafting Product Requirements (PRD)...', 'info');
        await api.triggerPRD(clusterId, brd.id);
        currentData = await loadData();
        prd = currentData.documents.find((d) => d.type === 'prd');
      }

      // Step 4: User Stories
      let story = currentData.documents.find((d) => d.type === 'story');
      if (!story) {
        if (!prd) throw new Error('Failed to locate generated PRD');
        toast('Drafting Agile User Stories...', 'info');
        await api.triggerStories(clusterId, prd.id);
        currentData = await loadData();
        story = currentData.documents.find((d) => d.type === 'story');
      }

      // Step 5: Technical Tasks
      let task = currentData.documents.find((d) => d.type === 'task');
      if (!task) {
        if (!story) throw new Error('Failed to locate generated User Stories');
        toast('Breaking down Technical Tasks...', 'info');
        await api.triggerTasks(story.id, clusterId);
        await loadData();
      }

      toast('Full pipeline generated successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Pipeline generation failed', 'error');
    } finally {
      setGeneratingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-slate-900 dark:text-zinc-300 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading pipeline stepper...</p>
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
            <AlertTriangle className="w-5 h-5" /> Pipeline Error
          </h3>
          <p className="text-sm">{error || 'Cluster not found'}</p>
        </div>
      </div>
    );
  }

  // Detect which documents are completed
  const hasSummary = !!cluster.summary;
  const hasBRD = documents.some((d) => d.type === 'brd');
  const hasPRD = documents.some((d) => d.type === 'prd');
  const hasStories = documents.some((d) => d.type === 'story');
  const hasTasks = documents.some((d) => d.type === 'task');

  // Build steps array
  const steps: Step[] = [
    {
      title: 'Feedback Clustered',
      description: 'Signals grouped together via vector database similarity search.',
      status: 'complete',
    },
    {
      title: 'AI Cluster Summary',
      description: 'Summarize signals into clean semantic definitions.',
      status: hasSummary ? 'complete' : 'active',
      actionLabel: 'Generate Summary',
      action: triggerSummary,
      loading: summarizing,
    },
    {
      title: 'Business Requirements (BRD)',
      description: 'Generate Business Requirements Document with Pro models.',
      status: hasBRD ? 'complete' : (!hasSummary ? 'pending' : 'active'),
      actionLabel: 'Generate BRD',
      action: triggerBRD,
      loading: generatingBRD,
    },
    {
      title: 'Product Requirements (PRD)',
      description: 'Draft technical and scope specifications.',
      status: hasPRD ? 'complete' : (!hasBRD ? 'pending' : 'active'),
      actionLabel: 'Generate PRD',
      action: triggerPRD,
      loading: generatingPRD,
    },
    {
      title: 'Agile User Stories',
      description: 'Generate formatted stories with explicit acceptance criteria.',
      status: hasStories ? 'complete' : (!hasPRD ? 'pending' : 'active'),
      actionLabel: 'Draft User Stories',
      action: triggerStories,
      loading: generatingStories,
    },
    {
      title: 'Technical Task Breakdown',
      description: 'Subdivide requirements into concrete engineering checklist tickets.',
      status: hasTasks ? 'complete' : (!hasStories ? 'pending' : 'active'),
      actionLabel: 'Breakdown Tasks',
      action: triggerTasks,
      loading: generatingTasks,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Back & Breadcrumb */}
      <div className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{cluster.title}</h2>
              <StatusBadge status={cluster.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">Workflow Stepper: Trigger and monitor document pipelines.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={triggerGenerateAll}
              disabled={generatingAll || (hasSummary && hasBRD && hasPRD && hasStories && hasTasks)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 border border-transparent disabled:border-slate-200"
            >
              {generatingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generatingAll ? 'Generating...' : 'Generate All'}
            </button>
            <Link
              href={`/review/${clusterId}`}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              Review & Edit Drafts
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Pipeline Stepper</h3>
        
        <div className="relative border-l border-slate-200 ml-4 pl-8 space-y-8 py-2">
          {steps.map((step, idx) => {
            const isComplete = step.status === 'complete';
            const isActive = step.status === 'active';
            const isPending = step.status === 'pending';

            return (
              <div key={idx} className="relative">
                {/* Stepper Dot */}
                <div className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  isComplete ? 'bg-slate-900 text-white border-slate-900' :
                  isActive ? 'bg-white text-slate-900 border-slate-900 shadow-sm shadow-slate-950/5' :
                  'bg-white text-slate-400 border-slate-200'
                }`}>
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className={`font-bold ${
                      isComplete ? 'text-slate-800' :
                      isActive ? 'text-slate-900 font-extrabold' :
                      'text-slate-400'
                    }`}>{step.title}</h4>
                    <p className="text-xs text-slate-500 max-w-xl leading-relaxed">{step.description}</p>
                  </div>

                  {/* Step Action Button */}
                  <div className="flex-shrink-0">
                    {isActive && step.action && (
                      <button
                        onClick={step.action}
                        disabled={step.loading || generatingAll}
                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors border border-slate-900 disabled:opacity-50"
                      >
                        {step.loading || (isActive && generatingAll) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {step.actionLabel}
                      </button>
                    )}
                    {isComplete && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" /> Complete
                      </span>
                    )}
                    {isPending && (
                      <span className="text-slate-400 text-xs font-medium">
                        Waiting on previous steps...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
