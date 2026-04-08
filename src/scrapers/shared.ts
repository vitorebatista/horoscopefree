// Shared scraper primitives — constants and a throttled-fetch factory.
// Each scraper imports `createThrottledFetch(acceptLanguage)` once at module
// load and gets back a closure with its OWN `nextAllowedAt` state. This
// preserves D-13 (independent per-source throttles) while eliminating ~20
// lines of copy-paste per adapter.
import { HoroscopeError } from '../types.js';

// Shared User-Agent — every scraper sends the same desktop Chrome string.
export const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Phase 1 / SCRAPE-06 floor for "this looks like a real horoscope, not a stub".
export const MIN_TEXT_LENGTH = 50;

// Per-request fetch deadline.
export const REQUEST_TIMEOUT_MS = 10_000;

// Default minimum gap between consecutive requests to the same upstream.
// SCRAPE-07 (EN) and D-14 (PT/ES) both land on 1000ms.
export const DEFAULT_THROTTLE_MS = 1000;

const ACCEPT_HEADER =
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

/**
 * Build a throttled fetch closure for a single upstream source.
 *
 * Each call returns a fresh function with its own `nextAllowedAt` timer, so
 * three scrapers calling this factory at module load get three independent
 * throttles (D-13 — EN must not block PT or ES).
 *
 * The returned function:
 *  - waits until `nextAllowedAt` before issuing the request
 *  - sets a `REQUEST_TIMEOUT_MS` AbortSignal
 *  - sends the shared `User-Agent` and the per-source `Accept-Language`
 *  - wraps any fetch reject (DNS, refused, timeout) in `HoroscopeError('NETWORK', ...)`
 */
export function createThrottledFetch(
  acceptLanguage: string,
  throttleMs: number = DEFAULT_THROTTLE_MS,
): (url: string) => Promise<Response> {
  let nextAllowedAt = 0;
  return async function throttledFetch(url: string): Promise<Response> {
    const now = Date.now();
    const wait = nextAllowedAt - now;
    if (wait > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    nextAllowedAt = Date.now() + throttleMs;
    try {
      return await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'User-Agent': USER_AGENT,
          Accept: ACCEPT_HEADER,
          'Accept-Language': acceptLanguage,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HoroscopeError('NETWORK', `Fetch failed for ${url}: ${message}`);
    }
  };
}
