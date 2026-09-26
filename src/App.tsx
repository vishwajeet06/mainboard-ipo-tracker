import React, { useState, useEffect } from 'react';
import { 
  MAINBOARD_IPOS, 
  DASHBOARD_KPIS, 
  CURRENT_DATE_FORMATTED 
} from './data/ipoData';
import { MainboardIPO } from './types/ipo';
import { generateDashboardCSV } from './services/googleDriveSheets';
import { fetchPublicSheetData, determineIPOCategory } from './services/publicSheetService';
import { calculateKPIsFromIpos } from './utils/kpiCalculator';
import { getFormattedCurrentDateIST, isWithinActiveISTWindow } from './utils/dateUtils';
import {
  publishIpoFeedToCloud,
  subscribeToCloudIpoFeed,
  getCloudIpoFeed,
  CloudIpoFeed
} from './services/cloudFeedService';

import { Navbar } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { ExecutiveTakeaway } from './components/ExecutiveTakeaway';
import { IPOTable } from './components/IPOTable';
import { IPOCardGrid } from './components/IPOCardGrid';
import { IPODetailModal } from './components/IPODetailModal';
import { LotCalculatorModal } from './components/LotCalculatorModal';
import { SheetLinkModal } from './components/SheetLinkModal';
import { ExportScriptModal } from './components/ExportScriptModal';
import { MarketSentimentData, DEFAULT_MARKET_SENTIMENT } from './types/sentiment';

import { 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  BookOpen, 
  Clock, 
  RefreshCw,
  FileSpreadsheet,
  Link2,
  Sparkles,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

export default function App() {
  // Pure Data State
  const [ipos, setIpos] = useState<MainboardIPO[]>(MAINBOARD_IPOS);
  const [kpis, setKpis] = useState(DASHBOARD_KPIS);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentimentData>(DEFAULT_MARKET_SENTIMENT);

  // Dynamic Current Date for Indian Market
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>(() => {
    return getFormattedCurrentDateIST().formattedLong;
  });

  // View Mode: 'table' vs 'cards' (User can toggle what suits them best!)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Recalculate KPIs whenever IPO list changes, and re-validate categories against real IST calendar date
  const updateIpoList = (newList: MainboardIPO[]) => {
    // Sanitize any incoming IPOs (whether from Cloud feed, Sheet, or API)
    const sanitizedList = newList.map((ipo) => {
      const determined = determineIPOCategory(ipo.closeDate, ipo.openDate, ipo.listingDate, ipo.visualStatus);
      return {
        ...ipo,
        category: determined.category,
        visualStatus: (determined.category === 'closing_today' ? '🚨 Closes Today' : determined.visualStatus) as any,
      };
    });

    setIpos(sanitizedList);
    setKpis(calculateKPIsFromIpos(sanitizedList));
  };

  // Modals & Selections
  const [selectedIpoForDetail, setSelectedIpoForDetail] = useState<MainboardIPO | null>(null);
  const [selectedIpoForCalc, setSelectedIpoForCalc] = useState<MainboardIPO | null>(null);
  const [selectedIpoHighlight, setSelectedIpoHighlight] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);

  // Auto-Refresh & Live Clock State (Default: Every 2 hrs = 7200 seconds between 6 AM and 6 PM IST)
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(7200); // 7200s = 2 hrs
  const [refreshCountdown, setRefreshCountdown] = useState(7200);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Just now');
  const [istTime, setIstTime] = useState<string>('');
  const [timeUntilClose, setTimeUntilClose] = useState<string>('');
  const [isWindowActive, setIsWindowActive] = useState<boolean>(true);

  // Active Feed Source (Central Cloud or Sheet)
  const [activeFeedSource, setActiveFeedSource] = useState<{
    title: string;
    updatedAt: string;
    count: number;
    url?: string;
  } | null>(null);

  // Stored Public Sheet URL
  const [publicSheetUrl, setPublicSheetUrl] = useState<string>(() => {
    return localStorage.getItem('ipo_public_sheet_url') || '';
  });

  const handleSavePublicSheetUrl = (url: string) => {
    setPublicSheetUrl(url);
    if (url) {
      localStorage.setItem('ipo_public_sheet_url', url);
    } else {
      localStorage.removeItem('ipo_public_sheet_url');
    }
  };

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

  const handleSelectInterval = (newInterval: number) => {
    setRefreshInterval(newInterval);
    setRefreshCountdown(newInterval);
    let label = `${Math.floor(newInterval / 3600)} hours`;
    if (newInterval === 7200) label = '2 hours (6 AM to 6 PM IST)';
    if (newInterval === 14400) label = '4 hours';
    if (newInterval === 21600) label = '6 hours';
    showToast(`Scheduled auto-refresh interval set to every ${label}.`);
  };

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Automated 2-Hour (6 AM to 6 PM IST) Cloud Feed Sync / Ingestion Engine
  const triggerDataRefresh = async (forceAiCall = false) => {
    // Only auto-trigger if current time is within active market day window: 6:00 AM to 6:00 PM IST (unless forced by user)
    if (!forceAiCall && !isWithinActiveISTWindow()) {
      console.log('Outside 6 AM - 6 PM IST window. Auto-refresh sleeping to save project resources.');
      setRefreshCountdown(refreshInterval);
      return;
    }

    setIsRefreshing(true);

    try {
      // 1. If user linked a Google Sheet, load from sheet
      if (publicSheetUrl && !forceAiCall) {
        await loadFromPublicSheet(publicSheetUrl);
        return;
      }

      // 2. Automated server background generation with Gemini AI
      const response = await fetch('/api/ai/refresh-ipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.ipos) && data.ipos.length > 0) {
          // If the AI generated full set, use it; if fewer than 8 were generated, merge with existing full directory so records aren't dropped
          let finalIpos = data.ipos;
          if (data.ipos.length < 8) {
            const aiIdSet = new Set(data.ipos.map((i: any) => i.id || i.name));
            const existingRemaining = MAINBOARD_IPOS.filter(
              (p) => !aiIdSet.has(p.id) && !aiIdSet.has(p.name)
            );
            finalIpos = [...data.ipos, ...existingRemaining];
          }

          updateIpoList(finalIpos);

          if (data.executiveTakeaway) {
            setKpis((prev) => ({
              ...prev,
              executiveTakeaway: {
                ...prev.executiveTakeaway,
                ...data.executiveTakeaway,
              },
            }));
          }

          if (data.marketSentiment) {
            setMarketSentiment((prev) => ({
              ...prev,
              ...data.marketSentiment,
            }));
          }

          const title = 'Automated AI Market Feed (NSE/BSE)';
          setActiveFeedSource({
            title,
            updatedAt: data.timestamp || 'Just now',
            count: finalIpos.length,
          });
          await publishIpoFeedToCloud(finalIpos, title, 'Automated Scheduler');
          showToast(`Live AI data refresh succeeded: ${finalIpos.length} IPOs synchronized.`);
          return;
        }
      }

      // Fallback: If AI call had a temporary network or rate limitation, load from cloud feed
      const feed = await getCloudIpoFeed();
      if (feed && Array.isArray(feed.ipos) && feed.ipos.length > 0) {
        updateIpoList(feed.ipos);
        setActiveFeedSource({
          title: feed.sheetTitle || 'Live Cloud Feed',
          updatedAt: feed.updatedAt || 'Recently',
          count: feed.ipos.length,
          url: feed.sheetUrl,
        });
      }
    } catch (err: any) {
      console.warn('Scheduled sync notice:', err);
    } finally {
      const nowTime = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setLastRefreshedAt(`${nowTime} IST`);
      setIsRefreshing(false);
      setRefreshCountdown(refreshInterval);
    }
  };

  // Helper to load directly from a public Google Sheet URL
  const loadFromPublicSheet = async (url: string): Promise<boolean> => {
    if (!url) return false;
    try {
      const publicData = await fetchPublicSheetData(url);
      if (publicData && publicData.ipos.length > 0) {
        updateIpoList(publicData.ipos);
        setActiveFeedSource({
          title: publicData.sheetTitle || 'Google Sheet Source',
          updatedAt: publicData.lastUpdated || 'Just now',
          count: publicData.ipos.length,
          url,
        });

        // Broadcast to Firestore
        await publishIpoFeedToCloud(publicData.ipos, 'Google Sheet Source', url);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to load from sheet:', err);
      return false;
    }
  };

  // Subscribe to Central Firestore IPO Feed
  useEffect(() => {
    getCloudIpoFeed().then((feed) => {
      if (feed && Array.isArray(feed.ipos) && feed.ipos.length >= 10) {
        updateIpoList(feed.ipos);
        setActiveFeedSource({
          title: feed.sheetTitle || 'Live Cloud Feed',
          updatedAt: feed.updatedAt || 'Recently',
          count: feed.ipos.length,
          url: feed.sheetUrl,
        });
      } else {
        // Broadcast full verified 15 Mainboard IPO dataset to cloud so all devices see all 15 issues
        publishIpoFeedToCloud(MAINBOARD_IPOS, 'Verified Mainboard Primary Feed (NSE/BSE)', 'Automated');
        updateIpoList(MAINBOARD_IPOS);
        setActiveFeedSource({
          title: 'Verified Mainboard Primary Feed (NSE/BSE)',
          updatedAt: 'Live',
          count: MAINBOARD_IPOS.length,
        });
      }
    });

    const unsubscribeCloud = subscribeToCloudIpoFeed((feed: CloudIpoFeed) => {
      if (feed && Array.isArray(feed.ipos) && feed.ipos.length >= 10) {
        updateIpoList(feed.ipos);
        setActiveFeedSource({
          title: feed.sheetTitle || 'Live Cloud Feed',
          updatedAt: feed.updatedAt || 'Recently',
          count: feed.ipos.length,
          url: feed.sheetUrl,
        });
      }
    });

    return () => unsubscribeCloud();
  }, []);

  // Clock & Countdown Timer (All calculations in Indian Standard Time - Asia/Kolkata)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istString = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setIstTime(istString);
      setCurrentDateFormatted(getFormattedCurrentDateIST().formattedLong);
      setIsWindowActive(isWithinActiveISTWindow());

      // Time until 5:00 PM IST
      const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const closeTime = new Date(istDate);
      closeTime.setHours(17, 0, 0, 0);

      const diffMs = closeTime.getTime() - istDate.getTime();
      if (diffMs > 0 && istDate.getHours() >= 9) {
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeUntilClose(`${hrs}h ${mins}m ${secs}s`);
      } else if (diffMs <= 0) {
        setTimeUntilClose('Bidding Window Closed (5:00 PM IST Passed)');
      } else {
        setTimeUntilClose('Pre-Bidding Window (Opens 10:00 AM IST)');
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Background Auto-Refresh Engine (Runs every 2 hours between 6 AM and 6 PM IST)
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          triggerDataRefresh();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRefreshEnabled, refreshInterval]);

  // Fast Cloud Sync (does not call heavy API, reads latest Firestore data directly)
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const feed = await getCloudIpoFeed();
      if (feed && Array.isArray(feed.ipos) && feed.ipos.length > 0) {
        updateIpoList(feed.ipos);
        setActiveFeedSource({
          title: feed.sheetTitle || 'Live Cloud Feed',
          updatedAt: feed.updatedAt || 'Recently',
          count: feed.ipos.length,
          url: feed.sheetUrl,
        });
        showToast('Synchronized with latest cloud records.');
      } else if (publicSheetUrl) {
        await loadFromPublicSheet(publicSheetUrl);
        showToast('Synchronized with Google Sheet.');
      } else {
        showToast('Data is up to date.');
      }
    } catch {
      showToast('Data refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // CSV Export Trigger
  const handleDownloadCSV = () => {
    const csvData = generateDashboardCSV(ipos, kpis);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const { dateStr } = getFormattedCurrentDateIST();
    link.setAttribute('download', `Mainboard_IPO_Tracker_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded Mainboard_IPO_Tracker_${dateStr}.csv`);
  };

  const handleSelectIPOByName = (name: string) => {
    const found = ipos.find((i) => i.name === name);
    if (found) {
      setSelectedIpoHighlight(name);
      setSelectedIpoForDetail(found);
    }
  };

  // Strictly filter items that close TODAY (category === 'closing_today')
  const closingTodayIpos = ipos.filter((i) => i.category === 'closing_today');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onDownloadCSV={handleDownloadCSV}
        onOpenScriptModal={() => setIsScriptModalOpen(true)}
        isAutoRefreshEnabled={isAutoRefreshEnabled}
        onToggleAutoRefresh={() => {
          setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
          showToast(isAutoRefreshEnabled ? 'Auto-refresh paused.' : `Auto-refresh enabled (${formatCountdown(refreshInterval)} cadence).`);
        }}
        refreshCountdown={refreshCountdown}
        refreshInterval={refreshInterval}
        onSelectInterval={handleSelectInterval}
        onManualRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        istTime={istTime}
        sentimentData={marketSentiment}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in slide-in-from-bottom duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Live Auto-Refresh Status Pill Bar with 2-Hour (6 AM to 6 PM IST) Cadence */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAutoRefreshEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAutoRefreshEnabled ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className="font-semibold text-slate-200">
              {isAutoRefreshEnabled 
                ? (isWindowActive ? `Auto-Refresh Active: Next in ${formatCountdown(refreshCountdown)}` : 'Auto-Refresh Paused (Active 6 AM - 6 PM IST)')
                : 'Auto-Poll Paused'}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-emerald-400 font-medium hidden sm:inline">
              Schedule: Every 2 hrs (6 AM – 6 PM IST)
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">Last Sync: {lastRefreshedAt}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-slate-300 text-[11px] flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>5:00 PM IST Cutoff:</span>
              <span className="text-amber-400 font-bold font-mono">{timeUntilClose}</span>
            </div>

            <button
              onClick={() => triggerDataRefresh(true)}
              disabled={isRefreshing}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-semibold border border-emerald-500/40 flex items-center gap-1 transition disabled:opacity-50"
              title="Force trigger live Gemini AI analysis and data update immediately"
            >
              <Sparkles className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Run AI Now</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition"
              title="Synchronize from central cloud store"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Sync Cloud</span>
            </button>
          </div>
        </div>

        {/* Active Feed Source Pill */}
        {activeFeedSource && (
          <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/30 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Source: {activeFeedSource.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    Live Data
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Tracking {activeFeedSource.count} Mainboard Issues (Kept till Listing Date) • Refreshed: <strong className="text-emerald-300">{activeFeedSource.updatedAt}</strong>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-semibold transition text-xs flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Update Sheet URL</span>
              </button>
            </div>
          </div>
        )}

        {/* 🚨 Urgent Deadline Banner: Only rendered if IPOs ACTUALLY close today */}
        {closingTodayIpos.length > 0 && (
          <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/50 border border-rose-500/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    🚨 Final Day Alert • Bidding Closes at 5:00 PM IST ({timeUntilClose})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                    {closingTodayIpos.length} Mainboard IPOs Closing Today
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Click any IPO card or button below to view detailed breakdown, subscription demand &amp; listing profit projection.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {closingTodayIpos.map((ipo) => (
                <button
                  key={ipo.id}
                  onClick={() => {
                    setSelectedIpoHighlight(ipo.name);
                    setSelectedIpoForDetail(ipo);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition ${
                    ipo.retailDecision === 'Strong Apply'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950'
                      : ipo.retailDecision === 'Avoid'
                      ? 'bg-slate-800 hover:bg-slate-700 text-rose-300 border-rose-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {ipo.name.replace(' Ltd.', '')} ({ipo.retailDecision})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: KPIs */}
        <section>
          <KPICards
            kpis={kpis}
            onFilterHighPotential={() => handleSelectIPOByName('Moneyview Ltd.')}
            onSelectIPO={handleSelectIPOByName}
          />
        </section>

        {/* Section 2: Executive Daily Takeaway */}
        <section>
          <ExecutiveTakeaway
            kpis={kpis}
            onOpenQuickApply={handleSelectIPOByName}
          />
        </section>

        {/* Section 3: Main IPO Display with View Mode Selector (Cards vs Table) */}
        <section className="space-y-4">
          
          {/* View Mode Toggle Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Active Mainboard IPO Directory</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  {ipos.length} Public Issues
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between Cards or Table view. Click any card to view full issue details, lot breakdown, and days to listing progress bar.
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'cards'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>
          </div>

          {/* Render based on user's preference */}
          {viewMode === 'cards' ? (
            <IPOCardGrid
              ipos={ipos}
              onSelectIPO={(ipo) => setSelectedIpoForDetail(ipo)}
              onOpenCalculator={(ipo) => setSelectedIpoForCalc(ipo)}
            />
          ) : (
            <IPOTable
              ipos={ipos}
              onOpenCalculator={(ipo) => setSelectedIpoForCalc(ipo)}
              selectedIpoName={selectedIpoHighlight}
            />
          )}

        </section>

        {/* Section 4: Retail Operator Playbook & Golden Rules */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Operator Decision Framework for Indian Retail Investors
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 text-xs leading-relaxed text-slate-300">
            <div className="p-4 bg-slate-855 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                1. The 15% GMP Cushion Rule
              </div>
              <p>
                In volatile secondary market regimes, never apply for an IPO with less than a 15% grey market premium. Issues with 2%–5% GMPs are vulnerable to wiping out their premium on opening ticks if the Nifty/Sensex opens down 150 points.
              </p>
            </div>

            <div className="p-4 bg-slate-855 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                2. QIB Institutional Validation
              </div>
              <p>
                Ordinary retail investors should rarely commit funds on Day 1. The smartest strategy is watching institutional (QIB) bidding on Day 3 morning. A QIB subscription above 5x to 10x confirms big smart-money absorption, dramatically lowering listing day discount risk.
              </p>
            </div>

            <div className="p-4 bg-slate-855 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-indigo-400 text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                3. The 1-Lot Multi-PAN Strategy
              </div>
              <p>
                For oversubscribed blockbuster IPOs, retail allotment is executed by computerized lucky lottery. Applying for 13 lots under a single PAN does NOT increase your lottery odds. Apply for 1 single lot across separate family PAN accounts instead.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-300">Mainboard IPO Tracker &amp; Retail Decision Dashboard</span>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Strict Mainboard BSE/NSE scope • Retained till Listing Date • Refreshed for {currentDateFormatted}
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="hover:text-emerald-400 transition"
            >
              Link Sheet
            </button>
            <span>•</span>
            <button
              onClick={handleDownloadCSV}
              className="hover:text-emerald-400 transition"
            >
              Export CSV
            </button>
            <span>•</span>
            <button
              onClick={() => setIsScriptModalOpen(true)}
              className="hover:text-emerald-400 transition"
            >
              Apps Script (.gs)
            </button>
          </div>
        </div>
      </footer>

      {/* Detailed IPO Popup Modal (Opens when user clicks on a Card or Row) */}
      {selectedIpoForDetail && (
        <IPODetailModal
          ipo={selectedIpoForDetail}
          onClose={() => setSelectedIpoForDetail(null)}
          onOpenCalculator={(ipo) => {
            setSelectedIpoForDetail(null);
            setSelectedIpoForCalc(ipo);
          }}
        />
      )}

      {/* Lot & Profit Calculator Modal */}
      {selectedIpoForCalc && (
        <LotCalculatorModal
          ipo={selectedIpoForCalc}
          onClose={() => setSelectedIpoForCalc(null)}
        />
      )}

      {/* Sheet Link Modal */}
      <SheetLinkModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        publicSheetUrl={publicSheetUrl}
        onSavePublicSheetUrl={handleSavePublicSheetUrl}
        onLoadPublicSheetData={loadFromPublicSheet}
      />

      {/* Export / Apps Script Modal */}
      <ExportScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        ipos={ipos}
        kpis={kpis}
        onDownloadCSV={handleDownloadCSV}
      />

    </div>
  );
}
