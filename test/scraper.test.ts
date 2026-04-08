import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, buildUrl } from '../src/scrapers/en.js';
import { HoroscopeError } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, 'fixtures/en/aries-2026-01-15.html');

describe('EN scraper — buildUrl', () => {
  it('builds horoscope.com URL for aries (sign=1) and 2026-01-15', () => {
    expect(buildUrl('aries', '2026-01-15')).toBe(
      'https://www.horoscope.com/us/horoscopes/general/horoscope-archive.aspx?sign=1&laDate=20260115',
    );
  });

  it('builds horoscope.com URL for pisces (sign=12) and 2025-12-31', () => {
    expect(buildUrl('pisces', '2025-12-31')).toBe(
      'https://www.horoscope.com/us/horoscopes/general/horoscope-archive.aspx?sign=12&laDate=20251231',
    );
  });
});

describe('EN scraper — extractText (fixture)', () => {
  it('extracts horoscope text from recorded aries-2026-01-15.html', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html);
    expect(text.length).toBeGreaterThanOrEqual(50);
    expect(text).not.toContain('<');
    expect(text).not.toContain('>');
  });

  it('strips horoscope.com leading "<Mon> <D>, <Y> - " date prefix from fixture', () => {
    const html = readFileSync(FIXTURE, 'utf-8');
    const text = extractText(html);
    // The date is already on HoroscopeResult.date — must not be duplicated in text.
    expect(text).not.toMatch(
      /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},\s*\d{4}/,
    );
    expect(text.startsWith('Whatever tasks or chores')).toBe(true);
  });

  it('strips date prefix from synthetic primary-path text', () => {
    const html =
      '<html><body><div class="main-horoscope"><p>Jan 15, 2026 - This is a sufficiently long horoscope paragraph for testing.</p></div></body></html>';
    expect(extractText(html)).toBe(
      'This is a sufficiently long horoscope paragraph for testing.',
    );
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
    const html =
      '<html><body><div class="main-horoscope"><p>too short</p></div></body></html>';
    expect(() => extractText(html)).toThrow(HoroscopeError);
  });

  it('extracts text from div.main-horoscope > p when long enough', () => {
    const longText =
      'This is a sufficiently long horoscope paragraph for testing the extraction path.';
    const html = `<html><body><div class="main-horoscope"><p>${longText}</p></div></body></html>`;
    expect(extractText(html)).toBe(longText);
  });

  it('falls back to ChatWidget.init JSON when primary selector misses', () => {
    // No div.main-horoscope on the page — primary path returns empty.
    // ChatWidget.init({ horoscopeText: "..." }) carries the same text in a JSON blob.
    const longText =
      'This is a sufficiently long ChatWidget fallback horoscope paragraph for testing the secondary extraction path.';
    const html =
      '<html><body><script>ChatWidget.init({ "horoscopeText": "' +
      longText +
      '", "other": "ignored" });</script></body></html>';
    expect(extractText(html)).toBe(longText);
  });

  it('ChatWidget fallback strips the date prefix too', () => {
    const longText =
      'Jan 15, 2026 - This is a sufficiently long ChatWidget fallback horoscope paragraph for the strip test.';
    const html =
      '<html><body><script>ChatWidget.init({ "horoscopeText": "' +
      longText +
      '" });</script></body></html>';
    expect(extractText(html)).toBe(
      'This is a sufficiently long ChatWidget fallback horoscope paragraph for the strip test.',
    );
  });

  it('ChatWidget fallback tries .text key when .horoscopeText is missing', () => {
    const longText =
      'This is a sufficiently long ChatWidget fallback paragraph carried via the .text key for the candidate iteration test.';
    const html =
      '<html><body><script>ChatWidget.init({ "text": "' +
      longText +
      '" });</script></body></html>';
    expect(extractText(html)).toBe(longText);
  });

  it('falls through to PARSE error when ChatWidget JSON is malformed', () => {
    // ChatWidget.init present but the JSON inside is invalid → JSON.parse throws,
    // catch swallows it, no candidate matched → PARSE.
    const html =
      '<html><body><script>ChatWidget.init({ this is not valid json });</script></body></html>';
    expect(() => extractText(html)).toThrow(HoroscopeError);
  });
});
