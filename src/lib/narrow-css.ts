/** THE MIRROR: a narrow PC window reads the tablet's layout blocks (owner, 2026-11-25: "Tablet layout: below a floor
 *  width the window gets the layout a tablet gets, with readable words. Wide windows keep your poster lock exactly as
 *  now."). Run on every sheet of `src/styles/` but about-old.css, at build and in dev (vite.config.ts), BEFORE Vite's
 *  own CSS handling.
 *
 *  Each pointer-gated `@media` block carries a one-line marker on the line above it:
 *  - `narrow: layout`: a copy of the block follows it, its query read as a touch screen reads it (`(pointer: coarse)`
 *    true, `(pointer: fine)` false) and every selector keyed on `:where(html.rvl-narrow)`, the class the poster lock
 *    sets on a narrow window (lib/window-fit.ts). A block whose query names the fine pointer also keeps its own rules
 *    off a narrow window (`:where(html:not(.rvl-narrow))`). `:where` adds no specificity, and the copy stands right
 *    after its original, so the cascade's order is the original's.
 *  - `narrow: touch`: left as it is: a narrow PC is still a mouse (hover, the cursor, no press areas, no veil).
 *  A touch screen and a wide window get every original rule as written, plus copies they can never match: strip the
 *  copies and the guards (`stripNarrow`) and the input comes back byte for byte (tests/narrow-css.test.ts).
 *  Anything it cannot read (a nested at-rule, `not`, `hover`, `:root`) is refused loudly: the build fails. */

import { NARROW_CLASS } from './window-fit';

export const MIRROR_MARK = '/* narrow: mirror */';
const ON = `:where(html.${NARROW_CLASS}) `;
export const GUARD = `:where(html:not(.${NARROW_CLASS})) `;
const ON_HTML = `:where(.${NARROW_CLASS})`;
const GUARD_HTML = `:where(:not(.${NARROW_CLASS}))`;
const MARKER = /\/\* narrow: ([a-z]+) \*\/[ \t]*\r?\n/g;

/** Skips a comment or a string at `i`; returns the index after it, or -1 when `i` starts neither. */
function skipOpaque(s: string, i: number): number {
  if (s.startsWith('/*', i)) {
    const e = s.indexOf('*/', i + 2);
    if (e < 0) throw new Error('narrow-css: an unclosed comment');
    return e + 2;
  }
  const q = s[i];
  if (q === '"' || q === "'") {
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === q) return j + 1;
    }
    throw new Error('narrow-css: an unclosed string');
  }
  return -1;
}

/** The index of the first `stop` character at depth 0 (outside parens, brackets, strings and comments), from `i`. */
function findTop(s: string, i: number, stop: string): number {
  let depth = 0;
  while (i < s.length) {
    const o = skipOpaque(s, i);
    if (o >= 0) { i = o; continue; }
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && stop.includes(c)) return i;
    i++;
  }
  return -1;
}

/** The index just after the `}` that closes the `{` at `open`. */
function closeOf(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length;) {
    const o = skipOpaque(s, i);
    if (o >= 0) { i = o; continue; }
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i + 1;
    i++;
  }
  throw new Error('narrow-css: an unclosed block');
}

/** Splits at depth-0 commas, keeping every character (the parts joined with ',' are the input). */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const k = findTop(s, from, ',');
    if (k < 0) { out.push(s.slice(from)); return out; }
    out.push(s.slice(from, k));
    from = k + 1;
  }
}

/** A media query list read as a touch screen reads it: `(pointer: coarse)` true, `(pointer: fine)` false.
 *  Returns the rewritten list, '' when it is always true, null when it can never be true. */
export function mirrorQuery(query: string): string | null {
  const kept: string[] = [];
  for (const q of splitTop(query)) {
    const conds = q.trim().split(/\s+and\s+/i);
    let dead = false;
    const rest: string[] = [];
    for (const raw of conds) {
      const c = raw.trim();
      if (!/^\(.*\)$/.test(c)) throw new Error(`narrow-css: cannot read the media condition "${c}"`);
      const f = c.slice(1, -1).replace(/\s+/g, '').toLowerCase();
      if (f === 'pointer:coarse') continue;
      if (f === 'pointer:fine') { dead = true; continue; }
      if (/pointer|hover/.test(f)) throw new Error(`narrow-css: cannot mirror the media condition "${c}"`);
      rest.push(c);
    }
    if (dead) continue;
    if (!rest.length) return '';
    kept.push(rest.join(' and '));
  }
  return kept.length ? kept.join(', ') : null;
}

/** Every selector of a list keyed on the narrow root ('on') or kept off it ('off'); its layout is kept. */
export function narrowSelectors(list: string, mode: 'on' | 'off'): string {
  return splitTop(list).map((part) => {
    const lead = /^\s*/.exec(part)![0];
    const body = part.slice(lead.length);
    if (/^:root(?![\w-])/.test(body)) throw new Error('narrow-css: a :root selector in a marked block');
    if (/^html(?![\w-])/.test(body)) {
      // the compound that starts at html ends at the first depth-0 space or combinator
      const end = findTop(body, 4, ' \t\r\n>+~');
      const at = end < 0 ? body.trimEnd().length : end;
      return lead + body.slice(0, at) + (mode === 'on' ? ON_HTML : GUARD_HTML) + body.slice(at);
    }
    return lead + (mode === 'on' ? ON : GUARD) + body;
  }).join(',');
}

/** A block's body with every rule's selectors rewritten; refuses a nested at-rule. */
function rewriteBody(body: string, mode: 'on' | 'off'): string {
  let out = '';
  let i = 0;
  while (i < body.length) {
    const ws = /^\s*/.exec(body.slice(i))![0];
    out += ws; i += ws.length;
    if (i >= body.length) break;
    if (body.startsWith('/*', i)) { const e = skipOpaque(body, i); out += body.slice(i, e); i = e; continue; }
    if (body[i] === '@') throw new Error('narrow-css: a nested at-rule in a marked block');
    const open = findTop(body, i, '{');
    if (open < 0) throw new Error('narrow-css: a rule without a body');
    const end = closeOf(body, open);
    out += narrowSelectors(body.slice(i, open), mode) + body.slice(open, end);
    i = end;
  }
  return out;
}

/** The whole sheet with its layout blocks mirrored (see the header). */
export function narrowCss(src: string): string {
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  let out = '';
  let from = 0;
  MARKER.lastIndex = 0;
  for (let m = MARKER.exec(src); m; m = MARKER.exec(src)) {
    const kind = m[1];
    if (kind !== 'layout' && kind !== 'touch') throw new Error(`narrow-css: an unknown marker "narrow: ${kind}"`);
    const at = m.index + m[0].length;
    if (!src.startsWith('@media', at)) throw new Error(`narrow-css: the marker "narrow: ${kind}" is not followed by @media`);
    const open = findTop(src, at, '{');
    const query = src.slice(at + 6, open).trim();
    if (!/\(\s*pointer\s*:/.test(query)) throw new Error(`narrow-css: a marked block that names no pointer: ${query}`);
    const end = closeOf(src, open);
    MARKER.lastIndex = end;
    if (kind === 'touch') continue;
    const mq = mirrorQuery(query);
    const fine = /\(\s*pointer\s*:\s*fine\s*\)/.test(query);
    const body = src.slice(open + 1, end - 1);
    out += src.slice(from, open + 1) + (fine ? rewriteBody(body, 'off') : body) + '}';
    if (mq !== null) out += eol + MIRROR_MARK + eol + '@media ' + (mq || 'all') + ' {' + rewriteBody(body, 'on') + '}';
    from = end;
  }
  return out + src.slice(from);
}

/** The transform undone: every mirror and every guard taken out (the strip-back proof). */
export function stripNarrow(out: string): string {
  let s = out;
  for (let k = s.indexOf(MIRROR_MARK); k >= 0; k = s.indexOf(MIRROR_MARK)) {
    const lead = s[k - 2] === '\r' ? 2 : 1; // the line break before the mark
    const open = s.indexOf('{', k);
    s = s.slice(0, k - lead) + s.slice(closeOf(s, open));
  }
  return s.split(GUARD).join('').split(GUARD_HTML).join('');
}
