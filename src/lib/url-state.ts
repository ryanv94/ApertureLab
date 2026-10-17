export const readParams = (): URLSearchParams => new URLSearchParams(location.search);

export function writeParams(obj: Record<string, string | number>): void {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) p.set(k, String(v));
  history.replaceState(null, '', `${location.pathname}?${p}`);
}
