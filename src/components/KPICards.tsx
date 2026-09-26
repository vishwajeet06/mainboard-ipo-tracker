import React from 'react';
import { DashboardKPIs } from '../types/ipo';
import { 
  Flame, 
  TrendingUp, 
  Award, 
  Zap, 
  Calendar, 
  PieChart,
  ArrowUpRight 
} from 'lucide-react';

interface KPICardsProps {
  kpis: DashboardKPIs;
  onFilterHighPotential: () => void;
  onSelectIPO: (name: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  kpis,
  onFilterHighPotential,
  onSelectIPO,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      
      {/* 1. Total Tracked Mainboard IPOs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg group hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Tracked
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <PieChart className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {kpis.totalTracked}
          </span>
          <span className="text-xs text-slate-400 font-medium">Mainboard IPOs</span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>6 Active Live • 4 Post-Close (Allotment) • 2 Upcoming • 3 Listed</span>
        </div>
      </div>

      {/* 2. High Potential IPOs (GMP > 20%) */}
      <div 
        onClick={onFilterHighPotential}
        className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg cursor-pointer group hover:border-emerald-500/60 transition"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> High Potential
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            {kpis.highPotentialCount}
          </span>
          <span className="text-xs text-emerald-300/80 font-medium">GMP &gt; 20% Cushion</span>
        </div>
        <div className="mt-2 text-xs text-emerald-400/90 flex items-center gap-1 font-medium group-hover:underline">
          <span>Moneyview (+42.7%) &amp; Adroit (+26.1%)</span>
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>

      {/* 3. Average Estimated Listing Gain (%) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg group hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Avg Est. Listing Gain
          </span>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            +{kpis.avgEstListingGain}%
          </span>
          <span className="text-xs text-teal-400 font-medium">Weighted Buffer</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Reflects 12 unlisted discovered issues
        </div>
      </div>

      {/* 4. Top Pick by GMP */}
      <div 
        onClick={() => onSelectIPO(kpis.topPickGmp.name)}
        className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg cursor-pointer group hover:border-indigo-500/60 transition"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> Top Pick by GMP
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-base font-bold text-white truncate group-hover:text-indigo-300 transition">
            {kpis.topPickGmp.name}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">
              +{kpis.topPickGmp.gainPercent}%
            </span>
            <span className="text-xs text-slate-400">₹{kpis.topPickGmp.gmpRs.toFixed(2)} GMP</span>
          </div>
        </div>
        <div className="mt-1 text-[11px] text-indigo-300/80 truncate">
          Dominant lending fintech • Day 2 Live
        </div>
      </div>

      {/* 5. Major Mover */}
      <div 
        onClick={() => onSelectIPO(kpis.majorMover.name)}
        className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg cursor-pointer group hover:border-amber-500/60 transition"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Major Mover
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-base font-bold text-white truncate group-hover:text-amber-300 transition">
            {kpis.majorMover.name}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-400">
              {kpis.majorMover.sub}x
            </span>
            <span className="text-xs text-emerald-400 font-semibold">+{kpis.majorMover.gmpGainPercent}%</span>
          </div>
        </div>
        <div className="mt-1 text-[11px] text-amber-300/80 truncate">
          Final-day bidding surge • Closes 5 PM
        </div>
      </div>

    </div>
  );
};
