// Live PT smoke test — only runs with SCRAPE_LIVE=1
// Usage: SCRAPE_LIVE=1 yarn vitest run test/live
// CI does NOT run this; local devs run it before releases.
import { describe, it, expect } from 'vitest';
import { PtScraper } from '../../src/scrapers/pt.js';

const isLive = !!process.env.SCRAPE_LIVE;

describe.skipIf(!isLive)('Live PT scraper smoke test', () => {
  it(
    'fetches aries from the PT source for today UTC',
    async () => {
      const scraper = new PtScraper();
      const todayUtc = new Date().toISOString().slice(0, 10);
      const result = await scraper.scrape('aries', todayUtc);
      expect(result.sign).toBe('aries');
      expect(result.date).toBe(todayUtc);
      expect(result.language).toBe('pt');
      expect(result.cached).toBe(false);
      expect(result.text.length).toBeGreaterThanOrEqual(50);
      expect(result.text).toMatch(/[áéíóúãõçâêô]/); // PT diacritic present
      expect(result.source).toMatch(/^https?:\/\//);
      expect(result.source).toContain('joaobidu.com.br');
    },
    15_000,
  );
});
