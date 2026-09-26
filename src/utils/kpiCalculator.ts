import { MainboardIPO, DashboardKPIs } from '../types/ipo';
import { getFormattedCurrentDateIST } from './dateUtils';

export function calculateKPIsFromIpos(ipos: MainboardIPO[]): DashboardKPIs {
  const totalTracked = ipos.length;
  const highPotentialIpos = ipos.filter((i) => (i.estGainPercent || 0) >= 20);
  const highPotentialCount = highPotentialIpos.length;

  const totalGain = ipos.reduce((sum, i) => sum + (i.estGainPercent || 0), 0);
  const avgEstListingGain = totalTracked > 0 ? Number((totalGain / totalTracked).toFixed(1)) : 0;

  // Top Pick by GMP (highest estGainPercent)
  let topPickGmp = {
    name: 'None',
    gmpRs: 0,
    gainPercent: 0,
  };
  if (ipos.length > 0) {
    const sortedByGmp = [...ipos].sort((a, b) => (b.estGainPercent || 0) - (a.estGainPercent || 0));
    const top = sortedByGmp[0];
    topPickGmp = {
      name: top.name,
      gmpRs: top.gmpRs || 0,
      gainPercent: top.estGainPercent || 0,
    };
  }

  // Major Mover (highest subscription)
  let majorMover = {
    name: 'None',
    sub: 0,
    gmpGainPercent: 0,
    highlight: 'Active bidding',
  };
  if (ipos.length > 0) {
    const sortedBySub = [...ipos].sort((a, b) => (b.totalSub || 0) - (a.totalSub || 0));
    const topSub = sortedBySub[0];
    majorMover = {
      name: topSub.name,
      sub: topSub.totalSub || 0,
      gmpGainPercent: topSub.estGainPercent || 0,
      highlight: `${topSub.totalSub}x Total Subscription`,
    };
  }

  // Sentiment classification according to DashboardKPIs union
  let marketSentiment: 'Bullish' | 'Moderately Bullish & Discerning' | 'Neutral' | 'Cautious' | 'Bearish' = 'Moderately Bullish & Discerning';
  if (avgEstListingGain >= 20) {
    marketSentiment = 'Bullish';
  } else if (avgEstListingGain >= 12) {
    marketSentiment = 'Moderately Bullish & Discerning';
  } else if (avgEstListingGain >= 5) {
    marketSentiment = 'Neutral';
  } else {
    marketSentiment = 'Cautious';
  }

  const closingTodayCount = ipos.filter((i) => i.category === 'closing_today').length;
  const strongApplyCount = ipos.filter((i) => i.retailDecision === 'Strong Apply').length;

  const { formattedLong } = getFormattedCurrentDateIST();

  return {
    totalTracked,
    highPotentialCount,
    avgEstListingGain,
    topPickGmp,
    majorMover,
    date: formattedLong,
    executiveTakeaway: {
      actionFocus: closingTodayCount > 0 
        ? `${closingTodayCount} IPOs Closing Today • ${strongApplyCount} High Conviction Apply`
        : `${totalTracked} Mainboard IPOs Active on BSE/NSE`,
      marketSentiment,
      keyWatch: topPickGmp.name !== 'None' 
        ? `${topPickGmp.name} (+${topPickGmp.gainPercent}% GMP)` 
        : 'Monitor Day 3 QIB Subscription Rates',
      marketSummary: `Live dataset tracking ${totalTracked} Mainboard IPOs across BSE and NSE. Average expected listing gain sits at +${avgEstListingGain}%.`,
    },
  };
}
