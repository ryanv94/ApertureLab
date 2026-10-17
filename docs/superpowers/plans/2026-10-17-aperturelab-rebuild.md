# ApertureLab Darkroom Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the 9 ApertureLab tools + home page as an Astro static site with the "Darkroom" design system, correct maths, full feature set, tests, and GitHub Pages deployment.

**Architecture:** Astro (`build.format: 'file'`) renders one shared `Base.astro` layout and 10 pages to plain `.html` at today's URLs. Each tool is split into a pure `logic.ts` (unit-tested with Vitest) and a `ui.ts` client script that wires DOM to logic. Shared image I/O, formatting, downloads and photographic stop scales live in `src/lib/`. CI runs Vitest + Playwright, then deploys.

**Tech Stack:** Astro 5, TypeScript (strict), hand-written CSS (custom properties, Astro scoped styles), Vitest, Playwright, exifreader, jszip, suncalc, cropperjs, @fontsource-variable/fraunces, @fontsource/ibm-plex-mono, @vite-pwa/astro, sharp (dev only, fixtures/icons).

**Spec:** `docs/superpowers/specs/2026-10-17-aperturelab-rebuild-design.md` — read it alongside this plan; section refs below are `§n`.

## Global Constraints

- Runtime network requests: own origin + New Relic only. No CDN `<script>`/`<link>`, no Google Fonts, no hotlinked images.
- New Relic snippet copied **verbatim** from current `index.html` lines 8–18 (the `<!-- New Relic Browser Monitoring -->` comment through its closing `</script>`), into `Base.astro` `<head>` via `<script is:inline>` / `set:html` so Astro does not touch it.
- Page filenames/URLs unchanged: `index`, `dof-visualizer`, `exposure-calculator`, `resize-watermark`, `exif-frame`, `panorama-splitter`, `color-palette`, `golden-hour`, `print-visualizer`, `selphy-layout` (`.html`).
- Dark theme only. Metric only (print sizes: inch standards + ISO A-sizes).
- Tokens exactly as §4 (`--bg #12100E`, `--surface #1C1916`, `--surface-2 #26221E`, `--line #3A342D`, `--text #EDE6DA`, `--text-dim #A39A8C`, `--accent #E5352B`, `--accent-hi #FF5A4E`, `--amber #F2B544`, `--ok #8FBF6A`, `--warn #F2B544`, `--bad #E5352B`).
- Fonts: Fraunces (display/numerals), IBM Plex Mono (UI/data); no Inter/Roboto/Arial/system-ui as primary.
- No `alert()`/`confirm()`. Errors render inline with `role="alert"`.
- All motion inside `@media (prefers-reduced-motion: no-preference)`.
- Privacy copy, verbatim: "Your photos are processed entirely on your device and are never uploaded. We use anonymous analytics to improve the site."
- Every `localStorage` access wrapped in try/catch.
- Heavy libraries (exifreader, jszip, cropperjs, suncalc) loaded via dynamic `import()` from the page that needs them.

## Review Focus

1. **Huge images** (e.g. 30000×4000 panorama, 100 MP photo): expect a capped-size warning, never a blank canvas or tab crash → test in Task 3 (`guardCanvasSize`) and Task 8 (pano native-res cap).
2. **Odd EXIF**: Make `"NIKON CORPORATION"`, `"OM Digital Solutions"`, `"samsung"`, ExposureTime `0.004`, missing FNumber/Lens → brand still detected, missing fields blank, no "undefined"/"NaN" text → tests in Task 7.
3. **Location timezone ≠ device timezone, DST days, polar day/night**: times shown in the location's tz, correct across DST, explicit "Sun does not rise/set" message → tests in Task 10.
4. **Transparent PNG exported as JPEG**: transparent areas become the matte/white, not black → test in Task 3 (`exportCanvas` with `background`), used by Tasks 6, 7, 8, 12.
5. **Phone portraits with EXIF Orientation 6**: displayed and exported upright everywhere → Playwright test in Task 13 using `portrait-orient6.jpg`.

---

### Task 1: Project scaffold, test harness, fixtures

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `src/pages/index.astro` (placeholder), `scripts/make-fixtures.mjs`, `tests/fixtures/*`, `tests/e2e/smoke.spec.ts`
- Move: `CNAME` → `public/CNAME`
- Create: `public/robots.txt` (`User-agent: *` / `Allow: /` / `Sitemap:` omitted)
- Delete: `.DS_Store`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test` (vitest run), `test:e2e` (playwright), `fixtures`; fixture files listed below; Playwright `baseURL` serving `dist/` via `astro preview` on port 4321.

- [ ] **Step 1:** `npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git`, keep existing files. Install runtime deps: `exifreader jszip suncalc cropperjs @fontsource-variable/fraunces @fontsource/ibm-plex-mono`; dev deps: `vitest @playwright/test sharp @vite-pwa/astro @types/suncalc`. `npx playwright install chromium`.
- [ ] **Step 2:** `astro.config.mjs`: `site: 'https://aperturelab.cc'`, `build: { format: 'file' }`, `trailingSlash: 'never'`. Add `.gitignore` (`node_modules`, `dist`, `.astro`, `test-results`, `playwright-report`, `.DS_Store`).
- [ ] **Step 3:** `scripts/make-fixtures.mjs` (sharp) writes to `tests/fixtures/`:
  - `photo-exif.jpg` 3000×2000, EXIF: Make `SONY`, Model `ILCE-7M4`, LensModel `FE 24-70mm F2.8 GM II`, FocalLength 50, FNumber 2.8, ExposureTime 1/250, ISO 100
  - `nikon-exif.jpg` 1200×800, Make `NIKON CORPORATION`, Model `NIKON Z 6_2`, no LensModel, no FNumber
  - `portrait-orient6.jpg` pixel data 3000×2000 with Orientation=6 (displays 2000×3000); top 200 rows of stored pixels solid red, rest grey — so when displayed upright (rotated 90° CW) the red band is along the right edge
  - `pano.jpg` 9000×1500; `huge-pano.jpg` 30000×2000 (low quality, small file)
  - `transparent.png` 800×600, fully transparent left half, opaque blue right half
  - `palette.png` 300×300, four equal quadrants `#E5352B`, `#F2B544`, `#1F3FD1`, `#FFFFFF`
  - `not-image.txt`
  Run `npm run fixtures`, commit outputs.
- [ ] **Step 4: Write failing smoke test** `tests/e2e/smoke.spec.ts`: for each of the 10 page paths, `page.goto(path)` returns 200 and collects zero `console.error`/`pageerror`. Route `**/*nr-data.net/**` and `**/js-agent.newrelic.com/**` to abort in a shared `test.beforeEach` fixture (`tests/e2e/fixtures.ts`, exported `test`), which all e2e specs import.
- [ ] **Step 5:** Run `npm run build && npm run test:e2e` → FAIL (9 pages 404).
- [ ] **Step 6:** Add placeholder `.astro` pages for the 9 tools (just an `<h1>`). Rerun → PASS.
- [ ] **Step 7:** Commit `chore: scaffold Astro project with Vitest, Playwright and fixtures`.

---

### Task 2: Darkroom design system + Base layout + navigation

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/layouts/Base.astro`, `src/components/SiteNav.astro`, `src/components/SiteFooter.astro`, `src/components/FilmStrip.astro`, `src/components/ToolHeader.astro`, `src/data/tools.ts`
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Produces:
  - `tools: ToolMeta[]` from `src/data/tools.ts` — `type ToolMeta = { slug: string; frame: string; name: string; short: string; blurb: string }`; order: dof-visualizer `01` "Depth of Field", exposure-calculator `02` "Exposure & ND", resize-watermark `03` "Resize & Watermark", exif-frame `04` "EXIF Frame", panorama-splitter `05` "Panorama Splitter", color-palette `06` "Colour Palette", golden-hour `07` "Golden Hour", print-visualizer `08` "Print DPI", selphy-layout `09` "SELPHY Magnets". `short` is the nav label; `blurb` one line.
  - `<Base title description slug?>` layout with default slot; sets `<title>{title} · ApertureLab</title>`, meta description, canonical, `theme-color #12100E`.
  - `<ToolHeader frame name lede />` — frame number + Fraunces h1 + lede.
  - `<FilmStrip code? />` — decorative divider (sprockets + edge code), `aria-hidden="true"`.
  - Utility classes in `base.css`: `.panel`, `.panel-grid` (controls column 22rem + preview, stacks < 960px), `.label`, `.readout` (Fraunces, tabular-nums, `--amber`), `.develop` (load reveal; children get `--i` index for 60ms stagger), `.visually-hidden`.

- [ ] **Step 1: Write failing test** `tests/e2e/layout.spec.ts`:
  - every page: `nav a[aria-current="page"]` matches its slug (home: none); `footer` contains the privacy copy verbatim; `head` contains the string `NREUM`; no `link[href*="fonts.googleapis"]` and no `script[src^="http"]`.
  - viewport 360×740: `document.documentElement.scrollWidth <= 360` on every page; menu button `[aria-controls="site-menu"]` opens overlay listing 9 tool links, Esc closes it and returns focus to the button.
  - tab from page top: first focusable is "Skip to content", focused element has non-`none` outline.
- [ ] **Step 2:** Run `npm run build && npx playwright test layout` → FAIL.
- [ ] **Step 3:** Implement tokens/base CSS per §4 (grain: inline SVG `feTurbulence` data URI at 4% opacity on `body::before`, fixed; safelight: radial-gradient of `--accent` at 12% alpha from top centre). Fonts imported from fontsource in `Base.astro` (`@fontsource-variable/fraunces/full.css` for `opsz`/`SOFT` axes; Plex Mono 400/500/600). Desktop nav ≥ 768px: wordmark "Aperture**Lab**" in Fraunces + tool links using `short`, current link gets red index tick (`::before`) and `aria-current`. Mobile: menu button → full-screen `<dialog id="site-menu">` contact-sheet grid of frames. Footer: privacy copy, GitHub link `https://github.com/ryanv94/ApertureLab`, build date (`new Date().toISOString().slice(0,10)` at build). Update all placeholder pages to use `Base`.
- [ ] **Step 4:** Rerun → PASS. Also run smoke spec → PASS.
- [ ] **Step 5:** Commit `feat: Darkroom design system, base layout and navigation`.

---

### Task 3: Shared libraries and form components

**Files:**
- Create: `src/lib/format.ts`, `src/lib/stops.ts`, `src/lib/image.ts`, `src/lib/download.ts`, `src/lib/storage.ts`, `src/lib/url-state.ts`
- Create components: `DropZone.astro`, `Slider.astro`, `NumberField.astro`, `Select.astro`, `Segmented.astro`, `Readout.astro`, `Button.astro`, `ErrorBox.astro`, `Modal.astro`, and `src/lib/toast.ts`
- Test: `tests/unit/format.test.ts`, `tests/unit/stops.test.ts`, `tests/unit/image.test.ts`, `tests/unit/download.test.ts`

**Interfaces:**
- Produces (`src/lib/format.ts`):
  - `formatShutter(sec: number): string` — `<1` → `1/${round(1/s)}s`; `1 ≤ s < 10` → one decimal, trailing `.0` dropped (`"2.5s"`, `"8.2s"`, `"1s"`); `10 ≤ s < 60` → integer `"30s"`; `60 ≤ s < 3600` → `"4m 16s"` (seconds zero-padded); `≥ 3600` → `"2h 19m"` (minutes zero-padded).
  - `formatDistance(mm: number): string` — `Infinity` → `"∞"`; `< 1000` → centimetres, integer when ≥ 100 mm else 1 decimal (`"45 cm"`, `"8.5 cm"`); else metres with 2 decimals `"2.73 m"`; ≥ 100 m → 0 decimals.
  - `formatBytes(n: number): string` → `"842 KB"`, `"3.4 MB"`.
- Produces (`src/lib/stops.ts`): `type Stop = { label: string; value: number; ev: number }`
  - `SHUTTER_THIRDS: Stop[]` 30s → 1/8000 nominal labels (30,25,20,15,13,10,8,6,5,4,3.2,2.5,2,1.6,1.3,1,0.8,0.6,0.5,0.4,0.3,1/4 … 1/8000 standard series); `value` = exact `2^(-ev)` seconds where `ev` is thirds from 1s (`ev = i/3` offset so 1s → 0).
  - `APERTURE_THIRDS: Stop[]` f/0.95 then f/1 → f/32 nominal (1,1.1,1.2,1.4,1.6,1.8,2,2.2,2.5,2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16,18,20,22,25,29,32); `value` = exact `2^(ev/2)` except f/0.95 (`value 0.95`).
  - `APERTURE_FULL: Stop[]` subset whose `ev` is integer (plus 0.95).
  - `ISO_THIRDS: Stop[]` 50 → 102400 standard series; `value` = `100·2^(ev)` exact.
- Produces (`src/lib/image.ts`):
  - `ACCEPTED_TYPES: string[]`; `validateFile(f: File): { ok: true } | { ok: false; message: string }` — non-image → `"<name> isn't an image file."`; HEIC/HEIF → message containing `"HEIC"` and `"Safari"`.
  - `loadImage(f: File): Promise<ImageBitmap>` — `createImageBitmap(f, { imageOrientation: 'from-image' })`; throws `Error` with friendly message on decode failure.
  - `fitWithin(w, h, maxEdge): { width: number; height: number }`.
  - `guardCanvasSize(w, h): { width; height; capped: boolean }` — caps longest edge to 16384 and area to 268_435_456, preserving ratio.
  - `exportCanvas(c: HTMLCanvasElement | OffscreenCanvas, type: 'image/jpeg'|'image/png'|'image/webp', quality?: number, background?: string): Promise<Blob>` — when `type` is JPEG and `background` given (default `#FFFFFF`), composites onto that colour first.
  - `setJpegDpi(blob: Blob, dpi: number): Promise<Blob>` — if bytes 2–3 are `FFE0` with `JFIF\0` identifier, set units byte (offset 13) = 1 and X/Y density (14–17, big-endian) = dpi; otherwise insert a JFIF APP0 after SOI.
- Produces (`src/lib/download.ts`): `downloadBlob(blob: Blob, filename: string): void`; `downloadZip(files: { name: string; blob: Blob }[], zipName: string): Promise<void>` (dynamic-imports jszip); `baseName(filename: string): string`.
- Produces (`src/lib/storage.ts`): `load<T>(key: string, fallback: T): T`, `save(key: string, value: unknown): void` — keys prefixed `al:`, try/catch.
- Produces (`src/lib/url-state.ts`): `readParams(): URLSearchParams`, `writeParams(obj: Record<string, string|number>): void` (uses `history.replaceState`).
- Produces (`src/lib/toast.ts`): `toast(message: string, kind?: 'info'|'ok'|'error'): void` — single `aria-live="polite"` region appended to body.
- Components (props): `DropZone {id, multiple?, label}` renders `<button>` + hidden `<input type=file>`, handles drag/drop/paste, dispatches `CustomEvent<'files', File[]>` named `files` on its root; `Slider {id, label, min, max, step, value, unit?}` (native range + live value `<output>`); `NumberField {id,label,min,max,step,value,unit?}`; `Select {id,label,options:{value,label}[],value?}`; `Segmented {id,label,options,value}` (radio group); `Readout {id,label,value?, tone?:'amber'|'ok'|'warn'|'bad'}` with `aria-live="polite"`; `Button {variant:'primary'|'ghost', type?, id?}`; `ErrorBox {id}` (hidden `role="alert"` region; helper `showError(id, msg)`/`clearError(id)` exported from `src/lib/errors.ts`); `Modal {id,title}` native `<dialog>` with close button, Esc closes.

- [ ] **Step 1: Write failing tests:**
  - `formatShutter`: `1/250 → "1/250s"`, `8.192 → "8.2s"`, `1 → "1s"`, `30 → "30s"`, `256 → "4m 16s"`, `8388.608 → "2h 19m"`, `3600 → "1h 00m"`.
  - `formatDistance`: `2729.46 → "2.73 m"`, `Infinity → "∞"`, `450 → "45 cm"`, `150000 → "150 m"`.
  - stops: `SHUTTER_THIRDS[0].label === "30s"`, last `"1/8000s"`, length 55; entry `1/125` has `|value − 1/128| < 1e-9`; `APERTURE_THIRDS` contains labels `"f/0.95"`, `"f/2.8"`, `"f/32"`; `ISO_THIRDS` first `50`, last `102400`, contains `100`; consecutive `ev` differ by `1/3`.
  - image: `fitWithin(6000,4000,2048) → {2048,1365}`; `guardCanvasSize(30000,2000)` → `{16384,1092,capped:true}`; `guardCanvasSize(20000,20000)` → area ≤ 268_435_456, `capped:true`; `validateFile` on `new File([], 'a.heic', {type:'image/heic'})` → message contains `"HEIC"`; on text file → `ok:false`.
  - `setJpegDpi`: given a minimal byte array `FFD8 FFE0 0010 4A464946 00 0101 00 0001 0001 0000 FFD9`, result bytes[13] === 1, bytes[14..15] = `0x012C`, bytes[16..17] = `0x012C`; given `FFD8 FFD9` (no APP0) result starts `FFD8FFE0` and contains density 300.
  - `baseName('IMG_001.final.JPG') === 'IMG_001.final'`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement the libs (vitest environment `happy-dom` for files needing `File`/`Blob`). Implement components with scoped styles using tokens; range slider styled: thin `--line` track, filled portion `--accent` via `--fill` custom property set in a tiny shared script `src/lib/slider-fill.ts`, square thumb.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: shared image, format, stop-scale libs and form components`.

---

### Task 4: Home page (contact sheet)

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/components/ToolFrame.astro`, `src/components/icons/*.astro` (9 line illustrations, inline SVG, `stroke="currentColor"`)
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `tools` (Task 2), `Base`, `FilmStrip`.

- [ ] **Step 1: Write failing test:** home shows h1, 9 `a.tool-frame` links whose `href`s equal `${slug}.html` in `tools` order, each containing its frame number and name; privacy block contains the privacy copy.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement per §5.10: Fraunces headline (e.g. "Tools for the darkroom you carry in your browser."), one-line on-device processing lede, film strip of 9 frames (sprocket rails top/bottom, edge code `▸ 01A` per frame), grease-pencil hover/focus mark: SVG ellipse with `stroke-dasharray` draw animation in `--accent`. `.develop` staggered reveal.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: contact-sheet home page`.

---

### Task 5: Depth of Field

**Files:**
- Create: `src/tools/dof/logic.ts`, `src/tools/dof/diagram.ts`, `src/tools/dof/ui.ts`
- Modify: `src/pages/dof-visualizer.astro`
- Test: `tests/unit/dof.test.ts`, `tests/e2e/dof.spec.ts`

**Interfaces:**
- Consumes: `APERTURE_THIRDS`, `APERTURE_FULL`, `formatDistance`, `readParams/writeParams`.
- Produces: `SENSORS: { id: string; label: string; crop: number }[]` (`ff` 1.0, `apsc` 1.5, `apsc-canon` 1.6, `mft` 2.0, `one-inch` 2.7, `gfx` 0.79, `custom`); `cocFor(crop: number, mode: 'default'|'print'|'custom', customUm?: number): number` (mm; default `0.030/crop`, print `0.020/crop`); `computeDof({ focalMm, n, distanceMm, cocMm }): { hyperfocal; near; far; total; front; behind }` (mm; `far`/`total`/`behind` = `Infinity` when distance ≥ hyperfocal); `renderDiagram(svg: SVGSVGElement, r: DofResult, distanceMm: number): void`.

- [ ] **Step 1: Write failing unit tests:** `computeDof({50, 2.8, 3000, 0.030})` → hyperfocal ≈ 29811.9 (±0.5), near ≈ 2729.46, far ≈ 3330.08, total ≈ 600.62, front ≈ 270.54, behind ≈ 330.08; distance = 40000 with same lens → `far === Infinity`, `total === Infinity`, `near` finite and < 40000; `cocFor(1.5,'default') ≈ 0.02`; `cocFor(1,'custom',25) === 0.025`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement logic with spec formulas (§5.1). Page: controls per §5.1 (focal Slider + NumberField synced; aperture Slider over index of chosen scale with full/⅓ Segmented; distance slider maps 0–1000 linearly to log10(100mm)…log10(1,000,000mm), plus NumberField in metres); five Readouts; diagram SVG `viewBox="0 0 800 220"` with log distance axis ticks (0.5, 1, 2, 5, 10, 20, 50, 100 m, ∞), sharp-zone band in `--amber` at 18% fill, subject marker in `--accent`. State ↔ URL params `s,f,n,d,c`.
- [ ] **Step 4:** Run unit → PASS.
- [ ] **Step 5: e2e:** load `dof-visualizer.html?s=ff&f=50&n=2.8&d=3` → near readout `"2.73 m"`, far `"3.33 m"`; set distance field to `40` → far `"∞"`; changing focal updates URL `f=`.
- [ ] **Step 6:** Build + run e2e → PASS. Commit `feat: depth of field tool`.

---

### Task 6: Exposure & ND

**Files:**
- Create: `src/tools/exposure/logic.ts`, `src/tools/exposure/timer.ts`, `src/tools/exposure/ui.ts`
- Modify: `src/pages/exposure-calculator.astro`
- Test: `tests/unit/exposure.test.ts`, `tests/unit/timer.test.ts`, `tests/e2e/exposure.spec.ts`

**Interfaces:**
- Consumes: `SHUTTER_THIRDS`, `APERTURE_THIRDS`, `ISO_THIRDS`, `formatShutter`.
- Produces: `ND_PRESETS: { label: string; stops: number }[]` (ND2 1, ND4 2, ND8 3, ND16 4, ND32 5, ND64 6, ND400 8.6, ND1000 10, ND2000 11, ND4000 12, ND32000 15, ND64000 16, ND1000000 20); `ev100(shutterS, n, iso): number` = `log2(n²/t) − log2(iso/100)`; `targetShutter({ baseS, baseN, baseIso, targetN, targetIso, filterStops }): number` = `baseS · 2^(filterStops + log2(targetN²/baseN²) + log2(baseIso/targetIso))`; `class BulbTimer { constructor(durationMs: number, now?: () => number); start(); pause(); reset(); remainingMs(): number; get state(): 'idle'|'running'|'paused'|'done'; onTick?: (ms:number)=>void; onDone?: ()=>void }` — remaining derived from `now()` deltas, not tick counts.

- [ ] **Step 1: Write failing tests:** `ev100(1/125, 8, 100) ≈ 12.97` (±0.01); `targetShutter({1/125, 8, 100, 8, 100, 10})` → `8.192`; with `filterStops 20` → `8388.608`; `{1/125, 8, 100, 16, 100, 0}` → `0.032`; `{1/125, 8, 100, 8, 400, 0}` → `0.002`. BulbTimer with injected clock: start at t=0, duration 10000; advance clock to 4000 → `remainingMs() === 6000`; pause, advance to 9000, resume → still 6000; advance 6000 more → state `done`, `onDone` called once.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. UI: metered Selects; filter stack = chip list with "Add ND" Select (presets + "Custom stops" NumberField 0–30) and CPL Slider 0–2 step 0.1 (default 1.5, off by default via checkbox); target aperture/ISO Selects; big Fraunces readout of result shutter + EV100 + total filter stops. Timer (shown when result ≥ 1s): SVG ring (`stroke-dashoffset` from remaining), Start/Pause/Reset buttons; `requestAnimationFrame` tick; Web Audio: short 880 Hz beep at 10s, 3, 2, 1 remaining and 1320 Hz long beep at done; `navigator.vibrate?.([200,100,200])` at done; Wake Lock acquired while running, released on pause/done, re-acquired on `visibilitychange` if running. Each API feature-detected.
- [ ] **Step 4:** Run unit → PASS.
- [ ] **Step 5: e2e:** set base 1/125, f/8, ISO 100; add ND1000 → readout `"8.2s"`; add ND1000000 instead → `"2h 19m"`; with result `8.2s`, click Start, `page.clock` fast-forward 9s → ring shows done state and no dialog event fired (`page.on('dialog')` count 0).
- [ ] **Step 6:** Run → PASS. Commit `feat: exposure and ND calculator with bulb timer`.

---

### Task 7: EXIF Frame (+ brand logos)

**Files:**
- Create: `scripts/fetch-logos.mjs`, `public/logos/*.svg`, `src/tools/exif-frame/brands.ts`, `src/tools/exif-frame/exif.ts`, `src/tools/exif-frame/layout.ts`, `src/tools/exif-frame/ui.ts`
- Modify: `src/pages/exif-frame.astro`
- Test: `tests/unit/exif-brands.test.ts`, `tests/unit/exif-layout.test.ts`, `tests/e2e/exif-frame.spec.ts`

**Interfaces:**
- Consumes: `DropZone`, `loadImage`, `exportCanvas`, `downloadBlob`, `formatShutter`.
- Produces: `BRANDS: { id: string; label: string; logo: string; match: RegExp }[]` (ids: canon, sony, nikon, fujifilm, panasonic, olympus, om-system, leica, pentax, ricoh, hasselblad, apple, google, samsung, dji); `detectBrand(make?: string, model?: string): string | null`; `type ExifFields = { make: string; model: string; lens: string; focal: string; aperture: string; shutter: string; iso: string; date: string }` (empty strings when missing); `readExif(file: File): Promise<ExifFields>`; `cleanModel(make: string, model: string): string` (strips duplicated make prefix, e.g. `"NIKON Z 6_2"` → `"Z 6_2"`, `"Canon EOS R5"` stays `"EOS R5"`); `settingsLine(f: ExifFields): string` → `"50mm  f/2.8  1/250s  ISO 100"`, omitting empty parts; `computeFrame({ imgW, imgH, layout: 'bar'|'polaroid'|'even', thicknessPct: number }): { canvasW; canvasH; image: Rect; caption: Rect }` where `type Rect = {x;y;w;h}` and thickness is % of the short edge.

- [ ] **Step 1:** `scripts/fetch-logos.mjs` downloads each Wikimedia SVG listed in the `brandLogos` map in the current `exif-frame.html` (keep that file until Task 15) into `public/logos/<id>.svg`; Google uses `https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg` instead of the Vecteezy PNG. Normalise each SVG: remove fixed width/height, keep viewBox. Commit SVGs. (Dev-time only; runtime loads `/logos/<id>.svg` from own origin.)
- [ ] **Step 2: Write failing tests:** `detectBrand('NIKON CORPORATION','NIKON Z 6_2') === 'nikon'`; `('OM Digital Solutions','OM-1') === 'om-system'`; `('OLYMPUS CORPORATION','E-M1') === 'olympus'`; `('samsung','SM-S918B') === 'samsung'`; `('Google','Pixel 8 Pro') === 'google'`; `('FUJIFILM','X-T5') === 'fujifilm'`; `('Panasonic','DC-S5M2') === 'panasonic'`; `('RICOH IMAGING COMPANY, LTD.','PENTAX K-3 Mark III') === 'pentax'` (model wins over make); `('RICOH IMAGING COMPANY, LTD.','GR III') === 'ricoh'`; `('Hasselblad','L2D-20c') === 'hasselblad'`; `('','') === null`. `settingsLine` with only iso `"100"` → `"ISO 100"`; with all empty → `""` (never contains `"undefined"`/`"NaN"`). `computeFrame({3000,2000,'even',5})` → border 100px each side, `canvasW 3200`; `'bar'` → bottom caption height > side border; `thicknessPct 0` with `'bar'` → image rect at x=0 and caption still has height > 0.
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4:** Implement. `readExif` dynamic-imports exifreader, reads `Make, Model, LensModel, FocalLength, FNumber, ExposureTime, ISOSpeedRatings|PhotographicSensitivity, DateTimeOriginal`, using numeric `.value` (rationals → number) and formatting via `formatShutter`/`f/${n}`. UI per §5.4: fields editable; brand Select (Auto + BRANDS); layout Segmented; matte Select (Pure White `#FFFFFF`, Warm White `#F5F0E6`, Slate `#2B2F36`, Black `#0B0B0B`) + keyline checkbox; thickness Slider 0–25; type Segmented (Modern/Fine Art/Technical). Logos drawn from `/logos/<id>.svg` via `Image`; on dark mattes draw logo through an offscreen canvas with `globalCompositeOperation='source-in'` filled `#EDE6DA`. Await `document.fonts.load()` for the chosen face before drawing. Preview canvas downscaled; export re-renders at full res; JPEG q 0.95 or PNG.
- [ ] **Step 5:** Run unit → PASS.
- [ ] **Step 6: e2e:** drop `photo-exif.jpg` → model field `"ILCE-7M4"`, brand auto shows Sony, settings field `"50mm  f/2.8  1/250s  ISO 100"`; drop `nikon-exif.jpg` → lens field empty, no field value contains `undefined`; click download → file `photo-exif-framed.jpg` whose decoded width = 3000 + 2·border; network log has no request to a host other than localhost.
- [ ] **Step 7:** Run → PASS. Commit `feat: EXIF frame tool with bundled brand logos`.

---

### Task 8: Panorama Splitter

**Files:**
- Create: `src/tools/panorama/logic.ts`, `src/tools/panorama/ui.ts`
- Modify: `src/pages/panorama-splitter.astro`
- Test: `tests/unit/panorama.test.ts`, `tests/e2e/panorama.spec.ts`

**Interfaces:**
- Consumes: `loadImage`, `guardCanvasSize`, `exportCanvas`, `downloadZip`, `downloadBlob`.
- Produces: `RATIOS: { id; label; w; h }[]` (`4x5` 4:5, `1x1`, `191x1` 1.91:1, `9x16`, `custom`); `planSlices({ imgW, imgH, count, ratio /* w/h */, mode: 'fit'|'crop', offset /* 0..1 */ }): { slideW: number; slideH: number; slices: { src: Rect; dst: Rect }[] }` — in source pixels: `crop`: slide height = imgH, slide width = imgH·ratio, total band width = count·slideW; if band > imgW, slide height reduces to `imgW/(count·ratio)` and the band is centred vertically by `offset`; else band is positioned horizontally by `offset`. `fit`: slideW = imgW/count, slideH = slideW/ratio; image band height `min(imgH, slideH)` centred, `dst` letterboxed when `imgH < slideH`. `planCover({ imgW, imgH, ratio }): { canvasW; canvasH; dst: Rect }` (letterbox whole image). `outputScale(slideW: number, size: 'ig'|'native'): number` (`ig` → 1080/slideW; `native` → 1, capped via `guardCanvasSize`).

- [ ] **Step 1: Write failing tests:** `planSlices({9000,1500,3,0.8,'crop',0.5})` → slideW 1200, slideH 1500, slice[0].src.x = (9000−3600)/2 = 2700, slices contiguous (`src[i+1].x === src[i].x + 1200`); `offset 0` → first x = 0; `{9000,1500,10,1,'crop',0.5}` → band 15000 > 9000 so slideH = 900, slideW 900, first src.x 0, src.y = 300; `'fit'` with `{9000,1500,3,0.8}` → slideW 3000, slideH 3750, dst letterboxed (dst.h = 1500, dst.y = 1125); `planCover({9000,1500,0.8})` → canvas ratio 0.8 and dst.w = canvasW; `outputScale(1200,'ig') === 0.9`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. UI per §5.5: ratio Segmented + custom W:H fields; count stepper 2–10; mode Segmented (Crop/Fit) with offset Slider shown in Crop mode; cover checkbox + matte Segmented (Black/White/Blur — blur = image scaled to fill + `filter: blur(40px)` + darken 30%, then letterboxed image on top); output Segmented (Instagram 1080 / Native). Preview: phone-frame strip, slides side-by-side with numbered seams, horizontally scrollable with scroll-snap. Downloads: ZIP `<base>-carousel.zip` containing `slide-00-cover.jpg` (if cover), `slide-01.jpg`…; per-slide download buttons. Huge images: when native output would exceed limits, `guardCanvasSize` caps and an inline warning shows.
- [ ] **Step 4:** Run unit → PASS.
- [ ] **Step 5: e2e:** drop `pano.jpg`, ratio 4:5, count 3, output IG → 3 preview slides; ZIP download contains 3 files (read via jszip in node) each 1080×1350; enable cover → 4 files; drop `huge-pano.jpg` with Native → warning visible, no page error.
- [ ] **Step 6:** Run → PASS. Commit `feat: panorama splitter honouring aspect ratio with cover slide`.

---

### Task 9: Colour Palette

**Files:**
- Create: `src/tools/palette/kmeans.ts`, `src/tools/palette/color.ts`, `src/tools/palette/worker.ts`, `src/tools/palette/histogram.ts`, `src/tools/palette/ui.ts`
- Modify: `src/pages/color-palette.astro`
- Test: `tests/unit/palette.test.ts`, `tests/e2e/palette.spec.ts`

**Interfaces:**
- Produces: `rgbToLab(r,g,b): [L,a,b]`, `labToRgb(L,a,b): [r,g,b]`, `toHex(r,g,b): string` (lowercase `#rrggbb`); `kmeans(pixels: Uint8ClampedArray, k: number, opts?: { maxIter?: number /*20*/; seed?: number }): { hex: string; rgb: [number,number,number]; share: number }[]` sorted by share desc, k-means++ init with seeded PRNG (mulberry32), skips pixels with alpha < 128; `computeHistograms(data: Uint8ClampedArray, step?: number): { r: Uint32Array; g: Uint32Array; b: Uint32Array; l: Uint32Array }`; worker message `{ pixels, k }` → `{ swatches }` or `{ error }`; `paletteCss(sw): string` → `:root {\n  --palette-1: #e5352b;\n …}`.

- [ ] **Step 1: Write failing tests:** build a 4-quadrant pixel array matching `palette.png` colours; `kmeans(pixels, 4, {seed:1})` returns 4 swatches whose hex set equals `{#e5352b,#f2b544,#1f3fd1,#ffffff}` (each within ΔE < 2 → compare via Lab distance) and each share ≈ 0.25; `rgbToLab(255,255,255)` ≈ `[100,0,0]`; `computeHistograms` on 10 pure-red pixels → `r[255] === 10`, `g[0] === 10`; `paletteCss` output contains `--palette-1:`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Worker via `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`. UI per §5.6: k Slider 3–10 (default 6, re-run on change, debounced 150ms); swatch tiles show colour, HEX, `rgb()`, share %; click → `navigator.clipboard.writeText` (fallback: select text in a readonly input + toast "Press Ctrl/Cmd+C"); histograms on canvases sized by `devicePixelRatio`; export: PNG strip (image on top, swatches below, hex labels in Plex Mono), "Copy CSS", "Download JSON".
- [ ] **Step 4:** Run unit → PASS.
- [ ] **Step 5: e2e:** drop `palette.png`, set k=4 → 4 swatches with hex texts including `#e5352b`; click first swatch (grant clipboard permissions) → toast visible, zero page errors.
- [ ] **Step 6:** Run → PASS. Commit `feat: k-means colour palette with histograms`.

---

### Task 10: Golden Hour (+ offline cities)

**Files:**
- Create: `scripts/build-cities.mjs`, `public/data/cities.json`, `src/tools/golden-hour/sun.ts`, `src/tools/golden-hour/cities.ts`, `src/tools/golden-hour/timeline.ts`, `src/tools/golden-hour/ui.ts`
- Modify: `src/pages/golden-hour.astro`
- Test: `tests/unit/sun.test.ts`, `tests/unit/cities.test.ts`, `tests/e2e/golden-hour.spec.ts`

**Interfaces:**
- Produces:
  - `cities.json` shape: `{ tz: string[]; admin: string[]; c: [name: string, cc: string, adminIdx: number, lat: number, lon: number, tzIdx: number, pop: number][] }`, lat/lon rounded to 3 dp.
  - `type City = { name; country; admin; lat; lon; tz; pop }`; `parseCities(json): City[]`; `searchCities(list: City[], q: string, limit = 8): City[]` (case/diacritic-insensitive prefix match on name first, then substring; ties by pop desc); `nearestCity(list: City[], lat, lon): City` (haversine).
  - `type Phase = 'night'|'blue'|'golden'|'day'`; `type SunDay = { blueAm?: [Date,Date]; goldenAm?: [Date,Date]; sunrise?: Date; noon: Date; sunset?: Date; goldenPm?: [Date,Date]; bluePm?: [Date,Date]; dayLengthMin: number; polar: null | 'day' | 'night' }`; `sunDay(dateISO: string /* YYYY-MM-DD in tz */, lat, lon, tz: string): Promise<SunDay>` — uses SunCalc with custom times `addTime(-4,'blueEnd','blueStartPm')` and `addTime(6,'goldenAmEnd','goldenPmStart')`; blue = −6°→−4°, golden = −4°→+6°; computes for local noon of that date in `tz` (derive UTC instant via `Intl.DateTimeFormat` offset lookup).
  - `formatInTz(d: Date, tz: string): string` → `"HH:MM"` 24-h.
  - `buildTimeline(day: SunDay, tz: string): { phase: Phase; startMin: number; endMin: number }[]` covering 0–1440 local minutes.

- [ ] **Step 1:** `scripts/build-cities.mjs`: download `https://download.geonames.org/export/dump/cities15000.zip` and `admin1CodesASCII.txt`, take top 5000 by population plus all `PPLC` rows, emit compact JSON above. Run it; assert output ≤ 150 KB gzipped (`gzip -c public/data/cities.json | wc -c`); commit JSON. Add GeoNames CC-BY 4.0 attribution line to the Golden Hour page.
- [ ] **Step 2: Write failing tests:**
  - London `2026-06-21`, 51.5074, −0.1278, `Europe/London`: `formatInTz(sunrise) === "04:43"` ±2 min, sunset `"21:21"` ±2 min.
  - Dublin `2026-12-21`, 53.3498, −6.2603, `Europe/Dublin`: sunrise `"08:39"` ±2, sunset `"16:08"` ±2.
  - Sydney `2026-01-15`, −33.8688, 151.2093, `Australia/Sydney` evaluated with `process.env.TZ='America/New_York'`: sunrise between `"05:50"` and `"06:05"` (proves tz ≠ device tz).
  - DST: London `2026-03-29` sunrise in `"06:38"`–`"06:48"` (BST already applied).
  - Ordering on London summer: `blueAm[0] < blueAm[1] ≤ goldenAm[0] < sunrise < goldenAm[1] < noon < goldenPm[0] < sunset < goldenPm[1] ≤ bluePm[0] < bluePm[1]` (ensures blue ≠ sunset bug).
  - Tromsø 69.6492, 18.9553, `Europe/Oslo`: `2026-06-21` → `polar === 'day'`, sunrise undefined; `2026-12-21` → `polar === 'night'`.
  - `buildTimeline` segments contiguous from 0 to 1440.
  - cities: `searchCities(list,'dub')[0].name === 'Dublin'`; `searchCities(list,'sao')` includes `São Paulo`; `nearestCity(list, 53.35, -6.26).tz === 'Europe/Dublin'` (use a 3-city fixture list for unit tests, not the full JSON).
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4:** Implement. UI per §5.7: location panel with "Use my location" button (10s timeout; on deny/timeout → inline message + focus city search; never silent default), combobox city search (ARIA 1.2 combobox pattern, lazy-fetches `/data/cities.json` on first focus), "Enter coordinates" disclosure with lat/lon NumberFields; date input (default today in tz); displayed "Times in {tz}"; readouts for all §5.7 times + day length; 24-h timeline band (night `#0E0D12`, blue `#2B4C8C`, golden `--amber`, day `#C9B99A`) with hour ticks and "now" marker when date is today in tz; countdown "Golden hour in 2h 14m" to next golden/blue start (updates each minute). Last location persisted via `storage.save('golden:loc', …)`. Polar → message "The sun doesn't set on this date" / "doesn't rise".
- [ ] **Step 5:** Run unit → PASS.
- [ ] **Step 6: e2e:** context with geolocation permission denied → error message visible and city input focused; type "Dub", choose Dublin, set date `2026-12-21` → sunrise readout matches `/08:3\d|08:40/`, timezone label `Europe/Dublin`; context with `geolocation {lat: 51.5074, lon: -0.1278}` granted → tz label `Europe/London`.
- [ ] **Step 7:** Run → PASS. Commit `feat: golden hour tracker with offline city search and timezone-aware times`.

---

### Task 11: Print DPI

**Files:**
- Create: `src/tools/print/logic.ts`, `src/tools/print/ui.ts`
- Modify: `src/pages/print-visualizer.astro`
- Test: `tests/unit/print.test.ts`, `tests/e2e/print.spec.ts`

**Interfaces:**
- Produces: `PRINT_SIZES: { id; label; wIn; hIn; unit: 'in'|'mm' }[]` — inch: 4×6, 5×7, 8×10, 8×12, 11×14, 12×18, 16×20, 20×30, 24×36; mm (stored converted to inches, label in mm): A6 105×148, A5 148×210, A4 210×297, A3 297×420, A2 420×594, A1 594×841; `rateDpi(dpi): 'excellent'|'good'|'acceptable'|'low'` (≥300, ≥200, ≥150, else); `printFit({ imgW, imgH, wIn, hIn, orientation: 'auto'|'portrait'|'landscape' }): { dpi: number /* rounded */; cropPct: number /* % of image area lost, 1 dp */; src: Rect /* centred */; printW: number; printH: number }`; `maxPrint(imgW, imgH, dpi): { wIn: number; hIn: number; wMm: number; hMm: number }`.

- [ ] **Step 1: Write failing tests:** `printFit({6000,4000,8,10,'auto'})` → landscape 10×8, src 5000×4000, `dpi === 500`, `cropPct === 16.7`, `src.x === 500`; `printFit({6000,4000,4,6,'auto'})` → dpi 1000, cropPct 0; `rateDpi(299) === 'good'`, `rateDpi(150) === 'acceptable'`, `rateDpi(149) === 'low'`; `maxPrint(6000,4000,300)` → `{20, 13.33…}` in, wMm ≈ 508.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. UI per §5.8: DropZone; image dims readout; orientation Segmented (Auto/Portrait/Landscape); custom size (W, H, unit Segmented in/mm); results table of all sizes (size, DPI, rating pill coloured ok/warn/bad, crop %) — row click selects; selected size shows crop preview: image with darkened outside region and draggable crop rectangle (pointer events, constrained to image; updates `src`); readouts for max size at 300/150 DPI in both in and cm.
- [ ] **Step 4:** Run unit → PASS.
- [ ] **Step 5: e2e:** drop `photo-exif.jpg` (3000×2000) → row "8 × 10 in" shows `250` and "Good"; row "A4" visible; dragging crop rectangle changes its `x` style.
- [ ] **Step 6:** Run → PASS. Commit `feat: print DPI visualiser with size table and draggable crop`.

---

### Task 12: Resize & Watermark

**Files:**
- Create: `src/tools/resize/logic.ts`, `src/tools/resize/render.ts`, `src/tools/resize/ui.ts`, `src/lib/cropper.ts`
- Modify: `src/pages/resize-watermark.astro`
- Test: `tests/unit/resize.test.ts`, `tests/e2e/resize.spec.ts`

**Interfaces:**
- Consumes: `DropZone {multiple}`, `loadImage`, `guardCanvasSize`, `exportCanvas`, `downloadBlob`, `downloadZip`, `baseName`, `formatBytes`, `Modal`.
- Produces: `SIZE_PRESETS: { id; label; w: number|null; h: number|null }[]` (original null/null, ig-square 1080×1080, ig-portrait 1080×1350, ig-story 1080×1920, fhd 1920×1080, uhd 3840×2160, custom); `planResize({ srcW, srcH, targetW, targetH, mode: 'fit'|'fill'|'crop', crop?: Rect }): { canvasW; canvasH; src: Rect; dst: Rect }` — fit: contain within target (canvas = scaled image size, no padding); fill: cover + centre crop; crop: uses given src rect scaled to target width, target height derived from crop ratio when `targetH` null; `type Watermark = { kind: 'none'|'text'|'image'; text?; font?: 'serif'|'mono'|'sans'; sizePct: number; color: string; opacity: number; shadow: boolean; image?: ImageBitmap; position: 'tl'|'tc'|'tr'|'ml'|'mc'|'mr'|'bl'|'bc'|'br'; marginPct: number }`; `watermarkAnchor(canvasW, canvasH, boxW, boxH, position, marginPct): { x; y }`; `renderOne(bitmap, plan, wm): HTMLCanvasElement`; `outputName(original: string, w, h, ext): string` → `"IMG_1-1080x1350.jpg"`; `openCropper(bitmap, aspect: number|null): Promise<Rect|null>` in `src/lib/cropper.ts` (Modal + cropperjs dynamic import; rotate ±90 buttons; returns crop rect in source px plus `rotation`) — reused by Task 13.

- [ ] **Step 1: Write failing tests:** `planResize({4000,3000,1080,1080,'fill'})` → canvas 1080×1080, src `{500,0,3000,3000}`; `'fit'` → canvas 1080×810; preset original (`targetW` = srcW) → canvas 4000×3000; `watermarkAnchor(1000,800,200,50,'br',3)` → `{776, 726}` (margin = 3% of short edge = 24); `'mc'` → `{400,375}`; `outputName('IMG_1.HEIC.jpg',1080,1350,'webp') === 'IMG_1.HEIC-1080x1350.webp'`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. UI per §5.3: multi-file DropZone with thumbnail strip (select active, remove); preset Select + custom W/H with aspect-lock toggle; mode Segmented (Fit/Fill/Crop — Crop opens `openCropper` per image, crop stored per image); watermark Segmented (None/Text/Image) with fields; 3×3 position grid (radio buttons); format Segmented (JPEG/PNG/WebP) + quality Slider 50–100 (hidden for PNG); estimated size readout (debounced 300ms `exportCanvas` of active image → `formatBytes`); "Download" (single) / "Download all (.zip)" (multiple). JPEG export passes `background '#FFFFFF'`.
- [ ] **Step 4:** Run unit → PASS.
- [ ] **Step 5: e2e:** drop `photo-exif.jpg`, preset IG Portrait, Fill, download JPEG → file `photo-exif-1080x1350.jpg`, decoded 1080×1350; add text watermark "© Test" → estimated size readout changes; drop `transparent.png`, preset Original, JPEG download → decode in page, pixel (100,300) has r,g,b ≥ 250 (Review Focus 4); drop `transparent.png` + `pano.jpg` together → "Download all" yields zip with 2 entries; drop `not-image.txt` → inline error contains "isn't an image".
- [ ] **Step 6:** Run → PASS. Commit `feat: resize and watermark with presets, crop, batch export`.

---

### Task 13: SELPHY Magnet Layout

**Files:**
- Create: `src/tools/selphy/logic.ts`, `src/tools/selphy/ui.ts`
- Modify: `src/pages/selphy-layout.astro`
- Test: `tests/unit/selphy.test.ts`, `tests/e2e/selphy.spec.ts`, `tests/e2e/orientation.spec.ts`

**Interfaces:**
- Consumes: `openCropper` (Task 12), `loadImage`, `exportCanvas`, `setJpegDpi`, `downloadBlob`.
- Produces: constants `SHEET_W = 1800`, `SHEET_H = 1200`, `BASE_SLOT_W = 531`, `BASE_SLOT_H = 827`, `SLOT_CENTRES_X = [600, 1200]`, `SLOT_ASPECT = 45/70`; `CALIBRATIONS = { selphy: { w: 95.7, h: 97.2, label: '47×72mm → 45×70mm' }, none: { w: 100, h: 100, label: '1:1 Digital Unscaled' } }`; `slotRects(wPct: number, hPct: number): [Rect, Rect]` — `w = round(531·wPct/100)`, `h = round(827·hPct/100)`, `x = centreX − w/2`, `y = (1200 − h)/2`; `cutMarks(r: Rect, offset = 12, len = 24): [x1,y1,x2,y2][]` (8 segments as in current `drawCutGuides`).

- [ ] **Step 1: Write failing tests:** `slotRects(95.7, 97.2)` → each `{w:508, h:804}`, rect0 `x === 346`, `y === 198`, rect1 `x === 946`; `slotRects(100,100)` → `w 531, h 827, x0 334.5`; `cutMarks` returns 8 segments, first `[r.x-12, r.y, r.x-36, r.y]`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. UI per §5.9: calibration Segmented (SELPHY calibrated / Exact 1:1 / Custom) with W/H Sliders 85–105 step 0.1 shown for Custom; two slot cards (upload via DropZone → `openCropper(bitmap, 45/70)` → stored cropped bitmap; Re-crop, Remove); "Use same image for both" checkbox; trim outline checkbox; sheet preview canvas (white sheet, empty slots drawn as dashed placeholders labelled "Magnet 1/2 · 45 × 70 mm"); Download disabled until ≥1 slot filled → `exportCanvas(jpeg, 0.98)` → `setJpegDpi(…, 300)` → `selphy-magnets.jpg`.
- [ ] **Step 4:** Run unit → PASS.
- [ ] **Step 5: e2e:** upload `photo-exif.jpg` to slot 1, accept crop → download enabled; download → 1800×1200 JPEG whose bytes[13..17] are `01 01 2C 01 2C`.
- [ ] **Step 6: Orientation test** (Review Focus 5) `tests/e2e/orientation.spec.ts`: for Print DPI, Resize (Original preset, PNG), and EXIF Frame, drop `portrait-orient6.jpg` → reported/decoded dimensions are portrait (2000 wide × 3000 tall for Print/Resize) and in the Resize PNG output pixel (1950, 1500) is red (r > 200, g < 60) while pixel (50, 1500) is not.
- [ ] **Step 7:** Run → PASS. Commit `feat: SELPHY magnet layout rebuilt with shared cropper and 300 DPI export`.

---

### Task 14: PWA / offline + manifest + icons

**Files:**
- Create: `public/icons/icon.svg`, `scripts/make-icons.mjs` → `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`; `src/lib/pwa.ts`
- Modify: `astro.config.mjs`, `src/layouts/Base.astro`
- Delete: `manifest.json`, `sw.js` (root)
- Test: `tests/e2e/pwa.spec.ts`

**Interfaces:**
- Consumes: `toast` (Task 3).

- [ ] **Step 1: Write failing test:** after load, `navigator.serviceWorker.ready` resolves; `link[rel=manifest]` JSON has `name "ApertureLab"`, `theme_color "#12100E"`, `background_color "#12100E"`, icons 192/512/maskable; with `context.setOffline(true)` after first load and SW control, reloading `dof-visualizer.html` still renders the h1.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: icon SVG = aperture-blade mark in `--accent` on `--bg` with a small `--amber` dot; sharp renders PNGs. `@vite-pwa/astro` with `registerType: 'autoUpdate'`, `workbox.globPatterns: ['**/*.{html,js,css,svg,png,woff2}']`, `runtimeCaching` for `/data/cities.json` (StaleWhileRevalidate), `cleanupOutdatedCaches: true`, `navigateFallback: null`. `src/lib/pwa.ts` registers via `virtual:pwa-register` and calls `toast('New version available — reload to update')` on `onNeedRefresh`. Remove old `manifest.json`/`sw.js`.
- [ ] **Step 4:** Run → PASS. Commit `feat: versioned offline PWA with new icons`.

---

### Task 15: CI/CD, README, legacy removal, final verification

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `readme.md` → rewrite
- Delete: root `*.html` (10 legacy files)

- [ ] **Step 1:** `deploy.yml`: triggers `pull_request` and `push: branches [main]`; job `test`: checkout, setup-node 22 (cache npm), `npm ci`, `npm test`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, upload `dist` via `actions/upload-pages-artifact@v3`; job `deploy` (needs test, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, permissions `pages: write, id-token: write`, environment `github-pages`) uses `actions/deploy-pages@v4`. Concurrency group `pages`.
- [ ] **Step 2:** Rewrite `readme.md`: what each tool does (matching §5 only), privacy copy verbatim, stack, local dev (`npm install`, `npm run dev`, `npm test`, `npm run test:e2e`), one-time setup "Settings → Pages → Source: GitHub Actions", regenerating fixtures/logos/cities/icons scripts, GeoNames attribution, MIT licence.
- [ ] **Step 3:** Delete the 10 legacy root HTML files (`git rm`). Confirm no file under `src/` references them.
- [ ] **Step 4: Verify:** `npm ci && npm test && npm run build && npm run test:e2e` → all pass. Then `grep -rEo 'https?://[a-z0-9.-]+' dist --include=*.html --include=*.js | grep -vE 'aperturelab.cc|nr-data.net|newrelic.com|github.com/ryanv94|w3.org|geonames.org' | sort -u` → empty output (only allowed hosts). Check `dist/` contains all 10 `.html` names and `CNAME`.
- [ ] **Step 5:** Commit `chore: CI deploy workflow, rewritten README, remove legacy pages`. Push branch and open PR to `main` with summary + test evidence (ask the user before pushing).
