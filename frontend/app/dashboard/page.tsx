'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { Cluster } from '@/types/models';
import { useToast } from '@/components/ui/ToastProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RecentFeedbacks } from '@/components/RecentFeedbacks';
import { ConnectorSimulator } from '@/components/ConnectorSimulator';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthContext';
import { 
  Inbox, 
  Plus, 
  Play, 
  BarChart2, 
  Layers, 
  FileText, 
  ArrowRight,
  Loader2,
  AlertTriangle,
  Send,
  Database,
  ArrowUpRight,
  FileCheck2,
  Sparkles,
  RefreshCw,
  Upload,
  Star,
  MessageCircle,
  Mic,
  Zap
} from 'lucide-react';

export default function FeedbackInboxPage() {
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [stats, setStats] = useState<{ total: number; by_source: Record<string, number> }>({ total: 0, by_source: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Action states
  const [clustering, setClustering] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [clusterResult, statsResult] = await Promise.allSettled([
        api.getClusters(),
        api.getFeedbackStats()
      ]);
      
      if (clusterResult.status === 'fulfilled') {
        setClusters(clusterResult.value.clusters || []);
      } else {
        console.error('Failed to fetch clusters:', clusterResult.reason);
        setError(`Failed to fetch clusters: ${clusterResult.reason?.message || 'Unknown error'}`);
      }
      
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value || { total: 0, by_source: {} });
      } else {
        console.error('Failed to fetch stats:', statsResult.reason);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data once auth session is resolved
    if (!authLoading && session) {
      fetchData();
    } else if (!authLoading && !session) {
      // Not authenticated — ProtectedRoute will handle redirect
      setLoading(false);
    }
  }, [authLoading, session]);

  const handleRunClustering = async () => {
    setClustering(true);
    try {
      const res = await api.triggerClustering();
      const msg = res.message || `Clustering complete! ${res.new_clusters || 0} new clusters, ${res.linked || 0} linked.`;
      toast(msg, 'success');
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to trigger clustering', 'error');
    } finally {
      setClustering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-14 h-14 rounded-full border-4 border-slate-900/10 dark:border-white/10 animate-ping"></div>
          <Loader2 className="w-8 h-8 text-slate-900 dark:text-zinc-300 animate-spin" />
        </div>
        <p className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase">Syncing Feedback Matrix...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-8 animate-fade-in">
      
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-zinc-900/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-800 tracking-widest">CONSOLE WORKSPACE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1.5">Feedback Inbox</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-semibold">
            Semantic signal pipeline powered by Google Gemini embeddings and Supabase pgvector proximity matches.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refresh logs"
            className="p-3 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 rounded-xl transition-all hover:rotate-185 duration-500"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleRunClustering}
            disabled={clustering}
            className="relative overflow-hidden group flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-150 text-white dark:text-black font-bold px-5 py-3 rounded-xl shadow-md shadow-slate-950/10 dark:shadow-white/5 disabled:opacity-50 transition-all duration-300 active:scale-[0.98]"
          >
            {clustering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Trigger AI Clustering</span>
            
            {/* Hover light sheen animation */}
            <div className="absolute inset-0 w-[40px] h-full bg-white/10 dark:bg-black/10 skew-x-[-20deg] translate-x-[-80px] group-hover:animate-[sheen_1.5s_infinite] pointer-events-none" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="group relative bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 flex items-center gap-5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          {/* Subtle gradient backdrop glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="bg-slate-50 dark:bg-zinc-900/50 text-slate-800 dark:text-zinc-200 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Total Raw Signals</p>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight mt-1">{stats.total}</h3>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="group relative bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 flex items-center gap-5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="bg-slate-50 dark:bg-zinc-900/50 text-slate-800 dark:text-zinc-200 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Active Clusters</p>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight mt-1">{clusters.length}</h3>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="group relative bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 flex items-center gap-5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl border border-emerald-500/10 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Manual Signals</p>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight mt-1">{stats.by_source.manual || 0}</h3>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="group relative bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 flex items-center gap-5 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-3.5 rounded-xl border border-blue-500/10 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">CSV Signals</p>
            <h3 className="text-3xl font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight mt-1">{stats.by_source.csv || 0}</h3>
          </div>
        </div>

      </div>

      {/* Source Distribution Tags */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* App Store */}
        <div className="group bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-2 rounded-lg border border-amber-500/10">
              <Star className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">App Store</span>
          </div>
          <h4 className="text-xl font-extrabold text-slate-800 dark:text-zinc-100">
            {(stats.by_source.appstore || 0) + (stats.by_source.google_play || 0)}
          </h4>
        </div>

        {/* Reddit */}
        <div className="group bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 p-2 rounded-lg border border-orange-500/10">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Reddit</span>
          </div>
          <h4 className="text-xl font-extrabold text-slate-800 dark:text-zinc-100">
            {stats.by_source.reddit || 0}
          </h4>
        </div>

        {/* Intercom / Zendesk */}
        <div className="group bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-2 rounded-lg border border-blue-500/10">
              <Inbox className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Support</span>
          </div>
          <h4 className="text-xl font-extrabold text-slate-800 dark:text-zinc-100">
            {(stats.by_source.intercom || 0) + (stats.by_source.zendesk || 0)}
          </h4>
        </div>

        {/* Transcripts */}
        <div className="group bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 p-2 rounded-lg border border-purple-500/10">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Transcripts</span>
          </div>
          <h4 className="text-xl font-extrabold text-slate-800 dark:text-zinc-100">
            {stats.by_source.transcript || 0}
          </h4>
        </div>

        {/* Sentry / PostHog */}
        <div className="group bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-2 rounded-lg border border-red-500/10">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Errors</span>
          </div>
          <h4 className="text-xl font-extrabold text-slate-800 dark:text-zinc-100">
            {(stats.by_source.sentry || 0) + (stats.by_source.posthog || 0)}
          </h4>
        </div>
      </div>

      {/* Connector Simulator */}
      <ConnectorSimulator onIngestionComplete={fetchData} />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3.5 rounded-2xl flex items-center gap-3 animate-slide-up">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 dark:text-red-400" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Content: Full-width Clusters Matrix */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200 tracking-tight">Active Feedback Clusters</h3>
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 px-3 py-1 rounded-lg border dark:border-zinc-800">
            {clusters.length} Active Themes
          </span>
        </div>

          {clusters.length === 0 ? (
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 border-dashed rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-4 transition-colors duration-300">
              <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-full text-slate-300 dark:text-zinc-700">
                <Layers className="w-10 h-10 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 dark:text-zinc-300">No Clusters Created Yet</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed font-semibold">
                  Ingest several pieces of feedback, then trigger AI Clustering to group them automatically by semantic content.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster) => {
                // Determine highlight boundary borders based on active status
                let borderHighlight = "border-l-slate-900 dark:border-l-white";
                if (cluster.status === 'approved') {
                  borderHighlight = "border-l-emerald-500 dark:border-l-emerald-400";
                } else if (cluster.status === 'reviewing') {
                  borderHighlight = "border-l-amber-500 dark:border-l-amber-400";
                }

                return (
                  <div 
                    key={cluster.id}
                    className={`bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 border-l-4 ${borderHighlight} rounded-2xl p-6 hover:shadow-md hover:border-slate-300/80 dark:hover:border-zinc-800/80 hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row justify-between gap-6 animate-slide-up`}
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-base leading-snug tracking-tight">{cluster.title}</h4>
                        <StatusBadge status={cluster.status} />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-semibold">
                        {cluster.summary || 'Cluster description draft has not been synthesized yet.'}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 pt-1">
                        <span className="flex items-center gap-1">
                          Inbound Signals: <strong className="text-slate-600 dark:text-zinc-300 font-extrabold">{cluster.feedback_count || 1}</strong>
                        </span>
                        <span>•</span>
                        <span>Created: {new Date(cluster.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex flex-row sm:flex-col items-stretch justify-center gap-2.5 sm:w-44 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-zinc-900 pt-4 sm:pt-0 sm:pl-6">
                      <Link
                        href={`/pipeline/${cluster.id}`}
                        className="group flex-1 flex items-center justify-center gap-1.5 border border-slate-200 dark:border-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300 text-xs font-bold py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform" />
                        <span>Pipeline Map</span>
                      </Link>
                      
                      <Link
                        href={`/review/${cluster.id}`}
                        className="group flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-150 text-white dark:text-black text-xs font-black py-2.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Review Gate</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      
      {/* Recent Feedbacks List */}
      <RecentFeedbacks />
    </div>
    </ProtectedRoute>
  );
}
