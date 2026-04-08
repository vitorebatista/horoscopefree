import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, buildUrl, PtScraper } from '../../src/scrapers/pt.js';
import { HoroscopeError } from '../../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, '../fixtures/pt/aries-2026-04-06.html');

describe('PT scraper — buildUrl', () => {
  it('builds a PT URL containing the aries slug', () => {
    const url = buildUrl('aries');
    expect(url).toContain('aries');
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain('joaobidu.com.br');
  });

  it('builds a PT URL containing the pisces slug (peixes)', () => {
    expect(buildUrl('pisces')).toContain('peixes');
  });

  it('builds a PT URL containing the taurus slug (touro)', () => {
    expect(buildUrl('taurus')).toContain('touro');
  });

  it('builds different URLs for different signs', () => {
    expect(buildUrl('aries')).not.toBe(buildUrl('pisces'));
  });
});

describe('PT scraper — extractText (fixture)', () => {
  it('extracts horoscope text from recorded aries-2026-04-06.html', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html);
    expect(text.length).toBeGreaterThanOrEqual(50);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('preserves PT diacritics in extracted text (D-11 mojibake guard)', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html);
    // At least one PT diacritic from the set á é í ó ú ã õ ç â ê ô
    // The aries fixture from 02-RESEARCH.md contains 'ã' and 'á' (e.g. "manhã", "fácil")
    const diacriticPattern = /[áéíóúãõçâêô]/;
    expect(text).toMatch(diacriticPattern);
  });

  it('returns all labeled horoscope sections (Trabalho + Bem-estar + Amor), not just the first', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html);
    // The recorded fixture has three labeled sections in <article> <p>:
    // Trabalho:, Bem–estar:, and Amor: (interleaved with promo paragraphs we filter out)
    expect(text).toMatch(/^Trabalho:/);
    expect(text).toContain('Bem'); // matches both Bem-estar and Bem–estar
    expect(text).toContain('estar:');
    expect(text).toContain('Amor:');
    // Sections joined with blank lines so consumers can split on \n\n if they want
    expect(text.split('\n\n').length).toBeGreaterThanOrEqual(3);
  });

  it('matches Saúde label as alternate for Bem-estar (live site relabeling)', () => {
    const html =
      '<html><body><article>' +
      '<p>Trabalho: This is a sufficiently long Trabalho paragraph to pass the length check.</p>' +
      '<p>Saúde: This is a sufficiently long Saúde paragraph to pass the length check.</p>' +
      '<p>Random promo paragraph that should be filtered out by the label regex.</p>' +
      '<p>Amor: This is a sufficiently long Amor paragraph to pass the length check.</p>' +
      '</article></body></html>';
    const text = extractText(html);
    expect(text).toContain('Trabalho:');
    expect(text).toContain('Saúde:');
    expect(text).toContain('Amor:');
    expect(text).not.toContain('Random promo paragraph');
    expect(text.split('\n\n')).toHaveLength(3);
  });

  it('throws HoroscopeError(PARSE) when no horoscope content present', () => {
    expect(() => extractText('<html><body>nothing here</body></html>')).toThrow(
      HoroscopeError,
    );
    try {
      extractText('<html><body>nothing here</body></html>');
    } catch (err) {
      expect(err).toBeInstanceOf(HoroscopeError);
      if (err instanceof HoroscopeError) {
        expect(err.code).toBe('PARSE');
      }
    }
  });

  it('throws HoroscopeError(PARSE) when text is shorter than 50 chars', () => {
    // article p selector matches but text is too short
    const shortHtml =
      '<html><body><article><p>too short</p></article></body></html>';
    expect(() => extractText(shortHtml)).toThrow(HoroscopeError);
    try {
      extractText(shortHtml);
    } catch (err) {
      expect(err).toBeInstanceOf(HoroscopeError);
      if (err instanceof HoroscopeError) {
        expect(err.code).toBe('PARSE');
      }
    }
  });

  it('extracts text from article p when long enough', () => {
    const longText =
      'Trabalho: Manter uma atitude positiva pela manhã aumenta as chances de bons resultados hoje.';
    const html = `<html><body><article><p>${longText}</p></article></body></html>`;
    expect(extractText(html)).toBe(longText);
  });
});

// D-04: joaobidu.com.br is today-only. The scraper throws NETWORK for past dates.
describe('PT scraper — today-only guard (D-04)', () => {
  it('rejects past dates with HoroscopeError(NETWORK) mentioning today', async () => {
    const scraper = new PtScraper();
    await expect(scraper.scrape('aries', '2020-01-01')).rejects.toThrow(
      /today/i,
    );
  });

  it('rejects past dates with HoroscopeError code NETWORK', async () => {
    const scraper = new PtScraper();
    try {
      await scraper.scrape('aries', '2020-01-01');
    } catch (err) {
      expect(err).toBeInstanceOf(HoroscopeError);
      if (err instanceof HoroscopeError) {
        expect(err.code).toBe('NETWORK');
      }
    }
  });
});
