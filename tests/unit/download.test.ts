import { it, expect } from 'vitest';
import { baseName } from '../../src/lib/download';

it('baseName strips only the last extension', () => {
  expect(baseName('IMG_001.final.JPG')).toBe('IMG_001.final');
  expect(baseName('noext')).toBe('noext');
});
