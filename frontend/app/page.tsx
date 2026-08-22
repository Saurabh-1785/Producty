'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Database,
  Inbox,
  Settings,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Terminal,
  Activity,
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Code,
  Check,
  CheckSquare,
  Square,
  ArrowRight,
  MousePointerClick,
  FileText,
  Github,
  Slack,
  MessageCircle,
  Trello,
  LayoutGrid
} from 'lucide-react';
import LiquidEther from '@/components/LiquidEther';
import PgVectorStage from '@/components/PgVectorStage';
import PgVectorSimilarityLayer from '@/components/PgVectorSimilarityLayer';
import AgentDecomposeLayer from '@/components/AgentDecomposeLayer';

export default function EnterpriseLandingPage() {
  // Sandbox Simulator State
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [approved, setApproved] = useState<boolean>(false);
  const [typewriterText, setTypewriterText] = useState<string>('');

  const speedMs = {
    slow: 9000,
    normal: 6000,
    fast: 4000
  };

  const fullSlackFeedback = "Hey team! Can we please add an option to export our dashboard analytics feedback to CSV spreadsheets? Our managers need raw reports for weekly syncs. It should also support date range filters to make custom auditing easier.";

  // Typewriter effect logic
  useEffect(() => {
    if (stepIndex === 0) {
      setTypewriterText('');
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < fullSlackFeedback.length) {
          setTypewriterText((prev) => prev + fullSlackFeedback.charAt(currentIdx));
          currentIdx++;
        } else {
          clearInterval(interval);
        }
      }, 18);
      return () => clearInterval(interval);
    }
  }, [stepIndex]);

  // Autoplay loop timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setStepIndex((prevIndex) => {
        if (prevIndex === 3) {
          setApproved(false);
          return 0;
        }
        return prevIndex + 1;
      });
    }, speedMs[speed]);

    return () => clearInterval(interval);
  }, [isPlaying, speed, approved]);

  const handleStepSelect = (idx: number) => {
    setIsPlaying(false);
    setStepIndex(idx);
    if (idx !== 3) {
      setApproved(false);
    }
  };

  const handleApprove = () => {
    setApproved(true);
  };

  const handleReset = () => {
    setStepIndex(0);
    setApproved(false);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] text-slate-900 dark:text-zinc-100 transition-colors duration-300">

      {/* ENTERPRISE HERO SECTION */}
      <section className="relative z-0 pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">

        {/* Professional SaaS Background: Grid + Soft Glow + Tech Accents (Breathtaking Visual Depth) */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black overflow-hidden">
          {/* WebGL Liquid Ether Background */}
          <LiquidEther />

          {/* Visible Grid Patterns (Guaranteed CSS Render) */}
          <div className="absolute inset-0 block dark:hidden premium-grid-light opacity-95"></div>
          <div className="absolute inset-0 hidden dark:block premium-grid-dark opacity-100"></div>

          {/* Animated Monochromatic Ambient Top Glow */}
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[1200px] h-[650px] opacity-45 dark:opacity-70 pointer-events-none blur-[140px] bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.45),rgba(100,116,139,0.2),transparent_70%)] animate-pulse-glow"></div>

          {/* Premium Technical Blueprint & Geometric Accents (No longer empty) */}
          <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-50 select-none">
            {/* Spinning abstract dashed circles */}
            <div className="absolute top-[-18%] left-1/2 -translate-x-1/2 w-[850px] h-[850px] border border-slate-200/60 dark:border-zinc-800/40 rounded-full border-dashed animate-[spin_180s_linear_infinite]" />
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[650px] h-[650px] border border-slate-200/50 dark:border-zinc-800/30 rounded-full border-dashed animate-[spin_120s_linear_infinite_reverse]" />

            {/* Interactive blueprint crosshair coordinates */}
            <svg className="absolute w-full h-full text-slate-300 dark:text-zinc-800" xmlns="http://www.w3.org/2000/svg">
              {/* Crosshair 1 */}
              <path d="M120 180h10M125 175v10" stroke="currentColor" strokeWidth="1.5" />
              {/* Crosshair 2 */}
              <path d="M880 140h10M885 135v10" stroke="currentColor" strokeWidth="1.5" />
              {/* Crosshair 3 */}
              <path d="M260 520h10M265 515v10" stroke="currentColor" strokeWidth="1.5" />
              {/* Crosshair 4 */}
              <path d="M780 580h10M785 575v10" stroke="currentColor" strokeWidth="1.5" />
              {/* Dot Arrays */}
              <circle cx="125" cy="400" r="1.5" fill="currentColor" />
              <circle cx="125" cy="415" r="1.5" fill="currentColor" />
              <circle cx="140" cy="400" r="1.5" fill="currentColor" />
              <circle cx="140" cy="415" r="1.5" fill="currentColor" />
              <circle cx="865" cy="460" r="1.5" fill="currentColor" />
              <circle cx="865" cy="475" r="1.5" fill="currentColor" />
              <circle cx="880" cy="460" r="1.5" fill="currentColor" />
              <circle cx="880" cy="475" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="max-w-[1000px] mx-auto px-6 text-center space-y-10">

          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] text-slate-900 dark:text-white">
              Stop writing tickets.<br />
              <span className="text-slate-400 dark:text-zinc-500">Start building.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium tracking-tight">
              ApeAI is the decoupled Product Operations engine. We ingest raw feedback signals, map vectors, draft Agile requirements, and sync to Jira automatically.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black text-sm font-bold px-8 py-4 rounded-full transition-all duration-200"
            >
              Start Free Workspace
            </Link>
            <a
              href="#interactive-sandbox"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-300 text-sm font-bold px-8 py-4 rounded-full transition-all duration-200"
            >
              Watch 1-Minute Demo
            </a>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / INTEGRATIONS BANNER */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto px-6 border-y border-slate-100 dark:border-zinc-900/50 py-10 text-center flex flex-col items-center">
          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-6">
            Seamlessly integrates with your existing stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center gap-2 font-bold text-xl"><Github className="w-6 h-6" /> GitHub</div>
            <div className="flex items-center gap-2 font-bold text-xl"><Trello className="w-6 h-6" /> Jira</div>
            <div className="flex items-center gap-2 font-bold text-xl"><LayoutGrid className="w-6 h-6" /> Linear</div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO SANDBOX (MAC FRAME STYLE) */}
      <section id="interactive-sandbox" className="pb-24 max-w-[1100px] mx-auto px-6">

        {/* Sleek MacOS-like wrapper */}
        <div className="relative border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0a0a0a] shadow-[0_20px_50px_rgba(15,_23,_42,_0.05)] dark:shadow-[0_20px_60px_rgba(0,_0,_0,_0.8)] transition-all">

          {/* Top Address/Status Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-900 bg-slate-50/80 dark:bg-zinc-950/80">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-zinc-800" />
              <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-zinc-800" />
              <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-zinc-800" />
            </div>

            <div className="flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono select-none px-6 py-1 bg-white dark:bg-zinc-900 rounded-md border border-slate-200 dark:border-zinc-800">
              api.apeai.io/sandbox/live
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-extrabold uppercase text-slate-600 dark:text-zinc-400 tracking-wider">
                Step {stepIndex + 1}/4
              </span>
            </div>
          </div>

          {/* Screen Canvas (Inherited strictly from Fathom walkthrough structure) */}
          <div className="min-h-[440px] p-8 md:p-12 transition-colors flex flex-col justify-center">

            {/* STAGE 1: INGESTION */}
            {stepIndex === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch h-full animate-fade-in">
                <div className="bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-zinc-800">
                    <FileText className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
                    <div>
                      <h4 className="text-sm font-bold">Feedback Ingestion Console</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Manual Paste</p>
                    </div>
                  </div>
                  <div className="pt-4 space-y-2">
                    <span className="text-xs font-bold">Saurabh (PM)</span>
                    <div className="text-xs text-slate-600 dark:text-zinc-300 font-medium leading-relaxed bg-white dark:bg-zinc-900 p-4 rounded-lg border border-slate-200 dark:border-zinc-800 min-h-[100px]">
                      {typewriterText}
                      <span className="inline-block w-1.5 h-3.5 bg-slate-900 dark:bg-white ml-1 animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0f172a] dark:bg-[#050505] border border-slate-800 dark:border-zinc-900 rounded-xl p-6 flex flex-col font-mono text-[11px] leading-relaxed text-zinc-300 shadow-inner">
                  <div className="flex items-center gap-2 text-zinc-400 font-bold pb-4 border-b border-slate-800 dark:border-zinc-900">
                    <Code className="w-4 h-4" /> Normalizer Endpoint
                  </div>
                  <pre className="pt-4 overflow-x-auto whitespace-pre-wrap text-emerald-400 font-medium">
                    {`{
  "source": "manual",
  "raw": "${typewriterText.length > 35 ? typewriterText.substring(0, 32) + '...' : typewriterText}",
  "meta": {
    "normalized": true,
    "timestamp": "2026-05-21T08:15Z"
  }
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* STAGE 2: pgvector SEMANTIC GROUPING */}
            {stepIndex === 1 && <PgVectorStage />}

            {/* STAGE 3: GEMINI AI DECOMPOSE */}
            {stepIndex === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch h-full animate-fade-in">
                <div className="bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-900 rounded-xl p-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-zinc-800 mb-4">
                    <FileText className="w-4 h-4" />
                    <h4 className="text-sm font-bold">Synthesized Document</h4>
                  </div>
                  <div className="space-y-3 bg-white dark:bg-black p-4 rounded-lg border border-slate-200 dark:border-zinc-800">
                    <h5 className="text-xs font-bold">PRD: Analytics CSV Exporter</h5>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                      "As a business analyst, I want to download historical feedback charts as raw CSV files..."
                    </p>
                    <div className="text-[10px] text-slate-500 list-disc pl-4 font-semibold pt-1">
                      <li>Returns strict RFC 4180 format.</li>
                      <li>Includes date parameter ranges.</li>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-900 rounded-xl p-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-zinc-800 mb-4">
                    <GitBranch className="w-4 h-4" />
                    <h4 className="text-sm font-bold">Engineering Breakdown</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white dark:bg-black p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                      <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold">Backend Task 1</h5>
                        <p className="text-[10px] text-slate-500 font-medium">Create FastAPI `/feedback/export` GET route.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white dark:bg-black p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                      <Square className="w-4 h-4 text-slate-300 dark:text-zinc-700 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold">Frontend Task 2</h5>
                        <p className="text-[10px] text-slate-500 font-medium">Build UI download button + date picker.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 4: PUBLISH GATE */}
            {stepIndex === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch h-full animate-fade-in">
                <div className="bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-900 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                  {!approved ? (
                    <>
                      <div className="w-12 h-12 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-4">
                        <MousePointerClick className="w-5 h-5 animate-bounce" />
                      </div>
                      <h5 className="text-sm font-bold mb-1">Human-in-the-Loop</h5>
                      <p className="text-xs text-slate-500 max-w-xs mb-6">Review generated spec and push tasks to systems.</p>
                      <button
                        onClick={handleApprove}
                        className="bg-slate-900 text-white dark:bg-white dark:text-black font-bold text-xs px-6 py-3 rounded-full hover:scale-105 transition-transform"
                      >
                        Approve & Sync
                      </button>
                    </>
                  ) : (
                    <div className="animate-fade-in flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-4">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <h5 className="text-sm font-bold">Successfully Verified!</h5>
                      <p className="text-xs text-slate-500">Hooks successfully dispatched.</p>
                    </div>
                  )}
                </div>

                <div className="bg-[#0f172a] dark:bg-[#050505] border border-slate-800 dark:border-zinc-900 rounded-xl p-6 flex flex-col font-mono text-[11px] leading-relaxed text-zinc-300">
                  <div className="flex items-center gap-2 text-zinc-400 font-bold pb-4 border-b border-slate-800 dark:border-zinc-900">
                    <Activity className="w-4 h-4" /> Decoupled Integrations
                  </div>
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between border border-slate-800 dark:border-zinc-900 p-3 rounded-lg">
                      <span className="font-bold">GitHub Issues</span>
                      {approved ? <span className="text-white">#104 Created</span> : <span className="text-zinc-600">Pending Gate</span>}
                    </div>
                    <div className="flex items-center justify-between border border-slate-800 dark:border-zinc-900 p-3 rounded-lg">
                      <span className="font-bold">Jira Cloud</span>
                      {approved ? <span className="text-white">APE-82 Logged</span> : <span className="text-zinc-600">Pending Gate</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controller Bar */}
          <div className="flex items-center justify-center gap-8 p-5 border-t border-slate-100 dark:border-zinc-900 bg-white dark:bg-[#0a0a0a]">
            <button onClick={() => setIsPlaying(!isPlaying)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => handleStepSelect(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${stepIndex === idx ? "w-8 bg-slate-900 dark:bg-white" : "w-2 bg-slate-200 dark:bg-zinc-800"}`}
                />
              ))}
            </div>
            <button onClick={handleReset} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ASYMMETRIC BENTO BOX FEATURES (Modern Fathom-style grids) */}
      <section className="py-24 bg-slate-50 dark:bg-[#050505] border-y border-slate-200 dark:border-zinc-900">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-12 text-center text-slate-900 dark:text-white">
            Engineered for <span className="text-slate-400 dark:text-zinc-500">Scale.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Bento 1: Large Span */}
            <div className="md:col-span-2 bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-800 rounded-3xl p-10 flex flex-col justify-end min-h-[250px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 dark:bg-zinc-800/50 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700" />
              <Zap className="w-8 h-8 text-slate-900 dark:text-white mb-6 relative" />
              <h3 className="text-3xl font-black tracking-tight mb-2 relative">Strictly Decoupled.</h3>
              <p className="text-slate-500 dark:text-zinc-400 font-medium relative max-w-md">
                Every architectural layer communicates exclusively via REST JSON. Zero tight coupling, allowing frictionless backend expansions.
              </p>
            </div>

            {/* Bento 2: Standard Span */}
            <div className="bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-800 rounded-3xl p-10 flex flex-col justify-end relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-48 h-48 bg-slate-100 dark:bg-zinc-800/50 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700" />
              <ShieldCheck className="w-8 h-8 text-slate-900 dark:text-white mb-6 relative" />
              <h3 className="text-2xl font-black tracking-tight mb-2 relative">Human Gates.</h3>
              <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium relative">
                AI outputs must be explicitly reviewed and approved by product managers before execution.
              </p>
            </div>

            {/* Bento 3: Full Width Banner Component */}
            <div className="md:col-span-3 bg-slate-900 dark:bg-[#0c0c0c] border border-slate-800 dark:border-zinc-800 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between overflow-hidden relative">
              <div className="z-10 text-white mb-6 md:mb-0">
                <CheckCircle2 className="w-8 h-8 text-white mb-6" />
                <h3 className="text-3xl font-black tracking-tight mb-2">Duplicate Blockers.</h3>
                <p className="text-slate-400 text-sm font-medium max-w-sm">
                  Integrated database trackers map relational links, strictly preventing redundant ticket duplication inside your external agile workflows.
                </p>
              </div>

              {/* Mock UI Element representing the blocker */}
              <div className="w-full md:w-96 bg-black/50 border border-slate-800 rounded-xl p-6 z-10 font-mono text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-800 pb-2 mb-2">
                  <span>POST /publish/jira</span>
                  <span className="text-red-400 font-bold">409 CONFLICT</span>
                </div>
                <p>{"{"}</p>
                <p className="pl-4">"error": "Duplicate action",</p>
                <p className="pl-4">"details": "Epic APE-82 already tracks cluster #104."</p>
                <p>{"}"}</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ZIG-ZAG ARCHITECTURE LAYERS (Atlassian Jira Style) */}
      <section className="py-24 md:py-32 overflow-hidden bg-white dark:bg-[#000000]">
        <div className="max-w-6xl mx-auto px-6 space-y-32">

          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
              The Engine Stack.
            </h2>
            <p className="text-lg text-slate-500 dark:text-zinc-400 font-medium">
              Explore how each decoupled module seamlessly transitions unstructured signals into agile velocity.
            </p>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6 order-2 md:order-1">
              <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                <Inbox className="w-6 h-6 text-slate-900 dark:text-white" />
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Layer 1: Unified Ingestion</h3>
              <p className="text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                Upload CSV spreadsheets or paste raw feedback directly. Unstructured customer feedback signals are instantly parsed, structured, and normalized inside our robust FastAPI middleware.
              </p>
            </div>
            <div className="order-1 md:order-2 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-800/80 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center p-6 relative overflow-hidden group">
              <style>{`
                @keyframes routeDash {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
              `}</style>
              
              {/* Background ambient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.03),transparent_60%)] pointer-events-none" />

              <div className="w-full h-full flex flex-col justify-between relative">
                {/* Header panel */}
                <div className="flex items-center justify-between bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur border border-slate-200 dark:border-zinc-800/80 px-3.5 py-2 rounded-xl shadow-sm text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-700 dark:text-zinc-300">INGESTION_ROUTER</span>
                  </div>
                  <span>ACTIVE STREAM</span>
                </div>

                {/* Main workflow visualization */}
                <div className="flex-1 flex items-center justify-between gap-4 py-4 relative">
                  {/* Left: Input Channels Stack */}
                  <div className="flex flex-col gap-3.5 w-[44%] z-10">
                    {/* Manual Text Channel */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-800/80 px-2.5 py-1.5 rounded-lg shadow-sm group-hover:translate-x-1 transition-transform duration-300">
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold text-slate-800 dark:text-zinc-200 truncate">Manual Text</p>
                        <p className="text-[7.5px] text-slate-400 dark:text-zinc-500 font-mono truncate">Text / Paste Console</p>
                      </div>
                    </div>

                    {/* CSV Ingestion */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-800/80 px-2.5 py-1.5 rounded-lg shadow-sm group-hover:translate-x-1.5 transition-transform duration-300">
                      <Inbox className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold text-slate-800 dark:text-zinc-200 truncate">CSV Spreadsheet</p>
                        <p className="text-[7.5px] text-slate-400 dark:text-zinc-500 font-mono truncate">Batch Feed Uploads</p>
                      </div>
                    </div>
                  </div>

                  {/* Middle: SVG Connection Lasers / Flow Arrows */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50 dark:opacity-75" viewBox="0 0 320 180" fill="none" style={{ zIndex: 0 }}>
                    <path d="M 115 65 Q 155 65 175 90" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,4" className="text-blue-500/80 dark:text-blue-400/80" style={{ animation: 'routeDash 1.5s linear infinite' }} />
                    <path d="M 115 115 Q 155 115 175 90" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,4" className="text-emerald-500/80 dark:text-emerald-400/80" style={{ animation: 'routeDash 1.5s linear infinite' }} />
                  </svg>

                  {/* Right: Central Router Card / Normalized Output */}
                  <div className="w-[45%] bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-3 flex flex-col justify-between h-[130px] z-10 font-mono text-[8.5px] text-zinc-300">
                    <div className="flex items-center gap-1.5 text-zinc-400 pb-1.5 border-b border-slate-800">
                      <Code className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="font-bold uppercase text-[7.5px] tracking-wider text-zinc-300">Router API v1.0</span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-1 py-1.5">
                      <p className="text-emerald-400 font-bold text-[7.5px]">✓ Ingesting signal</p>
                      <pre className="text-zinc-400 text-[7px] leading-tight overflow-hidden">
{`{
  "source": "manual",
  "status": "valid",
  "data_id": "9218"
}`}
                      </pre>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800 text-[6.5px] text-zinc-500 text-right">
                      100% Normalized
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 (Reversed) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-800/80 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center p-6 relative overflow-hidden group">
              <PgVectorSimilarityLayer />
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-slate-900 dark:text-white" />
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Layer 2: Relational Memory</h3>
              <p className="text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                We leverage Supabase and the Postgres `pgvector` extension. Our engine creates 768-dimensional embeddings using Gemini, performing instant cosine-similarity queries to match and group thousands of disjointed customer requests autonomously.
              </p>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6 order-2 md:order-1">
              <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6 text-slate-900 dark:text-white" />
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Layer 3: AI Decompose</h3>
              <p className="text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                The grouped insight nodes are handed to the Google Gemini multi-stage agent. It drafts full Business Requirement Documents, splits them into structured User Stories, and recursively decomposes tickets into Frontend, Backend, and Test chunks.
              </p>
            </div>
            <div className="order-1 md:order-2 bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-zinc-800/80 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center p-6 relative overflow-hidden group">
              <AgentDecomposeLayer />
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 py-12 px-6 bg-white dark:bg-[#000000] text-center text-sm text-slate-500 dark:text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-black tracking-tight text-slate-900 dark:text-white">
            <Cpu className="w-5 h-5" /> ApeAI.
          </div>
          <p className="font-medium">
            © {new Date().getFullYear()} ApeAI. Engineered for Decoupled Product Operations.
          </p>
        </div>
      </footer>

    </div>
  );
}
