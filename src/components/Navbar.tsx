import React from 'react';
import { 
  BarChart3, 
  Download, 
  Code, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  Link2, 
  Sparkles 
} from 'lucide-react';
import { MarketSentimentIndicator } from './MarketSentimentIndicator';
import { MarketSentimentData } from '../types/sentiment';

interface NavbarProps {
  onOpenSyncModal: () => void;
  onDownloadCSV: () => void;
  onOpenScriptModal: () => void;
  isAutoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  refreshCountdown: number;
  refreshInterval: number;
  onSelectInterval: (intervalSec: number) => void;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  istTime: string;
  sentimentData?: MarketSentimentData;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSyncModal,
  onDownloadCSV,
  onOpenScriptModal,
  isAutoRefreshEnabled,
  onToggleAutoRefresh,
  refreshCountdown,
  refreshInterval,
  onSelectInterval,
  onManualRefresh,
  isRefreshing,
  istTime,
  sentimentData,
}) => {
  const formatCountdown = (secs: number) => {
    if (secs >= 3600) {
      const hrs = Math.floor(secs / 3600);
      const mins = Math.floor((secs % 3600) / 60);
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    if (secs >= 60) {
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${secs}s`;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Nav Row */}
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-bold text-lg sm:text-xl ring-2 ring-emerald-400/30 shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  Mainboard IPO Tracker
                  <span className="hidden xs:inline-block text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    🇮🇳 NSE/BSE
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400">
                <span className="text-slate-300 font-medium hidden sm:inline">Auto-Ingestion Engine</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Strict Mainboard (Kept till Listing)
                </span>
              </div>
            </div>
          </div>

          {/* Center on Desktop (>= 1024px) */}
          <div className="hidden lg:flex items-center gap-3">
            {sentimentData && (
              <MarketSentimentIndicator data={sentimentData} />
            )}

            <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-200 font-mono font-semibold">{istTime} IST</span>
              </div>

              {/* Auto Refresh pill with Interval Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleAutoRefresh}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-[11px] transition ${
                    isAutoRefreshEnabled 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                  title="Toggle automated dashboard refresh"
                >
                  <span className={`w-2 h-2 rounded-full ${isAutoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>Auto-Refresh: {isAutoRefreshEnabled ? `ON (${formatCountdown(refreshCountdown)})` : 'OFF'}</span>
                </button>

                {/* Interval select dropdown */}
                <div className="relative inline-block">
                  <select
                    value={refreshInterval}
                    onChange={(e) => onSelectInterval(Number(e.target.value))}
                    className="bg-slate-850 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    title="Change Scheduled Auto-Refresh Cadence"
                  >
                    <option value={7200}>Every 2 hrs (6 AM – 6 PM IST)</option>
                    <option value={14400}>Every 4 hrs</option>
                    <option value={21600}>Every 6 hrs</option>
                  </select>
                </div>

                <button
                  onClick={onManualRefresh}
                  disabled={isRefreshing}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                  title="Sync from cloud database immediately"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Automated Cadence Status Badge */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto 2-Hr IST Sync</span>
            </div>

            {/* Sheet Link Modal */}
            <button
              onClick={onOpenSyncModal}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 transition"
              title="Connect or update Google Sheet link"
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Link Sheet</span>
              <span className="xs:hidden">Sheet</span>
            </button>

            {/* CSV Download */}
            <button
              onClick={onDownloadCSV}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Download clean CSV snapshot formatted for Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              CSV
            </button>

            {/* Apps Script (.gs) */}
            <button
              onClick={onOpenScriptModal}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="View Google Apps Script automation code"
            >
              <Code className="w-3.5 h-3.5 text-slate-400" />
              Script
            </button>

          </div>

        </div>

        {/* Mobile & Tablet Sub-bar (< 1024px screen sizes): Nifty Sentiment + IST Clock */}
        <div className="flex lg:hidden items-center justify-between py-2 border-t border-slate-800/80 gap-2 relative">
          {sentimentData && (
            <div className="shrink-0 relative">
              <MarketSentimentIndicator data={sentimentData} compact={true} />
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800/80 shrink-0">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-300 font-mono">{istTime} IST</span>
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="p-0.5 text-slate-400 hover:text-white rounded transition ml-1"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
