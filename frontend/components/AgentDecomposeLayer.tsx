"use client";

import React, { useEffect, useState } from "react";
import { FileText, CheckSquare, Square, Cpu, Sparkles } from "lucide-react";

export default function AgentDecomposeLayer() {
  const [phase, setPhase] = useState(0); // 0: Ingestion, 1: AI Processing, 2: Split Success
  const [frontChecked, setFrontChecked] = useState([false, false]);
  const [backChecked, setBackChecked] = useState([false, false]);

  // Dynamic animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setPhase((prev) => {
        const next = (prev + 1) % 3;
        if (next === 0) {
          setFrontChecked([false, false]);
          setBackChecked([false, false]);
        }
        return next;
      });
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  // Sequenced checklist simulation
  useEffect(() => {
    if (phase === 2) {
      const t1 = setTimeout(() => setFrontChecked([true, false]), 600);
      const t2 = setTimeout(() => setBackChecked([true, false]), 1200);
      const t3 = setTimeout(() => setFrontChecked([true, true]), 1800);
      const t4 = setTimeout(() => setBackChecked([true, true]), 2400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [phase]);

  return (
    <div className="w-full h-full flex flex-col justify-between relative">
      <style>{`
        @keyframes pulseBorder {
          0%, 100% { border-color: rgba(168, 85, 247, 0.2); box-shadow: 0 0 0px rgba(168, 85, 247, 0); }
          50% { border-color: rgba(168, 85, 247, 0.6); box-shadow: 0 0 12px rgba(168, 85, 247, 0.25); }
        }
        @keyframes laserRun {
          0% { stroke-dashoffset: 40; opacity: 0.2; }
          50% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.2; }
        }
        @keyframes rotateProcessing {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header panel */}
      <div className="flex items-center justify-between bg-white/85 dark:bg-[#1b1b1f]/85 backdrop-blur border border-slate-200 dark:border-zinc-800/80 px-3.5 py-2 rounded-xl shadow-sm text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 z-10">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
          <span className="text-slate-700 dark:text-zinc-300">GEMINI_DECOMPOSER</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
          <span className="text-purple-500 font-extrabold uppercase text-[7.5px]">
            {phase === 0 ? "Ingesting Spec" : phase === 1 ? "Decomposing..." : "Splitting Stories"}
          </span>
        </div>
      </div>

      {/* Main decomposition tree layout */}
      <div className="flex-1 flex flex-col items-center justify-between py-4 relative z-10 min-h-0">
        {/* Top Node (PRD Input Card) */}
        <div
          className={`w-[65%] bg-white dark:bg-[#121214] border rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm transition-all duration-500 z-20 ${
            phase === 0
              ? "border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20 scale-[1.03]"
              : "border-slate-200 dark:border-zinc-800/80"
          }`}
          style={{ animation: phase === 1 ? "pulseBorder 2s infinite" : "none" }}
        >
          <div className={`p-1.5 rounded-lg flex items-center justify-center transition-colors duration-500 ${phase === 0 ? "bg-purple-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"}`}>
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold text-slate-800 dark:text-zinc-200 font-mono truncate">CSV Exporter PRD</p>
            <p className="text-[7.5px] text-slate-400 dark:text-zinc-500 font-mono">
              {phase === 0 ? "Analyzing customer signals..." : phase === 1 ? "Gemini splitting spec..." : "Decomposition complete!"}
            </p>
          </div>
          <span className={`text-[6.5px] font-black uppercase px-2 py-0.5 rounded-full border transition-all ${phase === 0 ? "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50" : "bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-zinc-700/50"}`}>
            PRD
          </span>
        </div>

        {/* 100% Responsive SVG Tree Connections with Proportional Math */}
        <div className="w-full h-10 relative flex justify-center items-center">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Base line paths */}
            <path d="M 50 0 L 24 100" stroke="currentColor" strokeWidth="1.5" className="text-slate-100 dark:text-zinc-800/50" />
            <path d="M 50 0 L 76 100" stroke="currentColor" strokeWidth="1.5" className="text-slate-100 dark:text-zinc-800/50" />

            {/* Glowing Laser pulses when active */}
            {phase >= 1 && (
              <>
                <path
                  d="M 50 0 L 24 100"
                  stroke="url(#purpleGrad)"
                  strokeWidth="2"
                  strokeDasharray="15, 25"
                  className="opacity-90"
                  style={{ animation: "laserRun 1.5s linear infinite" }}
                />
                <path
                  d="M 50 0 L 76 100"
                  stroke="url(#purpleGrad)"
                  strokeWidth="2"
                  strokeDasharray="15, 25"
                  className="opacity-90"
                  style={{ animation: "laserRun 1.5s linear infinite" }}
                />
              </>
            )}

            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central AI Processor Bubble */}
          <div className={`absolute w-7 h-7 rounded-full bg-white dark:bg-[#121214] border flex items-center justify-center shadow-md transition-all duration-500 z-20 ${phase === 1 ? "border-purple-500 scale-110" : "border-slate-200 dark:border-zinc-800"}`}>
            {phase === 1 ? (
              <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-spin" style={{ animationDuration: '3s' }} />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            )}
          </div>
        </div>

        {/* Proportional Child Nodes */}
        <div className="flex w-full justify-between gap-4 z-10">
          {/* Left Child: Frontend User Story */}
          <div
            className={`w-[47%] bg-white dark:bg-[#121214] border rounded-xl p-2.5 shadow-sm space-y-2.5 transition-all duration-500 ${
              phase === 2
                ? "border-cyan-500/50 dark:border-cyan-500/40 shadow-cyan-100/10 dark:shadow-none"
                : "border-slate-100 dark:border-zinc-800/80 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800/50">
              <span className="text-[7.5px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-widest">FRONTEND STORY</span>
              <span className={`w-1.5 h-1.5 rounded-full bg-cyan-500 ${phase === 2 ? "animate-pulse" : "opacity-30"}`} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {frontChecked[0] ? (
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-500 shrink-0 transition-transform duration-300 scale-110" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-700 shrink-0" />
                )}
                <span className={`text-[7.5px] font-bold font-mono transition-colors duration-300 ${frontChecked[0] ? "text-slate-800 dark:text-zinc-200" : "text-slate-400 dark:text-zinc-600"}`}>
                  CSV Download Button
                </span>
              </div>
              <div className="flex items-center gap-2">
                {frontChecked[1] ? (
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-500 shrink-0 transition-transform duration-300 scale-110" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-700 shrink-0" />
                )}
                <span className={`text-[7.5px] font-bold font-mono transition-colors duration-300 ${frontChecked[1] ? "text-slate-800 dark:text-zinc-200" : "text-slate-400 dark:text-zinc-600"}`}>
                  Date Picker UI
                </span>
              </div>
            </div>
          </div>

          {/* Right Child: Backend User Story */}
          <div
            className={`w-[47%] bg-white dark:bg-[#121214] border rounded-xl p-2.5 shadow-sm space-y-2.5 transition-all duration-500 ${
              phase === 2
                ? "border-purple-500/50 dark:border-purple-500/40 shadow-purple-100/10 dark:shadow-none"
                : "border-slate-100 dark:border-zinc-800/80 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-800/50">
              <span className="text-[7.5px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-widest">BACKEND STORY</span>
              <span className={`w-1.5 h-1.5 rounded-full bg-purple-500 ${phase === 2 ? "animate-pulse" : "opacity-30"}`} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {backChecked[0] ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-500 shrink-0 transition-transform duration-300 scale-110" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-700 shrink-0" />
                )}
                <span className={`text-[7.5px] font-bold font-mono transition-colors duration-300 ${backChecked[0] ? "text-slate-800 dark:text-zinc-200" : "text-slate-400 dark:text-zinc-600"}`}>
                  FastAPI /export Route
                </span>
              </div>
              <div className="flex items-center gap-2">
                {backChecked[1] ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-500 shrink-0 transition-transform duration-300 scale-110" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-700 shrink-0" />
                )}
                <span className={`text-[7.5px] font-bold font-mono transition-colors duration-300 ${backChecked[1] ? "text-slate-800 dark:text-zinc-200" : "text-slate-400 dark:text-zinc-600"}`}>
                  CSV Formatter Unit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
