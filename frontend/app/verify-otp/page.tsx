'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Cpu, KeyRound, ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

function VerifyOTPContent() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const router = useRouter();
  const { user } = useAuth();

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!email) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center">
        <p className="text-slate-500">Invalid session. Please sign up again.</p>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP code");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    
    if (error) {
      setError(error.message);
    } else {
      alert('A new OTP has been sent to your email.');
    }
    setResendLoading(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-[#0c0c0e] p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl shadow-slate-900/5">
        <div className="text-center flex flex-col items-center">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Check your email</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
            We've sent a 6-digit verification code to <br/>
            <span className="font-bold text-slate-900 dark:text-white">{email}</span>
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
              <p className="font-bold text-lg">Verified Successfully!</p>
              <p className="text-sm opacity-80 mt-1">Redirecting to your workspace...</p>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerify}>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 block text-center">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ''))}
                  className="w-full text-center text-3xl tracking-[1em] font-mono bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
                  placeholder="------"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="group w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all duration-300 shadow-md"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify Code</span>}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        )}

        {!success && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {resendLoading ? 'Sending...' : 'Didn\'t receive a code? Resend'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="min-h-[85vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
