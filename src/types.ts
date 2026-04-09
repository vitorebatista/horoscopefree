export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;

export type Language = 'en' | 'pt' | 'es';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'pt', 'es'] as const;

export interface HoroscopeResult {
  sign: ZodiacSign;
  date: string;        // YYYY-MM-DD per D-09
  language: Language;
  text: string;
  source: string;      // full upstream URL per D-12
  cached: boolean;
}

export type HoroscopeErrorCode = 'NETWORK' | 'PARSE' | 'VALIDATION' | 'NOT_FOUND';

export class HoroscopeError extends Error {
  readonly code: HoroscopeErrorCode;
  constructor(code: HoroscopeErrorCode, message: string) {
    super(message);
    this.name = 'HoroscopeError';
    this.code = code;
  }
}
