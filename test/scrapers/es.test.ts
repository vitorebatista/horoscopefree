import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, buildUrl } from '../../src/scrapers/es.js';
import { HoroscopeError } from '../../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, '../fixtures/es/aries-2026-04-06.html');

describe('ES scraper — buildUrl', () => {
  it('builds an ES URL containing the aries slug', () => {
    const url = buildUrl('aries');
    expect(url).toContain('aries');
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain('20minutos.es');
  });

  it('builds an ES URL containing the pisces slug (piscis)', () => {
    expect(buildUrl('pisces')).toContain('piscis');
  });

  it('builds an ES URL containing the taurus slug (tauro)', () => {
    expect(buildUrl('taurus')).toContain('tauro');
  });

  it('builds different URLs for different signs', () => {
    expect(buildUrl('aries')).not.toBe(buildUrl('pisces'));
  });
});

describe('ES scraper — extractText (fixture, date-based lookup)', () => {
  it('extracts horoscope text from recorded aries-2026-04-06.html for date 2026-04-06', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html, '2026-04-06');
    expect(text.length).toBeGreaterThanOrEqual(50);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('preserves ES diacritics in extracted text (D-11 mojibake guard)', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html, '2026-04-06');
    // At least one ES diacritic from the set á é í ó ú ü ñ
    // The aries-2026-04-06 fixture text contains 'á' (e.g. "también" -> actually the text has "á")
    const diacriticPattern = /[áéíóúüñ]/;
    expect(text).toMatch(diacriticPattern);
  });

  it('extracts the most recent entry when no date is provided', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html);
    expect(text.length).toBeGreaterThanOrEqual(50);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
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
    // Second .prediction div present but text in next-div is too short
    const shortHtml =
      '<html><body>' +
      '<div class="prediction">sign description</div>' +
      '<div class="prediction"><p class="date">short</p><div>too short</div></div>' +
      '</body></html>';
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

  it('throws HoroscopeError(NETWORK) when requested date not found in archive', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    // 2020-01-01 is well outside the ~9-day archive window
    expect(() => extractText(html, '2020-01-01')).toThrow(HoroscopeError);
    try {
      extractText(html, '2020-01-01');
    } catch (err) {
      expect(err).toBeInstanceOf(HoroscopeError);
      if (err instanceof HoroscopeError) {
        expect(err.code).toBe('NETWORK');
      }
    }
  });

  it('extracts text from a minimal archive-shaped HTML when long enough', () => {
    const longText =
      'Hoy tendrás una mañana llena de claridad inesperada para tu rutina matutina positiva.';
    const html =
      '<html><body>' +
      '<div class="prediction">sign description</div>' +
      '<div class="prediction">' +
      '<p class="date">6  abril de 2026</p>' +
      `<div>${longText}</div>` +
      '</div>' +
      '</body></html>';
    expect(extractText(html, '2026-04-06')).toBe(longText);
  });
});

// ES archive is supported (>= 9 days) per 02-RESEARCH.md — NO D-04 today-only guard test needed.
