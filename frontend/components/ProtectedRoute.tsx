'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4">
        <Loader2 className="w-8 h-8 text-slate-900 dark:text-zinc-300 animate-spin" />
        <p className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase">Verifying Authentication...</p>
      </div>
    );
  }

  if (!user && pathname !== '/login' && pathname !== '/signup') {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
