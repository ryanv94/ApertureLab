# ApertureLab Rebuild — Design Spec

Date: 2026-10-17 · Branch: `redesign/darkroom` · Status: awaiting review

## 1. Goal

Redesign and rebuild the ApertureLab photography tool suite (aperturelab.cc) so that every tool is correct, complete, accessible and visually distinctive, while remaining a static site on GitHub Pages where all image processing happens in the visitor's browser.

### Success criteria

- All 9 tools deliver the feature set in §5; known bugs (§2) are fixed and covered by tests.
- No network requests other than to the site's own origin and New Relic (fonts, libraries, logos, city data all self-hosted).
- Existing URLs (`/index.html`, `/dof-visualizer.html`, …) continue to resolve.
- Every page passes: no console errors on load, keyboard-operable, WCAG AA contrast, usable at 360px width.
- CI runs unit + browser tests and blocks deploy on failure.

## 2. Decisions & context

| Topic | Decision |
|---|---|
| Analytics | **Keep New Relic snippet exactly as-is** (session replay included), placed verbatim in shared `<head>` |
| Build | Astro static build, deployed by GitHub Action |
| Scope | Same 9 tools, done properly (features in §5) |
| Brand logos | Bundled SVGs in repo (no hotlinking) |
| Aesthetic | "Darkroom", dark theme only |
| Units | Metric only; print sizes keep inch standards alongside ISO A-sizes |
| Golden Hour location | GPS + manual lat/long + bundled offline city list |
| Styling | Hand-written CSS with custom-property tokens + Astro scoped styles; no Tailwind |

Bugs in current code to be fixed: blue hour shows sunset time; panorama aspect ratio ignored; colour-palette swatch click throws (`AppState` undefined); `alert()` used for timer; service worker never invalidates cache; README describes features that don't exist; EXIF logos hotlinked from Wikimedia/Vecteezy.

## 3. Architecture

```
src/
  layouts/Base.astro          head (New Relic verbatim, fonts, manifest), nav, footer, film-edge chrome
  components/                 DropZone, Slider, Select, Segmented, NumberField, Readout,
                              Button, Toast, Modal, FilmStrip, ToolHeader
  pages/
    index.astro               → /index.html
    dof-visualizer.astro      → /dof-visualizer.html   (etc. — same 9 filenames as today)
  tools/<tool>/logic.ts       pure functions, no DOM; unit-tested
  tools/<tool>/ui.ts          DOM wiring, imported by the page as a client script
  lib/image.ts                load/decode/export pipeline
  lib/download.ts             blob download + ZIP helper (JSZip, lazy-loaded)
  lib/format.ts               shared number/time/distance formatting
  styles/tokens.css           design tokens
  styles/base.css             reset, typography, grain, focus styles, motion
public/
  CNAME, logos/*.svg, data/cities.json, icons/*, robots.txt
tests/
  unit/*.test.ts              Vitest
  e2e/*.spec.ts               Playwright
  fixtures/                   test images (with/without EXIF, rotated, panorama)
.github/workflows/deploy.yml
```

- `astro.config.mjs`: `build.format: 'file'` so pages emit as `name.html`; `site: 'https://aperturelab.cc'`.
- Dependencies (bundled, never CDN): `exifreader`, `jszip`, `suncalc`, `cropperjs` (SELPHY + Resize crop box), `@fontsource-variable/fraunces`, `@fontsource/ibm-plex-mono`, `@vite-pwa/astro`. Heavy libs are dynamically imported only on the pages that use them.
- Each page = Base layout + tool markup + one `<script>` importing its `ui.ts`. No UI framework.

### Image pipeline (`lib/image.ts`)

- Input via DropZone: drag-and-drop, paste (Ctrl/Cmd+V), or file picker; supports multiple where the tool allows.
- Validate MIME/extension (JPEG, PNG, WebP, AVIF, GIF, BMP; HEIC only where the browser decodes it).
- Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`.
- Preview canvases are downscaled to ≤ 2048px long edge; exports render from the full-res bitmap.
- Export via `canvas.toBlob(type, quality)`; downloads via object URL, revoked after use.
- Canvas size guard: if output exceeds ~16,384px edge or ~268 MP area, warn and offer a capped size.

## 4. Design system — "Darkroom"

### Tokens

```
--bg:        #12100E   warm black
--surface:   #1C1916
--surface-2: #26221E
--line:      #3A342D
--text:      #EDE6DA   paper
--text-dim:  #A39A8C
--accent:    #E5352B   safelight red (sole interactive accent)
--accent-hi: #FF5A4E
--amber:     #F2B544   results / readouts
--ok:        #8FBF6A   --warn: #F2B544   --bad: #E5352B
```

All text/background pairs verified ≥ 4.5:1 (body) / 3:1 (large, UI borders).

### Typography

- Display & large numerals: Fraunces (variable; use `opsz` + `SOFT` axes), self-hosted, Latin subset.
- UI, labels, data: IBM Plex Mono 400/500/600, self-hosted, Latin subset.
- Numeric readouts use `font-variant-numeric: tabular-nums`.

### Atmosphere & motifs

- Body background: `--bg` + SVG-noise film grain (inline data URI, ~4% opacity) + soft red radial "safelight" glow at top.
- Film-edge strips as section dividers: sprocket-hole rule + edge codes in mono lettering (`▸ 24A`, `APERTURELAB 400`).
- Home page = contact sheet: the 9 tools as numbered frames on a film strip; hover/focus draws a grease-pencil-style red circle/mark (SVG stroke animation).
- Cards are flat surfaces with 1px `--line` borders, small radius (4px) — no glassmorphism, no glows other than safelight.

### Motion

- Page load: staggered "develop" reveal — elements fade from near-black with slight blur/contrast ramp, 60ms stagger.
- Micro-interactions: slider thumb press, button depress, copy confirmation toast.
- All motion disabled under `prefers-reduced-motion: reduce`.

### Navigation

- Desktop: compact top bar — wordmark left, tool links right (abbreviated labels), current tool marked with red index tick.
- Mobile (< 768px): menu button opens full-screen contact-sheet overlay of the 9 tools.
- Footer: privacy statement, GitHub link, version/build date.

### Accessibility

- Native form controls styled (not replaced); every input has a `<label>`.
- `:focus-visible` ring in `--accent`, 2px offset.
- Live results in `aria-live="polite"` regions.
- Modals trap focus and close on Esc. Drop zones are keyboard-activatable buttons.

## 5. Tools

### 5.1 Depth of Field — `dof-visualizer.html`

- Inputs: sensor (FF 1.0, APS-C 1.5, APS-C Canon 1.6, MFT 2.0, 1″ 2.7, GFX 0.79, custom crop); focal length 8–600mm (slider + number); aperture f/0.95–f/32 in full or ⅓ stops (toggle); subject distance 0.1–1000 m on log slider + number; CoC preset (sensor default = 0.030/crop mm, or "Large print" = 0.020/crop, or custom µm).
- Outputs: near limit, far limit (∞ when distance ≥ hyperfocal), total DoF, hyperfocal, front/behind split (% and m).
- Diagram: inline SVG, log-scaled distance axis; camera glyph, subject marker, sharp zone band, hyperfocal tick; labels positioned to avoid overlap.
- Logic: `H = f²/(N·c) + f`; `Dn = s(H−f)/(H+s−2f)`; `Df = s(H−f)/(H−s)` for `s < H`, else ∞.
- State is reflected in the URL query string (shareable).

### 5.2 Exposure & ND — `exposure-calculator.html`

- Metered exposure: shutter 30s–1/8000 (⅓ stops), aperture f/1–f/32 (⅓ stops), ISO 50–102400 (⅓ stops).
- Filters: stack list — add/remove ND chips (ND2…ND1000000; 1–20 stops; also custom stops) and CPL (0–2 stops, default 1.5).
- Target aperture & ISO.
- Outputs: base EV100, total filter stops, resulting shutter time formatted as `1/250s`, `2.5s`, `4m 16s`, `1h 02m`.
- Bulb timer: SVG countdown ring; start/pause/reset; Web Audio beeps at 10s/3-2-1/done; `navigator.vibrate` where available; Screen Wake Lock while running; continues correctly if tab is backgrounded (based on `Date.now()`, not tick counting).

### 5.3 Resize & Watermark — `resize-watermark.html`

- Multiple images accepted; settings apply to all; preview shows selected one.
- Size presets: Original, IG Square 1080×1080, IG Portrait 1080×1350, IG Story 1080×1920, Full HD 1920×1080, 4K 3840×2160, Custom (W/H with aspect lock).
- Fit mode: Fit (contain, no crop), Fill (centre crop), Crop (Cropper.js box, per image).
- Watermark: none / text / image (PNG/SVG). Text: font (Fraunces / Plex Mono / system sans), size % of short edge, colour, opacity, optional shadow. Image: scale %, opacity. Position: 3×3 grid + margin %.
- Export: JPEG / PNG / WebP; quality 50–100; estimated size shown (debounced trial `toBlob`).
- Download single, or ZIP for multiple. Filenames: `<original>-<w>x<h>.<ext>`.

### 5.4 EXIF Frame — `exif-frame.html`

- Read EXIF via ExifReader: Make, Model, LensModel, FocalLength, FNumber, ExposureTime, ISO, DateTimeOriginal. All fields shown as editable inputs; missing fields blank.
- Brand auto-detect from Make/Model (normalised map), manual override select. Logos: Canon, Sony, Nikon, Fujifilm, Panasonic/Lumix, Olympus, OM System, Leica, Pentax, Ricoh, Hasselblad, Apple, Google, Samsung, DJI — SVGs in `public/logos/`, with light/dark variants (or `currentColor` recolouring) to suit matte colour.
- Layouts: Bottom bar (logo + model left, settings right), Polaroid (thick bottom, centred caption), Even border (uniform matte, small centred caption).
- Matte: Pure White, Warm White `#F5F0E6`, Slate, Black; optional fine keyline.
- Border thickness slider 0–25% of short edge; type style: Modern (Plex Mono), Fine Art (Fraunces), Technical (Plex Mono caps).
- Export full-resolution JPEG (q 0.95) or PNG.

### 5.5 Panorama Splitter — `panorama-splitter.html`

- Target ratio: 4:5, 1:1, 1.91:1, 9:16, custom W:H.
- Slide count 2–10 (stepper). Slides span full panorama height; slide width = height × ratio. If `count × slideWidth` ≠ pano width, user picks: **Fit** (scale so slides exactly cover the width; pads top/bottom with matte colour if needed) or **Crop** (centre a band; draggable horizontal offset).
- Optional cover slide: whole panorama letterboxed into target ratio on matte (black/white/blur-fill).
- Output size: 1080px wide per slide (IG) or native resolution.
- Preview: horizontal "phone carousel" strip with slide numbers + seam guides.
- Download ZIP (`slide-01.jpg`…) or individual slides.

### 5.6 Colour Palette — `color-palette.html`

- Downsample to ≤ 400px long edge, run k-means (k-means++ init, Lab space, max 20 iterations) in a Web Worker (module worker via Vite). k = 3–10, default 6.
- Swatches sorted by population; each shows HEX, RGB, % coverage; click copies HEX (toast confirmation; graceful fallback if Clipboard API unavailable).
- Histograms: RGB overlay + luminance, drawn on canvas at devicePixelRatio.
- Export: PNG palette strip (image + swatches), CSS custom properties text, JSON.

### 5.7 Golden Hour — `golden-hour.html`

- Location: "Use my location" (Geolocation, 10s timeout), city search over `public/data/cities.json` (~5,000 most populous GeoNames cities plus every national capital; fields: name, country, admin1, lat, lon, tz index; target ≤ 150 KB gzipped; lazy-loaded on first search focus; GeoNames CC-BY attribution in footer of page), or manual lat/lon.
- Timezone: city's IANA tz; for GPS/manual coords, tz of nearest city in the list. Displayed explicitly. Formatting via `Intl.DateTimeFormat({ timeZone })`.
- Date picker (defaults to today in that tz).
- Outputs (SunCalc): blue hour AM (sun −6° → −4°), golden hour AM (−4° → +6°), sunrise, solar noon, sunset, golden hour PM, blue hour PM, day length. Polar day/night handled with a clear message.
- Visual: 24-hour horizontal band coloured by phase (night / blue / golden / day), "now" marker when date = today, countdown to next golden/blue phase.
- Last-used location remembered in `localStorage` (try/catch guarded).

### 5.8 Print DPI — `print-visualizer.html`

- Sizes: 4×6, 5×7, 8×10, 8×12, 11×14, 12×18, 16×20, 20×30, 24×36 in; A6, A5, A4, A3, A2, A1 (mm); custom (in or mm). Orientation auto-matches image, with manual override.
- Results table: for every size, effective DPI (limited by the cropped dimension), rating (≥300 Excellent, ≥200 Good, ≥150 Acceptable, <150 Low), crop % lost.
- Max print size at 300 and 150 DPI for the image's native ratio.
- Selected size shows crop preview with draggable crop position.

### 5.9 SELPHY Magnet Layout — `selphy-layout.html`

- Preserve current behaviour and constants: two 45×70mm slots on a 6×4in landscape sheet (1800×1200px @300 DPI; base slot 531×827px, centred at x=600 and x=1200); calibration modes "SELPHY calibrated" (current pre-shrink values, 47×72 → 45×70; W 95.7%, H 97.2%), "Exact 1:1", "Custom" (W/H scale sliders). Exact constants copied from existing `selphy-layout.html` during implementation.
- Per slot: upload, crop (Cropper.js, locked 45:70 ratio, rotate ±90°), replace, remove. "Use same image for both" toggle.
- Cut guides: corner crop marks + optional dashed trim outline.
- Export: 1800×1200 JPEG (q 0.98) at 300 DPI (DPI written to JPEG JFIF header so print dialogs size it correctly).

### 5.10 Home — `index.html`

- Hero: Fraunces headline, short line on on-device processing, film-strip contact sheet of 9 tool frames (number, name, one-line description, simple line illustration per tool).
- Privacy statement block.

## 6. Error handling

- Inline, dismissible error messages within the tool panel (not `alert()`), plus `role="alert"`.
- Unsupported/undecodable file → message naming the format; HEIC → explain browser support.
- Oversized output → warning with capped alternative.
- Geolocation denied/timeout → message + focus city search; no silent default location.
- Progressive enhancement: Clipboard, Vibration, Wake Lock, Web Audio, service worker each feature-detected; absent → feature hidden, nothing throws.
- Worker errors surfaced as inline messages.

## 7. Offline / PWA

- `@vite-pwa/astro` generates a Workbox service worker; precache built HTML/CSS/JS/fonts/logos; `cities.json` runtime-cached on first use.
- Cache names include build hash; old caches purged on activate; `registerType: 'autoUpdate'` with a "New version available — reload" toast.
- Web manifest updated to Darkroom colours; real PNG icons (192, 512, maskable) generated from SVG source.

## 8. Privacy copy

- Footer & home: "Your photos are processed entirely on your device and are never uploaded. We use anonymous analytics to improve the site."
- No claim of "zero third-party" anywhere. README updated to match.

## 9. Testing

- **Vitest (unit)** — each `logic.ts`:
  - DoF: values vs published DoF tables (e.g. FF 50mm f/2.8 @ 3m), hyperfocal boundary, ∞ handling.
  - Exposure: stop arithmetic, ND stacking, time formatting.
  - Sun: SunCalc phase derivation vs NOAA reference times for fixed date/locations (±2 min), polar cases.
  - Timezone: nearest-city lookup.
  - Panorama: slice rects for each ratio/mode/count; cover slide geometry.
  - Print: DPI and rating table; max size.
  - SELPHY: slot rectangles at each calibration mode.
  - Palette: k-means on synthetic images with known colours.
  - Brand detection from EXIF Make/Model strings.
- **Playwright (e2e)** — Chromium: each page loads without console errors (New Relic requests blocked in tests); each image tool processes fixture image and triggers a download with expected dimensions; keyboard nav reaches all controls; 360px viewport has no horizontal overflow.

## 10. Deployment

- `.github/workflows/deploy.yml`: on PR → `npm ci`, `npm test`, `npm run build`, Playwright; on push to `main` → same, then `actions/upload-pages-artifact` + `actions/deploy-pages`.
- One-time manual step (documented in README): repo Settings → Pages → Source: "GitHub Actions".
- `CNAME` lives in `public/` so it ships with the build.
- Local: `npm install`, `npm run dev`, `npm test`.

## 11. Out of scope

- Light theme, imperial units, online geocoding, new tools, accounts/sync, analytics changes, i18n.

## 12. Rollout

- All work on `redesign/darkroom`; delivered as a PR for review and testing before merge to `main`. Old root-level HTML files removed in the same PR (replaced by build output).
