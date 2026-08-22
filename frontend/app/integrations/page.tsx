'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Integration } from '@/types/models';
import { useToast } from '@/components/ui/ToastProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [submitting, setSubmitting] = useState<string | null>(null);
  
  // Jira Form
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraProject, setJiraProject] = useState('');
  const [jiraDryRun, setJiraDryRun] = useState(false);

  const loadIntegrations = async () => {
    try {
      setError(null);
      const res = await api.getIntegrations();
      setIntegrations(res.integrations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch active integration pipelines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleConnect = async (type: 'jira') => {
    setSubmitting(type);
    try {
      let payload: Partial<Integration> = {
        type,
        name: `Active ${type.toUpperCase()} pipeline`,
        is_active: true,
      };

      if (type === 'jira') {
        if (!jiraUrl || !jiraEmail || !jiraToken || !jiraProject) {
          throw new Error('All fields are required to bind Jira Cloud.');
        }
        payload.api_url = jiraUrl;
        payload.api_key = jiraToken;
        payload.project_id = jiraProject;
        payload.config = { email: jiraEmail, dry_run: jiraDryRun };
      }

      await api.createIntegration(payload);
      toast(`Successfully connected ${type.toUpperCase()}!`, 'success');
      
      // Clear forms
      setJiraUrl('');
      setJiraEmail('');
      setJiraToken('');
      setJiraProject('');
      setJiraDryRun(false);

      loadIntegrations();
    } catch (err: any) {
      toast(err.message || `Failed to link ${type}`, 'error');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return;
    try {
      await api.deleteIntegration(id);
      toast('Integration disconnected successfully', 'success');
      loadIntegrations();
    } catch (err: any) {
      toast(err.message || 'Failed to disconnect integration', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-slate-900 dark:text-zinc-300 animate-spin" />
        <p className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase">Loading Integrations...</p>
      </div>
    );
  }

  const activeJira = integrations.find((i) => i.type === 'jira');

  return (
    <ProtectedRoute>
      <div className="space-y-8 animate-fade-in max-w-xl mx-auto pb-16">
        {/* Title */}
        <div className="text-center sm:text-left">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Integration Settings</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-semibold">
            Connect Jira issue trackers. API credentials are fully encrypted and stored backend-side.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3.5 rounded-2xl flex items-center gap-3 animate-slide-up">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 dark:text-red-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Platforms */}
        <div className="bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-zinc-800 shadow-2xl shadow-slate-900/5 dark:shadow-black/20 p-8 rounded-3xl transition-colors duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-zinc-900">
              <div className="bg-blue-600 text-white p-2.5 rounded-2xl font-black text-sm leading-none flex items-center justify-center w-10 h-10 shadow-md shadow-blue-500/10">
                JR
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-base">Jira Cloud</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">Publish stories and tickets directly into Jira tasks.</p>
              </div>
            </div>

            {activeJira ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-6 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Connected Pipeline
                </div>
                <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-2 font-semibold bg-white/50 dark:bg-black/25 p-4 rounded-xl border border-emerald-500/10">
                  <p className="flex justify-between"><span className="text-slate-400 dark:text-zinc-500">Host URL:</span> <span className="font-extrabold">{activeJira.api_url}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400 dark:text-zinc-500">Project Key:</span> <span className="font-extrabold text-blue-600 dark:text-blue-400">{activeJira.project_id}</span></p>
                </div>
                
                <button
                  onClick={() => handleDisconnect(activeJira.id, activeJira.name)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Disconnect Pipeline</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Jira Instance URL</label>
                  <input
                    type="text"
                    value={jiraUrl}
                    onChange={(e) => setJiraUrl(e.target.value)}
                    placeholder="https://company.atlassian.net"
                    className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all text-xs font-semibold"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Jira User Email</label>
                  <input
                    type="email"
                    value={jiraEmail}
                    onChange={(e) => setJiraEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all text-xs font-semibold"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Jira API Token</label>
                  <input
                    type="password"
                    value={jiraToken}
                    onChange={(e) => setJiraToken(e.target.value)}
                    placeholder="Enter API Token secret"
                    className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all text-xs font-semibold"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Project Key</label>
                  <input
                    type="text"
                    value={jiraProject}
                    onChange={(e) => setJiraProject(e.target.value)}
                    placeholder="e.g. PROJ"
                    className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all text-xs font-semibold"
                  />
                </div>
                
                <div className="flex items-center gap-2.5 pt-1.5 pb-2">
                  <input
                    type="checkbox"
                    id="jiraDryRun"
                    checked={jiraDryRun}
                    onChange={(e) => setJiraDryRun(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-zinc-800 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                  />
                  <label htmlFor="jiraDryRun" className="text-xs font-semibold text-slate-500 dark:text-zinc-400 cursor-pointer select-none">
                    Enable Dry Run (Test connection without creating real tickets)
                  </label>
                </div>
                
                <button
                  onClick={() => handleConnect('jira')}
                  disabled={submitting !== null || !jiraUrl || !jiraEmail || !jiraToken || !jiraProject}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-extrabold py-3.5 rounded-xl disabled:opacity-50 transition-all duration-300 shadow-md active:scale-[0.98]"
                >
                  {submitting === 'jira' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-300 dark:text-zinc-700" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Connect Jira Cloud</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
