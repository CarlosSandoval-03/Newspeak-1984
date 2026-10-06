// The Strings type only checks keys; list lengths, placeholders, and text limits need runtime checks.

import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';

// Every string in a strings tree, keyed by its path, e.g. "slogans.murals.0".
function strings(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node as object).flatMap(([key, value]) =>
    strings(value, path ? `${path}.${key}` : key),
  );
}

const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g))].sort();

describe('es matches en', () => {
  const english = new Map(strings(en));
  const spanish = new Map(strings(es));

  it('has the same keys and list lengths', () => {
    expect([...spanish.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('uses the same placeholders in every string', () => {
    for (const [path, text] of english) {
      expect(placeholders(spanish.get(path) ?? ''), path).toEqual(placeholders(text));
    }
  });
});

describe.each([
  ['en', en],
  ['es', es],
])('%s', (_, language) => {
  it('uses no glyphs missing from the fonts', () => {
    for (const [path, text] of strings(language)) expect(text, path).not.toMatch(/[←→↑↓№]/);
  });

  it('fits slogans in 2 lines of 22 characters, ground slogans in 12', () => {
    for (const [path, text] of strings(language.slogans, 'slogans')) {
      const max = path.startsWith('slogans.ground') ? 12 : 22;
      const lines = text.split('\n');
      expect(lines.length, path).toBeLessThanOrEqual(2);
      for (const line of lines) expect(line.length, path).toBeLessThanOrEqual(max);
    }
  });

  // The band slides as the line is typed, so length is bounded by reading time, not width.
  it('keeps diary lines to 80 characters', () => {
    for (const [i, page] of language.diary.pages.entries()) {
      expect(page.line.length, `diary.pages.${i}.line`).toBeLessThanOrEqual(80);
    }
  });
});
