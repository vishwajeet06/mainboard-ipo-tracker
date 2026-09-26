import React from 'react';
import { MainboardIPO, RetailDecision } from '../types/ipo';
import { calculateListingProgress } from '../utils/dateUtils';
import { 
  Calculator, 
  ChevronRight, 
  Clock, 
  Building2,
  Calendar,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface IPOCardGridProps {
  ipos: MainboardIPO[];
  onSelectIPO: (ipo: MainboardIPO) => void;
  onOpenCalculator: (ipo: MainboardIPO) => void;
}

export const IPOCardGrid: React.FC<IPOCardGridProps> = ({
  ipos,
  onSelectIPO,
  onOpenCalculator,
}) => {
  const getDecisionBadge = (decision: RetailDecision) => {
    switch (decision) {
      case 'Strong Apply':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30';
      case 'Apply for Listing Gains':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'Apply with Caution / Neutral':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Under Review':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Avoid':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Listed (Book Major Profits)':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Listed (Hold with Trailing SL)':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ipos.map((ipo) => {
        const isHighGmp = (ipo.estGainPercent || 0) >= 20;
        const progressInfo = calculateListingProgress(ipo.closeDate, ipo.listingDate);

        return (
          <div
            key={ipo.id}
            onClick={() => onSelectIPO(ipo)}
            className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:shadow-emerald-950/20 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top Bar: Visual Status & Decision Badge */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {ipo.visualStatus}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getDecisionBadge(ipo.retailDecision)}`}>
                  {ipo.retailDecision}
                </span>
              </div>

              {/* Title & Sector */}
              <div className="space-y-1 mb-4">
                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                  {ipo.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{ipo.sector}</span>
                  {ipo.symbol && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-emerald-400">{ipo.symbol}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-855 rounded-xl border border-slate-800/80 text-xs mb-3.5">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">GMP / Gain</div>
                  <div className={`font-bold font-mono mt-0.5 ${isHighGmp ? 'text-emerald-400' : 'text-teal-400'}`}>
                    ₹{ipo.gmpRs}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium">
                    +{ipo.estGainPercent}%
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Sub. Bids</div>
                  <div className="font-bold text-amber-400 font-mono mt-0.5">
                    {ipo.totalSub}x
                  </div>
                  <div className="text-[10px] text-slate-400">
                    QIB: {ipo.qibSub}x
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Min Inv.</div>
                  <div className="font-bold text-white font-mono mt-0.5">
                    ₹{ipo.minRetailInv.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {ipo.lotSize} sh
                  </div>
                </div>
              </div>

              {/* 📊 Visual 'Days to Listing' Progress Bar */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Days to Listing</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${progressInfo.badgeColor}`}>
                    {progressInfo.label}
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden relative shadow-inner">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressInfo.progressColor} transition-all duration-500`}
                    style={{ width: `${progressInfo.progressPercent}%` }}
                  />
                </div>

                {/* Step labels under progress bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Close:</span>
                    <span className="text-slate-300 font-medium">{ipo.closeDate}</span>
                    {progressInfo.daysSinceClose > 0 && (
                      <span className="text-emerald-400 font-semibold">
                        ({progressInfo.daysSinceClose}d ago)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Listing:</span>
                    <span className="text-emerald-400 font-bold">{ipo.listingDate}</span>
                    {progressInfo.daysRemainingToListing > 0 ? (
                      <span className="text-amber-300 font-semibold">
                        (in {progressInfo.daysRemainingToListing}d)
                      </span>
                    ) : (
                      <span className="text-indigo-400 font-bold">
                        (Listed)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Strategic Rationale snippet */}
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-4">
                {ipo.rationale}
              </p>
            </div>

            {/* Bottom Card Footer: Dates & Quick Action */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Bidding: <strong className="text-slate-200">{ipo.openDate} – {ipo.closeDate}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCalculator(ipo);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Lot Calculator"
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                <div className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center font-semibold text-xs">
                  <span>Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};
