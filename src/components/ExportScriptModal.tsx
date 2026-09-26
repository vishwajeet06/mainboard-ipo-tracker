import React, { useState } from 'react';
import { MainboardIPO, DashboardKPIs } from '../types/ipo';
import { DAILY_HISTORY_SNAPSHOTS } from '../data/ipoData';
import { generateDashboardCSV, getGoogleAppsScriptCode } from '../services/googleDriveSheets';
import { 
  X, 
  Code, 
  Download, 
  Copy, 
  Check, 
  History, 
  FileSpreadsheet, 
  CheckCircle2 
} from 'lucide-react';

interface ExportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ipos: MainboardIPO[];
  kpis: DashboardKPIs;
  onDownloadCSV: () => void;
}

export const ExportScriptModal: React.FC<ExportScriptModalProps> = ({
  isOpen,
  onClose,
  ipos,
  kpis,
  onDownloadCSV,
}) => {
  const [tab, setTab] = useState<'script' | 'history' | 'csv'>('script');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  if (!isOpen) return null;

  const scriptCode = getGoogleAppsScriptCode();
  const csvContent = generateDashboardCSV(ipos, kpis);

  const copyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copyCsv = () => {
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Developer &amp; Sheet Automation Hub
              </h3>
              <p className="text-xs text-slate-400">
                Google Apps Script (.gs), Daily History Snapshots &amp; CSV Data Feed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setTab('script')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              tab === 'script'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Google Apps Script (.gs)</span>
          </button>
          <button
            onClick={() => setTab('history')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              tab === 'history'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History Tab Snapshots</span>
          </button>
          <button
            onClick={() => setTab('csv')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
              tab === 'csv'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Raw CSV Preview</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-300 text-xs">
          
          {tab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Paste into Google Sheets via <strong>Extensions &gt; Apps Script</strong>:
                </span>
                <button
                  onClick={copyScript}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-80 leading-relaxed scrollbar-thin">
                {scriptCode}
              </pre>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Script includes automatic Column A freezing and scheduled Google Drive trash cleanup.</span>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              <p className="text-slate-400">
                Daily snapshots populated into the <strong>"History"</strong> tab of the Google Sheet:
              </p>
              <div className="space-y-2">
                {DAILY_HISTORY_SNAPSHOTS.map((snap) => (
                  <div key={snap.date} className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{snap.date}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-[10px]">
                        Avg Gain: +{snap.avgGmpPercent}%
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Top Pick: <strong className="text-white">{snap.topPick}</strong> • Tracked: {snap.trackedCount} IPOs
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {snap.statusSummary}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'csv' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Formatted with Column B non-table alignment &amp; Column A full-width table:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCsv}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition flex items-center gap-1"
                  >
                    {copiedCsv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCsv ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={onDownloadCSV}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-72 leading-relaxed scrollbar-thin">
                {csvContent}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
