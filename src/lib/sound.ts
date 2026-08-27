let ctxRef: AudioContext | null = null;

class SoundEngine {
  enabled = true;
  private hum: { gain: GainNode; stop: () => void } | null = null;
  private unlocked = false;
  private unlockCbs: (() => void)[] = [];

  constructor() {
    try { this.enabled = localStorage.getItem('rvl-sound') !== 'off'; } catch { /* private mode */ }
  }

  /** Call from the first user gesture. Idempotent. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.ctx();
    for (const cb of this.unlockCbs) cb();
    this.unlockCbs = [];
  }

  onUnlock(cb: () => void): void {
    if (this.unlocked) cb();
    else this.unlockCbs.push(cb);
  }

  private ctx(): AudioContext | null {
    if (!this.unlocked) return null;
    if (!ctxRef) {
      try { ctxRef = new AudioContext(); } catch { return null; }
    }
    if (ctxRef.state === 'suspended') void ctxRef.resume();
    return ctxRef;
  }

  private blip(freq: number, durS: number, type: OscillatorType, peak: number): void {
    if (!this.enabled) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durS);
    osc.connect(bp).connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durS + 0.02);
  }

  hover(): void { this.blip(2400, 0.04, 'square', 0.06); }
  click(): void { this.blip(300, 0.1, 'triangle', 0.18); }

  whoosh(): void {
    if (!this.enabled) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.45);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + 0.18);
    lp.frequency.exponentialRampToValueAtTime(150, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t);
  }

  startHum(): void {
    if (!this.enabled || this.hum) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 2);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 65;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.2);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.015;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start();
    lfo.start();
    this.hum = { gain: g, stop: () => { src.stop(); lfo.stop(); } };
  }

  stopHum(): void {
    if (!this.hum) return;
    if (ctxRef) this.hum.gain.gain.linearRampToValueAtTime(0, ctxRef.currentTime + 0.4);
    const h = this.hum;
    this.hum = null;
    setTimeout(() => h.stop(), 500);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try { localStorage.setItem('rvl-sound', this.enabled ? 'on' : 'off'); } catch { /* ok */ }
    if (!this.enabled) this.stopHum();
    return this.enabled;
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const sound = new SoundEngine();
