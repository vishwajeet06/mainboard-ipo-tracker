/**
 * Helper to obtain the current real date formatted for Indian Standard Time (IST - Asia/Kolkata)
 */
export function getFormattedCurrentDateIST(): {
  dateStr: string;        // e.g. "2026-09-26"
  formattedLong: string;  // e.g. "Saturday, September 26, 2026"
  formattedShort: string; // e.g. "26-Sep-26"
} {
  const now = new Date();
  
  // Format long: "Saturday, September 26, 2026"
  const formattedLong = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ISO string in Asia/Kolkata
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const day = parts.find(p => p.type === 'day')?.value || '26';
  const month = parts.find(p => p.type === 'month')?.value || '09';
  const year = parts.find(p => p.type === 'year')?.value || '2026';

  const dateStr = `${year}-${month}-${day}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month, 10) - 1;
  const monthAbbr = monthNames[monthIdx] || 'Sep';
  const shortYear = year.slice(-2);
  const formattedShort = `${day}-${monthAbbr}-${shortYear}`;

  return {
    dateStr,
    formattedLong,
    formattedShort,
  };
}

/**
 * Checks whether current Indian Standard Time (Asia/Kolkata) is between 6:00 AM and 6:00 PM IST
 */
export function isWithinActiveISTWindow(): boolean {
  const now = new Date();
  const istTimeString = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [hourStr] = istTimeString.split(':');
  const hour = parseInt(hourStr, 10);
  return hour >= 6 && hour < 18; // 06:00 to 17:59 IST
}

/**
 * Parses flexible date strings such as "25-Sep-26", "25-Sep-2026", "2026-09-25", or "25/09/2026"
 * into a Date object at midnight IST.
 */
export function parseDateString(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const cleaned = String(dateStr).trim();
  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'tba') return null;

  // Try standard DD-MMM-YY (e.g., "25-Sep-26" or "25-Sep-2026")
  const mmmMatch = cleaned.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (mmmMatch) {
    const day = parseInt(mmmMatch[1], 10);
    const mmm = mmmMatch[2].toLowerCase();
    let year = parseInt(mmmMatch[3], 10);
    if (year < 100) year += 2000;

    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = monthMap[mmm];
    if (month !== undefined) {
      return new Date(Date.UTC(year, month, day, 0, 0, 0));
    }
  }

  // Try ISO YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Date.UTC(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 0, 0, 0));
  }

  // Fallback to Date.parse
  const timestamp = Date.parse(cleaned);
  return isNaN(timestamp) ? null : new Date(timestamp);
}

export interface ListingProgressInfo {
  status: 'bidding_open' | 'post_bidding' | 'listed' | 'upcoming';
  label: string;
  daysSinceClose: number;
  daysRemainingToListing: number;
  totalPostBiddingDays: number;
  progressPercent: number; // 0 to 100
  badgeColor: string;
  progressColor: string;
}

/**
 * Calculates how long it has been since bidding ended and the remaining time until the listing date.
 * Under Indian SEBI T+3 regulations:
 * - Bidding closes on Day T (e.g. 25-Sep)
 * - Allotment finalized on T+1 (26-Sep)
 * - Demat credit on T+2 (29-Sep)
 * - NSE/BSE Listing on T+3 (30-Sep)
 */
export function calculateListingProgress(
  closeDateStr: string | undefined,
  listingDateStr: string | undefined
): ListingProgressInfo {
  const now = new Date();
  
  // Use today's midnight UTC as reference point for Indian date
  const todayParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const tYear = parseInt(todayParts.find(p => p.type === 'year')?.value || '2026', 10);
  const tMonth = parseInt(todayParts.find(p => p.type === 'month')?.value || '09', 10) - 1;
  const tDay = parseInt(todayParts.find(p => p.type === 'day')?.value || '26', 10);
  const todayMidnight = new Date(Date.UTC(tYear, tMonth, tDay, 0, 0, 0));

  const closeDate = parseDateString(closeDateStr);
  const listingDate = parseDateString(listingDateStr);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Case 1: Dates not available or invalid
  if (!closeDate || !listingDate) {
    return {
      status: 'upcoming',
      label: 'Dates Awaited',
      daysSinceClose: 0,
      daysRemainingToListing: 0,
      totalPostBiddingDays: 3,
      progressPercent: 15,
      badgeColor: 'text-slate-400 bg-slate-800 border-slate-700',
      progressColor: 'from-slate-500 to-slate-400',
    };
  }

  const diffCloseMs = todayMidnight.getTime() - closeDate.getTime();
  const daysSinceClose = Math.round(diffCloseMs / MS_PER_DAY);

  const diffListingMs = listingDate.getTime() - todayMidnight.getTime();
  const daysRemainingToListing = Math.round(diffListingMs / MS_PER_DAY);

  const totalPostBiddingMs = listingDate.getTime() - closeDate.getTime();
  const totalPostBiddingDays = Math.max(1, Math.round(totalPostBiddingMs / MS_PER_DAY));

  // Case 2: Already Listed
  if (daysRemainingToListing <= 0) {
    return {
      status: 'listed',
      label: daysRemainingToListing === 0 ? '🎉 Listed Today!' : `📈 Listed (${Math.abs(daysRemainingToListing)}d ago)`,
      daysSinceClose: Math.max(0, daysSinceClose),
      daysRemainingToListing: 0,
      totalPostBiddingDays,
      progressPercent: 100,
      badgeColor: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40',
      progressColor: 'from-indigo-500 to-purple-500',
    };
  }

  // Case 3: Still actively bidding (Bidding has not ended yet)
  if (daysSinceClose < 0) {
    return {
      status: 'bidding_open',
      label: `Bidding Open • ${Math.abs(daysSinceClose)}d left to close`,
      daysSinceClose: 0,
      daysRemainingToListing,
      totalPostBiddingDays,
      progressPercent: 10,
      badgeColor: 'text-teal-300 bg-teal-500/20 border-teal-500/40',
      progressColor: 'from-teal-500 to-emerald-500',
    };
  }

  // Case 4: Post-Bidding Phase (Countdown to Listing)
  // daysSinceClose is >= 0 and daysRemainingToListing > 0
  const progressRatio = Math.min(1, Math.max(0, daysSinceClose / totalPostBiddingDays));
  const progressPercent = Math.max(20, Math.min(95, Math.round(progressRatio * 100)));

  let label = '';
  if (daysSinceClose === 0) {
    label = `Bidding Closed Today • Listing in ${daysRemainingToListing}d`;
  } else if (daysSinceClose === 1) {
    label = `1d post-close (Allotment) • Listing in ${daysRemainingToListing}d`;
  } else {
    label = `${daysSinceClose}d post-close • Listing in ${daysRemainingToListing}d`;
  }

  return {
    status: 'post_bidding',
    label,
    daysSinceClose,
    daysRemainingToListing,
    totalPostBiddingDays,
    progressPercent,
    badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40',
    progressColor: 'from-emerald-500 via-teal-400 to-indigo-500',
  };
}
