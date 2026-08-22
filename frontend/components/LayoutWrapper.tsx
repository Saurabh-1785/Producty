'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/ui/ToastProvider';
import {
  Inbox,
  Settings,
  ShieldAlert,
  Cpu,
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  Upload,
  User,
  LogOut,
  ChevronDown,
  Compass
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { user, profile, signOut } = useAuth();

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // If this is the introductory landing page or an auth page, we want a clean, full-screen canvas
  const isLandingPage = pathname === '/';
  const isAuthPage = ['/login', '/signup', '/complete-profile'].includes(pathname);

  // Prevent flash before hydration completes
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Cpu className="w-10 h-10 text-slate-900 dark:text-white animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-slate-400">Loading ApeAI...</span>
        </div>
      </div>
    );
  }

  if (isLandingPage || isAuthPage) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-white dark:bg-[#000000] text-slate-900 dark:text-zinc-100 transition-colors duration-300">
          {/* Landing Header */}
          <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-[#000000]/70 border-b border-slate-100 dark:border-zinc-900 px-6 py-4 transition-colors">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="bg-slate-900 dark:bg-white group-hover:bg-black dark:group-hover:bg-zinc-200 text-white dark:text-black p-2 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg shadow-slate-900/10 dark:shadow-white/10">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white transition-colors">ApeAI</h1>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest -mt-1 transition-colors">Product Ops</p>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  aria-label="Toggle Theme"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white transition-all duration-300"
                >
                  {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                </button>
                  {user ? (
                    <Link
                      href="/dashboard"
                      className="hidden sm:inline-flex items-center gap-1.5 bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-black text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-md shadow-slate-900/10 hover:shadow-slate-900/20"
                    >
                      Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="hidden sm:inline-flex items-center gap-1.5 bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 text-white dark:text-black text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-md shadow-slate-900/10 hover:shadow-slate-900/20"
                    >
                      Log In
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
              </div>
            </div>
          </header>

          <main className="animate-fade-in">{children}</main>
        </div>
      </ToastProvider>
    );
  }

  // Dashboard layout configuration
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 flex transition-colors duration-300">

        {/* Sidebar Navigation - Desktop */}
        <aside className="w-64 border-r border-slate-200 dark:border-zinc-900 bg-white dark:bg-[#09090b] hidden md:flex flex-col fixed h-full z-20 transition-colors">
          {/* Branding */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-zinc-900">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="bg-slate-900 dark:bg-white text-white dark:text-black p-1.5 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">ApeAI</h1>
                <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest -mt-1">Product Ops</p>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 py-6 px-4 space-y-1.5">
            <Link
              href="/upload"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${pathname === '/upload'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
            >
              <Upload className={`w-4 h-4 ${pathname === '/upload' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'}`} />
              Upload Signals
            </Link>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${pathname === '/dashboard'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
            >
              <Inbox className={`w-4 h-4 ${pathname === '/dashboard' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'}`} />
              Feedback Inbox
            </Link>
            <Link
              href="/integrations"
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${pathname === '/integrations'
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
            >
              <Settings className={`w-4 h-4 ${pathname === '/integrations' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'}`} />
              Integrations
            </Link>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-900">
              <Link
                href="/"
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                View Intro & Docs
              </Link>
            </div>
          </nav>

          {/* Bottom Info Banner */}
          <div className="p-4 border-t border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-500 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-900 dark:text-white animate-pulse-subtle" />
              <span>Human-in-the-Loop Gate</span>
            </div>
          </div>
        </aside>

        {/* Sidebar Navigation - Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 md:hidden backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)}>
            <aside
              className="w-64 h-full bg-white dark:bg-[#09090b] border-r border-slate-200 dark:border-zinc-900 flex flex-col p-6 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-zinc-900">
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Cpu className="w-5 h-5 text-slate-900 dark:text-white" />
                  <span className="font-bold text-slate-900 dark:text-white">ApeAI</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg border border-slate-200 dark:border-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 py-6 space-y-1.5">
                <Link
                  href="/upload"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === '/upload'
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                    }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Signals
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === '/dashboard'
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                    }`}
                >
                  <Inbox className="w-4 h-4" />
                  Feedback Inbox
                </Link>
                <Link
                  href="/integrations"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${pathname === '/integrations'
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
                    }`}
                >
                  <Settings className="w-4 h-4" />
                  Integrations
                </Link>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 dark:text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" />
                  View Intro Page
                </Link>
              </nav>

              <div className="pt-4 border-t border-slate-100 dark:border-zinc-900">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                  <span>Human-in-the-Loop Gate</span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Application Container */}
        <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
          {/* Top Header */}
          <header className="h-16 border-b border-slate-200 dark:border-zinc-900 bg-white dark:bg-[#000000] sticky top-0 z-10 flex items-center justify-between px-6 md:px-8 transition-colors">

            {/* Sidebar toggle for mobile */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 md:hidden border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg"
                aria-label="Open sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="text-xs text-slate-400 hidden sm:block">
                Server Status: <span className="font-semibold text-slate-900 dark:text-white">Online</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle inside App */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* User Dropdown */}
              {user && (
                <div className="relative">
                  <button 
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-900 p-1.5 rounded-xl transition-colors"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="User Avatar" className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-zinc-800" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-xs font-bold text-white dark:text-black">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 hidden sm:inline">
                      {profile?.full_name || profile?.user_id || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg shadow-slate-900/10 py-2 z-50 animate-slide-up">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-900 mb-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profile?.full_name || 'ApeAI User'}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">{user.email}</p>
                      </div>
                      <Link 
                        href="/profile" 
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile Settings
                      </Link>
                      <button 
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          signOut();
                          router.push('/login');
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Dynamic Pages Area */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
