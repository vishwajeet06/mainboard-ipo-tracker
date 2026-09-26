import React, { useState, useMemo } from 'react';
import { MainboardIPO, RetailDecision, IPOCategory } from '../types/ipo';
import { calculateListingProgress } from '../utils/dateUtils';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Calculator, 
  Info, 
  ChevronRight, 
  AlertTriangle, 
  Check, 
  TrendingUp, 
  Sparkles,
  Clock 
} from 'lucide-react';

interface IPOTableProps {
  ipos: MainboardIPO[];
  onOpenCalculator: (ipo: MainboardIPO) => void;
  selectedIpoName?: string | null;
}

export const IPOTable: React.FC<IPOTableProps> = ({
  ipos,
  onOpenCalculator,
  selectedIpoName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | IPOCategory>('all');
  const [decisionFilter, setDecisionFilter] = useState<string>('all');

  // Filtered dataset
  const filteredIPOs = useMemo(() => {
    return ipos.filter((ipo) => {
      // Search
      const matchesSearch = 
        ipo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ipo.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ipo.retailDecision.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ipo.symbol && ipo.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category
      const matchesCategory = categoryFilter === 'all' || ipo.category === categoryFilter;

      // Decision
      const matchesDecision = decisionFilter === 'all' || ipo.retailDecision === decisionFilter;

      return matchesSearch && matchesCategory && matchesDecision;
    });
  }, [ipos, searchQuery, categoryFilter, decisionFilter]);

  // Helper for Decision Badge Styling
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      
      {/* Table Top Controls & Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Mainboard IPO Live Decision Tracker
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-semibold border border-slate-700">
                {filteredIPOs.length} of {ipos.length} IPOs
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict Mainboard (BSE/NSE) universe. Evaluated on GMP buffer, subscription health &amp; retail risk-reward.
            </p>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search IPO, sector, decision..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Category Tabs & Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                categoryFilter === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All Mainboard ({ipos.length})
            </button>
            <button
              onClick={() => setCategoryFilter('closing_today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'closing_today'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-rose-400 hover:bg-rose-950/20'
              }`}
            >
              <span>🚨 Closes Today (4)</span>
            </button>
            <button
              onClick={() => setCategoryFilter('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'live'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-emerald-400 hover:bg-emerald-950/20'
              }`}
            >
              <span>🟢 Live / Open (6)</span>
            </button>
            <button
              onClick={() => setCategoryFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'upcoming'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-amber-400 hover:bg-amber-950/20'
              }`}
            >
              <span>🟡 Upcoming (2)</span>
            </button>
            <button
              onClick={() => setCategoryFilter('recently_listed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                categoryFilter === 'recently_listed'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-indigo-400 hover:bg-indigo-950/20'
              }`}
            >
              <span>📈 Listed (Max 2 Days) (3)</span>
            </button>
          </div>

          {/* Decision Filter Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Verdict:</span>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Verdicts</option>
              <option value="Strong Apply">Strong Apply</option>
              <option value="Apply for Listing Gains">Apply for Listing Gains</option>
              <option value="Apply with Caution / Neutral">Apply with Caution / Neutral</option>
              <option value="Under Review">Under Review</option>
              <option value="Avoid">Avoid</option>
              <option value="Listed (Hold with Trailing SL)">Listed (Hold / SL)</option>
              <option value="Listed (Book Major Profits)">Listed (Book Profits)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Full-Width from Column A, Column A Frozen for Desktop & Mobile */}
      <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-slate-700">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/90 text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800">
              
              {/* Column A (Frozen): IPO Name */}
              <th className="sticky left-0 z-20 bg-slate-950 px-4 py-3.5 border-r border-slate-800 min-w-[200px] shadow-[2px_0_8px_rgba(0,0,0,0.5)]">
                IPO Name
              </th>

              {/* Column B: Visual Status */}
              <th className="px-3.5 py-3.5 min-w-[130px]">Visual Status</th>

              {/* Column C: Issue Dates */}
              <th className="px-3.5 py-3.5 min-w-[170px]">Open / Close / Listing</th>

              {/* Column D: Price & Lot Details */}
              <th className="px-3.5 py-3.5 min-w-[150px]">Price Band &amp; Min Inv.</th>

              {/* Column E: Issue Size & Fresh vs OFS */}
              <th className="px-3.5 py-3.5 min-w-[170px]">Issue Size (Fresh / OFS)</th>

              {/* Column F: GMP & Estimated Gain */}
              <th className="px-3.5 py-3.5 min-w-[140px] text-right">GMP &amp; Est. Gain</th>

              {/* Column G: Total Subscription */}
              <th className="px-3.5 py-3.5 min-w-[110px] text-center">Total Sub.</th>

              {/* Column H: Retail Decision */}
              <th className="px-3.5 py-3.5 min-w-[190px]">Retail Decision</th>

              {/* Column I: Strategic Rationale & Guidance */}
              <th className="px-3.5 py-3.5 min-w-[280px]">Strategic Rationale</th>

              {/* Column J: Registrar / Link */}
              <th className="px-3.5 py-3.5 min-w-[130px]">Registrar / Link</th>

              {/* Column K: Actions */}
              <th className="px-3.5 py-3.5 min-w-[100px] text-center">Action</th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80 text-xs">
            {filteredIPOs.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-slate-400">
                  No Mainboard IPOs match your search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredIPOs.map((ipo) => {
                const isSelected = selectedIpoName === ipo.name;
                const isHighGmp = ipo.estGainPercent >= 20;

                return (
                  <tr
                    key={ipo.id}
                    className={`hover:bg-slate-800/50 transition group ${
                      isSelected ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    
                    {/* Frozen Column A: IPO Name */}
                    <td className={`sticky left-0 z-10 px-4 py-3 border-r border-slate-800 bg-slate-900 group-hover:bg-slate-850 shadow-[2px_0_8px_rgba(0,0,0,0.4)] ${
                      isSelected ? 'bg-slate-900 border-l-4 border-l-emerald-500' : ''
                    }`}>
                      <div className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                        {ipo.name}
                        {isHighGmp && (
                          <span title="High Potential (GMP > 20%)">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-slate-300 font-semibold">{ipo.symbol || 'MAINBOARD'}</span>
                        <span>•</span>
                        <span className="text-slate-400 truncate max-w-[140px]">{ipo.sector}</span>
                      </div>
                      {ipo.closingAlert && (
                        <div className="mt-1 text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {ipo.closingAlert}
                        </div>
                      )}
                    </td>

                    {/* Column B: Visual Status */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/80">
                        {ipo.visualStatus}
                      </span>
                    </td>

                    {/* Column C: Issue Dates & Days to Listing Progress */}
                    <td className="px-3.5 py-3 whitespace-nowrap text-slate-300 min-w-[200px]">
                      {(() => {
                        const progressInfo = calculateListingProgress(ipo.closeDate, ipo.listingDate);
                        return (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-200">{ipo.openDate} &rarr; <strong className="text-white">{ipo.closeDate}</strong></span>
                              <span className="text-[10px] text-emerald-400 font-bold">{ipo.listingDate}</span>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${progressInfo.progressColor}`}
                                style={{ width: `${progressInfo.progressPercent}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="truncate max-w-[120px]">{progressInfo.label}</span>
                              {progressInfo.daysRemainingToListing > 0 ? (
                                <span className="text-amber-400 font-medium">{progressInfo.daysRemainingToListing}d to list</span>
                              ) : (
                                <span className="text-indigo-400 font-bold">Listed</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Column D: Price Band & Min Inv */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <div className="font-semibold text-white">
                        {ipo.priceBand}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Lot: <span className="text-slate-200">{ipo.lotSize} shs</span> • Min: <span className="text-emerald-400 font-medium">₹{ipo.minRetailInv.toLocaleString('en-IN')}</span>
                      </div>
                    </td>

                    {/* Column E: Issue Size & Fresh vs OFS */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <div className="font-bold text-white">
                        ₹{ipo.issueSizeCr.toFixed(2)} Cr
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Fresh: <span className="text-emerald-400">{ipo.freshPercent}%</span> | OFS: <span className={ipo.ofsPercent > 40 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>{ipo.ofsPercent}%</span>
                      </div>
                    </td>

                    {/* Column F: GMP & Estimated Gain */}
                    <td className="px-3.5 py-3 whitespace-nowrap text-right">
                      {ipo.category === 'recently_listed' ? (
                        <div>
                          <div className="font-bold text-emerald-400 text-sm">
                            CMP: ₹{ipo.cmp?.toFixed(2)}
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-300">
                            +{ipo.realizedGainPercent?.toFixed(2)}% realized
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className={`font-extrabold text-sm ${
                            ipo.estGainPercent >= 20 
                              ? 'text-emerald-400' 
                              : ipo.estGainPercent >= 10 
                              ? 'text-teal-300' 
                              : ipo.estGainPercent > 0 
                              ? 'text-amber-300' 
                              : 'text-rose-400'
                          }`}>
                            {ipo.estGainPercent > 0 ? '+' : ''}{ipo.estGainPercent.toFixed(2)}%
                          </div>
                          <div className="text-[11px] text-slate-400">
                            GMP: <span className="font-medium text-slate-200">₹{ipo.gmpRs.toFixed(2)}</span> (Est: ₹{ipo.estListingPrice})
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Column G: Total Subscription */}
                    <td className="px-3.5 py-3 whitespace-nowrap text-center">
                      {ipo.totalSub > 0 ? (
                        <div>
                          <div className={`font-extrabold text-xs px-2 py-0.5 rounded-full inline-block ${
                            ipo.totalSub >= 10
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ipo.totalSub >= 1
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {ipo.totalSub.toFixed(2)}x
                          </div>
                          {ipo.qibSub !== undefined && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              QIB: {ipo.qibSub}x | Ret: {ipo.retailSub}x
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono">-</span>
                      )}
                    </td>

                    {/* Column H: Retail Decision */}
                    <td className="px-3.5 py-3">
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-bold border ${getDecisionBadge(ipo.retailDecision)}`}>
                        {ipo.retailDecision}
                      </span>
                    </td>

                    {/* Column I: Strategic Rationale */}
                    <td className="px-3.5 py-3 text-slate-300 text-xs leading-relaxed max-w-sm">
                      <p className="line-clamp-2 hover:line-clamp-none transition-all duration-200 cursor-pointer">
                        {ipo.rationale}
                      </p>
                    </td>

                    {/* Column J: Registrar / Link */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <a
                        href={ipo.allotmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
                        title={`Check allotment or bidding at ${ipo.registrar}`}
                      >
                        <span className="truncate max-w-[100px]">{ipo.registrar}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    {/* Column K: Actions */}
                    <td className="px-3.5 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => onOpenCalculator(ipo)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                        title="Calculate Lots, Investment Amount & Expected Listing Profit"
                      >
                        <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Lots</span>
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Column A (IPO Name) is frozen horizontally for fast side-by-side assessment.</span>
        </div>
        <div className="text-slate-500">
          Source feeds: Chittorgarh, InvestorGain, NSE/BSE &amp; Official Registrars • Refreshed Daily
        </div>
      </div>

    </div>
  );
};
