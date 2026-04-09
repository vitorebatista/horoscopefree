// End-to-end scraper class tests with a mocked global.fetch.
// Covers EnScraper / PtScraper / EsScraper .scrape() class methods AND the
// shared `createThrottledFetch` returned closure body — neither was reachable
// from the existing tests because they all mocked at the *service* level
// (via __setScraperForTest) and never exercised the real fetch path.
//
// `vi.useFakeTimers` + `vi.setSystemTime` lock today UTC to 2026-04-08 so the
// PT today-only guard and the ES Spanish-date archive lookup can be hit
// deterministically. `shouldAdvanceTime: true` keeps the throttle's setTimeout
// from blocking the test runner for 1000ms between simulated requests.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnScraper } from '../../src/scrapers/en.js';
import { PtScraper } from '../../src/scrapers/pt.js';
import { EsScraper } from '../../src/scrapers/es.js';
import { HoroscopeError } from '../../src/types.js';

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-04-08T12:00:00Z'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchSpy = vi.spyOn(globalThis, 'fetch') as any;
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.useRealTimers();
});

function htmlResponse(html: string, status = 200, statusText = 'OK'): Response {
  return new Response(html, {
    status,
    statusText,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

describe('EnScraper.scrape — end-to-end with mocked fetch', () => {
  const html =
    '<html><body><div class="main-horoscope"><p>Jan 15, 2026 - This is a sufficiently long EN horoscope paragraph for the end-to-end scraper class test.</p></div></body></html>';

  it('returns a HoroscopeResult on 200', async () => {
    fetchSpy.mockResolvedValueOnce(htmlResponse(html));
    const result = await new EnScraper().scrape('aries', '2026-01-15');
    expect(result.sign).toBe('aries');
    expect(result.date).toBe('2026-01-15');
    expect(result.language).toBe('en');
    expect(result.cached).toBe(false);
    expect(result.text).toBe(
      'This is a sufficiently long EN horoscope paragraph for the end-to-end scraper class test.',
    );
    expect(result.source).toContain('horoscope.com');
    expect(result.source).toContain('sign=1');
    expect(result.source).toContain('laDate=20260115');

    // Verify the throttled fetch sent the EN Accept-Language header
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['Accept-Language']).toContain('en');
  });

  it('throws HoroscopeError(NETWORK) on non-2xx', async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse('<html></html>', 503, 'Service Unavailable'),
    );
    await expect(new EnScraper().scrape('aries', '2026-01-15')).rejects.toMatchObject({
      name: 'HoroscopeError',
      code: 'NETWORK',
    });
  });

  it('throws HoroscopeError(NETWORK) on fetch reject', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    try {
      await new EnScraper().scrape('aries', '2026-01-15');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HoroscopeError);
      if (err instanceof HoroscopeError) {
        expect(err.code).toBe('NETWORK');
        expect(err.message).toContain('ECONNREFUSED');
        expect(err.message).toContain('Fetch failed');
      }
    }
  });
});

describe('PtScraper.scrape — end-to-end with mocked fetch', () => {
  const html =
    '<html><body><article>' +
    '<p>Trabalho: This is a sufficiently long Trabalho paragraph for the PT end-to-end scraper class test.</p>' +
    '<p>Saúde: This is a sufficiently long Saúde paragraph for the PT end-to-end scraper class test.</p>' +
    '<p>Random promo paragraph that should be filtered out by the section label regex.</p>' +
    '<p>Amor: This is a sufficiently long Amor paragraph for the PT end-to-end scraper class test.</p>' +
    '</article></body></html>';

  it('returns a HoroscopeResult on 200 (today UTC = 2026-04-08)', async () => {
    fetchSpy.mockResolvedValueOnce(htmlResponse(html));
    const result = await new PtScraper().scrape('aries', '2026-04-08');
    expect(result.sign).toBe('aries');
    expect(result.language).toBe('pt');
    expect(result.cached).toBe(false);
    expect(result.text).toContain('Trabalho:');
    expect(result.text).toContain('Saúde:');
    expect(result.text).toContain('Amor:');
    expect(result.text).not.toContain('Random promo paragraph');
    expect(result.source).toContain('joaobidu.com.br');
    expect(result.source).toContain('aries');

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['Accept-Language']).toContain('pt');
  });

  it('throws HoroscopeError(NETWORK) on non-2xx', async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse('<html></html>', 500, 'Internal Server Error'),
    );
    await expect(new PtScraper().scrape('aries', '2026-04-08')).rejects.toMatchObject({
      name: 'HoroscopeError',
      code: 'NETWORK',
    });
  });

  it('throws HoroscopeError(NETWORK) on fetch reject', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('socket hang up'));
    await expect(new PtScraper().scrape('aries', '2026-04-08')).rejects.toThrow(
      /socket hang up/,
    );
  });
});

describe('EsScraper.scrape — end-to-end with mocked fetch', () => {
  // The synthetic HTML date "8  abril de 2026" matches the locked system time.
  const html =
    '<html><body>' +
    '<div class="prediction">aries general description</div>' +
    '<div class="prediction">' +
    '<p class="date">8  abril de 2026</p>' +
    '<div>This is a sufficiently long ES horoscope paragraph for the end-to-end scraper class test.</div>' +
    '</div></body></html>';

  it('returns a HoroscopeResult on 200', async () => {
    fetchSpy.mockResolvedValueOnce(htmlResponse(html));
    const result = await new EsScraper().scrape('aries', '2026-04-08');
    expect(result.sign).toBe('aries');
    expect(result.language).toBe('es');
    expect(result.cached).toBe(false);
    expect(result.text).toContain('ES horoscope paragraph');
    expect(result.source).toContain('20minutos.es');
    expect(result.source).toContain('aries');

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['Accept-Language']).toContain('es');
  });

  it('throws HoroscopeError(NETWORK) on non-2xx', async () => {
    fetchSpy.mockResolvedValueOnce(
      htmlResponse('<html></html>', 502, 'Bad Gateway'),
    );
    await expect(new EsScraper().scrape('aries', '2026-04-08')).rejects.toMatchObject({
      name: 'HoroscopeError',
      code: 'NETWORK',
    });
  });

  it('throws HoroscopeError(NETWORK) on fetch reject', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    await expect(new EsScraper().scrape('aries', '2026-04-08')).rejects.toThrow(
      /ETIMEDOUT/,
    );
  });
});
