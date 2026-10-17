export function baseName(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i > 0 ? filename.slice(0, i) : filename;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadZip(files: { name: string; blob: Blob }[], zipName: string): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  downloadBlob(await zip.generateAsync({ type: 'blob' }), zipName);
}
