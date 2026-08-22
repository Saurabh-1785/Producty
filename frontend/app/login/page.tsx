'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Cpu, Mail, Lock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // If already logged in, redirect
  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };



  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-[#0c0c0e] p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl shadow-slate-900/5">
        <div className="text-center flex flex-col items-center">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-black p-3 rounded-2xl mb-4 shadow-lg">
            <Cpu className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400 font-medium">
            Sign in to your ApeAI workspace
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 block">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all font-medium"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 focus:border-slate-900 dark:focus:border-zinc-700 transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="group w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all duration-300 shadow-md"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Sign In</span>}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>



        <p className="mt-8 text-center text-sm text-slate-500 dark:text-zinc-400 font-medium">
          Don't have an account?{' '}
          <Link href="/signup" className="text-slate-900 dark:text-white font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
