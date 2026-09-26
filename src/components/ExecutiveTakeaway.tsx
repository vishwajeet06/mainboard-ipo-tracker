import React from 'react';
import { DashboardKPIs } from '../types/ipo';
import { 
  Sparkles, 
  Target, 
  Eye, 
  Activity, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert 
} from 'lucide-react';

interface ExecutiveTakeawayProps {
  kpis: DashboardKPIs;
  onOpenQuickApply: (name: string) => void;
}

export const ExecutiveTakeaway: React.FC<ExecutiveTakeawayProps> = ({
  kpis,
  onOpenQuickApply,
}) => {
  const { executiveTakeaway, date } = kpis;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar with Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Executive Daily Takeaway
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                Operator Desk Report
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-200">{date}</span>
          <span>•</span>
          <span className="text-slate-400">Indian Standard Time (IST)</span>
        </div>
      </div>

      {/* 3 Core Blocks: Action Focus, Key Watch, Market Sentiment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
        
        {/* Action Focus */}
        <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Action Focus
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {executiveTakeaway.actionFocus}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Post-Bidding Phase</span>
            <button
              onClick={() => onOpenQuickApply('Moneyview Ltd.')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              Review Moneyview &rarr;
            </button>
          </div>
        </div>

        {/* Key Watch / Action */}
        <div className="bg-slate-800/50 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              <Eye className="w-4 h-4 text-amber-400" />
              Key Watch / Action
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {executiveTakeaway.keyWatch}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>Risk Strategy: Protect Capital</span>
            <span className="text-amber-400 font-semibold">Avoid Listing Discounts</span>
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="bg-slate-800/50 border border-indigo-500/20 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <Activity className="w-4 h-4 text-indigo-400" />
                Market Sentiment
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {executiveTakeaway.marketSentiment}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {executiveTakeaway.marketSummary}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 text-[11px] text-slate-400">
            Institutional QIB bias: High selective quality
          </div>
        </div>

      </div>

      {/* Operator Golden Rules Bar */}
      <div className="mt-5 p-3.5 bg-gradient-to-r from-slate-800/80 via-slate-800/40 to-slate-800/80 rounded-xl border border-slate-700/70 text-xs text-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Retail Investor Golden Rules:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
            <span>1. Minimum 15% GMP cushion recommended</span>
            <span>•</span>
            <span>2. Verify Day 3 QIB participation (&gt;5x preferred)</span>
            <span>•</span>
            <span>3. In heavily oversubscribed issues, apply 1 lot across multiple family PANs</span>
          </div>
        </div>
      </div>

    </div>
  );
};
