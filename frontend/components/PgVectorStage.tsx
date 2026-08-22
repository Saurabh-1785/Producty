import React from 'react';
import { Database, Terminal, Code, Cpu } from 'lucide-react';

export default function PgVectorStage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch h-full animate-fade-in">
      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes queryFadeIn {
          0% { opacity: 0; transform: scale(0.4); }
          12% { opacity: 0; transform: scale(0.4); }
          22% { opacity: 1; transform: scale(1.15); }
          26% { transform: scale(1); }
          90% { opacity: 1; }
          95% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes labelFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          20% { opacity: 0; transform: translateY(4px); }
          28% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; }
          95% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes radarSweep {
          0% { opacity: 0; transform: scale(0); }
          26% { opacity: 0; transform: scale(0); }
          27% { opacity: 0.8; transform: scale(0); }
          52% { opacity: 0; transform: scale(2.4); }
          100% { opacity: 0; }
        }

        @keyframes laserDraw {
          0% { stroke-dashoffset: 100; opacity: 0; }
          48% { stroke-dashoffset: 100; opacity: 0; }
          50% { opacity: 1; }
          70% { stroke-dashoffset: 0; opacity: 1; }
          90% { opacity: 1; }
          95% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes matchGlow1 {
          0% { fill: #64748b; filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0)); }
          48% { fill: #64748b; filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0)); }
          55% { fill: #10b981; filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)); }
          90% { fill: #10b981; filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)); }
          95% { fill: #64748b; opacity: 0; }
          100% { fill: #64748b; opacity: 0; }
        }

        @keyframes matchGlow2 {
          0% { fill: #64748b; filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0)); }
          52% { fill: #64748b; filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0)); }
          59% { fill: #10b981; filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)); }
          90% { fill: #10b981; filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)); }
          95% { fill: #64748b; opacity: 0; }
          100% { fill: #64748b; opacity: 0; }
        }

        @keyframes cosineArc {
          0% { opacity: 0; stroke-dashoffset: 40; }
          55% { opacity: 0; stroke-dashoffset: 40; }
          65% { opacity: 0.6; stroke-dashoffset: 0; }
          90% { opacity: 0.6; }
          95% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes textStep1 {
          0% { opacity: 0; transform: translateY(2px); }
          2% { opacity: 1; transform: translateY(0); }
          95% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes textStep2 {
          0% { opacity: 0; transform: translateY(2px); }
          15% { opacity: 0; transform: translateY(2px); }
          18% { opacity: 1; transform: translateY(0); }
          95% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes textStep3 {
          0% { opacity: 0; transform: translateY(2px); }
          32% { opacity: 0; transform: translateY(2px); }
          35% { opacity: 1; transform: translateY(0); }
          95% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes textStep4 {
          0% { opacity: 0; transform: translateY(2px); }
          55% { opacity: 0; transform: translateY(2px); }
          58% { opacity: 1; transform: translateY(0); }
          95% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes textStep5 {
          0% { opacity: 0; transform: translateY(2px); }
          72% { opacity: 0; transform: translateY(2px); }
          75% { opacity: 1; transform: translateY(0); }
          95% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Left Column: Semantic Coordinate Space */}
      <div className="bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <Database className="w-4 h-4 text-slate-800 dark:text-zinc-300" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">pgvector High-Dimensional Subspace</h4>
        </div>

        {/* Visual Map Canvas */}
        <div className="relative h-64 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-black mt-4 overflow-hidden shadow-inner">
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:16px_16px] opacity-75" />

          {/* SVG Vector and Node Space */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
            {/* Cluster A: Bugs & Crashes (Red/Rose Zone) */}
            <g opacity="0.35">
              <circle cx="50" cy="45" r="3" fill="#ef4444" />
              <circle cx="65" cy="35" r="2.5" fill="#ef4444" />
              <circle cx="45" cy="60" r="3" fill="#ef4444" />
              <circle cx="70" cy="55" r="2" fill="#ef4444" />
              <text x="42" y="24" className="text-[7px] font-bold tracking-wider fill-rose-500 uppercase select-none">Bugs & Crashes</text>
              <rect x="40" y="28" width="50" height="42" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
            </g>

            {/* Cluster B: Authentication & Security (Cyan Zone) */}
            <g opacity="0.35">
              <circle cx="60" cy="145" r="3" fill="#06b6d4" />
              <circle cx="75" cy="155" r="2" fill="#06b6d4" />
              <circle cx="50" cy="160" r="2.5" fill="#06b6d4" />
              <text x="45" y="132" className="text-[7px] font-bold tracking-wider fill-cyan-500 uppercase select-none">Auth & Billing</text>
              <rect x="42" y="136" width="48" height="34" fill="none" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.4" />
            </g>

            {/* Cluster C: Analytics & Features (Target Matching Cluster) */}
            <g>
              <text x="215" y="28" className="text-[7px] font-bold tracking-wider fill-slate-400 dark:fill-zinc-500 uppercase select-none">Analytics Features</text>
              {/* Boundary dashed line of target cluster */}
              <rect x="180" y="34" width="125" height="135" fill="none" stroke="#64748b" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.25" />

              {/* Distant feature node (Unrelated) */}
              <circle cx="210" cy="55" r="3" className="fill-slate-300 dark:fill-zinc-700" />
              <circle cx="280" cy="50" r="2.5" className="fill-slate-300 dark:fill-zinc-700" opacity="0.6" />

              {/* Match Candidate 1 (Existing CSV issue) */}
              <circle cx="225" cy="115" r="4.5"
                style={{ animation: 'matchGlow1 6s infinite ease-in-out' }}
                className="transition-all duration-300"
              />
              <text x="182" y="108"
                style={{ animation: 'labelFadeIn 6s infinite ease-in-out' }}
                className="text-[6.5px] font-bold fill-emerald-500 select-none bg-black"
              >
                Match #1: Ticket APE-210 (94.2%)
              </text>

              {/* Match Candidate 2 (Duplicate request) */}
              <circle cx="265" cy="130" r="4"
                style={{ animation: 'matchGlow2 6s infinite ease-in-out' }}
                className="transition-all duration-300"
              />
              <text x="250" y="145"
                style={{ animation: 'labelFadeIn 6s infinite ease-in-out' }}
                className="text-[6.5px] font-bold fill-emerald-500 select-none"
              >
                Match #2: Issue #421 (88.7%)
              </text>

              {/* Laser Connector Lines (from query point to candidate nodes) */}
              <line x1="240" y1="90" x2="225" y2="115"
                stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3"
                style={{ strokeDasharray: '100', strokeDashoffset: '100', animation: 'laserDraw 6s infinite linear' }}
              />
              <line x1="240" y1="90" x2="265" y2="130"
                stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3"
                style={{ strokeDasharray: '100', strokeDashoffset: '100', animation: 'laserDraw 6s infinite linear' }}
              />

              {/* Cosine Angle Archetype Curve */}
              <path d="M 233 102 A 20 20 0 0 0 248 102"
                fill="none" stroke="#f43f5e" strokeWidth="1.2"
                style={{ strokeDasharray: '40', strokeDashoffset: '40', animation: 'cosineArc 6s infinite ease-out' }}
              />

              {/* INCOMING QUERY VECTOR NODE */}
              <g style={{ transformOrigin: '240px 90px', animation: 'queryFadeIn 6s infinite ease-in-out' }}>
                {/* Outer concentric tracking circles */}
                <circle cx="240" cy="90" r="14" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" className="animate-spin" />
                <circle cx="240" cy="90" r="5" className="fill-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                <circle cx="240" cy="90" r="2.5" className="fill-white" />
              </g>

              {/* Radar scanner sweep ring expanding from query point */}
              <div className="absolute" style={{ left: '240px', top: '90px', transform: 'translate(-50%, -50%)' }}>
                <div
                  style={{ transformOrigin: 'center', animation: 'radarSweep 6s infinite ease-out' }}
                  className="w-40 h-40 rounded-full border-2 border-dashed border-blue-500/50 pointer-events-none"
                />
              </div>

              {/* Query Tag */}
              <g style={{ animation: 'labelFadeIn 6s infinite ease-in-out' }}>
                <rect x="200" y="68" width="80" height="11" rx="3" fill="#1e293b" className="stroke-blue-500" strokeWidth="0.5" />
                <text x="204" y="76" className="text-[6.5px] font-bold fill-white tracking-wide select-none">Query: CSV Spreadsheets</text>
              </g>
            </g>
          </svg>

          {/* Core Labels */}
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-slate-800 px-2 py-0.5 rounded text-[8px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Vector Querying
          </div>
        </div>
      </div>

      {/* Right Column: Console / Database Engine Terminal */}
      <div className="bg-[#0f172a] dark:bg-[#050505] border border-slate-800 dark:border-zinc-900 rounded-xl p-6 flex flex-col font-mono text-[11px] leading-relaxed text-zinc-300 justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 dark:border-zinc-900">
            <div className="flex items-center gap-2 text-zinc-400 font-bold">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span>Cluster Query Engine v1.02</span>
            </div>
            <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
              Live Compiler
            </div>
          </div>

          <div className="pt-4 space-y-3">
            {/* Step 1: Init */}
            <p className="text-zinc-500 flex items-center gap-1.5" style={{ animation: 'textStep1 6s infinite' }}>
              <span className="w-1 h-1 rounded-full bg-zinc-500" />
              Initializing pgvector cosine metric mapping...
            </p>

            {/* Step 2: Ingest & Embed */}
            <div className="space-y-1" style={{ animation: 'textStep2 6s infinite' }}>
              <p className="text-blue-400">&gt; google.generativeai.embed_content(raw_feedback)</p>
              <p className="text-zinc-500 text-[10px] pl-3">
                Mapped text (1,536 dimensions) → Vector <span className="text-blue-300 font-bold">[0.0142, -0.0984, ..., 0.8123]</span>
              </p>
            </div>

            {/* Step 3: DB Query */}
            <div className="space-y-1" style={{ animation: 'textStep3 6s infinite' }}>
              <p className="text-purple-400">&gt; SELECT ticket_id, similarity FROM ticket_vectors</p>
              <p className="text-purple-400 pl-3">ORDER BY embedding &lt;=&gt; query_vector LIMIT 3;</p>
            </div>

            {/* Step 4: Scan and Matches */}
            <div className="space-y-1.5" style={{ animation: 'textStep4 6s infinite' }}>
              <p className="text-amber-400">&gt;&gt; Database search completed. Scanning clusters...</p>
              <p className="text-white font-extrabold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Found 2 coordinate neighbors in [Feature Analytics] subspace.
              </p>
            </div>

            {/* Step 5: Distance Calculation & Block duplicate */}
            <div className="space-y-1 p-2.5 rounded bg-emerald-950/20 border border-emerald-900/30 text-emerald-400" style={{ animation: 'textStep5 6s infinite' }}>
              <p className="font-extrabold flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" />
                Deduplication Gate Triggered (Similarity &gt; 0.85)
              </p>
              <p className="text-[10px] pl-5">
                • Cosine Distance Metric: <span className="font-extrabold text-white">0.9419</span> (Match with APE-210)
              </p>
              <p className="text-[10px] pl-5">
                • Cosine Distance Metric: <span className="font-extrabold text-white">0.8870</span> (Match with Issue #421)
              </p>
              <p className="text-[10px] pl-5 font-bold text-white uppercase tracking-wider pt-0.5">
                → Rerouting current ticket to parent Issue #421.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/60 dark:border-zinc-900/60 flex items-center justify-between text-[10px] text-zinc-500 font-sans">
          <span>Query latency: <strong className="text-zinc-400">14.2ms</strong></span>
          <span>Engine Status: <strong className="text-emerald-500">IDLE (Listening)</strong></span>
        </div>
      </div>
    </div>
  );
}
