# ApertureLab × RV Photography Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin ApertureLab with the RV Photography identity (symbol, icons, Basalt/Alpenglow/Fjord palette, Poppins + Lora), dark only, keeping name, URLs and behaviour.

**Architecture:** Almost all change is design tokens, fonts, shared chrome components and the home page. Tool logic, component props and control `id`s are untouched. The Darkroom motifs (grain, red glow, `FilmStrip`, film-edge codes) are replaced by a ridge-line divider.

**Tech Stack:** Astro 7, hand-written CSS, fontsource (`@fontsource/poppins`, `@fontsource/lora`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-02-rv-rebrand-design.md`. Brand pack: `/Users/ry/Logo/claude/RV-Photography-Brand-Pack` (read-only source; copy files, never reference the path).

## Global Constraints

- Dark theme only; metric only; no CDNs or hotlinking (fonts bundled via fontsource).
- Privacy copy (`PRIVACY` in `src/data/tools.ts`) and `src/layouts/newrelic.html` are not touched.
- Page URLs, control `id`s, component props, `a.tool-frame`, `.privacy-block` and tool logic do not change.
- Tokens: `--bg #141A1C`, `--surface #1D2528`, `--surface-2 #263135`, `--line #2E393C`, `--text #EEF1EE`, `--text-dim #A3ADB0`, `--accent #F27A35`, `--accent-hi #F59A62`, `--on-accent #1C2427`, `--fjord #7FB2B6`, `--radius 2px`.
- Alpenglow is never body text; text on accent fills is `--on-accent`.
- Fonts: Poppins 400/500/600 (display + UI), Lora 400 + 400 italic (body, hints, captions). No `--font-mono`; numerals use `font-variant-numeric: tabular-nums`.
- Brand logo rules: symbol ≥ 24px, horizontal lockup ≥ 140px wide, clear space ≥ lens diameter, never on a photo in colour, no effects/outlines/badges.
- Export output defaults do not change; only UI chrome colours move.
- No horizontal scroll at 360px. All motion inside `prefers-reduced-motion: no-preference`.
- Work on `feat/rv-rebrand`; commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never touch `main`; the owner pushes.

## Review Focus

- 360px overflow on every page with wider Poppins (nav bar, tool headers, readouts, panel labels) — layout.spec must pass unmodified.
- Canvas text that names a font (`palette/ui.ts` uses `"IBM Plex Mono"`) falls back silently once the font is removed — must use Poppins and be loaded before drawing.
- Contrast: Alpenglow-on-bg text/links and Basalt-on-Alpenglow buttons ≥ 4.5:1 for text sizes used; `--bad` must stay distinguishable from `--accent` (both warm).
- Footer RV lockup must not shrink below 140px on a 360px viewport and must not overflow.
- Maskable icon keeps its safe zone and the installed-app name stays "ApertureLab".

---

### Task 1: Fonts and design tokens

**Files:**
- Modify: `package.json`, `src/layouts/Base.astro` (imports only), `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/controls.css`
- Create: `tests/e2e/brand.spec.ts`

**Interfaces:**
- Produces: CSS custom properties listed in Global Constraints plus `--font-display: 'Poppins', 'Futura', 'Century Gothic', 'Avenir Next', sans-serif` and `--font-body: 'Lora', 'Iowan Old Style', Georgia, serif`; `--amber` and `--font-mono` are removed (use `--fjord`). Utility `.readout` etc. keep their names.

- [ ] **Step 1: Write the failing test** in `tests/e2e/brand.spec.ts` (import `{ test, expect, PAGES }` from `./fixtures`). `test('uses brand fonts and tokens on every page')`: for each slug in `PAGES` (plus home), goto, then `getComputedStyle(document.body)` must have `fontFamily` containing `Lora`, `h1` `fontFamily` containing `Poppins`, `--bg` = `#141A1C` and `--accent` = `#F27A35` (trimmed, case-insensitive), and `document.fonts.check('500 16px Poppins')` true. Assert `errors` fixture is empty.
- [ ] **Step 2: Run** `npm run build && npx playwright test tests/e2e/brand.spec.ts` — expected FAIL (fonts are Fraunces/Plex).
- [ ] **Step 3: Swap dependencies:** `npm i @fontsource/poppins @fontsource/lora` and `npm rm @fontsource-variable/fraunces @fontsource/ibm-plex-mono`. In `Base.astro` import `@fontsource/poppins/latin-{400,500,600}.css`, `@fontsource/lora/latin-400.css`, `@fontsource/lora/latin-400-italic.css`; remove the Fraunces/Plex imports.
- [ ] **Step 4: Rewrite `tokens.css`** to the Global Constraints values (keep `--ok`, `--warn`, `--bad`, `--gutter`, `--max`, `--ease`; choose `--ok #8FBF6A`, `--warn #E9C46A`, `--bad #E5484D`).
- [ ] **Step 5: Update `base.css`:** body `font: 400 15px/1.6 var(--font-body)`, drop the radial glow `background-image` and the whole `body::before` grain block; headings `font-family: var(--font-display); font-weight: 500`, remove `font-variation-settings`; `::selection`/`.skip-link` use `--on-accent`; `.panel-title` becomes Poppins 600 with the dot replaced by a 10×2px Alpenglow tick; `.label`, `.hint`, buttons and inputs use `var(--font-display)` for UI text and `var(--font-body)` for `.hint`; `.readout` uses Poppins 500, `color: var(--fjord)`, tabular-nums; `.label output, .label .val` use `var(--fjord)`. Remove the `blur/brightness` filter from the `develop` keyframes (keep opacity + translateY).
- [ ] **Step 6: Update `controls.css`:** replace `--amber`→`--fjord`, `rgb(229 53 43 / …)`→`rgb(242 122 53 / …)`, `#564d43`→`var(--line)` lightened (`color-mix(in srgb, var(--line), var(--text-dim) 35%)`), primary button text `var(--on-accent)`, mono refs → `var(--font-display)`.
- [ ] **Step 7: Run** `grep -rn "font-mono\|--amber\|font-variation-settings\|Fraunces\|Plex" src` — fix every remaining hit in components/pages (swap to the new tokens; do not restyle layouts yet). Then `npm run build && npx playwright test tests/e2e/brand.spec.ts tests/e2e/layout.spec.ts` — expected PASS. If layout.spec fails at 360px, fix the overflow (e.g. `overflow-wrap`, smaller letter-spacing), never loosen the test.
- [ ] **Step 8: Commit** `feat: brand fonts and design tokens`.

---

### Task 2: Brand assets, icons, manifest, logo and footer lockup

**Files:**
- Modify: `public/icons/*` (replace), `public/manifest.webmanifest`, `src/layouts/Base.astro`, `src/components/SiteLogo.astro`, `src/components/SiteFooter.astro`
- Create: `public/icons/rv-lockup-reversed.svg`, `public/favicon.ico`
- Modify test: `tests/e2e/brand.spec.ts`, `tests/e2e/pwa.spec.ts` (if it asserts colours)

**Interfaces:**
- Produces: `SiteLogo.astro` (prop `size?: number`, default 44, unchanged) rendering the camera-ridge symbol; footer element `.rv-lockup` (an `<img>` of the reversed horizontal lockup, `alt="RV Photography"`, width ≥ 140px).

- [ ] **Step 1: Add failing tests** to `brand.spec.ts`: (a) home `link[rel=icon][type="image/svg+xml"]` and `link[rel=apple-touch-icon]` resolve (`request.get` 200) and `meta[name=theme-color]` content is `#141A1C`; (b) fetched `manifest.webmanifest` has `name` `ApertureLab`, `theme_color` and `background_color` `#141A1C`, and each icon src returns 200; (c) `.rv-lockup` is visible with `boundingBox().width >= 140` at viewport 360×800 and `document.documentElement.scrollWidth <= 360`; (d) header `.wordmark` contains an `svg` or `img` of width ≥ 24 and text `ApertureLab`.
- [ ] **Step 2: Run** the spec — expected FAIL.
- [ ] **Step 3: Copy assets** from the pack: `03_Icons/{favicon.svg→icons/icon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png}` into `public/icons/`; `03_Icons/favicon.ico` into `public/`; `01_Logo/symbol_alpenglow.svg` → `public/icons/logo.svg`; `01_Logo/lockup-horizontal_reversed.svg` → `public/icons/rv-lockup-reversed.svg`. Open each SVG first and confirm it contains no `<script>`/external references.
- [ ] **Step 4: Update `Base.astro`** head: `theme-color` `#141A1C`; add `<link rel="icon" href="favicon.ico" sizes="48x48" />` before the SVG icon. Update `manifest.webmanifest` colours to `#141A1C`; keep name/short_name/icon entries.
- [ ] **Step 5: `SiteLogo.astro`** keeps the `<img src="icons/logo.svg">` approach (now the new symbol). In `SiteNav.astro` set the wordmark to Poppins 500, `letter-spacing: .14em`, uppercase "APERTURE" + Fjord-free `Lab` in `--accent` (keep the `<em>` structure and `aria-label`).
- [ ] **Step 6: `SiteFooter.astro`:** add `<a href="https://veitch.cc" class="by"><span>by</span><img class="rv-lockup" src="icons/rv-lockup-reversed.svg" alt="RV Photography" width="180" /></a>` beside the privacy text; CSS `min-width: 140px; max-width: 100%; height: auto`; keep existing links and "Developed" date; footer top border gets the ridge divider in Task 3.
- [ ] **Step 7: Run** `npm run build && npx playwright test tests/e2e/brand.spec.ts tests/e2e/pwa.spec.ts` — expected PASS.
- [ ] **Step 8: Commit** `feat: RV Photography logo, icons and manifest`.

---

### Task 3: Ridge divider and site chrome

**Files:**
- Create: `src/components/RidgeLine.astro`
- Delete: `src/components/FilmStrip.astro`
- Modify: `src/components/SiteNav.astro`, `src/components/SiteFooter.astro`, `src/components/ToolHeader.astro`, `src/pages/index.astro` (remove FilmStrip import/use only; full home work is Task 4)

**Interfaces:**
- Produces: `RidgeLine.astro` — props `{ accent?: boolean }`, renders a decorative (`aria-hidden`) full-width SVG polyline at the symbol's 50° slope in `--line` with a short `--accent` notch at the summit when `accent` is true.
- `ToolHeader.astro` props unchanged (`frame`, `name`, `lede`); markup keeps `h1`.

- [ ] **Step 1: Failing test** in `brand.spec.ts`: every tool page has exactly one `.ridge` element below the header, no element with class `film-strip` and no text matching `/▸\s*\d\d/` anywhere; `body` computed `background-image` is `none`.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement `RidgeLine.astro`**; use it in `ToolHeader.astro` (below the lede, `accent`), in `SiteFooter.astro` (above the footer content) and in `index.astro` where `FilmStrip` was. Delete `FilmStrip.astro`.
- [ ] **Step 4: `ToolHeader`:** replace the film-edge line with `<p class="kicker">{frame} / {total}</p>` in Poppins 600, 12px, `letter-spacing: .16em`, `color: var(--accent)`; `h1` Poppins 500, `letter-spacing: -.01em`, `clamp(32px, 6vw, 56px)`; lede in Lora.
- [ ] **Step 5: `SiteNav`:** header background `rgb(20 26 28 / .9)`, 1px `--line` bottom border; desktop links Poppins 500 13px, current page marked with a 2px Alpenglow underline; `.num` becomes Fjord tabular; mobile menu sheet frames drop `▸ NNA` edge codes for `{t.frame}` in Fjord.
- [ ] **Step 6: Run** `npm run build && npx playwright test tests/e2e/brand.spec.ts tests/e2e/nav.spec.ts tests/e2e/layout.spec.ts` — expected PASS (update `nav.spec.ts` only if it asserts the removed `▸` text).
- [ ] **Step 7: Commit** `feat: ridge divider and brand site chrome`.

---

### Task 4: Home "field book" index, tool cards and icons

**Files:**
- Modify: `src/pages/index.astro`, `src/components/ToolFrame.astro`, `src/components/ToolIcon.astro`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `tools` from `src/data/tools.ts`; `RidgeLine` (Task 3).
- Preserved for tests: each tool link is `a.tool-frame` with `href="<slug>.html"` containing frame number and name; `.privacy-block` contains `PRIVACY`.

- [ ] **Step 1: Update `home.spec.ts` first:** rename the test to `home is a field-book index of the 10 tools`; keep the existing assertions; add: `.tool-frame` count 10, each contains its `blurb`, and at 360px no horizontal scroll. Expected FAIL only on anything depending on new markup (run to see the baseline).
- [ ] **Step 2: `ToolFrame.astro`:** keep props and `a.tool-frame`. Layout becomes a row-style entry: large Fjord numeral (`tool.frame`, Poppins 300), the `ToolIcon`, name (Poppins 500 22px), blurb (Lora 13px, `--text-dim`); remove `.edge` code, `.grease` SVG and its script. Hover/focus: border-color `--accent`, a 2px Alpenglow underline drawn along the bottom edge (`transform: scaleX`, inside `prefers-reduced-motion: no-preference`), icon colour to `--text`. Grid: `repeat(auto-fill, minmax(min(100%, 280px), 1fr))`.
- [ ] **Step 3: `index.astro`:** drop the film-sheet (`.sheet`, `.rail`) wrappers and the dark inset shadow; hero h1 Poppins 500 with `<em>` in `--accent` non-italic; kicker `00 · Ten tools`; neutral copy edits that remove darkroom metaphors: title `ApertureLab — free photography tools`, kicker `Ten tools`, privacy heading `Your photos stay on your device.` (privacy paragraph is `PRIVACY`, untouched). Update the `tools.ts`-independent counts only if wording changes them.
- [ ] **Step 4: `ToolIcon.astro`:** recolour only: replace `var(--amber)`→`var(--fjord)`, `#2B4C8C`→`var(--fjord)`, `#8FBF6A` stays; no geometry changes.
- [ ] **Step 5: Run** `npm run build && npx playwright test tests/e2e/home.spec.ts tests/e2e/nav.spec.ts tests/e2e/layout.spec.ts tests/e2e/smoke.spec.ts` — expected PASS.
- [ ] **Step 6: Commit** `feat: field-book home page and tool cards`.

---

### Task 5: Hardcoded colour audit in tool UIs

**Files:**
- Modify: `src/tools/palette/ui.ts`, `src/tools/collage/preview.ts`, `src/tools/collage/ui.ts` (default bg only if it is UI chrome — it is an export default, so leave it), `src/tools/selphy/ui.ts`, `src/components/DropZone.astro`, `src/components/Modal`/cropper CSS in `controls.css` as needed
- Leave unchanged (export output): `exif-frame/render.ts` ink/dim defaults, `resize/render.ts` shadow, `panorama/ui.ts` mattes, `image.ts` default background, `selphy` printed-sheet fills (`#FFFFFF`, black strokes)

- [ ] **Step 1: Failing test** in `tests/e2e/palette.spec.ts` (or `brand.spec.ts`): `grep`-style unit in `tests/unit/brand-tokens.test.ts` — read every file under `src` (excluding `src/tools/**/logic.ts`) as text and assert none contain `IBM Plex`, `Fraunces`, `#12100E`, `#EDE6DA`, `rgb(229 53 43`, `rgba(229,53,43`, `#e5352b` (case-insensitive) or `229 53 43`. Expected FAIL listing the hits.
- [ ] **Step 2: Fix each hit:** `palette/ui.ts` histogram red channel keeps RGB-semantic red (`rgba(229,53,43,.75)` is data colour, so keep it and add it to the test's allowlist by file+line comment `// data colour`), luminance fill → `rgba(238,241,238,.7)`; palette export canvas background `#12100E`→`#141A1C`, text `#EDE6DA`→`#EEF1EE`, font `"IBM Plex Mono"`→`"Poppins"` and `await document.fonts.load('500 16px Poppins')` before drawing. `collage/preview.ts` guide stroke `#e5352b`→`#F27A35`. `DropZone.astro` dashed border → `var(--line)`-based, hover tint `rgb(242 122 53 / .06)`. `selphy/ui.ts` placeholder fills `rgba(18,16,14,…)`→`rgba(20,26,28,…)`.
- [ ] **Step 3: Run** `npm test` (new test passes) then `npm run build && npx playwright test tests/e2e/palette.spec.ts tests/e2e/collage.spec.ts tests/e2e/selphy.spec.ts` — expected PASS; check palette download still decodes with sharp.
- [ ] **Step 4: Commit** `fix: move tool UI chrome colours to brand palette`.

---

### Task 6: Docs, cleanup and full verification

**Files:**
- Modify: `CLAUDE.md` (Design system, Layout list, Frontend aesthetics note), `readme.md` (only if it mentions the old look or fonts)

- [ ] **Step 1: Update `CLAUDE.md`:** replace the "Design system — Darkroom" section with the new tokens, fonts, motifs (ridge divider, field-book home, `RidgeLine`), the brand-logo usage rules from Global Constraints, and the "export defaults unchanged" rule; remove `FilmStrip` from the Layout components list and add `RidgeLine`; amend the Frontend aesthetics sentence to say the directive is realised as the RV Photography system; change "Fraunces and IBM Plex Mono" references.
- [ ] **Step 2: Cleanup check:** `grep -rn "Darkroom\|FilmStrip\|Fraunces\|Plex\|safelight\|grain" src docs/superpowers/specs/2026-11-02-rv-rebrand-design.md CLAUDE.md readme.md public` — only intentional historical mentions remain (the original design spec in `docs/` stays untouched).
- [ ] **Step 3: Full verification:** stop any running preview, then `npm test && npm run build && npm run test:e2e`; all must pass. Take screenshots via `npm run dev` of home, one tool page (`dof-visualizer`) at 1280px and 360px and review them for clipping, contrast and the lockup/ridge placement; fix any problems.
- [ ] **Step 4: Commit** `docs: describe the RV Photography design system` and report results to the owner (who pushes the branch and opens the PR).
