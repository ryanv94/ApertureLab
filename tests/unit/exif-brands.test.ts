import { describe, it, expect } from 'vitest';
import { detectBrand, cleanModel, settingsLine, BRANDS, type ExifFields } from '../../src/tools/exif-frame/brands';

describe('detectBrand', () => {
  it.each([
    ['NIKON CORPORATION', 'NIKON Z 6_2', 'nikon'],
    ['OM Digital Solutions', 'OM-1', 'om-system'],
    ['OLYMPUS CORPORATION', 'E-M1', 'olympus'],
    ['samsung', 'SM-S918B', 'samsung'],
    ['Google', 'Pixel 8 Pro', 'google'],
    ['FUJIFILM', 'X-T5', 'fujifilm'],
    ['Panasonic', 'DC-S5M2', 'panasonic'],
    ['RICOH IMAGING COMPANY, LTD.', 'PENTAX K-3 Mark III', 'pentax'],
    ['RICOH IMAGING COMPANY, LTD.', 'GR III', 'ricoh'],
    ['Hasselblad', 'L2D-20c', 'hasselblad'],
    ['Canon', 'Canon EOS R5', 'canon'],
    ['SONY', 'ILCE-7M4', 'sony'],
    ['Apple', 'iPhone 15 Pro', 'apple'],
    ['DJI', 'FC3582', 'dji'],
    ['LEICA CAMERA AG', 'LEICA Q3', 'leica'],
  ])('%s / %s → %s', (make, model, id) => expect(detectBrand(make, model)).toBe(id));
  it('returns null when unknown', () => expect(detectBrand('', '')).toBeNull());
  it('every brand has a bundled logo', () => BRANDS.forEach((b) => expect(b.logo).toMatch(/^logos\/[a-z-]+\.(svg|png)$/)));
});

describe('cleanModel', () => {
  it('strips a duplicated make prefix', () => {
    expect(cleanModel('NIKON CORPORATION', 'NIKON Z 6_2')).toBe('Z 6_2');
    expect(cleanModel('Canon', 'Canon EOS R5')).toBe('EOS R5');
    expect(cleanModel('SONY', 'ILCE-7M4')).toBe('ILCE-7M4');
  });
});

const empty: ExifFields = { make: '', model: '', lens: '', focal: '', aperture: '', shutter: '', iso: '', date: '' };

describe('settingsLine', () => {
  it('joins present parts', () =>
    expect(settingsLine({ ...empty, focal: '50', aperture: '2.8', shutter: '1/250s', iso: '100' })).toBe('50mm  f/2.8  1/250s  ISO 100'));
  it('omits missing parts', () => expect(settingsLine({ ...empty, iso: '100' })).toBe('ISO 100'));
  it('is empty with no data', () => {
    const s = settingsLine(empty);
    expect(s).toBe('');
    expect(s).not.toMatch(/undefined|NaN/);
  });
});
