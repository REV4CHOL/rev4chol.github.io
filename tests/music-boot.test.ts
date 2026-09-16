import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** THE MUSIC BOOT (owner: the music must continue to play even during loading screens): every page's head carries
 *  the same inline script, which restarts the track where the last page left it before any chunk loads. */
const PAGES = ['index.html', 'works.html', 'about.html', 'contact.html', 'project.html', 'story.html'];
const bootOf = (page: string) => { const m = readFileSync(page, 'utf8').match(/<script>\/\* music boot[^\n]*<\/script>/); return m ? m[0] : null; };

describe('The music boot in the page heads', () => {
  it('stands in every page, identical, before the title (the self-heal script ahead of it)', () => {
    const boots = PAGES.map(bootOf);
    for (const [i, b] of boots.entries()) expect(b, PAGES[i]).not.toBeNull();
    expect(new Set(boots).size).toBe(1);
    for (const page of PAGES) { const s = readFileSync(page, 'utf8'); expect(s.indexOf('/* music boot')).toBeLessThan(s.indexOf('<title>')); expect(s.indexOf('stale-deploy self-heal')).toBeLessThan(s.indexOf('/* music boot')); }
    expect(readFileSync('about-old.html', 'utf8').includes('music boot')).toBe(false); // (never touched)
  });

  it('seeks to where the track would be now (held: exactly there), plays, ramps to the volume on playing, and hands the element over', () => {
    const code = bootOf('about.html')!.replace(/^<script>/, '').replace(/<\/script>$/, '');
    const run = (pos: string | null, choice: string | null) => {
      const ls = new Map<string, ((...a: unknown[]) => void)[]>();
      const a = { preload: '', loop: false, volume: 0, src: '', currentTime: 0, duration: 220, plays: 0, addEventListener(t: string, cb: (...a: unknown[]) => void) { ls.set(t, [...(ls.get(t) ?? []), cb]); }, play() { this.plays += 1; return Promise.resolve(); }, fire(t: string) { for (const cb of ls.get(t) ?? []) cb(); } };
      const win: Record<string, unknown> = {};
      const timeouts: (() => void)[] = [];
      const fn = new Function('window', 'document', 'localStorage', 'sessionStorage', 'performance', 'setTimeout', 'Date', code);
      fn(win, { createElement: () => a }, { getItem: () => choice }, { getItem: () => pos }, { now: () => 123 }, (f: () => void) => { timeouts.push(f); }, { now: () => 61000 });
      return { a, win, timeouts };
    };
    const r = run(JSON.stringify({ t: 100, at: 1000, held: false }), null);
    expect(r.a.src).toBe('/content/music/night-road.mp3'); expect(r.a.loop).toBe(true); expect(r.a.preload).toBe('auto'); expect(r.a.plays).toBe(1);
    r.a.fire('loadedmetadata'); expect(r.a.currentTime).toBe(160); // 100 + 60 s of clock
    r.a.fire('playing'); while (r.timeouts.length) r.timeouts.shift()!();
    expect(r.a.volume).toBeCloseTo(0.55, 5); expect(r.win.rvlMusicBoot).toBe(r.a); expect(r.win.rvlMusicAt).toBe(123);
    const h = run(JSON.stringify({ t: 100, at: 1000, held: true }), null); h.a.fire('loadedmetadata'); expect(h.a.currentTime).toBe(100);
    const w = run(JSON.stringify({ t: 210, at: 1000, held: false }), null); w.a.fire('loadedmetadata'); expect(w.a.currentTime).toBe(50); // wrapped by 220
    const off = run(null, 'off'); expect(off.a.plays).toBe(0); expect(off.win.rvlMusicBoot).toBeUndefined();
    const fresh = run(null, null); fresh.a.fire('loadedmetadata'); expect(fresh.a.currentTime).toBe(0); expect(fresh.a.plays).toBe(1);
  });
});

describe('The music boot on a phone (owner: the music stopped at every section and had to be re-enabled by hand)', () => {
  it('refused (no gesture on the document yet), it plays again inside the first activating gesture — pointerup, touchend, click, keydown — once each', async () => {
    const code = bootOf('about.html')!.replace(/^<script>/, '').replace(/<\/script>$/, '');
    const docLs = new Map<string, { cb: () => void; opts: unknown }[]>();
    let refuse = true;
    const a = { preload: '', loop: false, volume: 0, src: '', currentTime: 0, duration: 220, plays: 0, addEventListener() { /* none needed */ }, play() { this.plays += 1; return refuse ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); } };
    const doc = { createElement: () => a, addEventListener(t: string, cb: () => void, opts: unknown) { docLs.set(t, [...(docLs.get(t) ?? []), { cb, opts }]); } };
    const win: Record<string, unknown> = {};
    const fn = new Function('window', 'document', 'localStorage', 'sessionStorage', 'performance', 'setTimeout', 'Date', code);
    fn(win, doc, { getItem: () => null }, { getItem: () => null }, { now: () => 1 }, () => undefined, { now: () => 1 });
    expect(a.plays).toBe(1);
    await Promise.resolve(); await Promise.resolve();
    expect([...docLs.keys()].sort()).toEqual(['click', 'keydown', 'pointerup', 'touchend']);
    for (const l of docLs.values()) expect(l[0].opts).toEqual({ once: true, passive: true });
    refuse = false;
    docLs.get('pointerup')![0].cb();
    expect(a.plays).toBe(2);
    expect(win.rvlMusicBoot).toBe(a);
  });
  it('arms no listener when the first play is granted', async () => {
    const code = bootOf('about.html')!.replace(/^<script>/, '').replace(/<\/script>$/, '');
    let armed = 0;
    const a = { preload: '', loop: false, volume: 0, src: '', currentTime: 0, duration: 220, plays: 0, addEventListener() { /* none needed */ }, play() { this.plays += 1; return Promise.resolve(); } };
    const fn = new Function('window', 'document', 'localStorage', 'sessionStorage', 'performance', 'setTimeout', 'Date', code);
    fn({}, { createElement: () => a, addEventListener() { armed += 1; } }, { getItem: () => null }, { getItem: () => null }, { now: () => 1 }, () => undefined, { now: () => 1 });
    await Promise.resolve(); await Promise.resolve();
    expect(a.plays).toBe(1); expect(armed).toBe(0);
  });
});
