export function showError(id: string, message: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.msg')!.textContent = message;
  el.hidden = false;
}

export function clearError(id: string): void {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}
