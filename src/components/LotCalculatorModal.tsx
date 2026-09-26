import React, { useState } from 'react';
import { MainboardIPO } from '../types/ipo';
import { 
  X, 
  Calculator, 
  TrendingUp, 
  AlertCircle, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck, 
  Coins 
} from 'lucide-react';

interface LotCalculatorModalProps {
  ipo: MainboardIPO | null;
  onClose: () => void;
}

export const LotCalculatorModal: React.FC<LotCalculatorModalProps> = ({ ipo, onClose }) => {
  if (!ipo) return null;

  // Max retail limit in India is ₹2,00,000
  const maxLots = Math.max(1, Math.floor(200000 / ipo.minRetailInv));
  const [lots, setLots] = useState(1);

  const totalShares = lots * ipo.lotSize;
  const totalInvestment = totalShares * ipo.capPrice;
  const expectedProfit = totalShares * ipo.gmpRs;
  const expectedTotalValue = totalInvestment + expectedProfit;
  const isHighProfit = expectedProfit > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                {ipo.visualStatus}
              </span>
              <span className="text-xs text-slate-400 font-medium">{ipo.sector}</span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1.5">{ipo.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Price Cap: <span className="text-slate-200 font-semibold">₹{ipo.capPrice}</span> • Lot: <span className="text-slate-200 font-semibold">{ipo.lotSize} shs</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Verdict Summary Box */}
          <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Retail Verdict
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {ipo.retailDecision}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Current GMP Buffer
              </div>
              <div className="text-sm font-extrabold text-white mt-0.5">
                ₹{ipo.gmpRs.toFixed(2)} ({ipo.estGainPercent > 0 ? '+' : ''}{ipo.estGainPercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Lot Selector */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <span>Select Application Lots:</span>
              <span className="text-slate-400">
                Max Retail: {maxLots} lots (≤ ₹2,00,000)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={maxLots}
                value={lots}
                onChange={(e) => setLots(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="w-14 text-center font-bold text-white bg-slate-800 py-1.5 px-2 rounded-xl border border-slate-700 text-sm">
                {lots}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
              <div className="text-[11px] text-slate-400 font-medium">Total Shares</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {totalShares.toLocaleString('en-IN')} shares
              </div>
              <div className="text-[10px] text-slate-500">{lots} lot(s) × {ipo.lotSize}</div>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
              <div className="text-[11px] text-slate-400 font-medium">UPI ASBA Block</div>
              <div className="text-lg font-bold text-white mt-0.5">
                ₹{totalInvestment.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-400">Funds blocked, not debited</div>
            </div>

            <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/30 col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                    Expected Listing Profit (Pre-tax)
                  </div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {expectedProfit >= 0 ? '+' : ''}₹{Math.round(expectedProfit).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Expected Value</div>
                  <div className="text-base font-bold text-white mt-1">
                    ₹{Math.round(expectedTotalValue).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-emerald-300/80 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Based on current ₹{ipo.gmpRs} grey market premium &amp; 100% allotment scenario</span>
              </div>
            </div>
          </div>

          {/* Operator Strategy Note */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-200">Operator Advice: </span>
            {ipo.rationale}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href={ipo.allotmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <span>Visit {ipo.registrar}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/30"
            >
              Done
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
