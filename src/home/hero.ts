import { Application, Assets, Container, DisplacementFilter, Sprite, Texture } from 'pixi.js';
import { GlitchFilter, RGBSplitFilter } from 'pixi-filters';
import { ditherImageToCanvas } from '../lib/dither';
import { dprCap, reducedMotion } from '../lib/env';
import { CLIP_MS, coverScale, loopCandidates, nextClip } from './loops';

/** The homepage hero. Two materials, one contract:
 *  - REEL: up to 8 short clips at /content/home/loop-N.(mp4|webm|gif) play
 *    full-bleed, one at a time, each holding for CLIP_MS before a datamosh
 *    cut to the next — endless. The page accent re-samples from every clip.
 *  - IMAGE: /content/home/hero.(jpg|jpeg|png|webp) is the first-paint poster
 *    and the fallback when no loops exist.
 *  Everything derives from whatever files are present at runtime — swap the
 *  media, the page adapts; no code or JSON edit. Missing both degrades to
 *  the void.
 *
 *  Register (after the Marceau pass): the reel IS the motion. The cursor gets
 *  a quiet answer — a soft chromatic lean and a slow displacement field that
 *  drifts after the pointer — and the glitch language lands as punctuation:
 *  the 3s cuts, rare ambient bursts, and clicks. No velocity shredder. */

const IMG_CANDIDATES = ['hero.jpg', 'hero.jpeg', 'hero.png', 'hero.webp'];

export interface HeroInfo { accent: string; src: string }

let burstNow: () => void = () => {};
/** Fire one datamosh burst on demand (page binds this to background clicks).
 *  No-op until the full-motion hero is mounted; no-op forever in calm mode. */
export function triggerBurst(): void {
  burstNow();
}

/** Average a frame and push it toward a usable accent: the page literally
 *  takes its color from whatever media the owner drops in. */
function accentFromSource(src: CanvasImageSource): string {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#C8FF00';
  try {
    ctx.drawImage(src, 0, 0, 16, 16);
  } catch {
    return '#C8FF00';
  }
  const d = ctx.getImageData(0, 0, 16, 16).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  r /= n; g /= n; b /= n;
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
  const l = (mx + mn) / 2;
  const dlt = mx - mn;
  let h = 0;
  const s = dlt === 0 ? 0 : dlt / (1 - Math.abs(2 * l - 1));
  if (dlt > 0) {
    if (mx === r / 255) h = (((g - b) / 255 / dlt) % 6) * 60;
    else if (mx === g / 255) h = (((b - r) / 255) / dlt + 2) * 60;
    else h = (((r - g) / 255) / dlt + 4) * 60;
    if (h < 0) h += 360;
  }
  const S = Math.min(1, s * 1.7 + 0.18);
  const L = Math.min(0.74, Math.max(0.58, l + 0.18));
  return `hsl(${Math.round(h)} ${Math.round(S * 100)}% ${Math.round(L * 100)}%)`;
}

/** Set the page accent (--accent is a registered property, so consumers tween)
 *  and tell the page chrome so live readouts can follow. */
function setAccent(accent: string): void {
  document.documentElement.style.setProperty('--accent', accent);
  window.dispatchEvent(new CustomEvent('rvl:accent', { detail: accent }));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/** A file exists iff HEAD succeeds with a non-HTML body (dev servers answer
 *  unknown paths with the SPA page). */
async function probe(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok && !(r.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}

interface Clip {
  url: string;
  sprite: Sprite;
  width: number;
  height: number;
  play(): void;
  pause(): void;
  /** A same-origin frame source for accent sampling; null when only a WebGL
   *  read-back can see the pixels (gif). */
  sample(): CanvasImageSource | null;
}

function loadVideoClip(url: string, autostart: boolean): Promise<Clip | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    const bail = setTimeout(() => { v.src = ''; v.load(); resolve(null); }, 10000);
    v.addEventListener('error', () => { clearTimeout(bail); resolve(null); }, { once: true });
    v.addEventListener('canplay', () => {
      clearTimeout(bail);
      const sprite = new Sprite(Texture.from(v));
      sprite.anchor.set(0.5);
      if (autostart) void v.play().catch(() => { /* poster frame remains */ });
      else v.pause();
      resolve({
        url,
        sprite,
        width: v.videoWidth,
        height: v.videoHeight,
        play: () => { void v.play().catch(() => { /* stays on its frame */ }); },
        pause: () => v.pause(),
        sample: () => v,
      });
    }, { once: true });
    v.src = url;
  });
}

async function loadGifClip(url: string, autostart: boolean): Promise<Clip | null> {
  try {
    // the import's side effect registers the gif loader with Assets
    const { GifSprite } = await import('pixi.js/gif');
    const source = await Assets.load(url);
    const sprite = new GifSprite({ source, loop: true, autoPlay: autostart });
    sprite.anchor.set(0.5);
    return {
      url,
      sprite,
      width: sprite.texture.width,
      height: sprite.texture.height,
      play: () => sprite.play(),
      pause: () => sprite.stop(),
      sample: () => null,
    };
  } catch {
    return null;
  }
}

interface FoundLoop { url: string; ext: string }

/** Which loops did the owner drop? HEAD probes only — cheap and fast. */
async function discoverLoops(): Promise<FoundLoop[]> {
  const found = await Promise.all(
    loopCandidates().map(async (slot) => {
      for (const c of slot) if (await probe(c.url)) return c;
      return null;
    }),
  );
  return found.filter((c): c is FoundLoop & { slot: number } => c !== null);
}

/** Load the discovered loops into renderable clips, in slot order. */
async function loadFound(found: FoundLoop[], autostart: boolean): Promise<Clip[]> {
  const clips = await Promise.all(
    found.map((c) => (c.ext === 'gif' ? loadGifClip(c.url, autostart) : loadVideoClip(c.url, autostart))),
  );
  return clips.filter((c): c is Clip => c !== null);
}

export async function mountHero(host: HTMLElement): Promise<HeroInfo | null> {
  // the poster image: first paint + fallback + first accent
  let img: HTMLImageElement | null = null;
  let imgSrc = '';
  for (const name of IMG_CANDIDATES) {
    try {
      img = await loadImage(`/content/home/${name}`);
      imgSrc = `/content/home/${name}`;
      break;
    } catch { /* try the next candidate */ }
  }

  let accent = img ? accentFromSource(img) : '#C8FF00';
  if (img) setAccent(accent);

  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: true,
    resolution: dprCap(),
    autoDensity: true,
    resizeTo: host,
  });
  host.append(app.canvas);
  (window as unknown as { rvlHero: Application }).rvlHero = app; // debug handle for verification

  // one root carries the material (image, then reel) and the filter chain
  const root = new Container();
  app.stage.addChild(root);

  const fits: (() => void)[] = [];
  const refit = () => fits.forEach((f) => f());
  app.renderer.on('resize', refit);
  const fitSprite = (sprite: Sprite, mw: number, mh: number) => {
    const f = () => {
      sprite.scale.set(coverScale(mw, mh, app.screen.width, app.screen.height));
      sprite.position.set(app.screen.width / 2, app.screen.height / 2);
    };
    f();
    fits.push(f);
  };

  let imageSprite: Sprite | null = null;
  if (img) {
    const tex = await Assets.load<Texture>(imgSrc);
    imageSprite = new Sprite(tex);
    imageSprite.anchor.set(0.5);
    fitSprite(imageSprite, tex.width, tex.height);
    root.addChild(imageSprite);
  }

  const calm = reducedMotion();
  const rgb = new RGBSplitFilter({ red: { x: 1.5, y: 0 }, green: { x: 0, y: 0 }, blue: { x: -1.5, y: 0 } });

  if (calm) {
    // calm mode: one still frame, one quiet static chromatic fringe — the
    // image if present, else the first frame of the first loop
    root.filters = [rgb];
    if (img) {
      revealVeil(host, img, accent);
      return { accent, src: imgSrc };
    }
    const found = await discoverLoops();
    const first = found.length > 0 ? (await loadFound([found[0]], false))[0] : undefined;
    if (!first) {
      console.warn('[revachol] missing media: /content/home/{loop-N.*|hero.*} — homepage stays on the void');
      return null;
    }
    fitSprite(first.sprite, first.width, first.height);
    root.addChild(first.sprite);
    const frame = first.sample();
    if (frame) accent = accentFromSource(frame);
    setAccent(accent);
    return { accent, src: first.url };
  }

  const glitch = new GlitchFilter({ slices: 10, offset: 0 });

  // the lens: a noise displacement field that DRIFTS after the pointer —
  // a slow lean, not a shredder
  const noise = document.createElement('canvas');
  noise.width = noise.height = 256;
  const nctx = noise.getContext('2d')!;
  const nimg = nctx.createImageData(256, 256);
  for (let i = 0; i < nimg.data.length; i += 4) {
    nimg.data[i] = (Math.random() * 255) | 0;
    nimg.data[i + 1] = (Math.random() * 255) | 0;
    nimg.data[i + 2] = 128;
    nimg.data[i + 3] = 255;
  }
  nctx.putImageData(nimg, 0, 0);
  const dispSprite = new Sprite(Texture.from(noise));
  dispSprite.anchor.set(0.5);
  dispSprite.scale.set(3);
  dispSprite.renderable = false; // sampled by the filter, never drawn
  dispSprite.position.set(app.screen.width / 2, app.screen.height / 2);
  app.stage.addChild(dispSprite);
  const disp = new DisplacementFilter({ sprite: dispSprite, scale: 3 });

  root.filters = [rgb, disp, glitch];

  // ---- the reel ----
  let clips: Clip[] = [];
  let active = 0;
  let clipClock = 0;
  let accentGen = 0;

  const sampleClipAccent = (clip: Clip) => {
    const gen = ++accentGen;
    // sample after the cut's burst settles so the glitch never tints the page
    setTimeout(() => {
      if (gen !== accentGen) return;
      const frame = clip.sample();
      if (frame) {
        setAccent(accentFromSource(frame));
        return;
      }
      try {
        const c = app.renderer.extract.canvas({
          target: clip.sprite,
          resolution: 24 / Math.max(clip.width, 1),
        });
        setAccent(accentFromSource(c as HTMLCanvasElement));
      } catch { /* keep the current accent */ }
    }, 360);
  };

  let pendingSwap = false;
  let swapIn = 0;
  const beginCut = () => {
    burstLeft = Math.max(burstLeft, 150 + Math.random() * 70);
    pendingSwap = true;
    swapIn = 80; // the switch lands mid-tear, like a hard film cut
  };
  const doSwap = () => {
    const prev = clips[active];
    active = nextClip(active, clips.length);
    const cur = clips[active];
    prev.sprite.visible = false;
    prev.pause();
    cur.sprite.visible = true;
    cur.play();
    clipClock = 0;
    sampleClipAccent(cur);
  };

  const mountReel = (loaded: Clip[]) => {
    clips = loaded;
    clips.forEach((c, i) => {
      fitSprite(c.sprite, c.width, c.height);
      c.sprite.visible = i === 0;
      if (i === 0) c.play(); else c.pause();
      root.addChild(c.sprite);
    });
    if (imageSprite) {
      // the poster hands over to the reel inside a tear
      burstLeft = Math.max(burstLeft, 200);
      const poster = imageSprite;
      imageSprite = null;
      setTimeout(() => { poster.visible = false; }, 90);
    }
    sampleClipAccent(clips[0]);
    (window as unknown as { rvlReel: unknown }).rvlReel = {
      count: clips.length,
      active: () => active,
      cut: beginCut,
    };
  };

  const foundLoops = await discoverLoops();
  if (!img && foundLoops.length === 0) {
    console.warn('[revachol] missing media: /content/home/{loop-N.*|hero.*} — homepage stays on the void');
    app.destroy(true);
    return null;
  }
  void loadFound(foundLoops, true).then((loaded) => {
    if (loaded.length > 0) mountReel(loaded);
  });

  // playback hygiene: browsers pause media on tab-hide and bfcache restore
  const resumeActive = () => { if (clips.length > 0 && !document.hidden) clips[active].play(); };
  document.addEventListener('visibilitychange', () => {
    if (clips.length === 0) return;
    if (document.hidden) clips[active].pause();
    else clips[active].play();
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) resumeActive(); });

  // ---- the drive: chromatic breathing, a quiet pointer lean, punctuated tears ----
  const split = { x: 1.5, y: 0 };
  const target = { x: 1.5, y: 0 };
  const lensTarget = { x: app.screen.width / 2, y: app.screen.height / 2 };
  let t = 0;
  let burstLeft = 0;
  let nextBurst = 7000 + Math.random() * 7000;
  burstNow = () => { burstLeft = Math.max(burstLeft, 150 + Math.random() * 160); };
  window.addEventListener('pointermove', (e) => {
    target.x = ((e.clientX - innerWidth / 2) / innerWidth) * 5;
    target.y = ((e.clientY - innerHeight / 2) / innerHeight) * 3;
    lensTarget.x = e.clientX;
    lensTarget.y = e.clientY;
  });
  app.ticker.add((tk) => {
    t += tk.deltaMS;
    split.x += (target.x - split.x) * 0.05;
    split.y += (target.y - split.y) * 0.05;
    const breathe = Math.sin(t / 1600) * 1.1;
    rgb.red = { x: split.x + breathe + 1.0, y: split.y };
    rgb.blue = { x: -(split.x + breathe + 1.0), y: -split.y };

    // the lens drifts after the pointer and slowly churns
    dispSprite.position.x += (lensTarget.x - dispSprite.position.x) * 0.02;
    dispSprite.position.y += (lensTarget.y - dispSprite.position.y) * 0.02;
    dispSprite.rotation += 0.00035 * tk.deltaMS;
    const k = 3 + Math.sin(t / 2400) * 0.8;
    disp.scale.x = k;
    disp.scale.y = k;

    // the reel holds, then cuts
    if (clips.length > 1) {
      clipClock += tk.deltaMS;
      if (clipClock >= CLIP_MS && !pendingSwap) beginCut();
    }
    if (pendingSwap) {
      swapIn -= tk.deltaMS;
      if (swapIn <= 0) {
        pendingSwap = false;
        doSwap();
      }
    }

    if (burstLeft > 0) {
      burstLeft -= tk.deltaMS;
      glitch.seed = Math.random();
      glitch.offset = 18 + Math.random() * 34;
      glitch.slices = 6 + ((Math.random() * 7) | 0);
      if (burstLeft <= 0) glitch.offset = 0; // the tear, then calm
    } else {
      nextBurst -= tk.deltaMS;
      if (nextBurst <= 0) {
        burstLeft = 110 + Math.random() * 110;
        nextBurst = 7000 + Math.random() * 7000;
      }
    }
  });

  if (img) revealVeil(host, img, accent);
  return { accent, src: img ? imgSrc : foundLoops[0].url };
}

/** Same dither-resolve language as the project heroes: the image arrives as
 *  bayer texture, then resolves — attention earns clarity. */
function revealVeil(host: HTMLElement, img: HTMLImageElement, accent: string): void {
  const d = ditherImageToCanvas(img, img.naturalWidth, img.naturalHeight, 320, '#060606', accent);
  const veil = document.createElement('canvas');
  veil.className = 'hero-veil';
  veil.width = d.width;
  veil.height = d.height;
  veil.getContext('2d')?.drawImage(d, 0, 0);
  host.append(veil);
  setTimeout(() => {
    veil.style.transition = 'opacity 1.2s';
    veil.style.opacity = '0';
    setTimeout(() => veil.remove(), 1400);
  }, reducedMotion() ? 60 : 420);
}
