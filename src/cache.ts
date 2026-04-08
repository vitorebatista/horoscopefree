// Disk-based JSON cache layer.
// CACHE-01: keys are {language}/{sign}/{YYYY-MM-DD}.json
// CACHE-02: existence check via fs.access (cache-aside)
// CACHE-03: atomic write via temp file + fs.rename
// CACHE-04: no expiry — cached entries valid forever
// D-14:     directory defaults to ${process.cwd()}/.cache/horoscopes, overridable via HOROSCOPE_CACHE_DIR
// D-15:     corrupt files (parse error) are auto-recovered: warn, unlink, treat as miss
// D-17:     write to <key>.tmp then fs.rename for POSIX-atomic write
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { HoroscopeResult, Language, ZodiacSign } from './types.js';

/**
 * Resolves the cache root directory.
 * Reads HOROSCOPE_CACHE_DIR env var fresh on each call so tests can manipulate it.
 */
export function getCacheDir(): string {
  return (
    process.env.HOROSCOPE_CACHE_DIR ?? join(process.cwd(), '.cache', 'horoscopes')
  );
}

/**
 * Builds the absolute path for a given (language, sign, date) cache entry.
 * Format: <CACHE_DIR>/<language>/<sign>/<YYYY-MM-DD>.json
 */
export function cacheKey(language: Language, sign: ZodiacSign, date: string): string {
  return join(getCacheDir(), language, sign, `${date}.json`);
}

/**
 * Existence check via fs.access — does NOT read file contents.
 * Returns true on success, false on any error (ENOENT, EACCES, etc.).
 */
async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a cached HoroscopeResult.
 * Returns null on miss (file does not exist).
 * Returns null AND deletes the file on parse failure (D-15: auto-recovery).
 */
export async function read(path: string): Promise<HoroscopeResult | null> {
  if (!(await exists(path))) return null;
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf-8');
  } catch {
    // Race: file existed at access() but vanished or became unreadable.
    return null;
  }
  try {
    return JSON.parse(raw) as HoroscopeResult;
  } catch {
    // D-15: corrupt cache file — log warning, remove, treat as miss.
    console.error(`[horoscopefree:cache] Corrupt cache file removed: ${path}`);
    await fs.unlink(path).catch(() => undefined);
    return null;
  }
}

/**
 * Atomic write: creates parent directories, writes to <path>.tmp, then renames.
 * fs.rename is atomic on POSIX when source and destination are on the same filesystem.
 * If HOROSCOPE_CACHE_DIR points to a different filesystem, fs.rename may throw EXDEV
 * (Pitfall 5 in research). We do NOT catch EXDEV here — the consumer should keep
 * the cache on a single filesystem.
 */
export async function write(path: string, result: HoroscopeResult): Promise<void> {
  const dir = dirname(path);
  await fs.mkdir(dir, { recursive: true });
  // Use a unique suffix so concurrent writes to the same key don't share a tmp file.
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(result, null, 2), 'utf-8');
  await fs.rename(tmp, path);
}
