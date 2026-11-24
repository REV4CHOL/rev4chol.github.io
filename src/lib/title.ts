import { stopScramble } from './scramble';

/** TWO-LANGUAGE TITLES (owner, 2026-11-24, of "Temptation / Xiêu Lòng": 'can we design something special to replace
 *  the "/" … Right now it looks rough'; chose A, "But I want the two texts to be organise neatly in the same column, and
 *  it need to sit a bit closer to each other via their line spacing"). A title written `English / Vietnamese` stands,
 *  wherever a film's name is a headline, as a lockup: line 1 the English name as a one-part title is drawn there; line 2
 *  the Vietnamese name at LOCKUP.ratio of it, in the film's accent, same face and weight; both lines' INK starting at
 *  one left edge; line 2's tallest mark (Ễ) clearing line 1's baseline by LOCKUP.clearEm. Running text and what is not
 *  seen (the tab title, aria labels, the ticker, the screen-reader list) keep the plain string with its slash.
 *  The numbers live twice, here and as components.css's :root custom properties (--tt-ratio, --tt-mark, --tt-clear);
 *  tests/title-lockup.test.ts ties them. */

export const TITLE_SEP = ' / ';

export interface TitleParts {
  main: string;
  /** the second language; null for a one-part title */
  alt: string | null;
}

/** Split a title at its first " / " (space, slash, space). A bar, a dash, a colon or a bare slash is part of a name. */
export function splitTitle(title: string): TitleParts {
  const i = title.indexOf(TITLE_SEP);
  if (i < 0) return { main: title, alt: null };
  const main = title.slice(0, i).trim();
  const alt = title.slice(i + TITLE_SEP.length).trim();
  if (!main || !alt) return { main: title.trim(), alt: null };
  return { main, alt };
}

export const LOCKUP = {
  /** line 2's size, of line 1's */
  ratio: 0.58,
  /** the tallest mark over the capitals in the display voice at 700 (Ễ, measured: 0.30 em above the cap top) */
  markEm: 0.3,
  /** the even gap between line 1's baseline and that mark's top, in line 2's em */
  clearEm: 0.07,
  /** the film page: the lockup's ink never takes more than this share of the hero's height (the viewfinder yields to
   *  it, and must keep the rest) */
  heroShare: 0.2,
} as const;

/** The lockup's ink height in line 1's em: line 1's cap, then line 2's mark, clearance and cap. */
export const lockupInkEm = (capEm: number): number => capEm + LOCKUP.ratio * (LOCKUP.markEm + LOCKUP.clearEm + capEm);

/** The margin, in line 2's em, that stands line 2's baseline (mark + clear + cap) of its em under line 1's baseline.
 *  `b1`, `b2`: the two baselines as laid out without it (px); `f2`: line 2's size; `capEm`: the face's cap height. */
export function altPullEm(b1: number, b2: number, f2: number, capEm: number, markEm: number = LOCKUP.markEm, clearEm: number = LOCKUP.clearEm): number {
  const want = b1 + (markEm + clearEm + capEm) * f2;
  return (want - b2) / f2;
}

/** The shift, in line 2's em, that starts line 2's ink where line 1's starts. `ink1`, `ink2`: each line's ink start
 *  from its own origin (px, + to the right); `f2`: line 2's size. */
export const inkShiftEm = (ink1: number, ink2: number, f2: number): number => (ink1 - ink2) / f2;

/** Line 1's size on the film page: `base` its set size, `room` the stack's width, `mainW`/`altW` the two lines' widths
 *  measured at `base`, `heroH` the hero's height, `capEm` the face's cap height. By width as a one-line title fits
 *  (98%, only when too wide), and by the hero share; never under 12 px. */
export function heroLockupSize(base: number, room: number, mainW: number, altW: number, heroH: number, capEm: number): number {
  let s = base;
  const wide = Math.max(mainW, altW);
  if (wide > room && room > 0) s = Math.floor(base * (room / wide) * 98) / 100;
  const tall = (LOCKUP.heroShare * heroH) / lockupInkEm(capEm);
  if (s > tall) s = Math.floor(tall * 100) / 100;
  return Math.max(12, s);
}

/* ------------------------------------------------------------------ the DOM -- */

const span = (cls: string, text: string): HTMLSpanElement => {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
};

/** Write a title into `el`: a one-part title as plain text (as before), a two-part one as its two line spans.
 *  `shape` dresses each part (upper case, soft breaks). */
export function fillTitle<T extends HTMLElement>(el: T, title: string, shape: (s: string) => string = (s) => s): T {
  const { main, alt } = splitTitle(title);
  stopScramble(el); // (a scramble still running on it would write the name before over these words)
  if (alt === null) {
    el.classList.remove('tt-two');
    el.textContent = shape(title);
    return el;
  }
  el.classList.add('tt-two');
  el.replaceChildren(span('tt-main', shape(main)), span('tt-alt', shape(alt)));
  settleLockup(el);
  return el;
}

/** A span of class `cls` holding a title (fillTitle). */
export const titleSpan = (cls: string, title: string, shape?: (s: string) => string): HTMLSpanElement =>
  fillTitle(span(cls, ''), title, shape);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** The same as markup, for a template (the next film's link). */
export function lockupHtml(title: string, shape: (s: string) => string = (s) => s): string {
  const { main, alt } = splitTitle(title);
  if (alt === null) return esc(shape(title));
  return `<span class="tt-lock tt-two"><span class="tt-main">${esc(shape(main))}</span><span class="tt-alt">${esc(shape(alt))}</span></span>`;
}

let ctx: CanvasRenderingContext2D | null = null;
/** A text's ink, measured in its own face at 1000 px (fine enough for a hairline), scaled to `size`. */
function ink(text: string, cs: CSSStyleDeclaration, size: number): { left: number; cap: number } {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return { left: 0, cap: 0.7 * size };
  const shout = cs.textTransform === 'uppercase' ? text.toUpperCase() : text;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} 1000px ${cs.fontFamily}`;
  const m = ctx.measureText(shout.replace(/​/g, ''));
  const cap = ctx.measureText('H').actualBoundingBoxAscent;
  return { left: (-m.actualBoundingBoxLeft * size) / 1000, cap: cap / 1000 };
}

/** Where a line's baseline stands (px from the viewport top): a zero-size mark sat on it, at its start (its first
 *  line) or its end (its last). */
export function baselineOf(line: HTMLElement, at: 'first' | 'last' = 'last'): number {
  const m = document.createElement('i');
  m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;';
  if (at === 'first') line.prepend(m); else line.append(m);
  const y = m.getBoundingClientRect().top;
  m.remove();
  return y;
}

/** The CSS zoom an element is drawn at (the poster lock zooms <body>: lib/poster-lock.ts): a box's on-screen px per
 *  layout px. Screen positions (getBoundingClientRect) divided by it are in the element's own px, as its sizes are. */
export function zoomOf(el: HTMLElement): number {
  const m = document.createElement('i');
  m.style.cssText = 'position:absolute;width:100px;height:0;visibility:hidden;';
  el.append(m);
  const z = m.getBoundingClientRect().width / 100;
  m.remove();
  return z > 0 ? z : 1;
}

/** The size a lockup is measured at: big enough that the layout's pixel grid is lost in it (at 13 px a whole pixel is
 *  0.08 em, more than the clearance itself). Both numbers are in em, so they hold at any size. */
const MEASURE_PX = 1000;

/** Set line 2's pull (the leading) and shift (the shared ink edge) in its own em, from the laid-out lines. Both scale
 *  with the size, so a refit keeps them; run again once the display face is in (a fallback's metrics lie). The ink
 *  is measured on the title's own words (data-text), never on a scramble's glyphs; the leading on the lockup set,
 *  for the measure only, at MEASURE_PX on one line. */
export function settleLockup(el: HTMLElement): void {
  const a = el.querySelector<HTMLElement>(':scope > .tt-main');
  const b = el.querySelector<HTMLElement>(':scope > .tt-alt');
  if (!a || !b || !el.isConnected) return;
  a.dataset.text ??= a.textContent ?? '';
  b.dataset.text ??= b.textContent ?? '';
  if (b.getClientRects().length === 0) return; // (not laid out: hidden; what it had stands)
  el.style.setProperty('--tt-pull', '0em');
  el.style.setProperty('--tt-shift', '0em');
  const was = { size: el.style.fontSize, space: el.style.whiteSpace };
  el.style.fontSize = `${MEASURE_PX}px`;
  el.style.whiteSpace = 'nowrap';
  const ca = getComputedStyle(a), cb = getComputedStyle(b);
  const f1 = parseFloat(ca.fontSize), f2 = parseFloat(cb.fontSize);
  if (f1 > 0 && f2 > 0) {
    const i1 = ink(a.dataset.text, ca, f1), i2 = ink(b.dataset.text, cb, f2);
    const num = (v: string, d: number) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d); // (the styles' numbers win)
    const cs = getComputedStyle(el);
    const mark = num(cs.getPropertyValue('--tt-mark'), LOCKUP.markEm), clear = num(cs.getPropertyValue('--tt-clear'), LOCKUP.clearEm);
    const z = zoomOf(el);
    const pull = altPullEm(baselineOf(a, 'last') / z, baselineOf(b, 'first') / z, f2, i2.cap, mark, clear);
    el.style.setProperty('--tt-pull', `${pull.toFixed(4)}em`);
    el.style.setProperty('--tt-shift', `${inkShiftEm(i1.left, i2.left, f2).toFixed(4)}em`);
  }
  el.style.fontSize = was.size;
  el.style.whiteSpace = was.space;
}

/** Settle every lockup under `root` (a list drawn while hidden settles when it shows), now and once the face is in. */
export function settleAll(root: ParentNode): void {
  const run = () => root.querySelectorAll<HTMLElement>('.tt-two').forEach(settleLockup);
  run();
  void document.fonts?.ready?.then(run);
}
