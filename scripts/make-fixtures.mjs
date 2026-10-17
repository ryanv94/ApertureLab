// Generates deterministic test images into tests/fixtures/. Run: npm run fixtures
import sharp from 'sharp';
import piexif from 'piexifjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = new URL('../tests/fixtures/', import.meta.url);
mkdirSync(out, { recursive: true });
const path = (n) => new URL(n, out);

const solid = (width, height, background, quality = 85) =>
  sharp({ create: { width, height, channels: 3, background } }).jpeg({ quality }).toBuffer();

function withExif(jpeg, { zeroth = {}, exif = {} }) {
  const bytes = piexif.insert(piexif.dump({ '0th': zeroth, Exif: exif }), jpeg.toString('binary'));
  return Buffer.from(bytes, 'binary');
}

const { ImageIFD, ExifIFD } = piexif;

// Sony full EXIF
writeFileSync(path('photo-exif.jpg'), withExif(await solid(3000, 2000, '#7a6a58'), {
  zeroth: { [ImageIFD.Make]: 'SONY', [ImageIFD.Model]: 'ILCE-7M4' },
  exif: {
    [ExifIFD.LensModel]: 'FE 24-70mm F2.8 GM II',
    [ExifIFD.FocalLength]: [50, 1],
    [ExifIFD.FNumber]: [28, 10],
    [ExifIFD.ExposureTime]: [1, 250],
    [ExifIFD.ISOSpeedRatings]: 100,
  },
}));

// Nikon with missing lens / aperture
writeFileSync(path('nikon-exif.jpg'), withExif(await solid(1200, 800, '#445566'), {
  zeroth: { [ImageIFD.Make]: 'NIKON CORPORATION', [ImageIFD.Model]: 'NIKON Z 6_2' },
  exif: { [ExifIFD.ExposureTime]: [1, 60], [ExifIFD.ISOSpeedRatings]: 400 },
}));

// Stored 3000x2000 with top 200 rows red; Orientation 6 => displays 2000x3000, red band on the right
const grey = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#808080' } })
  .composite([{ input: { create: { width: 3000, height: 200, channels: 3, background: '#ff0000' } }, top: 0, left: 0 }])
  .jpeg({ quality: 90 }).toBuffer();
writeFileSync(path('portrait-orient6.jpg'), withExif(grey, { zeroth: { [ImageIFD.Orientation]: 6 } }));

writeFileSync(path('pano.jpg'), await solid(9000, 1500, '#3d5a73', 60));
writeFileSync(path('huge-pano.jpg'), await solid(30000, 2000, '#2a2a2a', 30));

// 800x600: transparent left half, opaque blue right half
await sharp({ create: { width: 800, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: { create: { width: 400, height: 600, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } }, left: 400, top: 0 }])
  .png().toFile(path('transparent.png').pathname);

// 300x300 four quadrants
const q = (hex, left, top) => ({ input: { create: { width: 150, height: 150, channels: 3, background: hex } }, left, top });
await sharp({ create: { width: 300, height: 300, channels: 3, background: '#000000' } })
  .composite([q('#E5352B', 0, 0), q('#F2B544', 150, 0), q('#1F3FD1', 0, 150), q('#FFFFFF', 150, 150)])
  .png().toFile(path('palette.png').pathname);

writeFileSync(path('not-image.txt'), 'definitely not an image\n');
console.log('fixtures written');
