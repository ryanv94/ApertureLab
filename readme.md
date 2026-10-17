# ApertureLab

Free photography tools that run entirely in your browser — **[aperturelab.cc](https://aperturelab.cc)**

> Your photos are processed entirely on your device and are never uploaded. We use anonymous analytics to improve the site.

## The tools

| # | Tool | What it does |
|---|------|--------------|
| 01 | **Depth of Field** | Near/far limits, total depth, hyperfocal distance and front/behind split for full frame, APS-C (1.5× / 1.6×), Micro Four Thirds, 1″, 44×33 medium format or any crop factor. ⅓- or full-stop apertures from f/0.95 to f/32, adjustable circle of confusion, to-scale diagram, shareable URL. |
| 02 | **Exposure & ND** | Stack any number of ND filters (ND2 – ND1000000 or custom stops) plus a polariser, change aperture/ISO, get the new shutter time (`1/250s` … `2h 19m`). Bulb timer with countdown ring, beeps, vibration and screen wake lock. |
| 03 | **Resize & Watermark** | Instagram square/portrait/story, Full HD, 4K or custom sizes; fit, fill or hand-drawn crop; text or logo watermark in 9 positions; JPEG / PNG / WebP with quality and live file-size estimate; batch ZIP download. |
| 04 | **EXIF Frame** | Reads camera, lens and exposure from the photo's EXIF, auto-detects the brand logo (15 brands, bundled locally) and renders a caption bar, Polaroid or even-border matte at full resolution. Every caption field is editable. |
| 05 | **Panorama Splitter** | Slices a panorama into 2–10 seamless 4:5, 1:1, 1.91:1, 9:16 or custom slides, with crop-or-fit control, an optional overview cover slide (black, white or blurred background) and ZIP export. |
| 06 | **Colour Palette** | k-means clustering in Lab colour space (3–10 colours, off the main thread), coverage per colour, RGB and luminance histograms; export a PNG strip, CSS variables or JSON. |
| 07 | **Golden Hour** | Morning and evening golden and blue hour, sunrise, solar noon, sunset and day length for any date, in the location's own time zone. GPS, offline search over ~5,000 cities, or coordinates. Handles polar day and night. |
| 08 | **Print DPI** | Effective DPI and quality rating at every common inch and ISO A size, crop lost per size, largest print at 300 and 150 DPI, and a draggable crop preview. |
| 09 | **SELPHY Magnets** | Two 45×70 mm magnet photos on a 6×4 in Canon SELPHY sheet, pre-shrunk for borderless overscan (or exact / custom), with crop, rotate and cut marks. Exports 1800×1200 JPEG tagged at 300 DPI. |

Everything works offline once visited, and the site can be installed as an app. On phones, finished images open full size so you can press and hold to save them to Photos / the gallery (or use Share → Save Image).

## How it's built

- [Astro](https://astro.build) static site — every page is plain HTML at the same URL as before (`dof-visualizer.html`, …).
- TypeScript tool logic (`src/tools/<tool>/logic.ts`) kept free of the DOM and unit-tested; `ui.ts` wires it to the page.
- Hand-written CSS ("Darkroom" design system in `src/styles/`), Fraunces and IBM Plex Mono self-hosted.
- Libraries bundled at build time, never loaded from a CDN: ExifReader, JSZip, SunCalc, Cropper.js.
- Workbox service worker generated after each build (`integrations/service-worker.mjs`).
- Analytics: New Relic browser agent (snippet in `src/layouts/newrelic.html`).

## Develop

Requires Node 22.22+.

```bash
npm install
npm run dev          # http://localhost:4321
npm test             # unit tests (Vitest)
npm run build        # static site in dist/
npm run test:e2e     # browser tests (Playwright) against the built site
```

First-time Playwright setup: `npx playwright install chromium`.

### Regenerating bundled data

These run at development time only; their outputs are committed.

| Command | Produces |
|---------|----------|
| `npm run fixtures` | Test images in `tests/fixtures/` |
| `node scripts/fetch-logos.mjs` | Brand logos in `public/logos/` (from Wikimedia Commons) |
| `node scripts/build-cities.mjs` | `public/data/cities.json` (from GeoNames) |
| `node scripts/make-icons.mjs` | App icons in `public/icons/` from `icon.svg` |

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: unit tests → build → browser tests → publish to GitHub Pages. Pull requests run the same checks without deploying.

**One-time setup:** in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The custom domain is kept by `public/CNAME`.

## Credits

- City data © [GeoNames](https://www.geonames.org/), CC BY 4.0.
- Camera brand logos from Wikimedia Commons; trademarks belong to their owners.

## Licence

MIT.
