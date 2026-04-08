import type { HoroscopeResult, ZodiacSign } from '../types.js';

export interface HoroscopeScraper {
  scrape(sign: ZodiacSign, date: string): Promise<HoroscopeResult>;
}
