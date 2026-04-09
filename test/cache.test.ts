import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import {
  cacheKey,
  getCacheDir,
  read,
  write,
} from '../src/cache.js';
import type { HoroscopeResult } from '../src/types.js';

let tempRoot: string;
let originalEnv: string | undefined;

function fixture(overrides: Partial<HoroscopeResult> = {}): HoroscopeResult {
  return {
    sign: 'aries',
    date: '2026-01-15',
    language: 'en',
    text: 'Today brings unexpected clarity to your morning routine.',
    source:
      'https://www.horoscope.com/us/horoscopes/general/horoscope-archive.aspx?sign=1&laDate=20260115',
    cached: false,
    ...overrides,
  };
}

beforeEach(async () => {
  tempRoot = join(tmpdir(), `horoscope-cache-test-${randomBytes(6).toString('hex')}`);
  await fs.mkdir(tempRoot, { recursive: true });
  originalEnv = process.env.HOROSCOPE_CACHE_DIR;
  process.env.HOROSCOPE_CACHE_DIR = tempRoot;
});

afterEach(async () => {
  if (originalEnv === undefined) {
    delete process.env.HOROSCOPE_CACHE_DIR;
  } else {
    process.env.HOROSCOPE_CACHE_DIR = originalEnv;
  }
  await fs.rm(tempRoot, { recursive: true, force: true });
});

describe('cacheKey', () => {
  it('returns path ending with en/aries/2026-01-15.json', () => {
    const key = cacheKey('en', 'aries', '2026-01-15');
    expect(key.endsWith(join('en', 'aries', '2026-01-15.json'))).toBe(true);
    expect(key.startsWith(tempRoot)).toBe(true);
  });
});

describe('getCacheDir', () => {
  it('honors HOROSCOPE_CACHE_DIR when set', () => {
    expect(getCacheDir()).toBe(tempRoot);
  });

  it('falls back to ${cwd}/.cache/horoscopes when env var is unset', () => {
    delete process.env.HOROSCOPE_CACHE_DIR;
    expect(getCacheDir()).toBe(join(process.cwd(), '.cache', 'horoscopes'));
  });
});

describe('read', () => {
  it('returns null when file does not exist', async () => {
    const path = cacheKey('en', 'aries', '2026-01-15');
    expect(await read(path)).toBeNull();
  });

  it('returns parsed HoroscopeResult after write (round-trip)', async () => {
    const path = cacheKey('en', 'aries', '2026-01-15');
    const result = fixture();
    await write(path, result);
    const loaded = await read(path);
    expect(loaded).toEqual(result);
  });

  it('returns null AND removes file when JSON is corrupt (D-15)', async () => {
    const path = cacheKey('en', 'aries', '2026-01-15');
    await fs.mkdir(join(tempRoot, 'en', 'aries'), { recursive: true });
    await fs.writeFile(path, '{ this is not valid json', 'utf-8');

    const loaded = await read(path);
    expect(loaded).toBeNull();

    // File should have been unlinked by the auto-recovery path
    await expect(fs.access(path)).rejects.toThrow();
  });
});

describe('write', () => {
  it('creates nested parent directories on demand', async () => {
    const path = cacheKey('en', 'pisces', '2025-12-31');
    await write(path, fixture({ sign: 'pisces', date: '2025-12-31' }));
    await expect(fs.access(path)).resolves.toBeUndefined();
  });

  it('does not leave a .tmp file behind after success', async () => {
    const path = cacheKey('en', 'aries', '2026-01-15');
    await write(path, fixture());
    await expect(fs.access(`${path}.tmp`)).rejects.toThrow();
  });

  it('handles concurrent writes to the same key without producing corrupt JSON', async () => {
    const path = cacheKey('en', 'aries', '2026-01-15');
    const r1 = fixture({ text: 'A'.repeat(60) });
    const r2 = fixture({ text: 'B'.repeat(60) });
    await Promise.all([write(path, r1), write(path, r2)]);
    const loaded = await read(path);
    expect(loaded).not.toBeNull();
    expect([r1.text, r2.text]).toContain(loaded?.text);
  });
});
