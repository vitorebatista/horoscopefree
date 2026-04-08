import { describe, it, expect } from 'vitest';
import {
  HoroscopeError,
  ZODIAC_SIGNS,
  SUPPORTED_LANGUAGES,
  type HoroscopeErrorCode,
} from '../src/types.js';
import type { Language, ZodiacSign } from '../src/types.js';

describe('HoroscopeError', () => {
  it('is an instance of Error and HoroscopeError', () => {
    const err = new HoroscopeError('NETWORK', 'oops');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(HoroscopeError);
  });

  it('preserves code, name, and message', () => {
    const err = new HoroscopeError('PARSE', 'bad html');
    expect(err.code).toBe('PARSE');
    expect(err.name).toBe('HoroscopeError');
    expect(err.message).toBe('bad html');
  });

  it.each<HoroscopeErrorCode>(['NETWORK', 'PARSE', 'VALIDATION', 'NOT_FOUND'])(
    'discriminates code %s correctly',
    (code) => {
      const err = new HoroscopeError(code, 'msg');
      if (err.code === code) {
        expect(err.code).toBe(code);
      } else {
        throw new Error(`Code did not narrow to ${code}`);
      }
    },
  );
});

describe('ZODIAC_SIGNS', () => {
  it('contains exactly 12 signs in canonical order', () => {
    expect(ZODIAC_SIGNS).toEqual([
      'aries', 'taurus', 'gemini', 'cancer',
      'leo', 'virgo', 'libra', 'scorpio',
      'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ]);
    expect(ZODIAC_SIGNS).toHaveLength(12);
  });
});

describe('Language type — Phase 2 expansion (D-17)', () => {
  it('SUPPORTED_LANGUAGES contains exactly en, pt, es in that order', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'pt', 'es']);
  });

  it('SUPPORTED_LANGUAGES has length 3', () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(3);
  });

  it('includes each expected language', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('pt');
    expect(SUPPORTED_LANGUAGES).toContain('es');
  });

  it('type-level: en / pt / es are assignable to Language', () => {
    const en: Language = 'en';
    const pt: Language = 'pt';
    const es: Language = 'es';
    expect([en, pt, es]).toEqual(['en', 'pt', 'es']);
  });

  it('type-level: fr is not assignable to Language', () => {
    // @ts-expect-error — 'fr' is not a member of Language union
    const fr: Language = 'fr';
    // Runtime check is incidental; the @ts-expect-error above is the real assertion.
    expect(fr).toBe('fr');
  });
});

describe('ZodiacSign type (phase 1 — unchanged in phase 2)', () => {
  it('ZODIAC_SIGNS has 12 signs', () => {
    expect(ZODIAC_SIGNS.length).toBe(12);
  });

  it('aries and pisces are assignable to ZodiacSign', () => {
    const a: ZodiacSign = 'aries';
    const p: ZodiacSign = 'pisces';
    expect([a, p]).toEqual(['aries', 'pisces']);
  });
});
