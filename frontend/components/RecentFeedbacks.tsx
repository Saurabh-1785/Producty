'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/components/AuthContext';
import { Loader2, Database, Code, LayoutList, RefreshCw, AlertTriangle } from 'lucide-react';

export function RecentFeedbacks() {
  const { session, loading: authLoading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pretty' | 'json'>('pretty');

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await api.getRecentFeedbacks(10);
      setFeedbacks(res.feedbacks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recent feedbacks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && session) {
      fetchFeedbacks();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, session]);

  return (
    <div className="space-y-6 animate-fade-in mt-12 border-t border-slate-200/60 dark:border-zinc-900/80 pt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl border border-blue-500/10">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200 tracking-tight">Recent Database Entries</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
              Latest raw signals ingested into the system.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-100 dark:bg-zinc-900/50 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setViewMode('pretty')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'pretty'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Pretty Print
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === 'json'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw JSON
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-zinc-700 mx-1"></div>
          <button
            onClick={fetchFeedbacks}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3.5 rounded-xl flex items-center gap-3 animate-slide-up">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 border-dashed rounded-2xl">
          <Loader2 className="w-6 h-6 text-slate-400 dark:text-zinc-500 animate-spin" />
          <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Fetching Latest...</span>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 border-dashed rounded-2xl py-12 text-center text-sm font-semibold text-slate-500 dark:text-zinc-400">
          No recent feedback entries found in the database.
        </div>
      ) : viewMode === 'pretty' ? (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-800 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 mb-2 border border-slate-200 dark:border-zinc-800">
                    Source: {fb.source}
                  </span>
                  <p className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-medium">
                    {fb.content}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-900 pt-2">
                <span>ID: {fb.id.split('-')[0]}...</span>
                <span>•</span>
                <span>Author: {fb.author}</span>
                <span>•</span>
                <span>Saved: {new Date(fb.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono">
            {JSON.stringify(feedbacks, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
