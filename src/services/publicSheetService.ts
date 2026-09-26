import { MainboardIPO, IPOCategory } from '../types/ipo';
import { parseDateString } from '../utils/dateUtils';

/**
 * Safely parses numbers from string formats including:
 * - "10-12%" or "10 - 12%" -> extracts the upper value: 12
 * - "+26.1%" -> 26.1
 * - "₹120" -> 120
 * - "18.08x" -> 18.08
 */
export function parseUpperNumeric(val: any, fallback: number = 0): number {
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  const str = String(val || '').trim();
  if (!str) return fallback;

  // Handle ranges like "10-12%", "10 - 12%", "15.5-20.0%", "₹120 - ₹134"
  // Look for two numbers separated by a hyphen or dash
  const rangeMatch = str.match(/([0-9.]+)\s*[-–—]\s*([0-9.]+)/);
  if (rangeMatch && rangeMatch[2]) {
    const upperVal = parseFloat(rangeMatch[2]);
    return isNaN(upperVal) ? fallback : upperVal;
  }

  // Handle single values like "26.12%", "+15%", "₹35"
  const cleanStr = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Accurately determines category based on REAL Indian Standard Time calendar date.
 * If closeDate has passed (e.g. 25-Sep is in the past for 26-Sep), it is NEVER 'closing_today'.
 */
export function determineIPOCategory(
  closeDateStr: string,
  openDateStr: string,
  listingDateStr: string,
  rawStatus: string = ''
): { category: IPOCategory; visualStatus: string } {
  const now = new Date();
  const istParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const tYear = parseInt(istParts.find(p => p.type === 'year')?.value || '2026', 10);
  const tMonth = parseInt(istParts.find(p => p.type === 'month')?.value || '09', 10) - 1;
  const tDay = parseInt(istParts.find(p => p.type === 'day')?.value || '26', 10);
  const todayMidnight = new Date(Date.UTC(tYear, tMonth, tDay, 0, 0, 0));

  const closeDate = parseDateString(closeDateStr);
  const openDate = parseDateString(openDateStr);
  const listingDate = parseDateString(listingDateStr);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Check if listing has occurred
  if (listingDate && listingDate.getTime() <= todayMidnight.getTime()) {
    const daysSinceListing = Math.round((todayMidnight.getTime() - listingDate.getTime()) / MS_PER_DAY);
    return {
      category: 'recently_listed',
      visualStatus: daysSinceListing === 0 ? '📈 Listed Today' : `📈 Listed (Day ${daysSinceListing + 1})`,
    };
  }

  // Check if bidding closes EXACTLY today
  if (closeDate && closeDate.getTime() === todayMidnight.getTime()) {
    return {
      category: 'closing_today',
      visualStatus: '🚨 Closes Today',
    };
  }

  // Check if closeDate is ALREADY IN THE PAST (Bidding ended on 25-Sep or earlier)
  if (closeDate && closeDate.getTime() < todayMidnight.getTime()) {
    const daysSinceClose = Math.round((todayMidnight.getTime() - closeDate.getTime()) / MS_PER_DAY);
    return {
      category: 'live',
      visualStatus: `🔒 Bidding Closed (${daysSinceClose}d ago)`,
    };
  }

  // Check if openDate is in the future
  if (openDate && openDate.getTime() > todayMidnight.getTime()) {
    return {
      category: 'upcoming',
      visualStatus: '🟡 Upcoming',
    };
  }

  // Otherwise actively bidding live
  return {
    category: 'live',
    visualStatus: rawStatus.includes('Day') ? rawStatus : '🟢 Live (Bidding Open)',
  };
}

export interface PublicSheetData {
  ipos: MainboardIPO[];
  sheetTitle: string;
  lastUpdated: string;
}

/**
 * Extracts Google Spreadsheet ID from any standard Google Sheet URL or ID string
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already a plain ID (no slashes)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex to extract /d/<id>/
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Fetches and parses a public Google Sheet using the CSV Export link
 */
export async function fetchPublicSheetData(urlOrId: string): Promise<PublicSheetData | null> {
  const spreadsheetId = extractSpreadsheetId(urlOrId);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheet URL or ID. Please provide a valid URL.');
  }

  // Attempt to fetch as CSV export (works for any sheet with "Anyone with link can view")
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&id=${spreadsheetId}`;

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch spreadsheet (Status: ${response.status}). Make sure the Google Sheet permission is set to "Anyone with the link can view".`);
  }

  const csvText = await response.text();
  const parsed = parseSheetCSV(csvText);
  if (!parsed || parsed.length === 0) {
    throw new Error('No valid IPO table data found in the spreadsheet.');
  }

  return {
    ipos: parsed,
    sheetTitle: 'Google Sheet Source',
    lastUpdated: new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST',
  };
}

/**
 * Parses CSV text lines and extracts IPO rows
 */
function parseSheetCSV(csvText: string): MainboardIPO[] | null {
  const rows = parseCSVIntoArray(csvText);
  if (!rows || rows.length === 0) return null;

  return parseSheetRows(rows);
}

/**
 * Parses raw 2D array of cells from the sheet
 */
export function parseSheetRows(lines: string[][]): MainboardIPO[] | null {
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i] || [];
    if (row.some((cell) => cell.toLowerCase().includes('ipo name'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return null;

  const headerRow = lines[headerIndex].map((c) => c.trim().toLowerCase());
  const nameCol = headerRow.findIndex((c) => c.includes('ipo name'));
  const statusCol = headerRow.findIndex((c) => c.includes('status'));
  const dateCol = headerRow.findIndex((c) => c.includes('date') || c.includes('open'));
  const priceCol = headerRow.findIndex((c) => c.includes('price band') || c.includes('price'));
  const capCol = headerRow.findIndex((c) => c.includes('cap'));
  const lotCol = headerRow.findIndex((c) => c.includes('lot'));
  const minInvCol = headerRow.findIndex((c) => c.includes('min') || c.includes('retail inv'));
  const issueSizeCol = headerRow.findIndex((c) => c.includes('issue size'));
  const freshOfsCol = headerRow.findIndex((c) => c.includes('fresh'));
  const gmpCol = headerRow.findIndex((c) => c.includes('gmp'));
  const estPriceCol = headerRow.findIndex((c) => c.includes('est. listing price') || c.includes('est. price'));
  const estGainCol = headerRow.findIndex((c) => c.includes('est. gain') || c.includes('gain (%)'));
  const subCol = headerRow.findIndex((c) => c.includes('sub'));
  const decisionCol = headerRow.findIndex((c) => c.includes('decision') || c.includes('verdict'));
  const rationaleCol = headerRow.findIndex((c) => c.includes('rationale') || c.includes('guidance'));
  const linkCol = headerRow.findIndex((c) => c.includes('registrar') || c.includes('link'));

  const parsedIpos: MainboardIPO[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = lines[i] || [];
    const name = String(row[nameCol !== -1 ? nameCol : 0] || '').trim();
    if (!name || name.toLowerCase().includes('total') || name.startsWith('=')) continue;

    const rawDates = String(row[dateCol !== -1 ? dateCol : 2] || '');
    const dateParts = rawDates.split('/');
    const openDate = (dateParts[0] || '').trim();
    const closeDate = (dateParts[1] || '').trim();
    const listingDate = (dateParts[2] || '').trim();

    const rawStatus = String(row[statusCol !== -1 ? statusCol : 1] || '');
    const determined = determineIPOCategory(closeDate, openDate, listingDate, rawStatus);

    const priceBand = String(row[priceCol !== -1 ? priceCol : 3] || '₹100 - ₹110');
    const capPrice = parseUpperNumeric(row[capCol !== -1 ? capCol : 4], 100);
    const lotSize = parseUpperNumeric(row[lotCol !== -1 ? lotCol : 5], 100);
    const minRetailInv = parseUpperNumeric(row[minInvCol !== -1 ? minInvCol : 6], capPrice * lotSize);

    const issueSizeCr = parseUpperNumeric(row[issueSizeCol !== -1 ? issueSizeCol : 7], 200);
    const gmpRs = parseUpperNumeric(row[gmpCol !== -1 ? gmpCol : 9], 0);
    const estListingPrice = parseUpperNumeric(row[estPriceCol !== -1 ? estPriceCol : 10], capPrice + gmpRs);
    
    // Critical: Use parseUpperNumeric on estGainCol so "10-12%" yields 12% (NOT 1012%)
    let estGainPercent = parseUpperNumeric(row[estGainCol !== -1 ? estGainCol : 11], 0);
    if ((estGainPercent === 0 || estGainPercent > 250) && capPrice > 0 && gmpRs > 0) {
      estGainPercent = Number(((gmpRs / capPrice) * 100).toFixed(2));
    }

    const totalSub = parseUpperNumeric(row[subCol !== -1 ? subCol : 12], 0);
    const retailDecision = (String(row[decisionCol !== -1 ? decisionCol : 13] || 'Under Review').trim() as any);
    const rationale = String(row[rationaleCol !== -1 ? rationaleCol : 14] || '');
    const allotmentUrl = String(row[linkCol !== -1 ? linkCol : 15] || 'https://www.chittorgarh.com');

    parsedIpos.push({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      visualStatus: determined.visualStatus as any,
      category: determined.category,
      openDate,
      closeDate,
      listingDate,
      priceBand,
      capPrice,
      lotSize,
      minRetailInv,
      issueSizeCr,
      freshCr: issueSizeCr * 0.8,
      ofsCr: issueSizeCr * 0.2,
      freshPercent: 80,
      ofsPercent: 20,
      gmpRs,
      estListingPrice,
      estGainPercent,
      totalSub,
      qibSub: 0,
      niiSub: 0,
      retailSub: 0,
      retailDecision,
      rationale: rationale || `Evaluated on ${capPrice > 0 ? `₹${capPrice} cap price` : 'issue details'} and +${estGainPercent}% estimated listing gain.`,
      registrar: 'Link Intime / Bigshare',
      allotmentUrl,
      sector: 'Diversified',
    });
  }

  return parsedIpos.length > 0 ? parsedIpos : null;
}

/**
 * Standard CSV line parser handling quoted cells and commas
 */
function parseCSVIntoArray(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentField);
      result.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || row.length > 0) {
    row.push(currentField);
    result.push(row);
  }

  return result;
}
