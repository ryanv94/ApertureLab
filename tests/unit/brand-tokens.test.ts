import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '../../src');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// Files that deliberately draw export text in the old faces (user-selectable export typefaces).
const EXPORT_FONT_FILES = new Set([
  'tools/exif-frame/render.ts', 'tools/resize/render.ts', 'tools/selphy/ui.ts',
  'pages/exif-frame.astro', 'pages/resize-watermark.astro', 'pages/selphy-layout.astro',
]);
const files = walk(ROOT).filter((f) => /\.(astro|ts|css|html)$/.test(f) && !/logic\.ts$/.test(f));

const hits = (re: RegExp, skip: (rel: string) => boolean = () => false) =>
  files.flatMap((f) => {
    const rel = relative(ROOT, f);
    if (skip(rel)) return [];
    return readFileSync(f, 'utf8').split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => re.test(line) && !/\/\/ (data colour|export default)/.test(line))
      .map(({ n }) => `${rel}:${n}`);
  });

describe('old Darkroom values are gone from the UI', () => {
  it('has no Darkroom colours', () => {
    expect(hits(/#12100E|#EDE6DA|#e5352b|229[ ,]+53[ ,]+43/i)).toEqual([]);
  });
  it('names Fraunces / IBM Plex only in export-typeface files', () => {
    expect(hits(/IBM Plex|Fraunces/, (rel) => EXPORT_FONT_FILES.has(rel))).toEqual([]);
  });
});
