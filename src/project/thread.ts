/** THE FILM'S THREAD, DRAWN (owner, 2026-11-25: the synopsis left every film page and a quiet line drawing of the
 *  film's path stands in its row: "muted, subtle"). This file is the only part that touches the page: it measures the
 *  band and the player, asks the planner what to draw (project/thread-plan.ts), and sets the markup the drawer makes
 *  (project/thread-draw.ts). The page's poster lock zooms <body>, so screen px are divided by the band's own zoom
 *  (lib/title.ts zoomOf) and everything here is in layout px. The drawing never moves: it is made again only when one
 *  of the boxes it was planned from has changed (a window resized, a device turned, the player's size settling). */
import { zoomOf } from '../lib/title';
import { threadSvg } from './thread-draw';
import { planBand, planSide, sideBox, type Box, type FilmWords } from './thread-plan';

export interface ThreadMount {
  /** the band, where the synopsis stood (#p-thread: its 120 px are kept in the styles) */
  band: HTMLElement;
  /** the box beside the player (#p-thread-side: placed and sized here, hidden where there is no room) */
  side: HTMLElement;
  /** the section's body: the side box is placed inside it */
  body: HTMLElement;
  /** the section's rail: the feed spool stands in it where it is wide enough */
  rail: HTMLElement;
  /** the player's box, or a film in parts' stage; null for a film with no player */
  stage: HTMLElement | null;
  film: FilmWords;
  /** the film's own colour: the gate's hairline and the take-up reel's dot */
  accent: string;
  /** the film's thread pictures, in order (lib/content.ts threadFrames) */
  pics: { code: string; url: string; w: number; h: number }[];
}

/** Draws the thread, and draws it again whenever the band's or the player's box changes. */
export function mountThread(m: ThreadMount): void {
  const urls = new Map(m.pics.map((p) => [p.code, p.url]));
  const href = (code: string) => urls.get(code) ?? null;
  let last = '';
  const draw = () => {
    const z = zoomOf(m.band);
    const b = m.band.getBoundingClientRect();
    if (b.width === 0) return; // (not laid out: a hidden page)
    const body = m.body.getBoundingClientRect();
    const px = (n: number) => Math.round(n / z);
    const w = px(b.width);
    const rail = Math.max(0, px(b.left - m.rail.getBoundingClientRect().left));
    let player: Box | null = null;
    if (m.stage && !m.stage.hidden) {
      const s = m.stage.getBoundingClientRect();
      if (s.width > 0) player = { x: px(s.left - b.left), y: px(s.top - b.top), w: px(s.width), h: px(s.height) };
    }
    const side = sideBox({ w, h: px(body.bottom - b.top) }, player);
    const key = JSON.stringify([w, rail, player, side]);
    if (key === last) return;
    last = key;
    const band = planBand({ w, rail, side, pics: m.pics, film: m.film });
    m.band.innerHTML = threadSvg(band, { accent: m.accent, href });
    const svg = m.band.firstElementChild as SVGElement;
    svg.style.left = `${band.box.x}px`;
    svg.style.top = `${band.box.y}px`;
    if (side && player && band.exit !== null) {
      const from = band.frames.length;
      const run = planSide({ side, exit: band.exit, player, pics: m.pics.slice(from, from + 2), film: m.film });
      m.side.style.left = `${px(b.left - body.left) + side.x}px`;
      m.side.style.top = `${px(b.top - body.top) + side.y}px`;
      m.side.style.width = `${side.w}px`;
      m.side.style.height = `${side.h}px`;
      m.side.innerHTML = threadSvg(run, { accent: m.accent, href });
      m.side.hidden = false;
    } else {
      m.side.hidden = true;
      m.side.innerHTML = '';
    }
  };
  let asked = 0;
  const ask = () => {
    cancelAnimationFrame(asked);
    asked = requestAnimationFrame(draw);
  };
  draw();
  if (typeof ResizeObserver === 'function') {
    const boxes = new ResizeObserver(ask);
    boxes.observe(m.body);
    if (m.stage) boxes.observe(m.stage);
  }
  window.addEventListener('resize', ask);
}
