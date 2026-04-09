import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { getHoroscope, __setScraperForTest } from '../src/service.js';
import { HoroscopeError, type HoroscopeResult } from '../src/types.js';
import { cacheKey } from '../src/cache.js';
import type { HoroscopeScraper } from '../src/scrapers/interface.js';

let tempRoot: string;
let originalEnv: string | undefined;
let restoreScraper: () => void = () => {};

function makeResult(overrides: Partial<HoroscopeResult> = {}): HoroscopeResult {
  return {
    sign: 'aries',
    date: '2026-01-15',
    language: 'en',
    text: 'A wonderfully long horoscope passage that exceeds fifty characters easily.',
    source:
      'https://www.horoscope.com/us/horoscopes/general/horoscope-archive.aspx?sign=1&laDate=20260115',
    cached: false,
    ...overrides,
  };
}

beforeEach(async () => {
  tempRoot = join(tmpdir(), `horoscope-svc-test-${randomBytes(6).toString('hex')}`);
  await fs.mkdir(tempRoot, { recursive: true });
  originalEnv = process.env.HOROSCOPE_CACHE_DIR;
  process.env.HOROSCOPE_CACHE_DIR = tempRoot;
});

afterEach(async () => {
  restoreScraper();
  restoreScraper = () => {};
  if (originalEnv === undefined) {
    delete process.env.HOROSCOPE_CACHE_DIR;
  } else {
    process.env.HOROSCOPE_CACHE_DIR = originalEnv;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
});

function installMockScraper(scrape: HoroscopeScraper['scrape']) {
  const mock: HoroscopeScraper = { scrape };
  restoreScraper = __setScraperForTest('en', mock);
  return mock;
}

describe('getHoroscope — validation', () => {
  it('rejects bad date shape with VALIDATION', async () => {
    await expect(getHoroscope('aries', '2026/04/06', 'en')).rejects.toMatchObject({
      name: 'HoroscopeError',
      code: 'VALIDATION',
    });
  });

  it('rejects calendar-invalid date 2025-02-30 with VALIDATION', async () => {
    await expect(getHoroscope('aries', '2025-02-30', 'en')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('rejects calendar-invalid date 2026-13-01 with VALIDATION', async () => {
    await expect(getHoroscope('aries', '2026-13-01', 'en')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('rejects future date with VALIDATION', async () => {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await expect(getHoroscope('aries', future, 'en')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('rejects invalid sign with VALIDATION', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(getHoroscope('libraa' as any, '2026-01-15', 'en')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('rejects invalid language with NOT_FOUND', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(getHoroscope('aries', '2026-01-15', 'fr' as any)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('getHoroscope — cache-aside flow', () => {
  it('cache miss → scrapes once → writes file → returns cached:false', async () => {
    const scrape = vi.fn(async () => makeResult());
    installMockScraper(scrape);

    const result = await getHoroscope('aries', '2026-01-15', 'en');

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(result.cached).toBe(false);
    expect(result.text.length).toBeGreaterThanOrEqual(50);

    // Cache file should now exist on disk
    const path = cacheKey('en', 'aries', '2026-01-15');
    await expect(fs.access(path)).resolves.toBeUndefined();
  });

  it('cache hit → scraper NOT called → returns cached:true', async () => {
    const scrape = vi.fn(async () => makeResult());
    installMockScraper(scrape);

    // Prime cache
    await getHoroscope('aries', '2026-01-15', 'en');
    expect(scrape).toHaveBeenCalledTimes(1);

    // Second call → hit
    const result = await getHoroscope('aries', '2026-01-15', 'en');
    expect(scrape).toHaveBeenCalledTimes(1); // unchanged
    expect(result.cached).toBe(true);
  });
});

describe('getHoroscope — error re-throwing (D-13)', () => {
  it('re-throws scraper HoroscopeError(NETWORK) without writing cache', async () => {
    const scrape = vi.fn(async () => {
      throw new HoroscopeError('NETWORK', 'down');
    });
    installMockScraper(scrape);

    await expect(getHoroscope('aries', '2026-01-15', 'en')).rejects.toMatchObject({
      code: 'NETWORK',
      message: 'down',
    });

    // No cache file should have been written
    const path = cacheKey('en', 'aries', '2026-01-15');
    await expect(fs.access(path)).rejects.toThrow();
  });

  it('wraps non-HoroscopeError exceptions as HoroscopeError(NETWORK)', async () => {
    const scrape = vi.fn(async () => {
      throw new Error('boom');
    });
    installMockScraper(scrape);

    const promise = getHoroscope('aries', '2026-01-15', 'en');
    await expect(promise).rejects.toBeInstanceOf(HoroscopeError);
    await expect(promise).rejects.toMatchObject({
      code: 'NETWORK',
    });
    await expect(promise).rejects.toThrow(/boom/);
  });

  it('re-throws scraper HoroscopeError(PARSE) without writing cache', async () => {
    const scrape = vi.fn(async () => {
      throw new HoroscopeError('PARSE', 'no selector match');
    });
    installMockScraper(scrape);

    await expect(getHoroscope('aries', '2026-01-15', 'en')).rejects.toMatchObject({
      code: 'PARSE',
    });

    const path = cacheKey('en', 'aries', '2026-01-15');
    await expect(fs.access(path)).rejects.toThrow();
  });
});

describe('getHoroscope — PT (phase 2)', () => {
  it('routes pt to PtScraper and returns a pt-labeled result', async () => {
    const mockScraper = {
      async scrape() {
        return {
          sign: 'aries' as const,
          date: '2026-04-08',
          language: 'pt' as const,
          text: 'Hoje você terá uma manhã cheia de clareza inesperada para sua rotina matinal.',
          source: 'https://joaobidu.com.br/horoscopo-do-dia/horoscopo-do-dia-para-aries/',
          cached: false,
        };
      },
    };
    restoreScraper = __setScraperForTest('pt', mockScraper);

    const result = await getHoroscope('aries', '2026-04-08', 'pt');
    expect(result.language).toBe('pt');
    expect(result.sign).toBe('aries');
    expect(result.date).toBe('2026-04-08');
    expect(result.cached).toBe(false);
    expect(result.text.length).toBeGreaterThanOrEqual(50);
  });

  it('returns cached:true on second call for pt', async () => {
    const scrape = vi.fn(async () => ({
      sign: 'aries' as const,
      date: '2026-04-08',
      language: 'pt' as const,
      text: 'Hoje você terá uma manhã cheia de clareza inesperada para sua rotina matinal.',
      source: 'https://joaobidu.com.br/horoscopo-do-dia/horoscopo-do-dia-para-aries/',
      cached: false,
    }));
    restoreScraper = __setScraperForTest('pt', { scrape });

    await getHoroscope('aries', '2026-04-08', 'pt');
    expect(scrape).toHaveBeenCalledTimes(1);

    const cached = await getHoroscope('aries', '2026-04-08', 'pt');
    expect(scrape).toHaveBeenCalledTimes(1); // unchanged — served from cache
    expect(cached.cached).toBe(true);
  });

  it('returns NOT_FOUND for unsupported language fr', async () => {
    await expect(
      // @ts-expect-error — fr is not in the Language union
      getHoroscope('aries', '2026-04-08', 'fr'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('getHoroscope — ES (phase 2)', () => {
  it('routes es to EsScraper and returns an es-labeled result', async () => {
    const mockScraper = {
      async scrape() {
        return {
          sign: 'aries' as const,
          date: '2026-04-06',
          language: 'es' as const,
          text: 'Hoy tendrás una mañana llena de claridad inesperada para tu rutina matutina positiva.',
          source: 'https://www.20minutos.es/horoscopo/aries/',
          cached: false,
        };
      },
    };
    restoreScraper = __setScraperForTest('es', mockScraper);

    const result = await getHoroscope('aries', '2026-04-06', 'es');
    expect(result.language).toBe('es');
    expect(result.sign).toBe('aries');
    expect(result.date).toBe('2026-04-06');
    expect(result.cached).toBe(false);
    expect(result.text.length).toBeGreaterThanOrEqual(50);
  });

  it('returns cached:true on second call for es', async () => {
    const scrape = vi.fn(async () => ({
      sign: 'aries' as const,
      date: '2026-04-06',
      language: 'es' as const,
      text: 'Hoy tendrás una mañana llena de claridad inesperada para tu rutina matutina positiva.',
      source: 'https://www.20minutos.es/horoscopo/aries/',
      cached: false,
    }));
    restoreScraper = __setScraperForTest('es', { scrape });

    await getHoroscope('aries', '2026-04-06', 'es');
    expect(scrape).toHaveBeenCalledTimes(1);

    const cached = await getHoroscope('aries', '2026-04-06', 'es');
    expect(scrape).toHaveBeenCalledTimes(1); // unchanged — served from cache
    expect(cached.cached).toBe(true);
  });

  it('all three languages (en, pt, es) are registered in the scrapers registry', async () => {
    // Smoke-test registry by mocking each language and calling getHoroscope.
    const makeMockScraper = (lang: 'en' | 'pt' | 'es') => ({
      async scrape() {
        return {
          sign: 'aries' as const,
          date: '2026-04-06',
          language: lang,
          text: `Mock horoscope text for ${lang} that is definitely longer than fifty characters for validation.`,
          source: `https://mock.example/${lang}`,
          cached: false,
        } as const;
      },
    });

    const restoreEn = __setScraperForTest('en', makeMockScraper('en'));
    const restorePt = __setScraperForTest('pt', makeMockScraper('pt'));
    const restoreEs = __setScraperForTest('es', makeMockScraper('es'));
    try {
      const en = await getHoroscope('aries', '2026-04-06', 'en');
      const pt = await getHoroscope('aries', '2026-04-06', 'pt');
      const es = await getHoroscope('aries', '2026-04-06', 'es');
      expect(en.language).toBe('en');
      expect(pt.language).toBe('pt');
      expect(es.language).toBe('es');
    } finally {
      restoreEn();
      restorePt();
      restoreEs();
    }
  });
});
