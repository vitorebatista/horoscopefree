import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { app } from '../src/server.js';
import { __setScraperForTest } from '../src/service.js';
import { HoroscopeError, type HoroscopeResult } from '../src/types.js';
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

function installMockScraper(scrape: HoroscopeScraper['scrape']) {
  restoreScraper = __setScraperForTest('en', { scrape });
}

beforeEach(async () => {
  tempRoot = join(tmpdir(), `horoscope-srv-test-${randomBytes(6).toString('hex')}`);
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

describe('GET /horoscope/:language/:sign/:date', () => {
  it('returns 200 + HoroscopeResult on happy path', async () => {
    installMockScraper(async () => makeResult());

    const res = await app.request('/horoscope/en/aries/2026-01-15');
    expect(res.status).toBe(200);
    const body = (await res.json()) as HoroscopeResult;
    expect(body.sign).toBe('aries');
    expect(body.date).toBe('2026-01-15');
    expect(body.language).toBe('en');
    expect(body.text.length).toBeGreaterThanOrEqual(50);
    expect(body.cached).toBe(false);
  });

  it('returns 400 for invalid sign', async () => {
    const res = await app.request('/horoscope/en/libraa/2026-01-15');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('VALIDATION');
  });

  it('returns 400 for calendar-invalid date 2026-13-40', async () => {
    const res = await app.request('/horoscope/en/aries/2026-13-40');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('VALIDATION');
  });

  it('returns 400 for malformed date 2026-04-06X', async () => {
    const res = await app.request('/horoscope/en/aries/2026-04-06X');
    expect(res.status).toBe(400);
  });

  it('returns 400 for future date 2099-12-31', async () => {
    const res = await app.request('/horoscope/en/aries/2099-12-31');
    expect(res.status).toBe(400);
  });

  it('returns 404 for unsupported language fr', async () => {
    const res = await app.request('/horoscope/fr/aries/2026-01-15');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 200 for /horoscope/pt/aries/:date with mocked PtScraper', async () => {
    restoreScraper = __setScraperForTest('pt', {
      scrape: async () =>
        makeResult({
          language: 'pt',
          text: 'Hoje você terá uma manhã cheia de clareza inesperada para sua rotina matinal.',
          source: 'https://joaobidu.com.br/horoscopo-do-dia/horoscopo-do-dia-para-aries/',
        }),
    });
    const res = await app.request('/horoscope/pt/aries/2026-01-15');
    expect(res.status).toBe(200);
    const body = (await res.json()) as HoroscopeResult;
    expect(body.language).toBe('pt');
    expect(body.text.length).toBeGreaterThanOrEqual(50);
  });

  it('returns 200 for /horoscope/es/aries/:date with mocked EsScraper', async () => {
    restoreScraper = __setScraperForTest('es', {
      scrape: async () =>
        makeResult({
          language: 'es',
          text: 'Hoy tendrás una mañana llena de claridad inesperada para tu rutina matutina positiva.',
          source: 'https://www.20minutos.es/horoscopo/aries/',
        }),
    });
    const res = await app.request('/horoscope/es/aries/2026-01-15');
    expect(res.status).toBe(200);
    const body = (await res.json()) as HoroscopeResult;
    expect(body.language).toBe('es');
    expect(body.text.length).toBeGreaterThanOrEqual(50);
  });

  it('returns 502 when scraper throws NETWORK error', async () => {
    installMockScraper(async () => {
      throw new HoroscopeError('NETWORK', 'upstream down');
    });
    const res = await app.request('/horoscope/en/aries/2026-01-15');
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe('NETWORK');
    expect(body.message).toContain('upstream down');
  });

  it('returns 502 when scraper throws PARSE error', async () => {
    installMockScraper(async () => {
      throw new HoroscopeError('PARSE', 'no selector match');
    });
    const res = await app.request('/horoscope/en/aries/2026-01-15');
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toBe('PARSE');
  });
});

describe('GET /horoscope/:language/:sign (today)', () => {
  it('calls scraper with today UTC and returns 200', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const scrape = vi.fn(async () => makeResult({ date: today }));
    installMockScraper(scrape);

    const res = await app.request('/horoscope/en/aries');
    expect(res.status).toBe(200);
    expect(scrape).toHaveBeenCalledWith('aries', today);
    const body = (await res.json()) as HoroscopeResult;
    expect(body.date).toBe(today);
  });
});

describe('GET /horoscope/:language/:sign/:date — date aliases', () => {
  it('resolves `today` to today UTC', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const scrape = vi.fn(async () => makeResult({ date: today }));
    installMockScraper(scrape);

    const res = await app.request('/horoscope/en/aries/today');
    expect(res.status).toBe(200);
    expect(scrape).toHaveBeenCalledWith('aries', today);
    expect(((await res.json()) as HoroscopeResult).date).toBe(today);
  });

  it('resolves `yesterday` to yesterday UTC', async () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    const yesterday = d.toISOString().slice(0, 10);
    const scrape = vi.fn(async () => makeResult({ date: yesterday }));
    installMockScraper(scrape);

    const res = await app.request('/horoscope/en/aries/yesterday');
    expect(res.status).toBe(200);
    expect(scrape).toHaveBeenCalledWith('aries', yesterday);
    expect(((await res.json()) as HoroscopeResult).date).toBe(yesterday);
  });

  it('accepts `TODAY` and `Yesterday` case-insensitively', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const scrapeToday = vi.fn(async () => makeResult({ date: today }));
    installMockScraper(scrapeToday);
    const r1 = await app.request('/horoscope/en/aries/TODAY');
    expect(r1.status).toBe(200);
    expect(scrapeToday).toHaveBeenCalledWith('aries', today);
    restoreScraper();

    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    const yesterday = d.toISOString().slice(0, 10);
    const scrapeYday = vi.fn(async () => makeResult({ date: yesterday }));
    installMockScraper(scrapeYday);
    const r2 = await app.request('/horoscope/en/aries/Yesterday');
    expect(r2.status).toBe(200);
    expect(scrapeYday).toHaveBeenCalledWith('aries', yesterday);
  });

  it('passes through unrelated strings unchanged (still 400 for invalid date)', async () => {
    const res = await app.request('/horoscope/en/aries/tomorrow');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe('VALIDATION');
  });
});

describe('GET /health', () => {
  it('returns 200 with {status: ok}', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
