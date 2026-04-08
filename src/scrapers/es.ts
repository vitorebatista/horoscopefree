// ES scraper — 20minutos.es adapter
// SCRAPE-03: Spanish horoscope source
// SCRAPE-04: canonical sign -> ES slug mapping (D-08, D-09)
// SCRAPE-06: validate text non-empty AND length >= 50 (via shared MIN_TEXT_LENGTH)
// SCRAPE-07: User-Agent + per-source throttle (via shared throttle factory)
// D-09:      verbatim slugs from source (comment below)
// D-10:      fail clean (no multi-source fallback)
// D-11:      trust Response.text() charset decoding
// D-12:      source = full upstream URL
// D-13:      independent throttle, never blocks EN or PT
// Source URL pattern: https://www.20minutos.es/horoscopo/{slug}/
// Slug mapping: 'taurus' -> 'tauro', 'gemini' -> 'geminis', 'scorpio' -> 'escorpio',
//   'sagittarius' -> 'sagitario' (one 't'), 'aquarius' -> 'acuario', 'pisces' -> 'piscis'
// Archive: full archive >= 9 days embedded in page (NO D-04 today-guard needed)
// Extraction: second .prediction div -> find p.date matching target date -> next div sibling
// Date format on page: "{D}  {monthName} de {YYYY}" (double space between day and month name)
import * as cheerio from 'cheerio';
import type { HoroscopeScraper } from './interface.js';
import type { HoroscopeResult, ZodiacSign } from '../types.js';
import { HoroscopeError } from '../types.js';
import { createThrottledFetch, MIN_TEXT_LENGTH } from './shared.js';

// D-08: SIGN_SLUG is local to this scraper (NOT shared from types.ts)
// D-09: slugs are verbatim from source URLs (see 02-RESEARCH.md)
// URL: https://www.20minutos.es/horoscopo/{slug}/
// Notable: 'taurus'->'tauro', 'gemini'->'geminis', 'scorpio'->'escorpio',
//   'sagittarius'->'sagitario' (one 't'), 'aquarius'->'acuario', 'pisces'->'piscis'
const SIGN_SLUG: Record<ZodiacSign, string> = {
  aries: 'aries',
  taurus: 'tauro',
  gemini: 'geminis',
  cancer: 'cancer',
  leo: 'leo',
  virgo: 'virgo',
  libra: 'libra',
  scorpio: 'escorpio',
  sagittarius: 'sagitario',
  capricorn: 'capricornio',
  aquarius: 'acuario',
  pisces: 'piscis',
};

// Spanish month names for date-string matching (D-03 / 02-RESEARCH.md archive strategy)
const MONTH_NAMES: Record<number, string> = {
  1: 'enero',
  2: 'febrero',
  3: 'marzo',
  4: 'abril',
  5: 'mayo',
  6: 'junio',
  7: 'julio',
  8: 'agosto',
  9: 'septiembre',
  10: 'octubre',
  11: 'noviembre',
  12: 'diciembre',
};

// D-13: own throttle, independent from EN and PT.
const throttledFetch = createThrottledFetch('es-ES,es;q=0.9');

/**
 * Convert a YYYY-MM-DD date string to the Spanish date format used by 20minutos.es.
 * Format: "{D}  {monthName} de {YYYY}" (double space between day number and month name).
 * Example: "2026-04-06" -> "6  abril de 2026"
 */
function toSpanishDateString(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const monthName = MONTH_NAMES[month];
  // Remove leading zero from day: "06" -> "6"
  return `${day}  ${monthName} de ${year}`;
}

/**
 * Build the 20minutos.es URL for a given sign.
 * The same URL is used for all dates — the page embeds a rolling ~9-day archive,
 * so date-based extraction happens in `extractText(html, date)`.
 * URL pattern: https://www.20minutos.es/horoscopo/{slug}/
 */
export function buildUrl(sign: ZodiacSign): string {
  const slug = SIGN_SLUG[sign];
  return `https://www.20minutos.es/horoscopo/${slug}/`;
}

/**
 * Extract horoscope text from 20minutos.es HTML.
 * Strategy: second .prediction div -> find p.date matching date (Spanish format) -> next div.
 * If date omitted: returns the most recent entry (first p.date).
 * D-10: No fallback. D-12: min 50 chars. Throws PARSE or NETWORK on failure.
 */
export function extractText(html: string, date?: string): string {
  const $ = cheerio.load(html);

  // The second .prediction div contains the dated horoscope archive.
  const archiveDiv = $('.prediction').eq(1);

  if (date !== undefined) {
    // Archive lookup: find the p.date element matching the requested date.
    const targetDateStr = toSpanishDateString(date);
    let found = false;
    let text = '';

    archiveDiv.find('p.date').each((_i, el) => {
      if (found) return false; // exit .each loop early
      const dateText = $(el).text().trim();
      if (dateText.includes(targetDateStr)) {
        found = true;
        // The horoscope text is in the next sibling div
        text = $(el).next('div').text().trim();
        return false; // exit loop
      }
    });

    if (!found || text.length < MIN_TEXT_LENGTH) {
      if (!found) {
        throw new HoroscopeError(
          'NETWORK',
          `ES date ${date} not found in 20minutos.es archive. The archive window is ~9 days.`,
        );
      }
      throw new HoroscopeError(
        'PARSE',
        `Could not extract ES horoscope text >= ${MIN_TEXT_LENGTH} chars from 20minutos.es page`,
      );
    }
    return text;
  }

  // No date: return the first (most recent) entry
  const firstDateEl = archiveDiv.find('p.date').first();
  const primary = firstDateEl.next('div').text().trim();

  if (primary.length >= MIN_TEXT_LENGTH) {
    return primary;
  }
  throw new HoroscopeError(
    'PARSE',
    `Could not extract ES horoscope text >= ${MIN_TEXT_LENGTH} chars from 20minutos.es page`,
  );
}

export class EsScraper implements HoroscopeScraper {
  async scrape(sign: ZodiacSign, date: string): Promise<HoroscopeResult> {
    // No D-04 today-guard: 20minutos.es supports archive >= 9 days (per 02-RESEARCH.md)

    const url = buildUrl(sign);
    const response = await throttledFetch(url);

    if (!response.ok) {
      throw new HoroscopeError(
        'NETWORK',
        `HTTP ${response.status} ${response.statusText} from ${url}`,
      );
    }

    const html = await response.text();
    const text = extractText(html, date); // throws PARSE or NETWORK if extraction fails

    return {
      sign,
      date,
      language: 'es',
      text,
      source: url, // D-12: full upstream URL
      cached: false,
    };
  }
}
