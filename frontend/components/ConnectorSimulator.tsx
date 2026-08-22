'use client';

import React, { useState } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Zap,
  Star,
  MessageCircle,
  Mic,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// ─── Connector Source Definitions ─────────────────────────────

interface ConnectorSource {
  id: string;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  description: string;
  sampleCount: string;
  color: string;
  bgColor: string;
  borderColor: string;
  darkBgColor: string;
}

const CONNECTOR_SOURCES: ConnectorSource[] = [
  {
    id: 'appstore',
    label: 'App Store',
    emoji: '🌟',
    icon: <Star className="w-5 h-5" />,
    description: 'Simulate iOS App Store & Google Play review ingestion',
    sampleCount: '5 reviews',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500/10',
    darkBgColor: 'dark:bg-amber-950/20',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    emoji: '🤖',
    icon: <MessageCircle className="w-5 h-5" />,
    description: 'Simulate Reddit subreddit post & comment ingestion',
    sampleCount: '3 posts',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500/10',
    darkBgColor: 'dark:bg-orange-950/20',
  },
  {
    id: 'intercom',
    label: 'Intercom',
    emoji: '💬',
    icon: <MessageCircle className="w-5 h-5" />,
    description: 'Simulate Intercom & Zendesk support ticket ingestion',
    sampleCount: '4 tickets',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500/10',
    darkBgColor: 'dark:bg-blue-950/20',
  },
  {
    id: 'transcript',
    label: 'Transcripts',
    emoji: '🎙️',
    icon: <Mic className="w-5 h-5" />,
    description: 'Simulate Fireflies.ai & Zoom meeting transcript ingestion',
    sampleCount: '2 transcripts',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500/10',
    darkBgColor: 'dark:bg-purple-950/20',
  },
  {
    id: 'sentry',
    label: 'Sentry',
    emoji: '⚡',
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Simulate Sentry crash reports & PostHog friction events',
    sampleCount: '3 alerts',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500/10',
    darkBgColor: 'dark:bg-red-950/20',
  },
];

// ─── Connector Simulator Component ────────────────────────────

interface ConnectorSimulatorProps {
  onIngestionComplete?: () => void;
}

export function ConnectorSimulator({ onIngestionComplete }: ConnectorSimulatorProps) {
  const { toast } = useToast();
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const [completedSources, setCompletedSources] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const handleSimulate = async (source: ConnectorSource) => {
    if (loadingSource) return;

    setLoadingSource(source.id);
    try {
      const result = await api.simulateIngestion(source.id);
      setCompletedSources(prev => { const arr = Array.from(prev); arr.push(source.id); return new Set(arr); });
      toast(
        `${source.emoji} ${result.message || `${result.saved} ${source.label} items ingested`}`,
        'success'
      );
      onIngestionComplete?.();
    } catch (err: any) {
      toast(
        `Failed to simulate ${source.label}: ${err.message || 'Unknown error'}`,
        'error'
      );
    } finally {
      setLoadingSource(null);
    }
  };

  const handleSimulateAll = async () => {
    if (loadingSource) return;
    setLoadingSource('all');

    try {
      let totalSaved = 0;
      for (const source of CONNECTOR_SOURCES) {
        try {
          const result = await api.simulateIngestion(source.id);
          totalSaved += result.saved || 0;
          setCompletedSources(prev => { const arr = Array.from(prev); arr.push(source.id); return new Set(arr); });
        } catch {
          // Continue with other sources
        }
      }
      toast(`🚀 All connectors simulated! ${totalSaved} total items ingested`, 'success');
      onIngestionComplete?.();
    } catch (err: any) {
      toast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setLoadingSource(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full group flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white dark:from-zinc-950 dark:to-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-violet-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 tracking-tight">
              Connector Simulator
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
              Fire test payloads from App Store, Reddit, Intercom, Transcripts & Sentry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completedSources.size > 0 && (
            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
              {completedSources.size}/{CONNECTOR_SOURCES.length} fired
            </span>
          )}
          <ArrowRight
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'group-hover:translate-x-1'}`}
          />
        </div>
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className="space-y-3 animate-fade-in">
          {/* Simulate All Button */}
          <button
            onClick={handleSimulateAll}
            disabled={loadingSource !== null}
            className="w-full relative overflow-hidden group flex items-center justify-center gap-2.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-zinc-200 text-white dark:text-black font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-white/5 disabled:opacity-50 transition-all duration-300 hover:shadow-xl active:scale-[0.99]"
          >
            {loadingSource === 'all' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Simulate All Connectors</span>
            <div className="absolute inset-0 w-[40px] h-full bg-white/10 dark:bg-black/10 skew-x-[-20deg] translate-x-[-80px] group-hover:animate-[sheen_1.5s_infinite] pointer-events-none" />
          </button>

          {/* Individual Source Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONNECTOR_SOURCES.map((source) => {
              const isLoading = loadingSource === source.id || loadingSource === 'all';
              const isCompleted = completedSources.has(source.id);

              return (
                <button
                  key={source.id}
                  onClick={() => handleSimulate(source)}
                  disabled={loadingSource !== null}
                  className={`group relative text-left bg-white dark:bg-zinc-950 border ${
                    isCompleted
                      ? 'border-emerald-300 dark:border-emerald-800'
                      : 'border-slate-200 dark:border-zinc-900'
                  } rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-300 overflow-hidden`}
                >
                  {/* Background glow */}
                  <div className={`absolute top-0 right-0 w-20 h-20 ${source.bgColor} ${source.darkBgColor} rounded-full blur-2xl opacity-50 pointer-events-none`} />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`${source.bgColor} ${source.darkBgColor} ${source.color} p-2.5 rounded-lg border ${source.borderColor}`}>
                        {source.icon}
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : null}
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 tracking-tight">
                      {source.emoji} {source.label}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mt-1 leading-relaxed">
                      {source.description}
                    </p>
                    <span className="inline-block mt-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800">
                      {source.sampleCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reset */}
          {completedSources.size > 0 && (
            <button
              onClick={() => setCompletedSources(new Set())}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset simulation state
            </button>
          )}
        </div>
      )}
    </div>
  );
}
