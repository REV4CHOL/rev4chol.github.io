/** A NARROW PC WINDOW (owner, 2026-11-25: "Tablet layout: below a floor width the window gets the layout a tablet
 *  gets, with readable words. Wide windows keep your poster lock exactly as now."; of where the floor stands: "Under
 *  3/4 of the screen: any half-snapped window switches, yours included. A window 1440 px or wider never switches.").
 *
 *  THE SIGNAL IS THE WINDOW, NEVER THE ZOOM. `outerWidth` is the browser window in the OS's own pixels: browser zoom
 *  does not move it (Chrome and Edge), so zooming a wide window can never flip it narrow, and the poster lock's decree
 *  (browser zoom changes nothing on a wide window) stands. It is read against `screen.width` (the plate the poster
 *  would use), and nothing here reads the page's own width or the pixel ratio: both move with the zoom.
 *  A window that reports no width (0) is never narrow. One stateless threshold, no memory: it cannot oscillate. Docked
 *  developer tools or a side panel narrow the page but not the window: such a page reads wide and keeps the poster. */

/** The class on `<html>` while a fine-pointer window is narrow: the stylesheets' mirrored tablet blocks key on it. */
export const NARROW_CLASS = 'rvl-narrow';

/** The share of the screen's plate under which a window is narrow. */
export const NARROW_SHARE = 0.75;

/** `?win=narrow|poster` pins the mode for checks, as `?gfx=` pins the tier. */
export type WinPin = 'narrow' | 'poster' | null;

export function winPin(search: string): WinPin {
  const v = new URLSearchParams(search).get('win');
  return v === 'narrow' || v === 'poster' ? v : null;
}

/** The width under which a window is narrow: three quarters of the plate the poster would use (`max(posterW,
 *  screen)`), and never more than the poster's own width, so a window `posterW` px or wider never switches. */
export function narrowFloor(screenW: number, posterW: number): number {
  return Math.min(posterW, NARROW_SHARE * Math.max(posterW, screenW || 0));
}

/** Is this window narrow? `outerW` is `window.outerWidth`, `screenW` is `screen.width`; a pin wins. */
export function narrowWindow(outerW: number, screenW: number, posterW: number, pin: WinPin = null): boolean {
  if (pin) return pin === 'narrow';
  return outerW > 0 && outerW < narrowFloor(screenW, posterW);
}
