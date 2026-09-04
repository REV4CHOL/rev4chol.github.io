/** THE CITY'S SOUND (owner: ambient SFX) — synthesised on the site's one
 *  audio bus (lib/sound.ts: unlocked by the first gesture, muted by the
 *  SND toggle), nothing loaded: a wind-and-hum bed that thickens with
 *  altitude and speed; the traffic's roar and tyre hiss, loud in the streets
 *  and faint from the heights; the stadium's crowd, chanting, by distance;
 *  the market's murmur; the neon's buzz at kerb level; a distant horn now
 *  and then down low; a siren passing every minute or two, panned across; a
 *  thump for every firework. Every level eases — nothing clicks on.
 *
 *  THE MIX IS PURE (mixFor, tested): the camera's height, speed and
 *  distances give every bed its level. Each bed's tremolo is MULTIPLIED
 *  into it — a unity gain swung by a fraction of itself, then the level —
 *  so a bed at level zero is silent. (Owner: "a jumble": the tremolos were
 *  ADDED to the gains, their depths of 0.25–0.55 against levels of 0–0.15,
 *  so every bed played at its LFO's full swing wherever the camera stood,
 *  through negative gain — the stadium's crowd chopping at 3.9 Hz across
 *  the whole city, the market at 1.7 Hz; measured: a bed at level 0 rendered
 *  at the same RMS as at its level.) The noise loops are seamless — the
 *  head begins as the tail's continuation — so no loop thumps either. */
import { sound } from '../lib/sound';

export interface Ambience {
  y: number; speed: number; dStadium: number; dMarket: number;
  /** A counter: each increment is a firework launched, at this distance. */
  fireworks: number; dFireworks: number;
}

export type BedName = 'hum' | 'wind' | 'traffic' | 'tyres' | 'crowd' | 'market';
export interface BedSpec {
  name: BedName; brown: boolean; type: BiquadFilterType; freq: number; q: number;
  /** The tremolo: its rate in Hz and its depth as a FRACTION of the level (under 1: the gain never crosses zero). */
  tremolo: [number, number];
}
/** The beds: filtered noise loops, each breathing at its own slow rate; the crowd's flutter is the chant. */
export const BEDS: BedSpec[] = [
  { name: 'hum', brown: true, type: 'lowpass', freq: 170, q: 0.7, tremolo: [0.09, 0.2] },
  { name: 'wind', brown: false, type: 'bandpass', freq: 420, q: 0.5, tremolo: [0.17, 0.5] },
  { name: 'traffic', brown: true, type: 'bandpass', freq: 300, q: 0.8, tremolo: [0.23, 0.35] },
  { name: 'tyres', brown: false, type: 'bandpass', freq: 1300, q: 1.0, tremolo: [0.31, 0.45] },
  { name: 'crowd', brown: false, type: 'bandpass', freq: 900, q: 1.4, tremolo: [3.9, 0.4] },
  { name: 'market', brown: false, type: 'bandpass', freq: 700, q: 1.1, tremolo: [1.7, 0.3] },
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Every bed's level for a camera (and the neon's), pure: the streets roar,
 *  the heights blow, the stadium and the market are heard only near them. */
export function mixFor(a: Ambience): Record<BedName | 'neon', number> {
  const low = clamp(1 - a.y / 70, 0, 1); // 1 in the streets, 0 from the heights
  const high = clamp((a.y - 40) / 120, 0, 1);
  const rush = clamp(a.speed / 1.2, 0, 1);
  return {
    hum: 0.05 + 0.03 * high,
    wind: 0.012 + 0.05 * high + 0.08 * rush,
    traffic: 0.04 + 0.11 * low * low,
    tyres: 0.02 + 0.06 * low,
    crowd: 0.24 / (1 + (a.dStadium / 70) ** 2) ** 1.5, // gone within a few blocks, not a faint chant over the whole city
    market: 0.1 / (1 + (a.dMarket / 26) ** 2) * low,
    neon: 0.014 * clamp((22 - a.y) / 14, 0, 1),
  };
}

/** A loop without a seam. Given k samples more than the loop needs, the
 *  loop's head is built as the tail's own continuation, faded over k samples
 *  into the head's proper content; the body is untouched. At the loop point
 *  the last sample runs into what really followed it — no thump. */
export function seamless(x: Float32Array, k: number): Float32Array {
  const len = x.length - k;
  const o = new Float32Array(len);
  o.set(x.subarray(k, len), k);
  for (let i = 0; i < k; i++) {
    const t = i / k;
    o[i] = x[len + i] * (1 - t) + x[i] * t;
  }
  return o;
}

interface Bed { gain: GainNode; level: number }

export class CityAudio {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private beds: Partial<Record<BedName | 'neon', Bed>> = {};
  private nextHorn = 0;
  private nextSiren = 0;
  private fireworks = 0;
  private started = false;

  constructor() {
    sound.onUnlock(() => this.build());
  }

  /** White or brown noise, `seconds` long, looping without a seam. */
  private noise(seconds: number, brown = false): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.ceil(ctx.sampleRate * seconds), k = Math.round(ctx.sampleRate * 0.1);
    const x = new Float32Array(len + k);
    let last = 0;
    for (let i = 0; i < x.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; x[i] = last * 3.5; } else x[i] = w;
    }
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    buf.copyToChannel(seamless(x, k), 0);
    return buf;
  }

  /** A looping filtered-noise bed: its tremolo multiplies, its level alone decides how loud (starts silent). */
  private bed(spec: BedSpec): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(2.5 + Math.random(), spec.brown);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = spec.type; f.frequency.value = spec.freq; f.Q.value = spec.q;
    const mod = ctx.createGain(); // unity, swung by a fraction of itself
    mod.gain.value = 1;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = spec.tremolo[0];
    const lg = ctx.createGain();
    lg.gain.value = spec.tremolo[1];
    lfo.connect(lg).connect(mod.gain);
    lfo.start();
    const g = ctx.createGain(); // the level: zero is silent
    g.gain.value = 0;
    src.connect(f).connect(mod).connect(g).connect(this.out!);
    src.start();
    this.beds[spec.name] = { gain: g, level: 0 };
  }

  private build(): void {
    if (this.started) return;
    const bus = sound.bus();
    if (!bus) return;
    this.started = true;
    this.ctx = bus.ctx;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(bus.out);
    for (const spec of BEDS) this.bed(spec);
    const ctx = this.ctx;
    // the neon: a sawtooth's harmonics through a narrow band
    const neon = ctx.createOscillator();
    neon.type = 'sawtooth'; neon.frequency.value = 120;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 240; nf.Q.value = 4;
    const ng = ctx.createGain();
    ng.gain.value = 0;
    neon.connect(nf).connect(ng).connect(this.out);
    neon.start();
    this.beds.neon = { gain: ng, level: 0 };
    this.nextHorn = ctx.currentTime + 4;
    this.nextSiren = ctx.currentTime + 20 + Math.random() * 40;
  }

  private set(name: BedName | 'neon', level: number, tau = 0.6): void {
    const b = this.beds[name];
    if (!b || !this.ctx) return;
    if (Math.abs(b.level - level) < 0.0005) return;
    b.level = level;
    b.gain.gain.setTargetAtTime(level, this.ctx.currentTime, tau);
  }

  /** A horn a few streets off: two soft tones under a low-pass, a hair detuned, panned somewhere. */
  private horn(low: number): void {
    const ctx = this.ctx!, t = ctx.currentTime;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035 * low, t + 0.03);
    g.gain.setValueAtTime(0.035 * low, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    for (const f of [Math.random() < 0.5 ? 392 : 330, 494]) {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f * (0.97 + Math.random() * 0.06);
      o.connect(lp);
      o.start(t); o.stop(t + 0.4);
    }
    lp.connect(g).connect(pan).connect(this.out!);
  }

  private siren(): void {
    const ctx = this.ctx!, t = ctx.currentTime, dur = 7;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const wob = ctx.createOscillator();
    wob.type = 'triangle'; wob.frequency.value = 1.4;
    const wg = ctx.createGain();
    wg.gain.value = 160;
    o.frequency.value = 760;
    wob.connect(wg).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.028, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const pan = ctx.createStereoPanner();
    const from = Math.random() < 0.5 ? -1 : 1;
    pan.pan.setValueAtTime(from, t);
    pan.pan.linearRampToValueAtTime(-from, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    o.connect(lp).connect(g).connect(pan).connect(this.out!);
    o.start(t); wob.start(t); o.stop(t + dur + 0.1); wob.stop(t + dur + 0.1);
  }

  /** A firework's thump, by distance. */
  private pop(d: number): void {
    const ctx = this.ctx!, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(0.5, true);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain();
    const a = 0.14 / (1 + (d / 90) ** 2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(a, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    src.connect(f).connect(g).connect(this.out!);
    src.start(t);
  }

  /** Each frame: the mix follows the camera. */
  update(a: Ambience): void {
    if (!this.ctx || !this.out) return;
    const on = sound.enabled;
    this.out.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.3);
    if (!on) return;
    const mix = mixFor(a);
    this.set('hum', mix.hum);
    this.set('wind', mix.wind, 0.4);
    this.set('traffic', mix.traffic);
    this.set('tyres', mix.tyres);
    this.set('crowd', mix.crowd, 1);
    this.set('market', mix.market, 0.8);
    this.set('neon', mix.neon, 0.8);
    const t = this.ctx.currentTime;
    if (t > this.nextHorn) {
      this.nextHorn = t + 6 + Math.random() * 12;
      const low = clamp(1 - a.y / 70, 0, 1);
      if (low > 0.2 && Math.random() < 0.7) this.horn(low);
    }
    if (t > this.nextSiren) {
      this.nextSiren = t + 45 + Math.random() * 80;
      this.siren();
    }
    if (a.fireworks > this.fireworks) { this.fireworks = a.fireworks; this.pop(a.dFireworks); }
  }
}
