export interface MarketSentimentData {
  indexName: string;
  currentValue: number;
  changePoints: number;
  changePercent: number;
  sentiment: 'BULLISH' | 'NEUTRAL' | 'CAUTIOUS' | 'BEARISH';
  vixValue: number;
  summary: string;
  retailAdvice: string;
  lastUpdated: string;
}

export const DEFAULT_MARKET_SENTIMENT: MarketSentimentData = {
  indexName: 'NIFTY 50',
  currentValue: 26178.95,
  changePoints: 135.20,
  changePercent: 0.52,
  sentiment: 'BULLISH',
  vixValue: 12.45,
  summary: 'Domestic benchmark indices trade firmly in the green led by banking and capital goods inflows.',
  retailAdvice: 'Favorable listing environment: Healthy secondary market momentum supports IPO listing premiums holding firm on debut day.',
  lastUpdated: 'Live NSE Feed',
};
