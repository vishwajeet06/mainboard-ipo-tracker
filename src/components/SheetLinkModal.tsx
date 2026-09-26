import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Globe,
  Link2,
  ExternalLink
} from 'lucide-react';

interface SheetLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicSheetUrl: string;
  onSavePublicSheetUrl: (url: string) => void;
  onLoadPublicSheetData: (url: string) => Promise<boolean>;
}

export const SheetLinkModal: React.FC<SheetLinkModalProps> = ({
  isOpen,
  onClose,
  publicSheetUrl,
  onSavePublicSheetUrl,
  onLoadPublicSheetData,
}) => {
  const [inputUrl, setInputUrl] = useState(publicSheetUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!inputUrl.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const ok = await onLoadPublicSheetData(inputUrl.trim());
      if (ok) {
        onSavePublicSheetUrl(inputUrl.trim());
        setSuccessMsg('Successfully loaded and synchronized with this Google Sheet! All visitors and devices will now see this data.');
      } else {
        setErrorMsg('Could not fetch data from this link. Make sure the Google Sheet sharing permission is set to "Anyone with the link can view".');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error connecting to spreadsheet');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Connect Google Sheet Source
              </h3>
              <p className="text-xs text-slate-400">
                Direct Sync (No Login Required)
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

        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-300">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Google Sheet URL or ID:
            </label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1.../edit?usp=sharing"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Paste the link of your Google Sheet. Ensure its sharing setting is "Anyone with link can view".
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={isLoading || !inputUrl.trim()}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reading Sheet Rows...</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Sync Now</span>
              </>
            )}
          </button>

          {publicSheetUrl && (
            <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="truncate pr-2">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Active Sheet Link</span>
                <span className="text-emerald-400 font-mono text-[11px] truncate block">{publicSheetUrl}</span>
              </div>
              <a
                href={publicSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white p-1"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
