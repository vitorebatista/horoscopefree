// PT scraper — joaobidu.com.br adapter
// SCRAPE-02: Portuguese horoscope source
// SCRAPE-04: canonical sign -> PT slug mapping (D-08, D-09)
// SCRAPE-06: validate text non-empty AND length >= 50 (via shared MIN_TEXT_LENGTH)
// SCRAPE-07: User-Agent + per-source throttle (via shared throttle factory)
// D-09:      verbatim slugs from source (comment below)
// D-10:      fail clean (no multi-source fallback)
// D-11:      trust Response.text() charset decoding
// D-12:      source = full upstream URL
// D-13:      independent throttle, never blocks EN or ES
// Source URL pattern: https://joaobidu.com.br/horoscopo-do-dia/horoscopo-do-dia-para-{slug}/
// Slug mapping: 'taurus' -> 'touro', 'gemini' -> 'gemeos' (no accent in URL slug), 'leo' -> 'leao', etc.
// Archive: today-only per D-04 — server ignores query params; guard checks date === todayUTC
import * as cheerio from 'cheerio';
import type { HoroscopeScraper } from './interface.js';
import type { HoroscopeResult, ZodiacSign } from '../types.js';
import { HoroscopeError } from '../types.js';
import { todayUtc } from '../date.js';
import { createThrottledFetch, MIN_TEXT_LENGTH } from './shared.js';

// D-08: SIGN_SLUG is local to this scraper (NOT shared from types.ts)
// D-09: slugs are verbatim from the source URL paths (see 02-RESEARCH.md)
// URL pattern: https://joaobidu.com.br/horoscopo-do-dia/horoscopo-do-dia-para-{slug}/
// 'aries' -> 'aries' (same as English)
// 'taurus' -> 'touro' (Portuguese for bull)
// 'gemini' -> 'gemeos' (no accent — URL-safe slug; site uses 'gêmeos' in display text)
// 'cancer' -> 'cancer' (same as English)
// 'leo' -> 'leao' (Portuguese for lion, no accent in URL slug)
// 'virgo' -> 'virgem' (Portuguese for virgin/maiden)
// 'libra' -> 'libra' (same as English)
// 'scorpio' -> 'escorpiao' (Portuguese for scorpion, no accent in URL slug)
// 'sagittarius' -> 'sagitario' (Portuguese, no accent in URL slug)
// 'capricorn' -> 'capricornio' (Portuguese)
// 'aquarius' -> 'aquario' (Portuguese, no accent in URL slug)
// 'pisces' -> 'peixes' (Portuguese for fish)
const SIGN_SLUG: Record<ZodiacSign, string> = {
  aries: 'aries',
  taurus: 'touro',
  gemini: 'gemeos',
  cancer: 'cancer',
  leo: 'leao',
  virgo: 'virgem',
  libra: 'libra',
  scorpio: 'escorpiao',
  sagittarius: 'sagitario',
  capricorn: 'capricornio',
  aquarius: 'aquario',
  pisces: 'peixes',
};

// D-13: own throttle, independent from EN and ES.
const throttledFetch = createThrottledFetch('pt-BR,pt;q=0.9');

/**
 * Build the joaobidu.com.br URL for a given sign.
 * The date is NOT embedded in the URL — joaobidu.com.br is today-only per D-04
 * and the today-guard in `scrape()` enforces that only today's date is ever fetched.
 * URL pattern: https://joaobidu.com.br/horoscopo-do-dia/horoscopo-do-dia-para-{slug}/
 */
export function buildUrl(sign: ZodiacSign): string {
  const slug = SIGN_SLUG[sign];
  return `https://joaobidu.com.br/horoscopo-do-dia/horoscopo-do-dia-para-${slug}/`;
}

// joaobidu.com.br renders each horoscope section in its own <p> inside <article>,
// interleaved with promotional teaser paragraphs and a sign-navigation list.
// Real horoscope paragraphs are prefixed with one of these category labels.
// Bem-estar may use a hyphen or en-dash; Saúde may appear with or without the accent;
// the live site has been observed using "Saúde:" where the recorded fixture used "Bem–estar:".
const SECTION_LABEL_RE = /^(?:Trabalho|Amor|Sa[uú]de|Bem[\s\-–—]*estar)\s*:/u;

/**
 * Extract horoscope text from joaobidu.com.br HTML.
 *
 * Strategy: collect every <article> <p> whose text starts with a known section label
 * (Trabalho / Amor / Saúde / Bem-estar) and join them in source order with blank lines.
 * This preserves the multi-section structure of the source instead of returning only one
 * category, and is robust to Saúde ↔ Bem-estar relabeling and section reordering.
 *
 * Validation: combined text length must be >= 50 chars (D-12 / Phase 1 parity).
 * D-10: No multi-source fallback — single primary selector only.
 *
 * Exported for direct fixture testing.
 */
export function extractText(html: string): string {
  const $ = cheerio.load(html);
  const sections: string[] = [];
  $('article p').each((_, el) => {
    const text = $(el).text().trim();
    if (SECTION_LABEL_RE.test(text)) {
      sections.push(text);
    }
  });
  const combined = sections.join('\n\n');
  if (combined.length >= MIN_TEXT_LENGTH) {
    return combined;
  }
  throw new HoroscopeError(
    'PARSE',
    `Could not extract PT horoscope text >= ${MIN_TEXT_LENGTH} chars from joaobidu.com.br page (matched ${sections.length} labeled section(s))`,
  );
}

export class PtScraper implements HoroscopeScraper {
  async scrape(sign: ZodiacSign, date: string): Promise<HoroscopeResult> {
    // D-04: today-only guard. Past dates throw NETWORK so the service layer
    // returns the cached result if one exists, or surfaces the error otherwise.
    const today = todayUtc();
    if (date !== today) {
      throw new HoroscopeError(
        'NETWORK',
        `PT source (joaobidu.com.br) only supports today's horoscope; requested ${date}, today UTC is ${today}`,
      );
    }

    const url = buildUrl(sign);
    const response = await throttledFetch(url);

    if (!response.ok) {
      throw new HoroscopeError(
        'NETWORK',
        `HTTP ${response.status} ${response.statusText} from ${url}`,
      );
    }

    const html = await response.text();
    const text = extractText(html); // throws PARSE if extraction fails

    return {
      sign,
      date,
      language: 'pt',
      text,
      source: url, // D-12: full upstream URL
      cached: false,
    };
  }
}
