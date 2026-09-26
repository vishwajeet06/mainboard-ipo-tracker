import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { MarketSentimentData } from '../types/sentiment';

interface MarketSentimentIndicatorProps {
  data: MarketSentimentData;
}

export const MarketSentimentIndicator: React.FC<MarketSentimentIndicatorProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isPositive = data.changePoints >= 0;
  const isNeutral = data.sentiment === 'NEUTRAL';
  const isBullish = data.sentiment === 'BULLISH';

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
    <div className="relative">
      <div 
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition select-none"
        title="Click to view broader market sentiment impact on IPOs"
      >
        {/* NIFTY Label */}
        <div className="flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300">NIFTY 50</span>
        </div>

        {/* Index Value & Day Change */}
        <div className="flex items-baseline gap-1.5 font-mono text-xs">
          <span className="font-semibold text-white">
            {data.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </span>
          <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${
            isPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNeutral ? (
              <Minus className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
          </span>
        </div>

        {/* Sentiment Badge */}
        <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getBadgeStyle()}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isBullish ? 'bg-emerald-400 animate-pulse' : isNeutral ? 'bg-amber-400' : 'bg-rose-400'}`} />
          {data.sentiment}
        </span>
      </div>

      {/* Popover Card */}
      {showTooltip && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-80 p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">Secondary Market Risk Context</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getBadgeStyle()}`}>
              {data.sentiment}
            </span>
          </div>

          <div className="mt-3 space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between items-center text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Nifty 50 Change:</span>
              <span className={`font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? '+' : ''}{data.changePoints.toFixed(2)} pts ({isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%)
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">India VIX (Volatility):</span>
              <span className="font-mono font-semibold text-indigo-300">
                {data.vixValue.toFixed(2)} {data.vixValue < 15 ? '(Subdued / Safe)' : '(Elevated Volatility)'}
              </span>
            </div>

            <div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {data.summary}
              </p>
            </div>

            {/* Practical Retail Guidance */}
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-200 text-[11px] leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-300">Retail Application Impact: </span>
                {data.retailAdvice}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
