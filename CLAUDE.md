<!-- GSD:project-start source:PROJECT.md -->
## Project

**HoroscopeFree**

A multilingual horoscope data library and API that scrapes horoscope websites to provide daily horoscope readings for all 12 zodiac signs. Consumed as a git dependency by other projects or as a standalone REST API. Fetches on-demand and caches results to disk.

**Core Value:** Get accurate, up-to-date horoscope text for any sign, any date, in English, Portuguese, and Spanish — reliably and simply.

### Constraints

- **Data source**: Web scraping only — no paid APIs or subscriptions
- **Rate limiting**: Must be respectful of scraped sites (delays between requests)
- **Stack**: Modern TypeScript, native fetch, lightweight framework or none for API
- **Distribution**: Git dependency — must export clean library API alongside HTTP server
- **Node**: Target latest LTS
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 3.2.2 - All source code, compiled to JavaScript
- JavaScript (ES6) - Runtime target via TypeScript compilation
## Runtime
- Node.js 8.x, 10.x, 12.x (CI/CD tested matrix)
- Platform: Linux (production environment mentioned as Heroku)
- Yarn - Primary package manager
- Lockfile: `yarn.lock` (present)
## Frameworks
- Express.js 4.16.4 - REST API server framework
- jsdom 13.1.0 - DOM parsing and HTML manipulation
- superagent 4.0.0 - HTTP client for web scraping
- showdown 1.9.0 - Markdown to HTML converter
- moment.js 2.23.0 - Date/time parsing and formatting
- body-parser 1.18.3 - JSON and URL-encoded request parsing
- compression 1.7.3 - HTTP compression middleware
- TypeScript 3.2.2 - Compiler and type checking
- nodemon 1.18.9 - File watcher and auto-reload for development
- tslint 1.9.0 - TypeScript linting (configuration in `tslint.json`)
## Build System
- Output directory: `./dist`
- Configuration: `tsconfig.json`
- Watch mode: `tsc -w`
## Project Configuration
- Target: ES6
- Module: CommonJS
- Source root: `lib/`
- Output: `dist/`
- Source maps enabled
- Base URL: `lib/` for module resolution
- Watch directory: `lib/`
- Ignore patterns: `**/*.test.ts`, `**/*.spec.ts`, `.git`, `node_modules`
- Execution: `yarn start` on file changes
- File extensions: TypeScript (`.ts`)
## Environment Configuration
- `PORT` - Express server port (default: 5000)
- `CI` - CI/CD environment flag (GitHub Actions)
- No `.env` file pattern detected
- Configuration is minimal (only PORT via environment variable)
## Platform Requirements
- Node.js 8.x or higher
- Yarn package manager
- TypeScript compiler
- Node.js 8.x, 10.x, or 12.x (tested via CI)
- Compiled JavaScript in `dist/` directory
- Heroku platform (mentioned in README for deployment)
- HTTP port accessible (default 5000)
## Dependencies Summary
- express (4.16.4) - Core web framework
- body-parser (1.18.3) - Request parsing
- compression (1.7.3) - Response compression
- superagent (4.0.0) - HTTP requests
- jsdom (13.1.0) - DOM manipulation
- showdown (1.9.0) - Markdown conversion
- moment (2.23.0) - Date handling
- @types/express (4.16.0) - TypeScript types
- @types/showdown (1.9.0) - TypeScript types
- typescript (3.2.2) - Compiler
- nodemon (1.18.9) - File watcher
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Lowercase with hyphens: Not observed
- camelCase: Observed in all source files
- Example: `crawler.ts`, `app.ts`, `server.ts`, `home.ts`
- camelCase with descriptive names: `horoscopeCrawler()`, `formatDate()`, `nodeListToArray()`
- Arrow functions preferred for functional patterns: `const website = (language: string, sign: string) => { }`
- Async functions explicitly marked: `async function horoscopeCrawler(language: string)`
- camelCase consistently: `dateHoroscope`, `horoscope`, `language`, `sign`
- Constants as objects: `const signs = { ... }`, `const website = (...) => { ... }`
- No const assertions observed; standard object/variable declarations
- Explicit type annotations on function parameters: `(language: string, sign: string)`
- Inline type declarations for objects: Properties typed within function scope
- No custom type/interface definitions found; uses native types and third-party library types
## Code Style
- No Prettier configuration file detected
- Manual formatting observed with consistent 4-space indentation (inferred from tslint settings)
- Semicolons required at end of statements (enforced by tslint)
- No trailing whitespace (enforced by tslint)
- Tool: TSLint (configured in `tslint.json`)
- Key rules enforced:
## Import Organization
- Using `import * as` pattern for CommonJS compatibility: `import * as express from "express"`
- Default exports used: `import crawler from "./crawler"`
- Path aliases: baseUrl set to `./lib` in tsconfig.json
- Base URL configured: `baseUrl: "./lib"` and separate `baseUrl: "types"`
- Relative paths observed in imports: `import crawler from "./crawler"`
## Error Handling
- Promise `.catch()` chains used: `.catch((error: string) => error)` in `crawler.ts`
- Catch-all error handling: `.catch( () => 'err')` in `home.ts` returns string literal
- No try-catch blocks observed
- No explicit error logging or custom error types
- HTTP 200 for success: `res.status(200).send(...)`
- No error response handling in route handlers
- Silent failure in async operations (Promise.all without error handling)
## Logging
- Console.log for startup messages: `console.log('Express server listening on port ' + PORT)`
- No logging throughout application code for debugging or monitoring
- String concatenation for log output
## Comments
- Minimal commenting observed
- Example comments describe functionality: `// support application/json type post data`
- JSDoc not used
- No JSDoc or TSDoc comments found in source files
- Function documentation not present
## Function Design
- Functions are concise: `home()` is 11 lines, `formatDate()` is 6 lines
- More complex functions use multiple helper functions: `horoscopeCrawler()` delegates to `nodeListToArray()` and `formatDate()`
- Type-annotated function parameters: `(language: string, sign: string)`
- Destructuring used in some contexts: `({ text }) => { ... }`
- Default language value: `const language = 'en'` set in route handler
- Async functions return Promises: `async function horoscopeCrawler(language: string)`
- Explicit return statements used
- Promise chaining with `.then()` for async operations
## Module Design
- Default exports used: `export default new App().app`
- Single export per module pattern observed
- Class instantiation at export time: `new App().app`
- Not used; each file is imported individually
- Single class `App` in `app.ts` encapsulates Express configuration
- Constructor initializes and calls config method
- Private methods for internal configuration: `private config(): void`
- Public properties expose Express app: `public app: express.Application`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

> Note: this section was originally auto-generated from the legacy Phase 0 codebase
> (Express + jsdom + `lib/crawler.ts`). It is now hand-maintained to reflect the
> rewritten Hono + cheerio + per-language scraper architecture from Phases 1 and 2.
> If GSD's codebase mapper regenerates it from stale source files, restore from this version.

### Pattern overview

- **Hono HTTP server** wrapping a **typed library function** (`getHoroscope`).
- **Per-source scraper adapters** behind a single `HoroscopeScraper` interface, registered in a service-layer language map.
- **Cache-aside disk cache** keyed on `(language, sign, date)`.
- **Discriminated typed errors** (`HoroscopeError` with `code: 'NETWORK' | 'PARSE' | 'VALIDATION' | 'NOT_FOUND'`).
- Native Node `fetch` + cheerio for parsing — no Express, no jsdom, no superagent.

### Layers

| Layer | File(s) | Responsibility |
|---|---|---|
| Library entry | `src/index.ts` | Re-exports `getHoroscope`, `HoroscopeError`, and the public types. The only thing consumers import from `horoscopefree`. |
| HTTP server | `src/server.ts` | Hono app exported as `app`. Defines three routes (`GET /horoscope/:lang/:sign/:date`, `GET /horoscope/:lang/:sign`, `GET /health`), date aliasing (`today`, `yesterday`), error → status mapping, and an `import.meta.url`-gated `serve(...)` bootstrap so the file works both as a standalone process and as an importable module. |
| Service / orchestration | `src/service.ts` | `getHoroscope` — input validation (sign/date/language/future-date), language → scraper dispatch via the registry, cache-aside read/write, typed error wrapping. Owns D-13 (no stale-cache fallback on fresh failure). |
| Cache | `src/cache.ts` | Atomic disk cache. `cacheKey(language, sign, date)` → `<HOROSCOPE_CACHE_DIR>/<lang>/<sign>/<date>.json`. Writes via `<key>.tmp` + `fs.rename`. Auto-recovers from corrupt files by removing them on parse error. |
| Scrapers | `src/scrapers/{en,pt,es}.ts` | One adapter per source. Each implements `HoroscopeScraper` (single `scrape(sign, date)` method), owns its `buildUrl`, `extractText`, `User-Agent`, `Accept-Language`, and an **independent module-level throttle** so the three sources never block each other. |
| Scraper interface | `src/scrapers/interface.ts` | Single-method `HoroscopeScraper` contract. Adding a new language is "drop a file in `src/scrapers/`, register in `src/service.ts`". |
| Types | `src/types.ts` | `ZodiacSign` (12 canonical lowercase), `Language` (`'en' \| 'pt' \| 'es'`), `HoroscopeResult`, `HoroscopeError` class + `HoroscopeErrorCode` union. |

### Data flow

```
HTTP request                            Library call
     │                                       │
     ▼                                       │
src/server.ts:resolveDateAlias               │
  (today / yesterday → YYYY-MM-DD)           │
     │                                       │
     ▼                                       ▼
                  src/service.ts:getHoroscope
                          │
                          ▼
              ┌── validate language → 404 NOT_FOUND
              ├── validate sign/date → 400 VALIDATION
              ├── validate not-future → 400 VALIDATION
              ▼
                  cacheKey → cache read
                          │
                ┌─────────┴─────────┐
                │                   │
              hit                  miss
                │                   │
                ▼                   ▼
        return cached      scrapers[language].scrape(sign, date)
        (cached: true)              │
                          ┌─────────┴─────────┐
                          │                   │
                       success              failure
                          │                   │
                          ▼                   ▼
                  cache.write          throw HoroscopeError
                  return fresh         (NETWORK | PARSE)
                  (cached: false)
```

### Key abstractions

| Name | Where | Purpose |
|---|---|---|
| `HoroscopeScraper` | `src/scrapers/interface.ts` | One-method contract every language adapter implements. |
| `HoroscopeResult` | `src/types.ts` | `{ sign, date, language, text, source, cached }` — the only public response shape. |
| `HoroscopeError` | `src/types.ts` | Discriminated typed error. `err.code` narrows to `'NETWORK' \| 'PARSE' \| 'VALIDATION' \| 'NOT_FOUND'`. |
| Scraper registry | `src/service.ts` | `Partial<Record<Language, HoroscopeScraper>>` — adding a language is one line. |
| `cacheKey` | `src/cache.ts` | Pure function `(lang, sign, date) → fs path`. No side effects, no I/O. |
| `__setScraperForTest` | `src/service.ts` | Internal test seam — NOT re-exported from `src/index.ts`. Lets tests inject mocks; returns a restore fn. |

### Entry points

| Entry | Trigger | What it does |
|---|---|---|
| `src/index.ts` | `import { getHoroscope } from 'horoscopefree'` | Library mode — consumer imports the typed function. |
| `src/server.ts` (as module) | `import { app } from 'horoscopefree/server'` | Embedded mode — consumer mounts the Hono `app` into their own host. |
| `src/server.ts` (as process) | `node dist/server.js` or `yarn dev` | Standalone mode — `import.meta.url === file://${process.argv[1]}` check fires `serve(...)` on `PORT` (default 5000). |

### Error handling

- **Service layer is the boundary.** Every public function returns `HoroscopeResult` or throws `HoroscopeError` with a typed `code`. Internal helpers can throw native errors; the service layer catches and re-wraps them so consumers always see a typed error.
- **No stale fallback.** Per D-13, a fresh-fetch failure NEVER falls back to a previously cached result. Misleading data is worse than an explicit error.
- **HTTP layer maps codes → status:** `VALIDATION → 400`, `NOT_FOUND → 404`, `NETWORK → 502`, `PARSE → 502`, unknown → `500 INTERNAL`. The mapping table lives at `src/server.ts:ERROR_STATUS`.

### Project structure

```
src/
├── index.ts             # Library entry — re-exports getHoroscope, HoroscopeError, types
├── types.ts             # ZodiacSign, Language, HoroscopeResult, HoroscopeError, codes
├── cache.ts             # Disk JSON cache (atomic writes, corrupt-file recovery)
├── service.ts           # getHoroscope orchestrator + scraper registry + test seam
├── server.ts            # Hono HTTP server (routes, date aliases, error mapping, bootstrap)
└── scrapers/
    ├── interface.ts     # HoroscopeScraper contract
    ├── en.ts            # horoscope.com adapter (full date archive)
    ├── pt.ts            # joaobidu.com.br adapter (today-only per D-04)
    └── es.ts            # 20minutos.es adapter (~9-day embedded archive)

test/
├── types.test.ts        # Type-shape assertions (compile-time + runtime)
├── cache.test.ts        # Disk cache atomicity, corrupt recovery, env var
├── service.test.ts      # getHoroscope orchestration (validation, cache-aside, mocking)
├── server.test.ts       # Hono routes, status mapping, today/yesterday aliases
├── scraper.test.ts      # EN scraper fixture tests (Phase 1 location)
├── scrapers/
│   ├── pt.test.ts       # PT scraper fixture tests + D-04 today-guard
│   └── es.test.ts       # ES scraper fixture tests + archive lookup
├── fixtures/{en,pt,es}/ # Recorded HTML — offline TDD targets
└── live/                # SCRAPE_LIVE=1-gated smoke tests against real upstream sites

.planning/               # GSD planning artifacts (PROJECT, REQUIREMENTS, ROADMAP, phases)
```

### Architecture decisions

The two phase context files capture every design decision with rationale and alternatives considered:

- `.planning/phases/01-foundation-en-scraper-and-distribution/01-CONTEXT.md` — Phase 1 (D-01..D-27): stack, validation rules, cache semantics, error mapping, distribution model.
- `.planning/phases/02-pt-es-scrapers/02-CONTEXT.md` — Phase 2 (D-01..D-22): per-source scraper locality, throttle independence, PT today-only (D-04), ES archive extraction, language-type expansion.

When making changes, check the relevant CONTEXT.md before deviating from an existing decision.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
