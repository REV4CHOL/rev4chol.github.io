/** THE FILM'S THREAD, AS MARKUP (owner, 2026-11-25). Turns the planner's description (project/thread-plan.ts) into one
 *  SVG string. Quiet by construction: every opacity is written from THREAD_INK and nothing else, the film's accent
 *  stands on two details at most (the gate's hairline and the take-up reel's dot), the stills are dimmed by opacity over
 *  the page's black. No filter, mask, style, class or animation; nothing pressable; hidden from a screen reader.
 *
 *  The film seen edge on is the path stroked three times: a wide bone stroke, the page's black over it (leaving two
 *  hairlines 3 px apart), then a faint dashed stroke for the perforations between them. */
import { THREAD, THREAD_INK, type ThreadPlan } from './thread-plan';

const BONE = '#EDEDE6';
const VOID = '#060606';

/** Text and attribute escaping with named entities (the micro face's words, a frame's address, the accent). */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'));
const op = (v: number): string => `opacity="${String(v)}"`;
const n = (v: number): string => String(Math.round(v * 100) / 100 + 0);

export function threadSvg(plan: ThreadPlan, o: { accent: string; href: (code: string) => string | null }): string {
  const { box, type } = plan;
  const acc = esc(o.accent);
  const text = (s: string, x: number, y: number, anchor: string, ink: number) =>
    `<text x="${n(x)}" y="${n(y)}" font-size="${type}" text-anchor="${anchor}" letter-spacing="0.16em" fill="${BONE}" ${op(ink)}>${esc(s)}</text>`;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(box.x)} ${n(box.y)} ${n(box.w)} ${n(box.h)}" width="${n(box.w)}" height="${n(box.h)}" aria-hidden="true" focusable="false">`);

  // the film: two hairlines and the perforations between them
  const d = esc(plan.path);
  out.push(`<path d="${d}" fill="none" stroke="${BONE}" stroke-width="${THREAD.gap + 2}" ${op(THREAD_INK.line)}/>`);
  out.push(`<path d="${d}" fill="none" stroke="${VOID}" stroke-width="${THREAD.gap}"/>`);
  out.push(`<path d="${d}" fill="none" stroke="${BONE}" stroke-width="${THREAD.gap - 1}" stroke-dasharray="1 7" ${op(THREAD_INK.tick)}/>`);

  // rollers: a rim and a hub
  for (const r of plan.rollers) {
    out.push(`<circle cx="${n(r.x)}" cy="${n(r.y)}" r="${n(r.r)}" fill="none" stroke="${BONE}" ${op(THREAD_INK.roller)}/>`);
    out.push(`<circle cx="${n(r.x)}" cy="${n(r.y)}" r="1.2" fill="${BONE}" ${op(THREAD_INK.hub)}/>`);
  }

  // reels: rings fainter inward; the take-up reel's dot in the film's accent
  for (const reel of plan.reels) {
    reel.rings.slice(0, THREAD_INK.reel.length).forEach((rr, i) => {
      out.push(`<circle cx="${n(reel.x)}" cy="${n(reel.y)}" r="${n(rr)}" fill="none" stroke="${BONE}" ${op(THREAD_INK.reel[i])}/>`);
    });
    out.push(reel.accent
      ? `<circle cx="${n(reel.x)}" cy="${n(reel.y)}" r="1.6" fill="${acc}" ${op(THREAD_INK.accent)}/>`
      : `<circle cx="${n(reel.x)}" cy="${n(reel.y)}" r="1.6" fill="${BONE}" ${op(THREAD_INK.hub)}/>`);
  }

  // frames: the picture over black, dimmed, in a hairline, with its code (a picture the page cannot name is not drawn)
  for (const f of plan.frames) {
    const url = o.href(f.code);
    if (url === null) continue;
    const at = `x="${n(f.x)}" y="${n(f.y)}" width="${n(f.w)}" height="${n(f.h)}"`;
    out.push(`<rect ${at} fill="${VOID}"/>`);
    out.push(`<image href="${esc(url)}" ${at} preserveAspectRatio="none" ${op(THREAD_INK.still)}/>`);
    out.push(`<rect x="${n(f.x + 0.5)}" y="${n(f.y + 0.5)}" width="${n(Math.max(0, f.w - 1))}" height="${n(Math.max(0, f.h - 1))}" fill="none" stroke="${BONE}" ${op(THREAD_INK.frame)}/>`);
    out.push(text(f.code, f.label.x, f.label.y, f.label.anchor, THREAD_INK.code));
  }

  // the gate: two brackets either side of the film, one accent hairline across it
  if (plan.gate) {
    const { x, y, vertical } = plan.gate;
    const a = 10, g = 9;
    const brackets = vertical
      ? `M ${n(x - g)} ${n(y - a)} L ${n(x - g)} ${n(y + a)} M ${n(x + g)} ${n(y - a)} L ${n(x + g)} ${n(y + a)} M ${n(x - g - 3)} ${n(y - a)} L ${n(x - g)} ${n(y - a)} M ${n(x - g - 3)} ${n(y + a)} L ${n(x - g)} ${n(y + a)} M ${n(x + g)} ${n(y - a)} L ${n(x + g + 3)} ${n(y - a)} M ${n(x + g)} ${n(y + a)} L ${n(x + g + 3)} ${n(y + a)}`
      : `M ${n(x - a)} ${n(y - g)} L ${n(x + a)} ${n(y - g)} M ${n(x - a)} ${n(y + g)} L ${n(x + a)} ${n(y + g)} M ${n(x - a)} ${n(y - g - 3)} L ${n(x - a)} ${n(y - g)} M ${n(x + a)} ${n(y - g - 3)} L ${n(x + a)} ${n(y - g)} M ${n(x - a)} ${n(y + g)} L ${n(x - a)} ${n(y + g + 3)} M ${n(x + a)} ${n(y + g)} L ${n(x + a)} ${n(y + g + 3)}`;
    const across = vertical
      ? `M ${n(x - g + 2)} ${n(y)} L ${n(x + g - 2)} ${n(y)}`
      : `M ${n(x)} ${n(y - g + 2)} L ${n(x)} ${n(y + g - 2)}`;
    out.push(`<path d="${brackets}" fill="none" stroke="${BONE}" ${op(THREAD_INK.gate)}/>`);
    out.push(`<path d="${across}" fill="none" stroke="${acc}" ${op(THREAD_INK.accent)}/>`);
  }

  // the words: the film's name, its year, its place
  for (const l of plan.labels) out.push(text(l.text, l.x, l.y, l.anchor, THREAD_INK.type));

  out.push('</svg>');
  return out.join('');
}
