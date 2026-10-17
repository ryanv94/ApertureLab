import type { DofResult } from './logic';
import { formatDistance } from '../../lib/format';

const X0 = 80, X1 = 720, XINF = 768, AXIS_Y = 156, TOP = 44;
const D_MIN = 200, D_MAX = 200_000; // mm
const TICKS = [500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000];

/** Distance (mm) → x on a log axis; beyond D_MAX clamps to the ∞ slot. */
export function xFor(mm: number): number {
  if (mm === Infinity || mm > D_MAX) return XINF;
  const t = (Math.log10(Math.max(mm, D_MIN)) - Math.log10(D_MIN)) / (Math.log10(D_MAX) - Math.log10(D_MIN));
  return X0 + t * (X1 - X0);
}

const fmt = (mm: number) => formatDistance(mm).replace(' ', ' ');

export function renderDiagram(svg: SVGSVGElement, r: DofResult, distanceMm: number): void {
  const xn = xFor(r.near), xf = Math.max(xFor(r.far), xn + 2), xs = xFor(distanceMm), xh = xFor(r.hyperfocal);
  const narrow = xf - xn < 110;
  const ticks = TICKS.map((t) => {
    const x = xFor(t);
    return `<line x1="${x}" x2="${x}" y1="${AXIS_Y}" y2="${AXIS_Y + 6}" class="tick"/><text x="${x}" y="${AXIS_Y + 22}" class="tl">${t / 1000}m</text>`;
  }).join('');
  svg.innerHTML = `
    <defs>
      <linearGradient id="cone" x1="0" x2="1"><stop offset="0" stop-color="var(--text)" stop-opacity=".18"/><stop offset="1" stop-color="var(--text)" stop-opacity="0"/></linearGradient>
    </defs>
    <path d="M44 ${AXIS_Y - 40} L${xs} ${TOP + 6} L${xs} ${AXIS_Y - 6} Z" fill="url(#cone)"/>
    <rect class="zone" x="${xn}" y="${TOP}" width="${xf - xn}" height="${AXIS_Y - TOP}" rx="1"/>
    ${r.far === Infinity ? `<path d="M${XINF - 10} ${TOP} h20 M${XINF - 10} ${AXIS_Y} h20" class="zone-edge"/>` : ''}
    <line x1="20" x2="${XINF + 12}" y1="${AXIS_Y}" y2="${AXIS_Y}" class="axis"/>
    ${ticks}
    <text x="${XINF}" y="${AXIS_Y + 22}" class="tl">∞</text>
    <line x1="${xh}" x2="${xh}" y1="${TOP - 18}" y2="${AXIS_Y}" class="hyper"/>
    <text x="${xh}" y="${TOP - 24}" class="hl">H ${fmt(r.hyperfocal)}</text>
    <g transform="translate(22 ${AXIS_Y - 52})" class="cam">
      <rect x="0" y="6" width="22" height="16" rx="2"/><rect x="22" y="9" width="8" height="10"/><rect x="5" y="2" width="8" height="4"/>
    </g>
    <g transform="translate(${xs} ${AXIS_Y})" class="subject">
      <circle cx="0" cy="-58" r="6"/><path d="M0 -51 v26 M-9 -42 h18 M0 -25 l-7 24 M0 -25 l7 24"/>
    </g>
    <text x="${xn}" y="${TOP + 16}" dx="-6" class="el end">${fmt(r.near)}</text>
    <text x="${xf}" y="${narrow ? TOP + 34 : TOP + 16}" dx="6" class="el">${r.far === Infinity ? '∞' : fmt(r.far)}</text>`;
}
