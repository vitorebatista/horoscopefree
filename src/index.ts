// Library entry point — thin re-export over the service layer.
// Consumers do: import { getHoroscope, HoroscopeError } from 'horoscopefree';
// LIB-01, LIB-02, LIB-03 — exports the public API surface.
export { getHoroscope } from './service.js';
export { HoroscopeError } from './types.js';
export type {
  HoroscopeResult,
  ZodiacSign,
  Language,
  HoroscopeErrorCode,
} from './types.js';
