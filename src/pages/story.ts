import { music } from '../lib/music';
import { armPosterLock } from '../lib/poster-lock';
import { LOOKS, nextTime, parseTime, TimeOfDay, TIMES } from '../about/city-sky';
import { sound } from '../lib/sound';
import { armGlideNav, navNeighbors } from '../lib/swipe-nav';
import { hashSlug } from '../project/dossier';
import { startPage } from '../shell/page';
import '../styles/story.css';

/** The dial's seats — the tour left the section (owner: STORY opens in AUTO on every
 *  platform): AUTO drifts the city on its own, FREE hands over the stick. */
type Mode = 'auto' | 'free';
let mode: Mode = 'auto';

startPage('story', async ({ site }) => {
  // the page rides the plate; the CITY keeps true viewport pixels
  armPosterLock({ exempt: '#a3c' });
  // nothing scrolls here since the tour left, so no boundary to check: the
  // glide home arms while the city drifts itself — in FREE the thumb owns
  // the stick and the look, and the page keeps its seat
  armGlideNav({
    ...navNeighbors(site.nav, location.pathname),
    enabled: () => mode === 'auto',
  });
  await armFlight();
});

/** The time of day the page opens at: the address may ask (?tod=dawn), else the NIGHT (owner: always night; the
 *  switch works for the visit and is not remembered). */
function startTime(): TimeOfDay {
  const fromUrl = new URLSearchParams(location.search).get('tod');
  return fromUrl ? parseTime(fromUrl) : 'night';
}

/** The city mounts lazily (three.js is the story page's private cargo) and
 *  flies itself from the first frame; the dial can hand the stick over. */
async function armFlight(): Promise<void> {
  const canvas = document.getElementById('a3c') as HTMLCanvasElement | null;
  if (!canvas) return;
  await music.ready(); // (the build holds the main thread: the music is audibly on before it — a loading screen never cuts it)
  const { mountCity3D } = await import('../about/city3d');
  const ride = mountCity3D(canvas, hashSlug('revachol-night-city'));
  // THE FILM LAYERS OFF THE CITY (owner: "the whole city is having this window glitch" — the site's grain, a 1:1 noise
  // tile re-dealt every frame and composited overlay, lands hardest on mid-grey, and the city's dark glass is mid-grey:
  // every unlit pane crawled with static; the scanlines banded the panes over it). The canvas fills the viewport, so
  // the layers' punched hole (the one the film player uses) is the whole layer here: raw glass, the chrome keeps nothing
  // it would miss.
  for (const el of [document.getElementById('grain'), document.querySelector<HTMLElement>('.scan-layer')]) {
    if (!el) continue;
    el.classList.add('has-hole');
    el.style.setProperty('--hole-x', '0px'); el.style.setProperty('--hole-y', '0px');
    el.style.setProperty('--hole-w', '100%'); el.style.setProperty('--hole-h', '100%');
  }
  (window as unknown as { rvlRide: typeof ride }).rvlRide = ride; // debug handle for verification

  // -- the flight dial: AUTO (endless drift, the section's opening seat) /
  // FREE (drag-look + WASD; on a phone a stick, lift buttons and a drag) --
  const fly = document.getElementById('a3-fly')!;
  const hint = document.getElementById('a3-hint')!;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const modes: Mode[] = ['auto', 'free'];
  if (!fine) hint.textContent = 'DRAG ▸ LOOK ▪ STICK ▸ MOVE ▪ ▲▼ ▸ RISE/SINK';
  fly.innerHTML = modes
    .map((m) => `<button type="button" data-m="${m}"${m === 'auto' ? ' class="on"' : ''}>${m.toUpperCase()}</button>`)
    .join('');
  const setMode = (m: Mode, boot = false) => {
    mode = m;
    ride.setMode(m);
    document.body.classList.toggle('a3-touch-free', m === 'free' && !fine);
    if (m !== 'free') ride.setStick(0, 0, 0);
    hint.hidden = m !== 'free';
    for (const b of fly.querySelectorAll('button')) b.classList.toggle('on', b.dataset.m === m);
    if (!boot) sound.click(); // (the opening seat is set by the house, not a click)
  };
  setMode('auto', true); // every platform opens mid-drift
  fly.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (b) setMode(b.dataset.m as Mode);
  });
  // -- the clock: NIGHT / DUSK / DAWN / HAZE / DAY (owner: a time-of-day
  // system) — settable from the address (?tod=dawn), T cycles it
  const clock = document.getElementById('a3-tod')!;
  clock.innerHTML = TIMES.map((t) => `<button type="button" data-t="${t}">${LOOKS[t].label}</button>`).join('');
  let tod = startTime();
  const setTime = (t: TimeOfDay, instant = false) => {
    tod = t;
    ride.setTime(t, instant);
    for (const b of clock.querySelectorAll('button')) b.classList.toggle('on', b.dataset.t === t);
  };
  setTime(tod, true);
  clock.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (b) { setTime(b.dataset.t as TimeOfDay); sound.click(); }
  });
  // free flight: drag anywhere to look (the whole page is the windshield),
  // WASD/arrows to move — on a phone the drag looks, a stick moves, two
  // buttons rise and sink
  let lookId: number | null = null;
  let lx = 0, ly = 0;
  window.addEventListener('pointerdown', (e) => {
    if (mode !== 'free' || lookId !== null) return;
    if ((e.target as Element).closest?.('.a3-fly, .a3-tod, .a3-pad, .a3-lift, .nav, .hud, a, button')) return;
    lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (lookId !== e.pointerId || mode !== 'free') return;
    ride.look(e.clientX - lx, e.clientY - ly);
    lx = e.clientX; ly = e.clientY;
  });
  const endLook = (e: PointerEvent) => { if (e.pointerId === lookId) lookId = null; };
  window.addEventListener('pointerup', endLook);
  window.addEventListener('pointercancel', endLook);
  if (!fine) { // the stick and the lift buttons (owner: free fly mode on mobile, with touch controls)
    const pad = document.createElement('div');
    pad.className = 'a3-pad'; pad.setAttribute('aria-hidden', 'true');
    const knob = document.createElement('div');
    knob.className = 'a3-pad-knob';
    pad.append(knob);
    const lift = document.createElement('div');
    lift.className = 'a3-lift'; lift.setAttribute('aria-label', 'Rise and sink');
    lift.innerHTML = '<button type="button" data-l="1" aria-label="Rise">▲</button><button type="button" data-l="-1" aria-label="Sink">▼</button>';
    document.body.append(pad, lift);
    let padId: number | null = null;
    let sx = 0, sy = 0, liftV = 0;
    const R = 40;
    const setKnob = (dx: number, dy: number) => { knob.style.translate = `${dx}px ${dy}px`; };
    pad.addEventListener('pointerdown', (e) => {
      if (padId !== null) return;
      padId = e.pointerId; sx = e.clientX; sy = e.clientY;
      try { pad.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer: no capture to take */ }
    });
    pad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== padId) return;
      let dx = e.clientX - sx, dy = e.clientY - sy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      setKnob(dx, dy);
      ride.setStick(-dx / R, -dy / R, liftV); // (owner: left is left)
    });
    const endPad = (e: PointerEvent) => {
      if (e.pointerId !== padId) return;
      padId = null; setKnob(0, 0); ride.setStick(0, 0, liftV);
    };
    pad.addEventListener('pointerup', endPad);
    pad.addEventListener('pointercancel', endPad);
    for (const b of lift.querySelectorAll<HTMLButtonElement>('button')) {
      const v = Number(b.dataset.l);
      const on = (e: PointerEvent) => { e.preventDefault(); liftV = v; ride.setStick(padId === null ? 0 : undefined, undefined, liftV); };
      const off = () => { if (liftV === v) { liftV = 0; ride.setStick(undefined, undefined, 0); } };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    }
  }
  window.addEventListener('keydown', (e) => {
    ride.keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 't' && !e.repeat && !(e.target as Element).closest?.('input, textarea')) { setTime(nextTime(tod)); sound.click(); }
    // the windshield owns these keys mid-flight — the page must not scroll
    if (mode === 'free' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => ride.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => ride.keys.clear());
}
