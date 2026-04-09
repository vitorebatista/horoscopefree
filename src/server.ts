// HTTP server — Hono + @hono/node-server.
// HTTP-01: GET /horoscope/:language/:sign/:date
// HTTP-02: GET /horoscope/:language/:sign (today UTC per D-18)
// HTTP-03: VALIDATION→400, NOT_FOUND→404, NETWORK/PARSE→502
// HTTP-04: PORT env var with default 5000
// D-19:    error mapping
// D-20:    standalone — runs only when invoked directly
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { HoroscopeError, type HoroscopeErrorCode } from './types.js';
import { getHoroscope } from './service.js';
import { todayUtc, yesterdayUtc } from './date.js';

const ERROR_STATUS: Record<HoroscopeErrorCode, 400 | 404 | 502> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  NETWORK: 502,
  PARSE: 502,
};

export const app = new Hono();

app.onError((err, c) => {
  if (err instanceof HoroscopeError) {
    const status = ERROR_STATUS[err.code];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.json({ error: err.code, message: err.message }, status as any);
  }
  // Unexpected — log and surface as 500
  console.error('[horoscopefree:server] Unexpected error:', err);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c.json({ error: 'INTERNAL', message: 'Internal server error' }, 500 as any);
});

/**
 * Resolve `today` and `yesterday` date aliases to YYYY-MM-DD (UTC).
 * Anything else passes through unchanged so the service layer can validate it.
 * Case-insensitive — `TODAY`, `Today`, `today` all work.
 */
function resolveDateAlias(input: string): string {
  const normalized = input.toLowerCase();
  if (normalized === 'today') return todayUtc();
  if (normalized === 'yesterday') return yesterdayUtc();
  return input;
}

// GET /horoscope/:language/:sign/:date
// :date accepts YYYY-MM-DD or the aliases `today` / `yesterday` (case-insensitive UTC).
app.get('/horoscope/:language/:sign/:date', async (c) => {
  const { language, sign, date } = c.req.param();
  const resolvedDate = resolveDateAlias(date);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await getHoroscope(sign as any, resolvedDate, language as any);
  return c.json(result);
});

// GET /horoscope/:language/:sign — today UTC
app.get('/horoscope/:language/:sign', async (c) => {
  const { language, sign } = c.req.param();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await getHoroscope(sign as any, todayUtc(), language as any);
  return c.json(result);
});

// Health check — useful for the consumer's reverse proxy / orchestrator.
app.get('/health', (c) => c.json({ status: 'ok' }));

// Standalone server bootstrap.
// Only listen when this file is the process entry point — NOT when imported by tests.
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file://${process.argv[1]}.js`;

if (isMain) {
  const port = Number.parseInt(process.env.PORT ?? '5000', 10);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[horoscopefree] HTTP server listening on http://localhost:${info.port}`);
  });
}
