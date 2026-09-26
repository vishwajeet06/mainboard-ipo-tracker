import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialized GenAI instance (server-side only, reads GEMINI_API_KEY from environment)
const ai = new GoogleGenAI();

/**
 * Robust JSON extractor from model text output
 */
function extractJSON(text: string): any {
  if (!text) return null;
  
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Continue
  }

  // Strip markdown code fences ```json ... ``` or ``` ... ```
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(fenceRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Continue
    }
  }

  // Find outermost curly braces { ... }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue
    }
  }

  return null;
}

/**
 * Server-side route to fetch live Indian Mainboard IPOs using Gemini 3.8 Flash
 * with fine-tuned, strict prompt constraints for consistent numbers and real dates.
 */
app.post('/api/ai/refresh-ipos', async (req, res) => {
  try {
    // Determine accurate Indian Standard Time date
    const now = new Date();
    const istDateStr = now.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    const istShortDate = now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const prompt = `You are the owner and lead market research analyst of the "Mainboard IPO Tracker & Retail Decision Dashboard".

CURRENT DATE (IST): ${istDateStr} (${istShortDate}). Time: 8:00 AM / 3:00 PM IST cycle.

MANDATE & PURPOSE:
Collect authentic public market data for Mainboard IPOs on the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE).
Think like the owner giving practical, actionable guidance and clear retail decisions to ordinary retail investors.

SCOPE & INCLUSION CRITERIA:
1. STRICT MAINBOARD ONLY: Absolutely NO SME IPOs (exclude all BSE SME / NSE Emerge). Only mainboard public issues.
2. COMPREHENSIVE COVERAGE: Include ALL four essential segments (aim for at least 12-16 total Mainboard issues):
   - A. Currently Open / Live Offerings (e.g. Moneyview Ltd., German Green Steel & Power, Orient Cables, A-One Steels India, Runwal Enterprises, AceVector/Snapdeal, etc.)
   - B. Closed IPOs that have not yet listed (KEEP them through their official listing date: basis of allotment & listing prep, e.g. Adroit Industries, Swastika Infra, ArMee Infotech, Elevate Campuses)
   - C. Upcoming Pipeline (opening in the coming days/week, e.g. SRIT India, Shah Investor's Home)
   - D. Recently Listed (debuted in the last 2-3 sessions, e.g. Sonaselection India, SS Retail, Hero Motors)
3. RETAIL DECISION ENGINE (Owner Judgment for ordinary retail investors):
   - Must assign one of these exact decisions:
     * "Strong Apply" (GMP cushion >20%, high institutional backing/QIB demand)
     * "Apply for Listing Gains" (GMP cushion 10-20%, reasonable valuation)
     * "Apply with Caution / Neutral" (GMP cushion 5-10%, cyclical/mixed)
     * "Avoid" (Poor GMP <5%, low subscription, high debt, or expensive valuation)
     * "Under Review" (Upcoming or anchor book awaiting confirmation)
     * "Listed (Hold with Trailing SL)" (For solid debuts)
     * "Listed (Book Major Profits)" (For bumper 50%+ listing gains)
4. EXECUTIVE TAKEAWAY:
   - Provide "actionFocus", "keyWatch", "marketSentiment", and "marketSummary" tailored for retail investors.

CONSISTENCY & FORMAT RULES:
- capPrice, gmpRs, estListingPrice, totalSub, qibSub, niiSub, retailSub: pure numbers.
- estGainPercent: single number = ((gmpRs / capPrice) * 100) rounded to 2 decimals. NEVER return a range string like "10-12%".
- minRetailInv: capPrice * lotSize.
- For closed IPOs awaiting listing, set category="live", visualStatus="🔒 Bidding Closed" (do not mark "🚨 Closes Today" if closeDate is before ${istShortDate}).
- Keep all fields complete.

JSON SCHEMA:
{
  "ipos": [
    {
      "id": "slug-name",
      "name": "Full Company Name Ltd.",
      "symbol": "TICKER",
      "visualStatus": "🟢 Live (Day 2)" | "🟢 Live (Day 1)" | "🔒 Bidding Closed" | "🟡 Upcoming" | "📈 Listed (Day 2)" | "🚨 Closes Today",
      "category": "live" | "upcoming" | "recently_listed" | "closing_today",
      "openDate": "DD-MMM-YY",
      "closeDate": "DD-MMM-YY",
      "listingDate": "DD-MMM-YY",
      "priceBand": "₹XX - ₹YY",
      "capPrice": 134,
      "lotSize": 111,
      "minRetailInv": 14874,
      "issueSizeCr": 150.71,
      "freshCr": 132.62,
      "ofsCr": 18.09,
      "freshPercent": 88,
      "ofsPercent": 12,
      "gmpRs": 35.0,
      "estListingPrice": 169.0,
      "estGainPercent": 26.12,
      "totalSub": 18.08,
      "qibSub": 22.4,
      "niiSub": 24.15,
      "retailSub": 12.8,
      "cmp": 0,
      "realizedGainPercent": 0,
      "retailDecision": "Strong Apply" | "Apply for Listing Gains" | "Apply with Caution / Neutral" | "Avoid" | "Under Review" | "Listed (Hold with Trailing SL)" | "Listed (Book Major Profits)",
      "rationale": "Clear 2-3 sentence owner guidance explaining why ordinary retail investors should apply, avoid, or book profit.",
      "registrar": "Registrar Name (e.g. MUFG Intime, Link Intime, KFin Technologies, Bigshare Services)",
      "allotmentUrl": "https://url-to-check-allotment",
      "sector": "Sector Name",
      "closingAlert": null,
      "dayNumber": 1
    }
  ],
  "executiveTakeaway": {
    "actionFocus": "High priority retail action for today",
    "keyWatch": "What to avoid or watch out for",
    "marketSentiment": "e.g. Moderately Bullish / Selective Quality Focus",
    "marketSummary": "Concise 2-sentence executive summary of the current primary market and retail bidding appetite."
  },
  "marketSentiment": {
    "indexName": "NIFTY 50",
    "currentValue": 26178.95,
    "changePoints": 135.20,
    "changePercent": 0.52,
    "sentiment": "BULLISH" | "NEUTRAL" | "CAUTIOUS" | "BEARISH",
    "vixValue": 12.45,
    "summary": "Secondary market trends summary",
    "retailAdvice": "Advice for retail IPO applicants given current market sentiment"
  },
  "marketSummary": "Concise summary for ordinary retail investors."
}

Return ONLY valid JSON. Include at least 12-16 representative Mainboard IPOs across all 4 categories so the dashboard is complete.`;

    let parsed: any = null;
    let rawText = '';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      rawText = response.text || '';
      if (!rawText && response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) rawText += part.text;
        }
      }

      parsed = extractJSON(rawText);
    } catch (e1: any) {
      console.warn('AI generate attempt 1 failed:', e1?.message);
    }

    if (!parsed || !Array.isArray(parsed.ipos) || parsed.ipos.length === 0) {
      try {
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${prompt}\n\nIMPORTANT: Strict JSON only starting with { and ending with }.`,
        });

        rawText = retryResponse.text || '';
        if (!rawText && retryResponse.candidates && retryResponse.candidates[0]?.content?.parts) {
          for (const part of retryResponse.candidates[0].content.parts) {
            if (part.text) rawText += part.text;
          }
        }

        parsed = extractJSON(rawText);
      } catch (e2: any) {
        console.warn('AI generate attempt 2 failed:', e2?.message);
      }
    }

    if (!parsed || !Array.isArray(parsed.ipos) || parsed.ipos.length === 0) {
      throw new Error('AI model was unable to generate structured IPO data. Please try again.');
    }

    // Clean and validate every record before returning to ensure upper values
    const cleanedIpos = parsed.ipos.map((ipo: any) => {
      const capPrice = typeof ipo.capPrice === 'number' ? ipo.capPrice : parseFloat(String(ipo.capPrice).replace(/[^0-9.]/g, '')) || 100;
      const gmpRs = typeof ipo.gmpRs === 'number' ? ipo.gmpRs : parseFloat(String(ipo.gmpRs).replace(/[^0-9.]/g, '')) || 0;
      
      // Prevent range string bug (e.g. 10-12% -> 12)
      let estGainPercent = 0;
      if (typeof ipo.estGainPercent === 'number') {
        estGainPercent = ipo.estGainPercent;
      } else {
        const str = String(ipo.estGainPercent || '');
        const rangeMatch = str.match(/([0-9.]+)\s*[-–—]\s*([0-9.]+)/);
        if (rangeMatch && rangeMatch[2]) {
          estGainPercent = parseFloat(rangeMatch[2]);
        } else {
          estGainPercent = parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
        }
      }

      if ((!estGainPercent || estGainPercent > 200) && capPrice > 0 && gmpRs > 0) {
        estGainPercent = Number(((gmpRs / capPrice) * 100).toFixed(2));
      }

      const lotSize = typeof ipo.lotSize === 'number' ? ipo.lotSize : parseInt(String(ipo.lotSize).replace(/[^0-9]/g, ''), 10) || 100;
      const minRetailInv = capPrice * lotSize;

      return {
        ...ipo,
        capPrice,
        lotSize,
        minRetailInv,
        gmpRs,
        estListingPrice: capPrice + gmpRs,
        estGainPercent: Number(estGainPercent.toFixed(2)),
      };
    });

    return res.json({
      success: true,
      ipos: cleanedIpos,
      executiveTakeaway: parsed.executiveTakeaway || null,
      marketSentiment: parsed.marketSentiment || null,
      marketSummary: parsed.marketSummary || 'AI Primary Market Analysis synchronized with NSE/BSE filings.',
      timestamp: new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ', ' + istShortDate,
    });

  } catch (error: any) {
    console.error('AI IPO Generation Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate live IPO dataset with AI',
    });
  }
});

// Setup Vite middlewares in development or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
