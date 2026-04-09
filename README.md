# horoscopefree

A small, typed multilingual horoscope library and HTTP API for Node.js.

It scrapes a single validated source per language, caches each result to disk, and exposes:

- a `getHoroscope(sign, date, language)` function with a typed `HoroscopeResult` and a typed `HoroscopeError` union, and
- a Hono HTTP server you can run standalone or mount inside your own host.

Distributed as a **git dependency** (no npm publish). Supported languages: **English**, **Portuguese**, **Spanish**.

---

## Requirements

- Node.js **>= 22.18.0** (Node 22 LTS or later — required for native TypeScript stripping and modern `fetch` semantics)
- `npm` or `yarn`

## Install

```bash
npm install git+https://github.com/<your-org>/horoscopefree.git
# or
yarn add git+https://github.com/<your-org>/horoscopefree.git
```

The `prepare` script runs `tsc` on install, so the consumer gets compiled `dist/` JavaScript and `.d.ts` declarations without TypeScript needing to be installed in the consumer project.

---

## Library usage

```typescript
import { getHoroscope, HoroscopeError } from 'horoscopefree';

try {
  const result = await getHoroscope('aries', '2026-01-15', 'en');
  console.log(result.text);
  console.log(result.cached); // false on first call, true on subsequent calls
} catch (err) {
  if (err instanceof HoroscopeError) {
    // err.code is one of: 'NETWORK' | 'PARSE' | 'VALIDATION' | 'NOT_FOUND'
    console.error(err.code, err.message);
  } else {
    throw err;
  }
}
```

The first call for a given `(sign, date, language)` triple fetches from the source and writes the result to disk. Every subsequent call returns immediately from cache with `cached: true`.

### All three languages

```typescript
const en = await getHoroscope('aries', '2026-01-15', 'en');
const pt = await getHoroscope('aries', '2026-04-08', 'pt');
const es = await getHoroscope('aries', '2026-04-08', 'es');
```

All three return the same shape (`{ sign, date, language, text, source, cached }`) and write to a per-language cache directory.

> **PT is today-only.** The Portuguese source (`joaobidu.com.br`) does not expose a date archive. Calls with a past date return a cache hit if one exists, otherwise throw `HoroscopeError('NETWORK', ...)`. EN supports the full historical archive; ES supports roughly the last 9 days. Plan accordingly.

### Public API

| Symbol | Kind | Description |
|---|---|---|
| `getHoroscope(sign, date, language)` | function | `(ZodiacSign, string, Language) => Promise<HoroscopeResult>`. `date` must be `YYYY-MM-DD`. Throws `HoroscopeError` on any failure. |
| `HoroscopeError` | class | `extends Error`. Has a `.code: HoroscopeErrorCode` field for narrowing. |
| `HoroscopeResult` | type | `{ sign, date, language, text, source, cached }`. |
| `ZodiacSign` | type | `'aries' \| 'taurus' \| 'gemini' \| 'cancer' \| 'leo' \| 'virgo' \| 'libra' \| 'scorpio' \| 'sagittarius' \| 'capricorn' \| 'aquarius' \| 'pisces'`. |
| `Language` | type | `'en' \| 'pt' \| 'es'`. |
| `HoroscopeErrorCode` | type | `'NETWORK' \| 'PARSE' \| 'VALIDATION' \| 'NOT_FOUND'`. |

### Error semantics

| Code | When |
|---|---|
| `VALIDATION` | Bad sign, malformed date, calendar-invalid date (e.g. `2025-02-30`), or future date |
| `NOT_FOUND` | Unsupported language (anything outside `en` / `pt` / `es`) |
| `NETWORK` | Upstream unreachable, non-2xx HTTP, timeout, or PT today-only guard rejected a past date |
| `PARSE` | Upstream HTML changed and the scraper could no longer extract a valid horoscope |

There is **no stale-cache fallback**. If a fresh fetch fails, `getHoroscope` throws — it will not silently serve yesterday's text under today's date. Misleading data is worse than an explicit error.

---

## HTTP server usage

The package also ships a standalone Hono HTTP server.

### Three ways to run it

**1. Standalone process (after install):**

```bash
node node_modules/horoscopefree/dist/server.js
# → [horoscopefree] HTTP server listening on http://localhost:5000
```

**2. Embedded in your own host:**

```typescript
import { serve } from '@hono/node-server';
import { app } from 'horoscopefree/server';

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`mounted on :${info.port}`);
});
```

**3. Mount routes onto an existing Hono app:**

```typescript
import { Hono } from 'hono';
import { app as horoscope } from 'horoscopefree/server';

const root = new Hono();
root.route('/api/v1', horoscope);
```

### Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/horoscope/:language/:sign/:date` | Fetch a horoscope for an explicit date. `:date` accepts `YYYY-MM-DD` or the aliases `today` / `yesterday` (case-insensitive, UTC). |
| `GET` | `/horoscope/:language/:sign` | Equivalent to `:date = today`. |
| `GET` | `/health` | Liveness probe. Returns `{"status":"ok"}`. |

### Examples

```bash
# Explicit date
curl http://localhost:5000/horoscope/en/aries/2026-01-15

# Date aliases
curl http://localhost:5000/horoscope/en/aries/today
curl http://localhost:5000/horoscope/en/aries/yesterday

# Other languages
curl http://localhost:5000/horoscope/pt/aries/today
curl http://localhost:5000/horoscope/es/aries/today

# Health check
curl http://localhost:5000/health
```

A successful response looks like:

```json
{
  "sign": "aries",
  "date": "2026-01-15",
  "language": "en",
  "text": "Whatever tasks or chores you may have to perform today are likely to go ...",
  "source": "https://www.horoscope.com/us/horoscopes/general/horoscope-archive.aspx?sign=1&laDate=20260115",
  "cached": false
}
```

### HTTP status codes

| Status | Cause |
|---|---|
| `200` | Success |
| `400` | Invalid sign, malformed date, calendar-invalid date, or future date (`VALIDATION`) |
| `404` | Unsupported language — only `en`, `pt`, `es` are supported (`NOT_FOUND`) |
| `502` | Upstream scrape failure (`NETWORK` or `PARSE`) |
| `500` | Unexpected internal error — file an issue |

Error responses are always JSON: `{ "error": "<CODE>", "message": "<details>" }`.

---

## Sources

| Language | Host | Date archive support |
|---|---|---|
| `en` | `horoscope.com` | Full archive — any past date |
| `pt` | `joaobidu.com.br` | Today only — past dates require a cache hit, otherwise `NETWORK` error |
| `es` | `20minutos.es` | Approximately the last 9 days |

Each source is validated against a recorded HTML fixture so offline tests catch selector regressions, and a `SCRAPE_LIVE=1`-gated smoke test verifies the live endpoint still responds correctly.

---

## Configuration

| Variable | Default | Effect |
|---|---|---|
| `PORT` | `5000` | HTTP server listen port. |
| `HOROSCOPE_CACHE_DIR` | `${cwd}/.cache/horoscopes` | Directory for cached horoscope JSON. **Must be on a single filesystem** — atomic writes use `fs.rename`, which fails with `EXDEV` across mounts. |
| `SCRAPE_LIVE` | unset | When set to `1`, the live smoke tests under `test/live/` actually run. Used by maintainers before tagging releases. |

## Cache behavior

- **Layout:** `<HOROSCOPE_CACHE_DIR>/<language>/<sign>/<YYYY-MM-DD>.json`
- **Atomic writes:** `<key>.tmp` + `fs.rename` — readers never see a half-written file.
- **No expiry:** once a date's horoscope is cached, it's valid forever. Horoscopes are inherently dated, so a cached entry is by definition immutable.
- **No stale fallback:** see "Error semantics" above.
- **Corrupt-file recovery:** if a cache file fails to parse, it is removed and the next call re-scrapes.

---

## Development

```bash
yarn install
yarn dev          # Run server with hot reload via tsx (no build step)
yarn typecheck    # tsc --noEmit
yarn lint         # eslint src test
yarn test         # vitest run (offline, fixture-based — never hits the network)
yarn coverage     # vitest run --coverage (V8 provider, text + HTML + lcov reports)
yarn build        # tsc — emit dist/
```

`yarn coverage` writes a full HTML report to `coverage/index.html` and also prints a per-file table to the terminal. Coverage thresholds are enforced in `vitest.config.ts` — the run fails (exit 1) if statements/branches/functions/lines drop below the configured floor.

### CI

Every pull request to `master` runs the full quality gate via `.github/workflows/ci.yml`:

| Step | Command |
|---|---|
| Lint | `yarn lint` |
| Typecheck | `yarn typecheck` |
| Tests + coverage gate | `yarn coverage` |
| Build | `yarn build` |

Failures block the workflow run (non-zero exit aborts subsequent steps). To make CI failures actually **block PR merges**, enable a branch protection rule on `master` in your GitHub repo settings (`Settings → Branches → Add rule`), require the `lint + typecheck + test + coverage` check, and tick *Require status checks to pass before merging*. The workflow itself is jurisdictionally agnostic — branch protection is the GitHub feature that turns CI signals into a merge gate.

For maintainer-facing details — release checklist, architecture decisions, project structure, scraper conventions — see [`CLAUDE.md`](./CLAUDE.md) and the per-phase context files under `.planning/phases/`.

---

## Deploy to Fly.io

The repo ships a `Dockerfile` and `fly.toml` for one-command deployment to [Fly.io](https://fly.io). The default configuration uses a single `shared-cpu-1x` / 256 MB machine in `gru` (São Paulo) with a 1 GB persistent volume mounted at `/data` for the horoscope cache. On the free $5/month credit this typically runs at $0/month for low-traffic personal use.

**First-time setup:**

```bash
# 1. Install flyctl + authenticate (one-time per machine)
curl -L https://fly.io/install.sh | sh
fly auth signup    # or: fly auth login

# 2. Create the app (the name in fly.toml must be globally unique — rename if needed)
fly apps create horoscopefree

# 3. Create the persistent volume for the horoscope cache
fly volumes create horoscope_cache --region gru --size 1

# 4. Deploy
fly deploy
```

**Subsequent deploys:** just `fly deploy`.

**Useful commands:**

```bash
fly status          # machine + volume state
fly logs            # tail logs
fly ssh console     # shell into the running VM
fly open            # open the deployed URL in a browser
```

**Why single-instance only:** the per-source throttle in `src/scrapers/shared.ts` holds `nextAllowedAt` state in a module-level closure. Scaling to multiple machines would multiply the effective throttle delay by the instance count and can violate the 1000 ms inter-request floor that the upstream sites expect. `fly.toml` is configured for single-instance by default — do **not** set `min_machines_running > 1` or enable auto-scaling.

**Cold starts:** `auto_stop_machines = "stop"` means the VM stops when idle to preserve free credit. The first request after an idle period incurs a ~5-second cold start. Subsequent requests in the same warm window are <50 ms.

**Operating a public endpoint:** if you expose the deployed URL to anyone other than yourself, re-read [`DISCLAIMER.md`](./DISCLAIMER.md) and consider contacting the upstream publishers directly. You are now the *operator* of a service that fetches third-party content, not just the author of a library.

---

## Disclaimer

This library fetches content from third-party publishers (horoscope.com, joaobidu.com.br, 20minutos.es). Before deploying, read [`DISCLAIMER.md`](./DISCLAIMER.md) — it covers the no-affiliation statement, source attribution requirements, ToS-compliance obligations, and commercial-use guidance. **TL;DR:** display the `source` URL alongside any horoscope text you show end users, comply with each upstream site's ToS, and contact the publishers directly for commercial or high-volume use.

## License

MIT — see [`LICENSE`](./LICENSE).
