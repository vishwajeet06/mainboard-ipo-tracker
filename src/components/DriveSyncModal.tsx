import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { MainboardIPO, DashboardKPIs, DriveFileInfo } from '../types/ipo';
import { 
  syncDashboardToGoogleSheets, 
  scanDashboardFiles, 
  trashFiles, 
  CreateSheetResult 
} from '../services/googleDriveSheets';
import { 
  extractSpreadsheetId, 
  fetchPublicSheetData 
} from '../services/publicSheetService';
import { 
  X, 
  FileSpreadsheet, 
  CloudUpload, 
  ExternalLink, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  FolderSync,
  Globe,
  Link2
} from 'lucide-react';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  ipos: MainboardIPO[];
  kpis: DashboardKPIs;
  user: User | null;
  accessToken: string | null;
  onLogin: () => void;
  onSyncSuccess: (result: CreateSheetResult) => void;
  lastSyncedResult: CreateSheetResult | null;
  publicSheetUrl: string;
  onSavePublicSheetUrl: (url: string) => void;
  onLoadPublicSheetData: (url: string) => Promise<boolean>;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  ipos,
  kpis,
  user,
  accessToken,
  onLogin,
  onSyncSuccess,
  lastSyncedResult,
  publicSheetUrl,
  onSavePublicSheetUrl,
  onLoadPublicSheetData,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sync' | 'public_feed' | 'cleanup'>('sync');
  const [copiedLink, setCopiedLink] = useState(false);

  // Public Sheet URL Input
  const [inputUrl, setInputUrl] = useState(publicSheetUrl);
  const [isLoadingPublicFeed, setIsLoadingPublicFeed] = useState(false);

  useEffect(() => {
    setInputUrl(publicSheetUrl);
  }, [publicSheetUrl]);

  // File Cleanup State
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResultMsg, setCleanupResultMsg] = useState<string | null>(null);
  const [retainedFiles, setRetainedFiles] = useState<DriveFileInfo[]>([]);
  const [cleanupCandidates, setCleanupCandidates] = useState<DriveFileInfo[]>([]);
  const [showConfirmTrashDialog, setShowConfirmTrashDialog] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  if (!isOpen) return null;

  // Handle Sync to Google Sheets
  const handleSyncToSheets = async () => {
    if (!accessToken) {
      onLogin();
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncNotice(null);

    try {
      const result = await syncDashboardToGoogleSheets(accessToken, ipos, kpis);
      onSyncSuccess(result);
      onSavePublicSheetUrl(result.spreadsheetUrl);
      setSyncNotice('Sheet created with public view permissions. Anyone with the link or on other devices can now refresh from it without logging in!');
    } catch (err: any) {
      console.warn('Failed to sync to Google Sheets:', err);
      setSyncError(err.message || 'Failed to sync with Google Drive & Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle File Scan
  const handleScanFiles = async () => {
    if (!accessToken) return;
    setIsScanning(true);
    setCleanupResultMsg(null);

    try {
      const { retainedFiles, cleanupCandidates } = await scanDashboardFiles(accessToken);
      setRetainedFiles(retainedFiles);
      setCleanupCandidates(cleanupCandidates);
      setHasScanned(true);
    } catch (err: any) {
      console.warn('Scan notice:', err);
      setSyncError(err.message || 'Failed to scan Google Drive files.');
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Executing Cleanup (after explicit user confirmation)
  const handleExecuteCleanup = async () => {
    if (!accessToken || cleanupCandidates.length === 0) return;
    
    setIsCleaning(true);
    setShowConfirmTrashDialog(false);

    try {
      const fileIdsToTrash = cleanupCandidates.map((f) => f.id);
      const trashed = await trashFiles(accessToken, fileIdsToTrash);
      setCleanupResultMsg(`Cleaned up ${trashed.length} outdated dashboard file(s). They have been moved to your Google Drive Trash.`);
      await handleScanFiles();
    } catch (err: any) {
      console.warn('Cleanup notice:', err);
      setSyncError(err.message || 'Failed to trash outdated files.');
    } finally {
      setIsCleaning(false);
    }
  };

  // Handle Loading from Public URL (No login needed)
  const handleConnectPublicSheet = async () => {
    if (!inputUrl.trim()) return;
    setIsLoadingPublicFeed(true);
    setSyncError(null);
    setSyncNotice(null);

    try {
      const success = await onLoadPublicSheetData(inputUrl.trim());
      if (success) {
        onSavePublicSheetUrl(inputUrl.trim());
        setSyncNotice('Successfully connected! This dashboard will now auto-refresh from this Google Sheet every hour without requiring any Google login on this device.');
      } else {
        setSyncError('Could not read data from this Google Sheet link. Make sure the spreadsheet sharing is set to "Anyone with the link can view" in Google Drive.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Failed to connect to spreadsheet.');
    } finally {
      setIsLoadingPublicFeed(false);
    }
  };

  const copyUrlToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Google Sheets &amp; Drive Integration
              </h3>
              <p className="text-xs text-slate-400">
                Official Mainboard IPO Tracker • Works On All Devices (Logged-in or Free/Guest)
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 shrink-0 ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>Sync with Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('public_feed')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 shrink-0 ${
              activeTab === 'public_feed'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Link Sheet URL (No Login Needed)</span>
            {publicSheetUrl && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>

          <button
            onClick={() => {
              setActiveTab('cleanup');
              if (!hasScanned && accessToken) handleScanFiles();
            }}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 shrink-0 ${
              activeTab === 'cleanup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            <span>File Cleanup</span>
            {cleanupCandidates.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-xs sm:text-sm">
          
          {/* Error Banner */}
          {syncError && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-rose-200">Notice</div>
                <div className="mt-0.5">{syncError}</div>
              </div>
            </div>
          )}

          {/* Success / Notice Banner */}
          {syncNotice && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-start gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-200">Success</div>
                <div className="mt-0.5">{syncNotice}</div>
              </div>
            </div>
          )}

          {/* TAB 1: SYNC WITH GOOGLE DRIVE (CREATOR/MANAGER) */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              
              {/* User Auth State Card */}
              {!user ? (
                <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Connect Google Account</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Sign in to your Google Account to create and sync the official Mainboard IPO tracker spreadsheet into your Google Drive with public view permissions.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={onLogin}
                      className="gsi-material-button"
                    >
                      <div className="gsi-material-button-state"></div>
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">Sign in with Google</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-emerald-500/40" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                        {user.displayName ? user.displayName[0] : 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white text-xs sm:text-sm">{user.displayName || user.email}</div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Authorized for Google Drive &amp; Sheets
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <span>Account Active</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div>
                <button
                  onClick={handleSyncToSheets}
                  disabled={isSyncing}
                  className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950/50 border border-emerald-500/40 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Writing Spreadsheet &amp; Setting Public Read Permissions...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-5 h-5" />
                      <span>{lastSyncedResult ? 'Update Existing Spreadsheet in Drive' : 'Create & Sync Google Sheet'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Last Synced Result Card */}
              {lastSyncedResult && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Live Google Sheet Active</span>
                      </div>
                      <h5 className="font-bold text-white text-sm mt-0.5">
                        {lastSyncedResult.name}
                      </h5>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Public Link Enabled
                    </span>
                  </div>

                  {/* Shareable Link Bar */}
                  <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-700/80">
                    <input
                      type="text"
                      readOnly
                      value={lastSyncedResult.spreadsheetUrl}
                      className="bg-transparent text-xs text-slate-300 w-full focus:outline-none font-mono truncate"
                    />
                    <button
                      onClick={() => copyUrlToClipboard(lastSyncedResult.spreadsheetUrl)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
                      title="Copy Shareable Link"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={lastSyncedResult.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-slate-800 transition shrink-0"
                      title="Open Google Sheet in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Permission: Anyone with link can view</span>
                    <a
                      href={lastSyncedResult.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: LINK PUBLIC SHEET URL (NO LOGIN NEEDED FOR OTHER DEVICES) */}
          {activeTab === 'public_feed' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>How to View Live Sheet Data Without Logging In</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  When using another device (or sharing with friends who are not logged in), paste the Google Sheet URL generated by you or your other agent below. 
                  As long as the sheet sharing is set to <strong className="text-emerald-400">"Anyone with the link can view"</strong>, this dashboard will directly ingest the latest rows and auto-refresh every hour with <strong>zero login required</strong>!
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Google Sheet URL or Spreadsheet ID:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit?usp=sharing"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <button
                    onClick={handleConnectPublicSheet}
                    disabled={isLoadingPublicFeed || !inputUrl.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {isLoadingPublicFeed ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Connect &amp; Load</span>
                  </button>
                </div>
              </div>

              {publicSheetUrl && (
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-slate-400 text-[11px] block">Current Public Feed Source:</span>
                    <span className="text-emerald-300 font-mono truncate">{publicSheetUrl}</span>
                  </div>
                  <button
                    onClick={() => {
                      onSavePublicSheetUrl('');
                      setInputUrl('');
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium shrink-0"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FILE MANAGEMENT & CLEANUP */}
          {activeTab === 'cleanup' && (
            <div className="space-y-4">
              
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Strict Operational Cleanup Policy:</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li>Keep files modified <strong className="text-white">Today ({kpis.date.split(',')[1]?.trim() || 'Today'})</strong> and <strong className="text-white">Yesterday</strong>.</li>
                  <li>Move older <strong className="text-amber-400">“Mainboard IPO Tracker &amp; Retail Decision Dashboard”</strong> files to Google Drive Trash.</li>
                  <li><strong className="text-emerald-400">Strict Protection</strong>: Never delete the <span className="font-mono text-emerald-300">“IPO Data Feed (Auto)”</span> file or any non-IPO files.</li>
                </ul>
              </div>

              {/* Status or scan button */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {isScanning ? 'Scanning Google Drive for dashboard files...' : hasScanned ? `Found ${retainedFiles.length + cleanupCandidates.length} relevant file(s)` : 'Click scan to check Google Drive files'}
                </div>
                <button
                  onClick={handleScanFiles}
                  disabled={isScanning || !accessToken}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Refresh Scan</span>
                </button>
              </div>

              {cleanupResultMsg && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{cleanupResultMsg}</span>
                </div>
              )}

              {cleanupCandidates.length > 0 ? (
                <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>{cleanupCandidates.length} Outdated File(s) Identified for Cleanup</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {cleanupCandidates.map((file) => (
                      <div key={file.id} className="p-2 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium truncate max-w-xs">{file.name}</span>
                        <span className="text-[10px] text-amber-400">Older than yesterday</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowConfirmTrashDialog(true)}
                    disabled={isCleaning}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Move {cleanupCandidates.length} Outdated File(s) to Trash</span>
                  </button>
                </div>
              ) : (
                hasScanned && (
                  <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <span>Google Drive is already clean! No outdated files found prior to yesterday.</span>
                  </div>
                )
              )}

              {retainedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Retained &amp; Protected Files ({retainedFiles.length})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {retainedFiles.map((file) => (
                      <div key={file.id} className="p-2.5 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-white font-medium truncate">{file.name}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          file.isProtected 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {file.isProtected ? 'Protected' : 'Retained (Active)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-850 flex items-center justify-between text-xs text-slate-400">
          <span>Mainboard Focus • NSE / BSE Official Listing Guidelines</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>

      {/* Confirmation Dialog for Trash */}
      {showConfirmTrashDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-white text-base">Confirm Moving Outdated Files to Trash</h4>
              <p className="text-xs text-slate-400">
                You are about to move {cleanupCandidates.length} outdated dashboard file(s) to your Google Drive Trash. Files from today and yesterday will remain intact.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmTrashDialog(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCleanup}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-950/50"
              >
                Confirm Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
