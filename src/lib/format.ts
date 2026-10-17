/** Shutter / duration in seconds → "1/250s", "8.2s", "4m 16s", "2h 19m". */
export function formatShutter(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  if (sec < 0.3) return `1/${Math.round(1 / sec)}s`;
  if (sec < 10) return `${trimZero(sec.toFixed(1))}s`;
  if (sec < 60) return `${Math.round(sec)}s`;
  const total = Math.round(sec);
  if (total < 3600) return `${Math.floor(total / 60)}m ${pad(total % 60)}s`;
  return `${Math.floor(total / 3600)}h ${pad(Math.floor((total % 3600) / 60))}m`;
}

/** Millimetres → "45 cm", "8.5 cm", "2.73 m", "150 m", "∞". */
export function formatDistance(mm: number): string {
  if (mm === Infinity) return '∞';
  if (!Number.isFinite(mm)) return '—';
  if (mm < 100) return `${trimZero((mm / 10).toFixed(1))} cm`;
  if (mm < 1000) return `${Math.round(mm / 10)} cm`;
  if (mm < 100_000) return `${(mm / 1000).toFixed(2)} m`;
  return `${Math.round(mm / 1000)} m`;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const trimZero = (s: string) => s.replace(/\.0$/, '');
