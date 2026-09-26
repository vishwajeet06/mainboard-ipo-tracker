import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Activity, X } from 'lucide-react';
import { MarketSentimentData } from '../types/sentiment';

interface MarketSentimentIndicatorProps {
  data: MarketSentimentData;
  compact?: boolean;
}

export const MarketSentimentIndicator: React.FC<MarketSentimentIndicatorProps> = ({ data, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const isPositive = data.changePoints >= 0;
  const isNeutral = data.sentiment === 'NEUTRAL';
  const isBullish = data.sentiment === 'BULLISH';

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Badge styling according to sentiment
  const getBadgeStyle = () => {
    switch (data.sentiment) {
      case 'BULLISH':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'CAUTIOUS':
      case 'BEARISH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'NEUTRAL':
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <div 
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 cursor-pointer transition select-none active:scale-95 shadow-sm ${
          compact ? 'text-xs' : ''
        }`}
        title="Tap or click to view broader market sentiment impact on IPOs"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        {/* NIFTY Label */}
        <div className="flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 whitespace-nowrap">NIFTY</span>
        </div>

        {/* Index Value & Day Change */}
        <div className="flex items-baseline gap-1 font-mono text-[11px] sm:text-xs">
          <span className="font-semibold text-white">
            {data.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className={`text-[10px] sm:text-[11px] font-semibold flex items-center gap-0.5 ${
            isPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            ) : isNeutral ? (
              <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            )}
            {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
          </span>
        </div>

        {/* Sentiment Badge */}
        <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border uppercase tracking-wider ${getBadgeStyle()}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBullish ? 'bg-emerald-400 animate-pulse' : isNeutral ? 'bg-amber-400' : 'bg-rose-400'}`} />
          {data.sentiment}
        </span>
      </div>

      {/* Popover Card */}
      {isOpen && (
        <>
          {/* Backdrop on mobile for guaranteed touch dismiss */}
          <div 
            className="fixed inset-0 z-40 bg-black/40 sm:hidden" 
            onClick={() => setIsOpen(false)}
          />

          <div 
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-4 top-28 sm:top-full sm:inset-x-auto sm:right-0 sm:left-auto mt-2 max-w-sm sm:w-84 p-4 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white uppercase tracking-wider">Secondary Market Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getBadgeStyle()}`}>
                  {data.sentiment}
                </span>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-3 space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between items-center text-[11px] bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400">Nifty 50 Change:</span>
                <span className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{data.changePoints.toFixed(2)} pts ({isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%)
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400">India VIX (Volatility):</span>
                <span className="font-mono font-semibold text-indigo-300">
                  {data.vixValue.toFixed(2)} {data.vixValue < 15 ? '(Subdued / Safe)' : '(Elevated Volatility)'}
                </span>
              </div>

              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {data.summary}
                </p>
              </div>

              {/* Retail Application Guidance */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[11px] leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-300 mb-0.5">Retail Application Impact:</div>
                  <span className="text-emerald-100/90">{data.retailAdvice}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
