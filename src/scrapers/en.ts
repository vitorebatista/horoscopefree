// EN scraper — horoscope.com adapter
// SCRAPE-01: URL pattern sign={1-12}&laDate={YYYYMMDD}
// SCRAPE-04: canonical sign → numeric mapping
// SCRAPE-05: primary CSS selector + ChatWidget.init fallback
// SCRAPE-06: validate text non-empty AND length >= 50
// SCRAPE-07: User-Agent + 1000ms inter-request throttle (via shared throttle factory)
// D-12:      source = full upstream URL
import * as cheerio from 'cheerio';
import type { HoroscopeScraper } from './interface.js';
import type { HoroscopeResult, ZodiacSign } from '../types.js';
import { HoroscopeError } from '../types.js';
import { createThrottledFetch, MIN_TEXT_LENGTH } from './shared.js';

const SIGN_TO_NUMBER: Record<ZodiacSign, number> = {
  aries: 1,
  taurus: 2,
  gemini: 3,
  cancer: 4,
  leo: 5,
  virgo: 6,
  libra: 7,
  scorpio: 8,
  sagittarius: 9,
  capricorn: 10,
  aquarius: 11,
  pisces: 12,
};

// horoscope.com prefixes every paragraph with the date in the form "Jan 15, 2026 - ".
// The date is already exposed as a top-level field on HoroscopeResult, so strip it from the text.
const DATE_PREFIX_RE =
  /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},\s*\d{4}\s*[-–—]\s*/;

function stripLeadingDate(text: string): string {
  return text.replace(DATE_PREFIX_RE, '');
}

// D-13: own throttle, independent from PT and ES.
const throttledFetch = createThrottledFetch('en-US,en;q=0.5');

/**
 * Build the horoscope.com archive URL for a given sign and date.
 * Date input is YYYY-MM-DD (e.g., "2026-01-15"); URL needs YYYYMMDD (e.g., "20260115").
 */
export function buildUrl(sign: ZodiacSign, date: string): string {
  const signNum = SIGN_TO_NUMBER[sign];
  const compactDate = date.replace(/-/g, ''); // 2026-01-15 → 20260115
  return `https://www.horoscope.com/us/horoscopes/general/horoscope-archive.aspx?sign=${signNum}&laDate=${compactDate}`;
}

/**
 * Extract horoscope text from horoscope.com HTML.
 *
 * Primary: div.main-horoscope > p (first paragraph, trimmed).
 * Fallback: ChatWidget.init({...}) JSON regex if primary returns empty or < 50 chars.
 * Validation: text length must be >= 50 chars (Discretion in CONTEXT.md).
 *
 * Exported for direct testing with fixture HTML.
 */
export function extractText(html: string): string {
  const $ = cheerio.load(html);

  // Primary path: div.main-horoscope > p
  // Use .first() because the page may have multiple paragraphs (Pitfall 6).
  const primary = stripLeadingDate($('div.main-horoscope > p').first().text().trim());
  if (primary.length >= MIN_TEXT_LENGTH) {
    return primary;
  }

  // Fallback: ChatWidget.init JSON object regex
  // The exact field name is verified during fixture recording (RESEARCH.md A1).
  // We try multiple plausible keys: horoscopeText, text, content.
  const match = html.match(/ChatWidget\.init\s*\(\s*(\{[\s\S]*?\})\s*\)/);
  if (match) {
    try {
      const data = JSON.parse(match[1]) as Record<string, unknown>;
      const candidates = [data.horoscopeText, data.text, data.content];
      for (const candidate of candidates) {
        if (typeof candidate === 'string') {
          const trimmed = stripLeadingDate(candidate.trim());
          if (trimmed.length >= MIN_TEXT_LENGTH) return trimmed;
        }
      }
    } catch {
      // JSON.parse failed — fall through to ParseError
    }
  }

  throw new HoroscopeError(
    'PARSE',
    `Could not extract horoscope text >= ${MIN_TEXT_LENGTH} chars from page`,
  );
}

export class EnScraper implements HoroscopeScraper {
  async scrape(sign: ZodiacSign, date: string): Promise<HoroscopeResult> {
    const url = buildUrl(sign, date);
    const response = await throttledFetch(url);

    if (!response.ok) {
      throw new HoroscopeError(
        'NETWORK',
        `HTTP ${response.status} ${response.statusText} from ${url}`,
      );
    }

    const html = await response.text();
    const text = extractText(html); // throws PARSE if extraction fails

    return {
      sign,
      date,
      language: 'en',
      text,
      source: url, // D-12: full upstream URL
      cached: false,
    };
  }
}
