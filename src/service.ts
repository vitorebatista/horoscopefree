// Service layer — orchestrates input validation, cache-aside, and scraper invocation.
// LIB-01: exports getHoroscope as the primary library function
// LIB-05: maps all error paths to HoroscopeError with discriminated code
// D-09:   accepts date as a YYYY-MM-DD string only
// D-13:   on scraper failure re-throws NETWORK error; NEVER falls back to stale cache
// D-16:   rejects future dates as VALIDATION
// D-27 step 5
import {
  HoroscopeError,
  ZODIAC_SIGNS,
  SUPPORTED_LANGUAGES,
} from './types.js';
import type {
  HoroscopeResult,
  Language,
  ZodiacSign,
} from './types.js';
import { cacheKey, read, write } from './cache.js';
import { todayUtc } from './date.js';
import type { HoroscopeScraper } from './scrapers/interface.js';
import { EnScraper } from './scrapers/en.js';
import { PtScraper } from './scrapers/pt.js';
import { EsScraper } from './scrapers/es.js';

// Scraper registry. All three languages registered (EN plan 01-04, PT plan 02-03, ES plan 02-04).
const scrapers: Partial<Record<Language, HoroscopeScraper>> = {
  en: new EnScraper(),
  pt: new PtScraper(),
  es: new EsScraper(),
};

const ZODIAC_SET: ReadonlySet<string> = new Set<string>(ZODIAC_SIGNS);
const LANGUAGE_SET: ReadonlySet<string> = new Set<string>(SUPPORTED_LANGUAGES);

/**
 * Validates that the input string is a real calendar date in YYYY-MM-DD form.
 * Catches both shape errors (2026/04/06) and calendar errors (2026-13-40, 2025-02-30).
 */
function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  // Use UTC parsing so the round-trip is timezone-independent.
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  // Round-trip the date back to string and compare; rejects 2025-02-30 (which Date silently
  // normalizes to 2025-03-02) and any other invalid combo.
  return parsed.toISOString().slice(0, 10) === date;
}

/**
 * Public service function. Implements input validation, cache-aside, and typed-error wrapping.
 *
 * @throws HoroscopeError(VALIDATION) — bad sign, bad date format, calendar-invalid date, or future date
 * @throws HoroscopeError(NOT_FOUND) — unsupported language
 * @throws HoroscopeError(NETWORK)   — fetch failure or non-2xx HTTP from upstream
 * @throws HoroscopeError(PARSE)     — extraction failed at the scraper layer
 */
export async function getHoroscope(
  sign: ZodiacSign,
  date: string,
  language: Language,
): Promise<HoroscopeResult> {
  // Language validation BEFORE sign/date so 404 takes precedence over 400 in HTTP layer.
  if (!LANGUAGE_SET.has(language)) {
    throw new HoroscopeError('NOT_FOUND', `Unsupported language: ${String(language)}`);
  }

  if (!ZODIAC_SET.has(sign)) {
    throw new HoroscopeError(
      'VALIDATION',
      `Invalid sign: ${String(sign)}. Must be one of: ${ZODIAC_SIGNS.join(', ')}`,
    );
  }

  if (!isValidDateString(date)) {
    throw new HoroscopeError(
      'VALIDATION',
      `Invalid date format: ${date}. Expected YYYY-MM-DD with a real calendar date.`,
    );
  }

  const today = todayUtc();
  if (date > today) {
    throw new HoroscopeError(
      'VALIDATION',
      `Future date not supported: ${date} (today UTC is ${today})`,
    );
  }

  const scraper = scrapers[language];
  if (!scraper) {
    // Should be unreachable given LANGUAGE_SET check above, but defensive:
    throw new HoroscopeError('NOT_FOUND', `No scraper registered for language: ${language}`);
  }

  // Cache-aside: read first, scrape on miss, write on success.
  const key = cacheKey(language, sign, date);
  const cached = await read(key);
  if (cached) {
    return { ...cached, cached: true };
  }

  let fresh: HoroscopeResult;
  try {
    fresh = await scraper.scrape(sign, date);
  } catch (err) {
    // D-13: re-throw without falling back to stale cache.
    if (err instanceof HoroscopeError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new HoroscopeError(
      'NETWORK',
      `Unexpected scraper error for ${language}/${sign}/${date}: ${message}`,
    );
  }

  const persisted: HoroscopeResult = { ...fresh, cached: false };
  await write(key, persisted);
  return persisted;
}

/**
 * Test seam — allows test code to inject a mock scraper for a given language.
 * NOT exported from src/index.ts (internal use only).
 * Returns a restore function that puts the original scraper back.
 */
export function __setScraperForTest(
  language: Language,
  scraper: HoroscopeScraper,
): () => void {
  const original = scrapers[language];
  scrapers[language] = scraper;
  return () => {
    if (original) {
      scrapers[language] = original;
    } else {
      delete scrapers[language];
    }
  };
}
