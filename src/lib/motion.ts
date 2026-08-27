/** Calm mode: the explicit, persisted alternative to full motion. The inline
 *  <head> snippet in every page stamps .rvl-calm before first paint from the
 *  same key, so a calm visitor never sees a flash of motion. */
const KEY = 'rvl-motion';

export function calmActive(): boolean {
  return document.documentElement.classList.contains('rvl-calm');
}

export function toggleCalm(): boolean {
  const calm = !calmActive();
  try { localStorage.setItem(KEY, calm ? 'calm' : 'full'); } catch { /* private mode */ }
  document.documentElement.classList.toggle('rvl-calm', calm);
  return calm;
}
