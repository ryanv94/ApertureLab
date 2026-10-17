/** Keeps the filled portion of every range input in sync (CSS reads --fill). */
export function syncFill(input: HTMLInputElement): void {
  const min = +input.min || 0, max = +input.max || 100;
  input.style.setProperty('--fill', `${((+input.value - min) / (max - min)) * 100}%`);
}

document.addEventListener('input', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'range') syncFill(e.target);
});
document.querySelectorAll<HTMLInputElement>('input[type=range]').forEach(syncFill);
