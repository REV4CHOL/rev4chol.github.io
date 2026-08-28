import type { Application } from 'pixi.js';
import { Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { GlitchFilter, RGBSplitFilter } from 'pixi-filters';
import { ISO } from './constants';
import type { ViewRect } from './priority';

/* Channel-flip effects — the misprint pass. A flip is a broadcast breaking
   up: the whole world (panes, furniture, the lattice itself) physically
   tears along the iso grain while the signal misregisters — RGB plates
   drift apart, glitch slices jump every frame, comic speed lines rip
   through the void, the camera takes stepped kicks. Everything here is
   called from WorksWorld.exit()/arrive(), which gate on reducedMotion —
   nothing in this module runs in calm mode. */

const G_LEN = Math.hypot(ISO.a, ISO.b);
/** Unit vector of the floor's iso grain — every flip motion runs along it. */
export const GRAIN = { x: ISO.a / G_LEN, y: ISO.b / G_LEN };
const GRAIN_DEG = (Math.atan2(GRAIN.y, GRAIN.x) * 180) / Math.PI;

const INKS: Array<{ color: number; alpha: number }> = [
  { color: 0xc8ff00, alpha: 0.8 }, // signal — carries the burst
  { color: 0xc8ff00, alpha: 0.4 },
  { color: 0xedede6, alpha: 0.7 }, // bone
  { color: 0xff2e63, alpha: 0.75 }, // alert
  { color: 0x2418ff, alpha: 0.85 }, // field
  { color: 0xb79cff, alpha: 0.55 }, // flourish
];

/** Stepped camera kicks. The pan controller rewrites worldC's position every
    tick, so the stage is the one transform the jolt can own without a fight. */
export function joltCamera(stage: Container, amp = 1): void {
  gsap.killTweensOf(stage.position);
  gsap
    .timeline()
    .to(stage.position, { x: 11 * amp, y: -6 * amp, duration: 0.05, ease: 'steps(1)' })
    .to(stage.position, { x: -8 * amp, y: 5 * amp, duration: 0.05, ease: 'steps(1)' })
    .to(stage.position, { x: 0, y: 0, duration: 0.04, ease: 'steps(1)' });
}

export interface Misreg {
  dispose(): void;
}

/** The misregistration rig: glitch slices displaced along the grain + RGB
    plate drift, reseeded every frame, intensity tweened from→to. On a natural
    finish it tears itself down — unless enter()'s own burst has replaced the
    filters, in which case it leaves them alone. Exit worlds die before their
    rig finishes, so destroy() must dispose() it by hand. */
export function misregister(
  app: Application,
  target: Container,
  from: number,
  to: number,
  duration: number,
  onDone?: () => void,
): Misreg {
  const glitch = new GlitchFilter({ slices: 10, offset: 24, direction: GRAIN_DEG });
  const rgb = new RGBSplitFilter({ red: { x: 0, y: 0 }, green: { x: 0, y: 0 }, blue: { x: 0, y: 0 } });
  target.filters = [glitch, rgb];
  const ticker = app.ticker;
  const k = { v: from };
  const jitter = () => {
    glitch.seed = Math.random();
    glitch.offset = k.v * (2.2 + Math.random() * 3.4);
    const s = k.v * (0.7 + Math.random() * 0.6);
    rgb.red = { x: s, y: -s * 0.35 };
    rgb.blue = { x: -s, y: s * 0.35 };
  };
  ticker.add(jitter);
  let done = false;
  const teardown = () => {
    if (done) return;
    done = true;
    ticker.remove(jitter);
    if (target.destroyed) return;
    if (target.filters?.includes(glitch)) target.filters = [];
  };
  const tw = gsap.to(k, {
    v: to,
    duration,
    ease: to > from ? 'power2.in' : 'power3.out',
    onComplete: () => {
      teardown();
      onDone?.();
    },
  });
  return {
    dispose: () => {
      tw.kill();
      teardown();
    },
  };
}

export interface Burst {
  kill(): void;
}

/** Comic speed lines along the grain — solid slabs, broken dashes and Ben-Day
    dot rails shooting through the view in alternating bands, some stuttering
    on stepped easing. Every streak destroys itself and a sweeper reaps the
    layer once the last one lands; kill() ends everything early so a world
    teardown never leaves a tween writing to destroyed graphics. */
export function streakBurst(world: Container, index: number, view: ViewRect, sign: 1 | -1): Burst {
  const layer = new Container();
  world.addChildAt(layer, Math.min(index, world.children.length));
  const rot = Math.atan2(GRAIN.y, GRAIN.x);
  const eases = ['power1.in', 'steps(4)', 'none'];
  const tls: gsap.core.Timeline[] = [];
  let maxEnd = 0;
  for (let i = 0; i < 34; i++) {
    const ink = INKS[Math.floor(Math.random() * INKS.length)];
    const len = 90 + Math.random() * 380;
    const th = 2 + Math.random() * 3;
    const s = new Graphics();
    const form = Math.random();
    if (form < 0.22) {
      // dot rail — the halftone note
      for (let d = 0; d < len; d += 13) s.circle(d, 0, th * 0.7 * (0.7 + Math.random() * 0.6));
    } else if (form < 0.4) {
      // broken dash
      for (let d = 0; d < len; d += 34) s.rect(d, -th / 2, 22, th);
    } else {
      s.rect(0, -th / 2, len, th);
    }
    s.fill({ color: ink.color, alpha: ink.alpha });
    s.rotation = rot;
    s.x = view.x - view.w * 0.2 + Math.random() * view.w * 1.4;
    s.y = view.y - view.h * 0.2 + Math.random() * view.h * 1.4;
    const band = Math.floor((s.y - view.y) / 150);
    const dir = (((band % 2) + 2) % 2 === 0 ? 1 : -1) * sign;
    const travel = (480 + Math.random() * 560) * dir;
    const dur = 0.2 + Math.random() * 0.22;
    const delay = Math.random() * 0.16;
    maxEnd = Math.max(maxEnd, delay + dur);
    tls.push(
      gsap
        .timeline({ delay, onComplete: () => { if (!s.destroyed) s.destroy(); } })
        .to(s, { x: s.x + travel * GRAIN.x, y: s.y + travel * GRAIN.y, duration: dur, ease: eases[Math.floor(Math.random() * eases.length)] }, 0)
        .to(s, { alpha: 0, duration: 0.08, ease: 'none' }, Math.max(0, dur - 0.08)),
    );
    layer.addChild(s);
  }
  const sweep = () => {
    for (const tl of tls) tl.kill();
    if (!layer.destroyed) layer.destroy({ children: true });
  };
  const sweeper = gsap.delayedCall(maxEnd + 0.08, sweep);
  return {
    kill: () => {
      sweeper.kill();
      sweep();
    },
  };
}
