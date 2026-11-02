# ApertureLab × RV Photography rebrand — design

Date: 2026-11-02 · Source: `/Users/ry/Logo/claude/RV-Photography-Brand-Pack` (guidelines v1.0, Nov 2026)

## Intent

ApertureLab keeps its name, URLs and behaviour, and adopts the RV Photography identity: the camera-ridge symbol, the Basalt / Alpenglow / Fjord / Glacier Mist palette, Poppins + Lora, and the new favicon/app icons. The "Darkroom" look (Fraunces, IBM Plex Mono, safelight red, film grain, film-edge strips, contact sheet) is retired.

**Decisions (owner):** endorsed brand (symbol + "ApertureLab" wordmark in the header, "by RV Photography" lockup in the footer); dark theme only.

**Unchanged:** privacy copy, New Relic snippet, page URLs, metric-only, no CDNs/hotlinking, control `id`s, component props, tool logic, 360px no-horizontal-scroll rule.

## Tokens (`src/styles/tokens.css`)

| Token | Value | Source |
|---|---|---|
| `--bg` | `#141A1C` | guide dark ground |
| `--surface` | `#1D2528` | guide dark paper |
| `--surface-2` | `#263135` | between paper and line |
| `--line` | `#2E393C` | guide dark line |
| `--text` | `#EEF1EE` | Glacier Mist |
| `--text-dim` | `#A3ADB0` | guide dark muted |
| `--accent` / `--accent-hi` | `#F27A35` / `#F59A62` | Alpenglow (dark-mode values) |
| `--on-accent` | `#1C2427` | Basalt text on orange (white fails contrast) |
| `--fjord` (replaces `--amber` for readouts) | `#7FB2B6` | Fjord, dark-mode value |
| `--ok` / `--warn` / `--bad` | retuned to sit with palette; `--bad` distinct from accent |
| `--font-display` | Poppins (400/500/600) | self-hosted via fontsource |
| `--font-body` | Lora (400, 400 italic) | self-hosted via fontsource |
| `--font-mono` | removed; numeric UI uses Poppins with `tabular-nums` |
| `--radius` | `2px` | |

Accent stays the only interactive colour. Alpenglow is never used for body text.

## Identity and assets

- `SiteLogo.astro`: inline new symbol (from `01_Logo/symbol_alpenglow.svg`), paired with "ApertureLab" in Poppins, tracked wide. Clear space ≥ lens diameter; symbol ≥ 24px.
- `SiteFooter.astro`: reversed horizontal RV Photography lockup (`lockup-horizontal_reversed.svg`), ≥ 140px wide, linked as today (portfolio/Instagram links kept).
- Copy from `03_Icons` into `public/icons/` (replacing existing files, same names where the manifest and `Base.astro` reference them): `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- `manifest.webmanifest`: name/short_name stay "ApertureLab"; `theme_color` and `background_color` become Basalt `#141A1C` (not the pack's orange, to respect dark-only). `Base.astro` `theme-color` likewise.
- Photo watermark / export frames: no logo is added to user exports.

## Chrome and motifs

- Remove: grain overlay, red safelight glow, `FilmStrip` edge codes.
- Add: a ridge-line divider (SVG polyline at the symbol's 50° slope, 1px `--line`, accent notch) under the header and above the footer; replaces `FilmStrip` usage.
- Panels: `--surface` with 1px `--line`, 2px radius, a short Alpenglow tick on `.panel-title`.
- Headings: Poppins 500; hints, captions, long copy: Lora (italic for place names/titles where they appear). Readouts: Fjord numerals, Poppins tabular.
- Focus ring stays `--accent`. `.develop` staggered reveal retained inside `prefers-reduced-motion: no-preference`.
- Home (`index.astro`): "field book" index — numbered rows (`01`…) with the tool's `ToolIcon` line art (Alpenglow + Fjord via `currentColor`/accent), name, blurb; hover draws an Alpenglow underline along the ridge line. Kicker/count wording unchanged.
- `ToolIcon.astro`: recolour only (no redraw).

## Code that hardcodes colours

Audit `src/tools/{exif-frame,resize}/render.ts`, `selphy/ui.ts`, `palette/ui.ts`. Rule: **export output defaults do not change**; only UI chrome colours (previews, overlays, handles) move to the new palette/tokens.

## Cleanup and docs

- Remove `@fontsource-variable/fraunces` and `@fontsource/ibm-plex-mono` once unreferenced; add `@fontsource/poppins` and `@fontsource/lora`.
- Update `CLAUDE.md` design-system section ("Darkroom" → new system, tokens, fonts, motifs) and the Frontend aesthetics note; update `readme.md` if it mentions the old look.

## Testing

- Unit tests unaffected (logic untouched).
- E2E: layout test must still pass at 360px (Poppins is wider than Plex Mono — fix overflow, don't relax the test). Update any assertions on old copy/structure (e.g. `FilmStrip`, home contact sheet). `pwa.spec.ts` name check still `ApertureLab`.
- Verify visually via `npm run dev` screenshots of home, a tool page, and mobile 360px.
- Gate: `npm test && npm run build && npm run test:e2e` green before handoff. Owner pushes and opens the PR; no commits to `main`.

## Out of scope

New tools, behaviour changes, light theme, the alternative wordmarks (Basecamp / Field Journal), redrawing tool illustrations.
