'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Calendar, ArrowRight, Loader2, AlertTriangle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function CompleteProfilePage() {
  const [dob, setDob] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Pre-fill name if available from Google
  useEffect(() => {
    if (user?.user_metadata?.full_name && !fullName) {
      setFullName(user.user_metadata.full_name);
    }
    // If they already have a DOB in profile, they might not need this page, but we let them update it.
    if (profile?.dob && !dob) {
      setDob(profile.dob);
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dob) {
      setError("Date of birth is required");
      return;
    }

    setLoading(true);
    setError(null);

    if (!user) return;

    // Upsert the profile in the database
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        dob: dob,
        full_name: fullName || null
      });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-[#0c0c0e] p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl shadow-slate-900/5">
        <div className="text-center flex flex-col items-center">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-black p-3 rounded-2xl mb-4 shadow-lg">
            <UserIcon className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Almost there</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400 font-medium">
            Please complete your profile to continue
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-4 py-6 rounded-xl flex flex-col items-center gap-3 text-center animate-fade-in">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <div>
              <p className="font-bold text-lg">Profile Updated!</p>
              <p className="text-sm opacity-80 mt-1">Taking you to your dashboard...</p>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all font-medium"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 block">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !dob}
              className="group w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all duration-300 shadow-md"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Complete Profile</span>}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
