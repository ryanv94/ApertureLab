export type Brand = { id: string; label: string; logo: string; match: RegExp };

// Order matters: model-specific sub-brands (Pentax under Ricoh, OM System vs Olympus) come first.
export const BRANDS: Brand[] = [
  { id: 'pentax', label: 'Pentax', logo: 'logos/pentax.svg', match: /pentax/i },
  { id: 'om-system', label: 'OM System', logo: 'logos/om-system.svg', match: /om digital|om system|^om-\d/i },
  { id: 'olympus', label: 'Olympus', logo: 'logos/olympus.svg', match: /olympus/i },
  { id: 'canon', label: 'Canon', logo: 'logos/canon.svg', match: /canon/i },
  { id: 'sony', label: 'Sony', logo: 'logos/sony.svg', match: /sony|^ilce|^dsc-/i },
  { id: 'nikon', label: 'Nikon', logo: 'logos/nikon.svg', match: /nikon/i },
  { id: 'fujifilm', label: 'Fujifilm', logo: 'logos/fujifilm.svg', match: /fuji/i },
  { id: 'panasonic', label: 'Panasonic Lumix', logo: 'logos/panasonic.svg', match: /panasonic|lumix/i },
  { id: 'leica', label: 'Leica', logo: 'logos/leica.svg', match: /leica/i },
  { id: 'ricoh', label: 'Ricoh', logo: 'logos/ricoh.svg', match: /ricoh/i },
  { id: 'hasselblad', label: 'Hasselblad', logo: 'logos/hasselblad.png', match: /hasselblad/i },
  { id: 'apple', label: 'Apple', logo: 'logos/apple.svg', match: /apple|iphone/i },
  { id: 'google', label: 'Google', logo: 'logos/google.svg', match: /google|pixel/i },
  { id: 'samsung', label: 'Samsung', logo: 'logos/samsung.svg', match: /samsung/i },
  { id: 'dji', label: 'DJI', logo: 'logos/dji.svg', match: /\bdji\b/i },
];

/** Picks a brand from EXIF Make/Model; the model is checked first so sub-brands win. */
export function detectBrand(make = '', model = ''): string | null {
  for (const text of [model, make]) {
    if (!text.trim()) continue;
    const hit = BRANDS.find((b) => b.match.test(text.trim()));
    if (hit) return hit.id;
  }
  return null;
}

/** "NIKON Z 6_2" with make "NIKON CORPORATION" → "Z 6_2". */
export function cleanModel(make: string, model: string): string {
  const first = make.trim().split(/\s+/)[0];
  if (first && model.toLowerCase().startsWith(first.toLowerCase() + ' ')) return model.slice(first.length).trim();
  return model.trim();
}

export type ExifFields = { make: string; model: string; lens: string; focal: string; aperture: string; shutter: string; iso: string; date: string };

/** "50mm  f/2.8  1/250s  ISO 100", omitting whatever is missing. */
export function settingsLine(f: ExifFields): string {
  return [
    f.focal && `${f.focal}mm`,
    f.aperture && `f/${f.aperture}`,
    f.shutter,
    f.iso && `ISO ${f.iso}`,
  ].filter(Boolean).join('  ');
}
