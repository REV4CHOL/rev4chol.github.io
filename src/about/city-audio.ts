/** THE CITY'S SOUND (owner: ambient SFX) — synthesised on the site's one
 *  audio bus (lib/sound.ts: unlocked by the first gesture, muted by the
 *  SND toggle), nothing loaded: a wind-and-hum bed that thickens with
 *  altitude and speed; the traffic's roar and tyre hiss, loud in the streets
 *  and faint from the heights; the stadium's crowd,
 *  chanting, by distance; the market's murmur; the neon's buzz at kerb
 *  level; horns now and then down low; a siren passing every minute or
 *  two, panned across; a thump for every firework. Every level eases —
 *  nothing clicks on. */
import { sound } from '../lib/sound';

export interface Ambience {
  y: number; speed: number; dStadium: number; dMarket: number;
  /** A counter: each increment is a firework launched, at this distance. */
  fireworks: number; dFireworks: number;
}

interface Bed { gain: GainNode; level: number }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class CityAudio {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private beds: Record<string, Bed> = {};
  private nextHorn = 0;
  private nextSiren = 0;
  private fireworks = 0;
  private started = false;

  constructor() {
    sound.onUnlock(() => this.build());
  }

  private noise(seconds: number, brown = false): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  /** A looping filtered-noise bed with its own gain (starts silent). */
  private bed(name: string, brown: boolean, type: BiquadFilterType, freq: number, q: number, tremolo?: [number, number]): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(2.5 + Math.random(), brown);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.out!);
    if (tremolo) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = tremolo[0];
      const lg = ctx.createGain();
      lg.gain.value = tremolo[1];
      lfo.connect(lg).connect(g.gain);
      lfo.start();
    }
    src.start();
    this.beds[name] = { gain: g, level: 0 };
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
    this.bed('hum', true, 'lowpass', 170, 0.7, [0.09, 0.02]);
    this.bed('wind', false, 'bandpass', 420, 0.5, [0.17, 0.3]);
    this.bed('traffic', true, 'bandpass', 300, 0.8, [0.23, 0.25]);
    this.bed('tyres', false, 'bandpass', 1300, 1.0, [0.31, 0.4]);
    this.bed('crowd', false, 'bandpass', 900, 1.4, [3.9, 0.55]);
    this.bed('market', false, 'bandpass', 700, 1.1, [1.7, 0.35]);
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
    this.nextHorn = ctx.currentTime + 2;
    this.nextSiren = ctx.currentTime + 20 + Math.random() * 40;
  }

  private set(name: string, level: number, tau = 0.6): void {
    const b = this.beds[name];
    if (!b || !this.ctx) return;
    if (Math.abs(b.level - level) < 0.0005) return;
    b.level = level;
    b.gain.gain.setTargetAtTime(level, this.ctx.currentTime, tau);
  }

  private horn(low: number): void {
    const ctx = this.ctx!, t = ctx.currentTime;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05 * low, t + 0.02);
    g.gain.setValueAtTime(0.05 * low, t + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    for (const f of [Math.random() < 0.5 ? 392 : 330, 494]) {
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = f * (0.96 + Math.random() * 0.08);
      o.connect(lp);
      o.start(t); o.stop(t + 0.3);
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
    const low = clamp(1 - a.y / 70, 0, 1); // 1 in the streets, 0 from the heights
    const high = clamp((a.y - 40) / 120, 0, 1);
    const rush = clamp(a.speed / 1.2, 0, 1);
    this.set('hum', 0.05 + 0.03 * high);
    this.set('wind', 0.012 + 0.05 * high + 0.08 * rush, 0.4);
    this.set('traffic', 0.04 + 0.11 * low * low);
    this.set('tyres', 0.02 + 0.06 * low);
    this.set('crowd', 0.24 / (1 + (a.dStadium / 70) ** 2), 1);
    this.set('market', 0.1 / (1 + (a.dMarket / 26) ** 2) * low, 0.8);
    this.set('neon', 0.014 * clamp((22 - a.y) / 14, 0, 1), 0.8);
    const t = this.ctx.currentTime;
    if (t > this.nextHorn) {
      this.nextHorn = t + 2.5 + Math.random() * 7;
      if (low > 0.2 && Math.random() < 0.8) this.horn(low);
    }
    if (t > this.nextSiren) {
      this.nextSiren = t + 45 + Math.random() * 80;
      this.siren();
    }
    if (a.fireworks > this.fireworks) { this.fireworks = a.fireworks; this.pop(a.dFireworks); }
  }
}
