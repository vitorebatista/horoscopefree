// Live smoke test — only runs with SCRAPE_LIVE=1
// Usage: SCRAPE_LIVE=1 yarn vitest run test/live
// CI does NOT run this; local devs run it before releases.
import { describe, it, expect } from 'vitest';
import { EnScraper } from '../../src/scrapers/en.js';

const isLive = !!process.env.SCRAPE_LIVE;

describe.skipIf(!isLive)('Live EN scraper smoke test', () => {
  it(
    'fetches aries for a known past date from horoscope.com',
    async () => {
      const scraper = new EnScraper();
      const result = await scraper.scrape('aries', '2026-01-15');
      expect(result.sign).toBe('aries');
      expect(result.date).toBe('2026-01-15');
      expect(result.language).toBe('en');
      expect(result.cached).toBe(false);
      expect(result.text.length).toBeGreaterThanOrEqual(50);
      expect(result.source).toContain('sign=1');
      expect(result.source).toContain('laDate=20260115');
    },
    15_000,
  );
});
