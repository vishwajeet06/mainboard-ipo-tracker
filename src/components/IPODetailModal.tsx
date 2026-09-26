import React from 'react';
import { MainboardIPO, RetailDecision } from '../types/ipo';
import { calculateListingProgress } from '../utils/dateUtils';
import { 
  X, 
  Calculator, 
  ExternalLink, 
  Calendar, 
  IndianRupee, 
  Building2, 
  ShieldCheck, 
  Clock
} from 'lucide-react';

interface IPODetailModalProps {
  ipo: MainboardIPO | null;
  onClose: () => void;
  onOpenCalculator: (ipo: MainboardIPO) => void;
}

export const IPODetailModal: React.FC<IPODetailModalProps> = ({
  ipo,
  onClose,
  onOpenCalculator,
}) => {
  if (!ipo) return null;

  const isHighGmp = (ipo.estGainPercent || 0) >= 20;
  const progressInfo = calculateListingProgress(ipo.closeDate, ipo.listingDate);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-850 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getDecisionBadge(ipo.retailDecision)}`}>
                {ipo.retailDecision}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {ipo.visualStatus}
              </span>
              {ipo.symbol && (
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800/80 text-emerald-400 border border-slate-700">
                  {ipo.symbol}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {ipo.name}
            </h2>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{ipo.sector}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">BSE &amp; NSE Mainboard</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200">
          
          {/* Highlight Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Cap Price</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">₹{ipo.capPrice}</div>
              <div className="text-[10px] text-slate-500 truncate">{ipo.priceBand}</div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">GMP (Premium)</div>
              <div className={`text-lg font-bold font-mono mt-0.5 ${isHighGmp ? 'text-emerald-400' : ipo.gmpRs > 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                ₹{ipo.gmpRs}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                +{ipo.estGainPercent}% Est. Gain
              </div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Total Subscription</div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                {ipo.totalSub}x
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                QIB: {ipo.qibSub}x • Retail: {ipo.retailSub}x
              </div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Min Retail Lot</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                ₹{ipo.minRetailInv.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400">
                {ipo.lotSize} Shares / Lot
              </div>
            </div>
          </div>

          {/* 📊 Visual 'Days to Listing' Progress Timeline in Modal */}
          <div className="p-4 bg-slate-855 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Days to Listing Progress</span>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${progressInfo.badgeColor}`}>
                {progressInfo.label}
              </span>
            </div>

            {/* Visual Track */}
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${progressInfo.progressColor} transition-all duration-500`}
                style={{ width: `${progressInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <div>
                <span className="text-slate-500">Bidding Ended: </span>
                <strong className="text-white">{ipo.closeDate}</strong>
                {progressInfo.daysSinceClose > 0 && (
                  <span className="text-emerald-400 font-semibold ml-1">
                    ({progressInfo.daysSinceClose} days elapsed)
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500">Official Listing: </span>
                <strong className="text-emerald-400">{ipo.listingDate}</strong>
                {progressInfo.daysRemainingToListing > 0 ? (
                  <span className="text-amber-300 font-semibold ml-1">
                    ({progressInfo.daysRemainingToListing} days remaining)
                  </span>
                ) : (
                  <span className="text-indigo-400 font-bold ml-1">
                    (Stock Listed)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Strategic Rationale & Retail Advice */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4" />
              <span>Retail Strategic Guidance &amp; Rationale</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {ipo.rationale}
            </p>
          </div>

          {/* Detailed Timetable & Structure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Timeline */}
            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Issue Timetable (Kept till Listing)</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Bidding Opens:</span>
                  <span className="font-semibold text-white">{ipo.openDate}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Bidding Closes:</span>
                  <span className="font-semibold text-rose-300">{ipo.closeDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Listing Date:</span>
                  <span className="font-semibold text-emerald-400">{ipo.listingDate}</span>
                </div>
              </div>
            </div>

            {/* Issue Structure */}
            <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <span>Issue Size &amp; Composition</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Total Issue Size:</span>
                  <span className="font-semibold text-white">₹{ipo.issueSizeCr} Cr</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Fresh Issue:</span>
                  <span className="font-semibold text-emerald-300">₹{ipo.freshCr} Cr ({ipo.freshPercent}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Offer for Sale (OFS):</span>
                  <span className="font-semibold text-slate-300">₹{ipo.ofsCr} Cr ({ipo.ofsPercent}%)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Registrar & Allotment */}
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-slate-400">Official Allotment Registrar:</div>
              <div className="font-bold text-white text-sm mt-0.5">{ipo.registrar}</div>
            </div>
            {ipo.allotmentUrl && (
              <a
                href={ipo.allotmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 font-semibold transition self-start sm:self-auto"
              >
                <span>Check Allotment Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <button
            onClick={() => onOpenCalculator(ipo)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Lot &amp; Profit Calculator</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
