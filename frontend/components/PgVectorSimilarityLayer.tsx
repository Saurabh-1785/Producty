"use client";

import React, { useEffect, useState } from "react";
import { Database, Terminal, Code, Cpu } from "lucide-react";

export default function PgVectorSimilarityLayer() {
  const [activeStep, setActiveStep] = useState(0);

  // Rotate console output and animations every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-between relative">
      <style>{`
        @keyframes radarRipple {
          0% {
            transform: scale(0.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        @keyframes floatNode {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-4px) scale(1.05); }
        }
        @keyframes dashFlow {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}</style>

      {/* Header panel */}
      <div className="flex items-center justify-between bg-white/85 dark:bg-[#1b1b1f]/85 backdrop-blur border border-slate-200 dark:border-zinc-800/80 px-3.5 py-2 rounded-xl shadow-sm text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 z-10">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span className="text-slate-700 dark:text-zinc-300">PGVECTOR_SUBSPACES</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-500">COSINE DISTANCE SEARCH</span>
        </div>
      </div>

      {/* Main visualization grid */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-4 relative z-10 min-h-0">
        {/* Left: 2D Subspace scatter plot (7 cols) */}
        <div className="sm:col-span-7 h-full flex flex-col justify-center relative min-h-[140px] sm:min-h-0">
          <div className="w-full h-full border border-slate-200 dark:border-zinc-800/80 rounded-xl bg-white/60 dark:bg-black/30 relative overflow-hidden flex items-center justify-center p-2 shadow-inner">
            {/* Grid Coordinates backdrop */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-[0.06] dark:opacity-[0.12] pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-t border-l border-slate-900 dark:border-white" />
              ))}
            </div>

            {/* Axes */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-200/60 dark:bg-zinc-800/60 pointer-events-none" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-200/60 dark:bg-zinc-800/60 pointer-events-none" />

            <svg className="w-full h-full absolute inset-0 select-none pointer-events-none" viewBox="0 0 200 120" fill="none">
              {/* Cluster 1: Features (Purple) */}
              <g opacity="0.35">
                <circle cx="45" cy="35" r="2.5" fill="#a855f7" />
                <circle cx="30" cy="20" r="2" fill="#a855f7" />
                <circle cx="55" cy="25" r="2.5" fill="#a855f7" />
                <line x1="30" y1="20" x2="45" y2="35" stroke="#a855f7" strokeWidth="0.5" />
                <line x1="45" y1="35" x2="55" y2="25" stroke="#a855f7" strokeWidth="0.5" />
              </g>

              {/* Cluster 2: Security & Auth (Amber) */}
              <g opacity="0.35">
                <circle cx="160" cy="85" r="2" fill="#f59e0b" />
                <circle cx="145" cy="95" r="2.5" fill="#f59e0b" />
                <circle cx="170" cy="100" r="2.5" fill="#f59e0b" />
                <line x1="145" y1="95" x2="160" y2="85" stroke="#f59e0b" strokeWidth="0.5" />
                <line x1="160" y1="85" x2="170" y2="100" stroke="#f59e0b" strokeWidth="0.5" />
              </g>

              {/* Cluster 3: Analytics Target Match (Emerald) */}
              <g>
                {/* Laser connections from input vector to nearest neighbors */}
                <line x1="100" y1="60" x2="80" y2="78" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" style={{ animation: 'dashFlow 1.2s linear infinite' }} />
                <line x1="100" y1="60" x2="122" y2="42" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" style={{ animation: 'dashFlow 1.2s linear infinite' }} />

                {/* Target Node 1 */}
                <circle cx="80" cy="78" r="4" fill="#10b981" className="animate-pulse" />
                <text x="52" y="89" className="text-[5.5px] font-mono fill-emerald-600 dark:fill-emerald-400 font-extrabold">APE-210 (0.94 sim)</text>

                {/* Target Node 2 */}
                <circle cx="122" cy="42" r="4" fill="#10b981" />
                <text x="127" y="38" className="text-[5.5px] font-mono fill-emerald-600 dark:fill-emerald-400 font-extrabold">Issue #421 (0.89 sim)</text>
              </g>

              {/* Incoming Embedding Vector Point */}
              <g style={{ animation: 'floatNode 3s ease-in-out infinite' }}>
                {/* Expanding Radar Sweep Waves */}
                <circle cx="100" cy="60" r="16" fill="none" stroke="#3b82f6" strokeWidth="0.75" className="origin-center" style={{ transformOrigin: '100px 60px', animation: 'radarRipple 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite' }} />
                <circle cx="100" cy="60" r="28" fill="none" stroke="#3b82f6" strokeWidth="0.5" className="origin-center" style={{ transformOrigin: '100px 60px', animation: 'radarRipple 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite', animationDelay: '0.8s' }} />

                {/* Core point */}
                <circle cx="100" cy="60" r="8" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,1" />
                <circle cx="100" cy="60" r="4.5" fill="#3b82f6" />
                <circle cx="100" cy="60" r="1.5" fill="#fff" />
              </g>
              <text x="90" y="49" className="text-[6.5px] font-extrabold fill-blue-600 dark:fill-blue-400 font-sans tracking-wide">Input Vector</text>
            </svg>
          </div>
        </div>

        {/* Right: Live SQL Console and matches (5 cols) */}
        <div className="sm:col-span-5 h-full flex flex-col justify-between">
          <div className="w-full h-full bg-[#0d0d10] border border-slate-800 rounded-xl p-3 flex flex-col justify-between font-mono text-[8px] leading-relaxed text-zinc-300 min-h-[140px] shadow-lg">
            {/* Terminal Header */}
            <div className="flex items-center gap-1.5 text-zinc-400 pb-1.5 border-b border-slate-800/80">
              <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="font-bold uppercase text-[7px] tracking-wider text-zinc-300">Supabase Engine</span>
            </div>

            {/* SQL Query Snippet */}
            <div className="py-1 text-slate-500 font-medium">
              <span className="text-purple-400">SELECT</span> id, sim <br />
              <span className="text-purple-400">FROM</span> embeddings <br />
              <span className="text-purple-400">ORDER BY</span> val <span className="text-emerald-400">&lt;=&gt;</span> :query <br />
              <span className="text-purple-400">LIMIT</span> <span className="text-blue-400">2</span>;
            </div>

            {/* Live Matches console lines */}
            <div className="space-y-1 pt-1.5 border-t border-slate-800/60 text-left">
              <div className="flex items-center gap-1 text-[7.5px]">
                <span className="text-zinc-500 animate-pulse">&gt;</span>
                <span className="text-blue-400 font-bold">Embedding calculated</span>
              </div>
              
              <div className="space-y-1">
                <div className={`transition-all duration-500 flex items-center justify-between text-[7px] p-1 rounded ${activeStep >= 1 ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 opacity-100" : "opacity-40"}`}>
                  <span className="font-semibold">✓ APE-210 Match</span>
                  <span className="font-mono text-emerald-500 text-[6.5px]">94.2% Sim</span>
                </div>
                <div className={`transition-all duration-500 flex items-center justify-between text-[7px] p-1 rounded ${activeStep >= 2 ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 opacity-100" : "opacity-40"}`}>
                  <span className="font-semibold">✓ Issue #421 Match</span>
                  <span className="font-mono text-emerald-500 text-[6.5px]">88.7% Sim</span>
                </div>
              </div>
            </div>

            {/* Footer status */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/40 text-[6.5px] text-zinc-500">
              <span>Query time: 1.2ms</span>
              <span className="text-emerald-500 font-bold uppercase animate-pulse">Synced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
