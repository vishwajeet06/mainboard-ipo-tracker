export type IPOVisualStatus = 
  | '🚨 Closes Today'
  | '🟢 Live (Day 1)'
  | '🟢 Live (Day 2)'
  | '🟢 Live (Day 3)'
  | '🟡 Upcoming'
  | '📈 Listed (Day 1)'
  | '📈 Listed (Day 2)';

export type IPOCategory = 'closing_today' | 'live' | 'upcoming' | 'recently_listed';

export type RetailDecision = 
  | 'Strong Apply'
  | 'Apply for Listing Gains'
  | 'Apply with Caution / Neutral'
  | 'Under Review'
  | 'Avoid'
  | 'Listed (Hold with Trailing SL)'
  | 'Listed (Book Major Profits)';

export interface MainboardIPO {
  id: string;
  name: string;
  symbol?: string;
  visualStatus: IPOVisualStatus;
  category: IPOCategory;
  openDate: string;
  closeDate: string;
  listingDate: string;
  priceBand: string;
  capPrice: number;
  lotSize: number;
  minRetailInv: number;
  issueSizeCr: number;
  freshCr: number;
  ofsCr: number;
  freshPercent: number;
  ofsPercent: number;
  gmpRs: number;
  estListingPrice: number;
  estGainPercent: number;
  totalSub: number;
  qibSub?: number;
  niiSub?: number;
  retailSub?: number;
  retailDecision: RetailDecision;
  rationale: string;
  registrar: string;
  allotmentUrl: string;
  sector: string;
  bseNseCode?: string;
  closingAlert?: string;
  dayNumber?: number;
  cmp?: number;
  realizedGainPercent?: number;
}

export interface DashboardKPIs {
  totalTracked: number;
  highPotentialCount: number; // GMP > 20%
  avgEstListingGain: number; // in %
  topPickGmp: {
    name: string;
    gmpRs: number;
    gainPercent: number;
  };
  majorMover: {
    name: string;
    sub: number;
    gmpGainPercent: number;
    highlight: string;
  };
  date: string;
  executiveTakeaway: {
    actionFocus: string;
    keyWatch: string;
    marketSentiment: 'Bullish' | 'Moderately Bullish & Discerning' | 'Neutral' | 'Cautious' | 'Bearish';
    marketSummary: string;
  };
}

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
  isRetained: boolean; // today or yesterday
  isProtected: boolean; // e.g. "IPO Data Feed (Auto)"
  canTrash: boolean;
}

export interface DailySnapshot {
  date: string;
  trackedCount: number;
  avgGmpPercent: number;
  topPick: string;
  closingIPOs: string[];
  statusSummary: string;
}
