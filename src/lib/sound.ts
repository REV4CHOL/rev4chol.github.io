let ctxRef: AudioContext | null = null;

class SoundEngine {
  enabled = true;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private hum: { gain: GainNode; stop: () => void } | null = null;
  private humTeardown: { timer: ReturnType<typeof setTimeout>; stop: () => void } | null = null;
  private unlockCbs: (() => void)[] = [];
  private armed = false;

  constructor() {
    try { this.enabled = localStorage.getItem('rvl-sound') !== 'off'; } catch { /* private mode */ }
  }

  /** Called once by the shell. Optimistic: Chrome propagates user activation
   *  across same-origin navigations, so a page reached by clicking a link may
   *  start its AudioContext immediately — sound then flows page to page
   *  instead of re-locking on every load. Cold loads (no activation yet) skip
   *  context creation to avoid the autoplay warning and arm gesture listeners
   *  instead. */
  init(): void {
    const activated = (navigator as Partial<{ userActivation: { hasBeenActive: boolean } }>)
      .userActivation?.hasBeenActive;
    if (activated !== false) this.ensureCtx();
    this.arm(); // stays armed even when already running — recovery is free
    if (this.ready()) this.flushUnlockCbs();
  }

  /** Any user gesture may call this; idempotent. */
  unlock(): void {
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => { /* not a gesture */ });
  }

  onUnlock(cb: () => void): void {
    if (this.ready()) cb();
    else this.unlockCbs.push(cb);
  }

  private ready(): boolean {
    return ctxRef !== null && ctxRef.state === 'running';
  }

  private flushUnlockCbs(): void {
    for (const cb of this.unlockCbs.splice(0)) cb();
  }

  /** Gesture listeners stay armed for the page's life: unlock() is idempotent
   *  and near-free once running, and a single swallowed attempt must never
   *  leave the whole site mute. Unlock callbacks flush via the context's own
   *  statechange listener (ensureCtx). */
  private arm(): void {
    if (this.armed) return;
    this.armed = true;
    const onGesture = () => this.unlock();
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    window.addEventListener('touchend', onGesture);
  }

  private ensureCtx(): AudioContext | null {
    if (!ctxRef) {
      try { ctxRef = new AudioContext(); } catch { return null; }
      // one master bus: a single volume point, and an analyser tap so the
      // output is verifiable (window.rvlSound.level())
      this.master = ctxRef.createGain();
      this.master.gain.value = 1;
      this.analyser = ctxRef.createAnalyser();
      this.analyser.fftSize = 256;
      this.master.connect(this.analyser);
      this.analyser.connect(ctxRef.destination);
      ctxRef.addEventListener('statechange', () => {
        if (this.ready()) this.flushUnlockCbs();
      });
    }
    return ctxRef;
  }

  private ctx(): AudioContext | null {
    // never schedule into a suspended context: a queue of stale blips would
    // all fire at once on resume
    return this.ready() ? ctxRef : null;
  }

  private out(): AudioNode | null {
    return this.master;
  }

  private blip(freq: number, durS: number, type: OscillatorType, peak: number, q = 6): void {
    if (!this.enabled) return;
    const ctx = this.ctx();
    const out = this.out();
    if (!ctx || !out) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durS);
    osc.connect(bp).connect(g).connect(out);
    osc.start(t);
    osc.stop(t + durS + 0.02);
  }

  hover(): void { this.blip(2400, 0.045, 'square', 0.14, 3); }

  click(): void {
    this.blip(300, 0.1, 'triangle', 0.32);
    // a sub-thump gives the tick physical weight on small speakers
    const ctx = this.ctx();
    const out = this.out();
    if (!this.enabled || !ctx || !out) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /** The datamosh tear: a falling shred of noise + a pitch-dropped square. */
  zap(): void {
    if (!this.enabled) return;
    const ctx = this.ctx();
    const out = this.out();
    if (!ctx || !out) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.2);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(3200, t);
    hp.frequency.exponentialRampToValueAtTime(280, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(hp).connect(g).connect(out);
    src.start(t);
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.15);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.12, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(og).connect(out);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  whoosh(): void {
    if (!this.enabled) return;
    const ctx = this.ctx();
    const out = this.out();
    if (!ctx || !out) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.45);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + 0.18);
    lp.frequency.exponentialRampToValueAtTime(150, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(lp).connect(g).connect(out);
    src.start(t);
  }

  startHum(): void {
    if (!this.enabled || this.hum) return;
    if (this.humTeardown) {
      clearTimeout(this.humTeardown.timer);
      this.humTeardown.stop();
      this.humTeardown = null;
    }
    const ctx = this.ctx();
    const out = this.out();
    if (!ctx || !out) return;
    // 160Hz cutoff, not 65: small laptop speakers roll off below ~150Hz and
    // rendered the old hum physically inaudible
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 2);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 1.2);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.03;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(lp).connect(g).connect(out);
    src.start();
    lfo.start();
    this.hum = { gain: g, stop: () => { src.stop(); lfo.stop(); } };
  }

  stopHum(): void {
    if (!this.hum) return;
    if (ctxRef) this.hum.gain.gain.linearRampToValueAtTime(0, ctxRef.currentTime + 0.4);
    const h = this.hum;
    this.hum = null;
    const timer = setTimeout(() => {
      h.stop();
      this.humTeardown = null;
    }, 500);
    this.humTeardown = { timer, stop: h.stop };
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try { localStorage.setItem('rvl-sound', this.enabled ? 'on' : 'off'); } catch { /* ok */ }
    if (!this.enabled) this.stopHum();
    return this.enabled;
  }

  /** Instantaneous output RMS from the master tap — 0 when silent. */
  level(): number {
    if (!this.analyser) return 0;
    const d = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(d);
    let sum = 0;
    for (const v of d) { const c = (v - 128) / 128; sum += c * c; }
    return Math.sqrt(sum / d.length);
  }

  humOn(): boolean {
    return this.hum !== null;
  }

  state(): string {
    return ctxRef ? ctxRef.state : 'none';
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const sound = new SoundEngine();

if (typeof window !== 'undefined') {
  // debug handle for verification, same pattern as rvlHero/rvlWorld/rvlReel
  (window as unknown as { rvlSound: unknown }).rvlSound = {
    state: () => sound.state(),
    level: () => sound.level(),
    humOn: () => sound.humOn(),
    test: () => sound.click(),
  };
}
