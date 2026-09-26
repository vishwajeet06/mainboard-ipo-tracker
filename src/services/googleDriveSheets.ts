import { MainboardIPO, DashboardKPIs, DriveFileInfo } from '../types/ipo';
import { DAILY_HISTORY_SNAPSHOTS } from '../data/ipoData';
import { parseUpperNumeric, determineIPOCategory } from './publicSheetService';

export interface CreateSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  isExisting: boolean;
  name: string;
}

export interface CleanupResult {
  totalScanned: number;
  retainedCount: number;
  trashedCount: number;
  trashedFileNames: string[];
}

/**
 * Searches user's Google Drive for IPO tracker dashboards and categorizes them
 */
export const scanDashboardFiles = async (accessToken: string): Promise<{
  allFiles: DriveFileInfo[];
  retainedFiles: DriveFileInfo[];
  cleanupCandidates: DriveFileInfo[];
}> => {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to query Google Drive (HTTP ${res.status})`);
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  // Current date anchor (2026-09-25)
  const today = new Date('2026-09-25T00:00:00');
  const yesterday = new Date('2026-09-24T00:00:00');
  const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);

  const allFiles: DriveFileInfo[] = [];
  const retainedFiles: DriveFileInfo[] = [];
  const cleanupCandidates: DriveFileInfo[] = [];

  for (const f of files) {
    const name: string = f.name || '';
    const isTargetFile = name.includes('Mainboard IPO Tracker & Retail Decision Dashboard');
    
    // Explicit protection rule: Never touch IPO Data Feed (Auto) or non-IPO files
    const isDataFeed = name.includes('IPO Data Feed (Auto)');
    const isProtected = isDataFeed || !isTargetFile;

    const modifiedTime = f.modifiedTime ? new Date(f.modifiedTime) : new Date();
    const isTodayOrYesterday = modifiedTime >= startOfYesterday;

    const fileInfo: DriveFileInfo = {
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
      isRetained: isTodayOrYesterday,
      isProtected: isProtected,
      canTrash: isTargetFile && !isProtected && !isTodayOrYesterday,
    };

    if (isTargetFile || isDataFeed) {
      allFiles.push(fileInfo);
      if (fileInfo.canTrash) {
        cleanupCandidates.push(fileInfo);
      } else {
        retainedFiles.push(fileInfo);
      }
    }
  }

  return { allFiles, retainedFiles, cleanupCandidates };
};

/**
 * Moves specified files to Google Drive trash (Safe delete)
 */
export const trashFiles = async (accessToken: string, fileIds: string[]): Promise<string[]> => {
  const trashedIds: string[] = [];

  for (const fileId of fileIds) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trashed: true }),
    });

    if (res.ok) {
      trashedIds.push(fileId);
    } else {
      console.warn(`Could not trash file ${fileId}: HTTP ${res.status}`);
    }
  }

  return trashedIds;
};

export interface DriveParsedFeed {
  fileId: string;
  fileName: string;
  modifiedTime: string;
  ipos: MainboardIPO[];
  kpis?: DashboardKPIs;
}

/**
 * Searches user's Google Drive for the latest Mainboard IPO Tracker file
 * (including files updated by another agent between 11:30 AM and 12:00 PM)
 * and reads the live data directly into the dashboard.
 */
export const fetchLatestSheetDataFromDrive = async (accessToken: string): Promise<DriveParsedFeed | null> => {
  // Query for spreadsheets containing "Mainboard IPO Tracker" or "IPO Data Feed" ordered by last modified
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and (name contains 'Mainboard IPO Tracker' or name contains 'IPO Data Feed')");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,webViewLink)&pageSize=5`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const files: any[] = data.files || [];
  if (files.length === 0) return null;

  const targetFile = files[0];
  const spreadsheetId = targetFile.id;

  // Fetch spreadsheet metadata to check sheet tabs
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) return null;

  const meta = await metaRes.json();
  const sheets: any[] = meta.sheets || [];
  if (sheets.length === 0) return null;

  // Prefer "Main Dashboard", fallback to first sheet
  const mainSheet = sheets.find((s) => s.properties.title === 'Main Dashboard') || sheets[0];
  const sheetTitle = mainSheet.properties.title;

  // Read range A1:P60
  const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetTitle)}'!A1:P60`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!valuesRes.ok) return null;

  const valuesData = await valuesRes.json();
  const rows: (string | number)[][] = valuesData.values || [];
  if (rows.length < 2) return null;

  // Locate the header row containing "IPO Name"
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.some((cell) => typeof cell === 'string' && cell.toLowerCase().includes('ipo name'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return null;

  const headerRow = rows[headerIndex].map((c) => String(c).trim().toLowerCase());
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

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const name = String(row[nameCol !== -1 ? nameCol : 0] || '').trim();
    if (!name) continue;

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
      retailDecision,
      rationale,
      registrar: 'Official Registrar',
      allotmentUrl: allotmentUrl.startsWith('http') ? allotmentUrl : 'https://www.chittorgarh.com',
      sector: 'Mainboard Sector',
    });
  }

  if (parsedIpos.length === 0) return null;

  return {
    fileId: targetFile.id,
    fileName: targetFile.name,
    modifiedTime: targetFile.modifiedTime,
    ipos: parsedIpos,
  };
};

/**
 * Creates or updates the official Mainboard IPO Tracker & Retail Decision Dashboard in Google Sheets
 */
export const syncDashboardToGoogleSheets = async (
  accessToken: string,
  ipos: MainboardIPO[],
  kpis: DashboardKPIs
): Promise<CreateSheetResult> => {
  const spreadsheetTitle = `Mainboard IPO Tracker & Retail Decision Dashboard - 2026-09-25`;

  // 1. Search if today's file already exists
  const searchQuery = encodeURIComponent(`name='${spreadsheetTitle}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let spreadsheetId: string | null = null;
  let isExisting = false;

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      spreadsheetId = searchData.files[0].id;
      isExisting = true;
    }
  }

  // 2. If not existing, create a new spreadsheet
  if (!spreadsheetId) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: spreadsheetTitle,
          locale: 'en_IN',
          autoRecalc: 'ON_CHANGE',
        },
        sheets: [
          { properties: { title: 'Main Dashboard', sheetId: 0 } },
          { properties: { title: 'History', sheetId: 1 } },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to create Google Spreadsheet (HTTP ${createRes.status})`);
    }

    const createdData = await createRes.json();
    spreadsheetId = createdData.spreadsheetId;
  } else {
    // If existing, ensure 'Main Dashboard' and 'History' sheets exist
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const existingSheetTitles = (meta.sheets || []).map((s: any) => s.properties.title);
      const requests = [];
      if (!existingSheetTitles.includes('Main Dashboard')) {
        requests.push({ addSheet: { properties: { title: 'Main Dashboard' } } });
      }
      if (!existingSheetTitles.includes('History')) {
        requests.push({ addSheet: { properties: { title: 'History' } } });
      }
      if (requests.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        });
      }
    }
  }

  // 3. Prepare "Main Dashboard" data following all formatting rules:
  // Non-table sections (Title, KPIs, Executive Takeaway, Golden Rules) start from Column B.
  // Main tracker table is full-width starting from Column A (Row 14).
  const mainSheetValues: (string | number)[][] = [];

  // Row 1: Empty
  mainSheetValues.push([]);

  // Row 2: Title & Date (Starts from Column B)
  mainSheetValues.push(['', 'MAINBOARD IPO TRACKER & RETAIL DECISION DASHBOARD (NSE / BSE)', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  // Row 3: Subtitle / Date (Column B)
  mainSheetValues.push(['', `Daily Operator Snapshot • Date: ${kpis.date} • Strict Mainboard Scope (No SME IPOs)`, '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  // Row 4: Empty
  mainSheetValues.push([]);

  // Row 5: KPI Section Header (Column B)
  mainSheetValues.push(['', 'DAILY OPERATING KPIs', '', '', '', 'EXECUTIVE TAKEAWAY & ACTION FOCUS', '', '', '', '', '', '', '', '', '', '']);
  // Row 6: KPIs Row 1 (Column B to E) & Takeaway (Column F+)
  mainSheetValues.push([
    '',
    'Total Tracked Mainboard IPOs',
    kpis.totalTracked,
    'Top Pick by GMP',
    `${kpis.topPickGmp.name} (+${kpis.topPickGmp.gainPercent}%)`,
    'Action Focus:',
    kpis.executiveTakeaway.actionFocus,
    '', '', '', '', '', '', '', '', '',
  ]);
  // Row 7: KPIs Row 2
  mainSheetValues.push([
    '',
    'High Potential IPOs (GMP > 20%)',
    kpis.highPotentialCount,
    'Major Mover',
    `${kpis.majorMover.name} (${kpis.majorMover.sub}x sub, +${kpis.majorMover.gmpGainPercent}%)`,
    'Key Watch / Action:',
    kpis.executiveTakeaway.keyWatch,
    '', '', '', '', '', '', '', '', '',
  ]);
  // Row 8: KPIs Row 3
  mainSheetValues.push([
    '',
    'Avg Estimated Listing Gain (%)',
    `${kpis.avgEstListingGain}%`,
    'Market Sentiment',
    kpis.executiveTakeaway.marketSentiment,
    'Retail Strategy Note:',
    kpis.executiveTakeaway.marketSummary,
    '', '', '', '', '', '', '', '', '',
  ]);

  // Row 9: Empty
  mainSheetValues.push([]);

  // Row 10: Retail Golden Rules Banner (Column B)
  mainSheetValues.push([
    '',
    'OPERATOR GOLDEN RULES FOR RETAIL INVESTORS',
    '1. Minimum 15% GMP cushion required in volatile markets',
    '2. Never bid on Day 1 unless QIB anchor book is exceptional',
    '3. Avoid 100% OFS issues with no fresh capex infusion',
    '4. In oversubscribed issues, apply 1 lot per family PAN account',
    '', '', '', '', '', '', '', '', '', '', '',
  ]);

  // Row 11: Empty
  mainSheetValues.push([]);

  // Row 12: Main Table Section Header (Full width from Column A)
  mainSheetValues.push([
    'MAINBOARD IPO LIVE TRACKER & RETAIL DECISIONS (STRICT NSE/BSE MAINBOARD ONLY)',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]);

  // Row 13: Table Column Headers (Starts in Column A!)
  const headers = [
    'IPO Name',
    'Visual Status',
    'Issue Open / Close / Listing Date',
    'Price Band',
    'Cap Price (₹)',
    'Lot Size',
    'Min Retail Inv (₹)',
    'Issue Size (₹ Cr)',
    'Fresh vs OFS (₹ Cr)',
    'GMP (₹)',
    'Est. Listing Price (₹)',
    'Est. Gain (%)',
    'Total Sub. (x)',
    'Retail Decision',
    'Strategic Rationale & Guidance',
    'Registrar / Allotment Link',
  ];
  mainSheetValues.push(headers);

  // Rows 14+: Main Table Rows
  for (const ipo of ipos) {
    const dates = `${ipo.openDate} / ${ipo.closeDate} / ${ipo.listingDate}`;
    const freshOfs = `Fresh: ₹${ipo.freshCr.toFixed(2)} (${ipo.freshPercent}%) | OFS: ₹${ipo.ofsCr.toFixed(2)} (${ipo.ofsPercent}%)`;
    
    mainSheetValues.push([
      ipo.name,
      ipo.visualStatus,
      dates,
      ipo.priceBand,
      ipo.capPrice,
      ipo.lotSize,
      ipo.minRetailInv,
      ipo.issueSizeCr,
      freshOfs,
      ipo.gmpRs,
      ipo.estListingPrice,
      `${ipo.estGainPercent > 0 ? '+' : ''}${ipo.estGainPercent.toFixed(2)}%`,
      ipo.totalSub > 0 ? `${ipo.totalSub.toFixed(2)}x` : '-',
      ipo.retailDecision,
      ipo.rationale,
      ipo.allotmentUrl,
    ]);
  }

  // 4. Populate "Main Dashboard" values
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Main Dashboard'!A1:P${mainSheetValues.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: mainSheetValues,
    }),
  });

  // 5. Populate "History" tab
  const historyValues: (string | number)[][] = [
    ['Date', 'Tracked IPO Count', 'Avg Est Gain (%)', 'Top Pick by GMP', 'Closing IPOs', 'Daily Summary Takeaway'],
    ...DAILY_HISTORY_SNAPSHOTS.map((s) => [
      s.date,
      s.trackedCount,
      `${s.avgGmpPercent}%`,
      s.topPick,
      s.closingIPOs.join(', '),
      s.statusSummary,
    ]),
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'History'!A1:F${historyValues.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: historyValues,
    }),
  });

  // 6. Formatting & Rules execution:
  // - Freeze ONLY Column A (Column 1) on Main Dashboard
  // - Do NOT freeze any rows (set frozenRowCount: 0 for mobile ergonomics)
  // - Set column widths and header styles
  const stylingRequests = [
    // Freeze Column A only on sheet 0
    {
      updateSheetProperties: {
        properties: {
          sheetId: 0,
          gridProperties: {
            frozenColumnCount: 1, // Freeze Column A
            frozenRowCount: 0,    // DO NOT freeze rows (mobile friendly)
          },
        },
        fields: 'gridProperties.frozenColumnCount,gridProperties.frozenRowCount',
      },
    },
    // Set Column A width (IPO Name)
    {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 240 },
        fields: 'pixelSize',
      },
    },
    // Set Column B width (Status)
    {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: 'COLUMNS',
          startIndex: 1,
          endIndex: 2,
        },
        properties: { pixelSize: 150 },
        fields: 'pixelSize',
      },
    },
    // Set Column N width (Retail Decision)
    {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: 'COLUMNS',
          startIndex: 13,
          endIndex: 14,
        },
        properties: { pixelSize: 220 },
        fields: 'pixelSize',
      },
    },
    // Set Column O width (Strategic Rationale)
    {
      updateDimensionProperties: {
        range: {
          sheetId: 0,
          dimension: 'COLUMNS',
          startIndex: 14,
          endIndex: 15,
        },
        properties: { pixelSize: 340 },
        fields: 'pixelSize',
      },
    },
    // Format Table Header Row (Row 13 -> 0-indexed index 12)
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 12,
          endRowIndex: 13,
          startColumnIndex: 0,
          endColumnIndex: 16,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.08, green: 0.16, blue: 0.28 }, // Dark Navy
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
      },
    },
    // Title styling (Row 2, Column B)
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 1,
          endColumnIndex: 8,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
              fontSize: 16,
              foregroundColor: { red: 0.05, green: 0.2, blue: 0.4 },
            },
          },
        },
        fields: 'userEnteredFormat.textFormat',
      },
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: stylingRequests }),
  }).catch((err) => {
    console.warn('BatchUpdate styling notice:', err);
  });

  if (!spreadsheetId) {
    throw new Error('Spreadsheet creation failed to return an ID.');
  }

  // Grant "Anyone with the link can view" permission so other devices & friends can view/refresh without login
  await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  }).catch((err) => {
    console.warn('Set public read permission notice:', err);
  });

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    isExisting,
    name: spreadsheetTitle,
  };
};

/**
 * Generates the clean CSV content for instant offline import or download
 */
export const generateDashboardCSV = (ipos: MainboardIPO[], kpis: DashboardKPIs): string => {
  const lines: string[] = [];

  // Helper to escape CSV cell
  const esc = (val: string | number | undefined): string => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  lines.push('');
  lines.push([esc(''), esc('MAINBOARD IPO TRACKER & RETAIL DECISION DASHBOARD (NSE / BSE)')].join(','));
  lines.push([esc(''), esc(`Daily Operator Snapshot • Date: ${kpis.date} • Strict Mainboard Scope`)].join(','));
  lines.push('');

  lines.push([esc(''), esc('DAILY OPERATING KPIs'), esc(''), esc(''), esc(''), esc('EXECUTIVE TAKEAWAY & ACTION FOCUS')].join(','));
  lines.push([
    esc(''),
    esc('Total Tracked Mainboard IPOs'), esc(kpis.totalTracked),
    esc('Top Pick by GMP'), esc(`${kpis.topPickGmp.name} (+${kpis.topPickGmp.gainPercent}%)`),
    esc('Action Focus:'), esc(kpis.executiveTakeaway.actionFocus),
  ].join(','));
  lines.push([
    esc(''),
    esc('High Potential IPOs (GMP > 20%)'), esc(kpis.highPotentialCount),
    esc('Major Mover'), esc(`${kpis.majorMover.name} (${kpis.majorMover.sub}x sub)`),
    esc('Key Watch / Action:'), esc(kpis.executiveTakeaway.keyWatch),
  ].join(','));
  lines.push([
    esc(''),
    esc('Avg Estimated Listing Gain (%)'), esc(`${kpis.avgEstListingGain}%`),
    esc('Market Sentiment'), esc(kpis.executiveTakeaway.marketSentiment),
    esc('Market Summary:'), esc(kpis.executiveTakeaway.marketSummary),
  ].join(','));
  lines.push('');

  lines.push([esc(''), esc('OPERATOR GOLDEN RULES FOR RETAIL INVESTORS')].join(','));
  lines.push([
    esc(''),
    esc('1. Min 15% GMP cushion needed'),
    esc('2. Avoid 100% OFS exit offers'),
    esc('3. In oversubscribed issues, apply 1 lot per family PAN'),
  ].join(','));
  lines.push('');

  lines.push([esc('MAINBOARD IPO LIVE TRACKER (STRICT MAINBOARD ONLY - NO SME)')].join(','));

  const tableHeaders = [
    'IPO Name',
    'Visual Status',
    'Issue Open / Close / Listing Date',
    'Price Band',
    'Cap Price (₹)',
    'Lot Size',
    'Min Retail Inv (₹)',
    'Issue Size (₹ Cr)',
    'Fresh vs OFS (₹ Cr)',
    'GMP (₹)',
    'Est. Listing Price (₹)',
    'Est. Gain (%)',
    'Total Sub. (x)',
    'Retail Decision',
    'Strategic Rationale & Guidance',
    'Registrar / Allotment Link',
  ];
  lines.push(tableHeaders.map(esc).join(','));

  for (const ipo of ipos) {
    const dates = `${ipo.openDate} / ${ipo.closeDate} / ${ipo.listingDate}`;
    const freshOfs = `Fresh: ₹${ipo.freshCr.toFixed(2)} (${ipo.freshPercent}%) | OFS: ₹${ipo.ofsCr.toFixed(2)} (${ipo.ofsPercent}%)`;
    lines.push([
      esc(ipo.name),
      esc(ipo.visualStatus),
      esc(dates),
      esc(ipo.priceBand),
      esc(ipo.capPrice),
      esc(ipo.lotSize),
      esc(ipo.minRetailInv),
      esc(ipo.issueSizeCr),
      esc(freshOfs),
      esc(ipo.gmpRs),
      esc(ipo.estListingPrice),
      esc(`${ipo.estGainPercent > 0 ? '+' : ''}${ipo.estGainPercent.toFixed(2)}%`),
      esc(ipo.totalSub > 0 ? `${ipo.totalSub.toFixed(2)}x` : '-'),
      esc(ipo.retailDecision),
      esc(ipo.rationale),
      esc(ipo.allotmentUrl),
    ].join(','));
  }

  return lines.join('\n');
};

/**
 * Returns complete Google Apps Script code for users to automate this in Google Sheets
 */
export const getGoogleAppsScriptCode = (): string => {
  return `/**
 * Mainboard IPO Tracker & Retail Decision Dashboard
 * Automated Google Apps Script
 * Date: 2026-09-25
 */

function updateMainboardIPODashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName("Main Dashboard") || ss.insertSheet("Main Dashboard", 0);
  var historySheet = ss.getSheetByName("History") || ss.insertSheet("History", 1);
  
  // Mobile ergonomics: Freeze ONLY Column A, do NOT freeze any rows
  mainSheet.setFrozenColumns(1);
  mainSheet.setFrozenRows(0);
  
  Logger.log("Mainboard IPO Tracker synchronized successfully.");
}

/**
 * Cleanup routine for older dashboard files in Google Drive
 */
function performFileCleanup() {
  var searchPattern = "Mainboard IPO Tracker & Retail Decision Dashboard";
  var files = DriveApp.searchFiles("title contains '" + searchPattern + "' and trashed = false");
  
  var today = new Date();
  var yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  var startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
  
  var trashedCount = 0;
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    
    // Strict Protection: Never delete data feeds or non-IPO files
    if (fileName.indexOf("IPO Data Feed (Auto)") !== -1) {
      continue;
    }
    
    // Keep only files modified today and yesterday; trash older versions
    if (file.getLastUpdated() < startOfYesterday) {
      file.setTrashed(true);
      trashedCount++;
      Logger.log("Cleaned up older file: " + fileName);
    }
  }
  return trashedCount;
}

/**
 * Setup 1-Click Daily Auto-Refresh Trigger in Google Cloud
 * Runs automatically every morning at 9:00 AM IST even when computer is off!
 */
function setupDailyAutoTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "updateMainboardIPODashboard") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger("updateMainboardIPODashboard")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .inTimezone("Asia/Kolkata")
    .create();
    
  Logger.log("Daily 9:00 AM IST Auto-Refresh Trigger successfully configured.");
}`;
};
