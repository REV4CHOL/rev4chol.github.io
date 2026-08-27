import { Application, Assets, DisplacementFilter, Sprite, Texture } from 'pixi.js';
import { GlitchFilter, RGBSplitFilter } from 'pixi-filters';
import { ditherImageToCanvas } from '../lib/dither';
import { dprCap, reducedMotion } from '../lib/env';

/** The homepage hero: whatever image lives at /content/home/hero.(jpg|jpeg|png|webp),
 *  cover-fit and datamoshed live. Everything derives from the image at runtime —
 *  the cover fit, the accent color, the effect drive — so swapping the file
 *  always adapts, no code or JSON edit. Missing image degrades to the void. */

const CANDIDATES = ['hero.jpg', 'hero.jpeg', 'hero.png', 'hero.webp'];

export interface HeroInfo { accent: string; src: string }

let burstNow: () => void = () => {};
/** Fire one datamosh burst on demand (page binds this to background clicks).
 *  No-op until the full-motion hero is mounted; no-op forever in calm mode. */
export function triggerBurst(): void {
  burstNow();
}

/** Average the image and push it toward a usable accent: the page literally
 *  takes its color from whatever picture the owner drops in. */
function accentFromImage(img: HTMLImageElement): string {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#C8FF00';
  ctx.drawImage(img, 0, 0, 16, 16);
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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

export async function mountHero(host: HTMLElement): Promise<HeroInfo | null> {
  // probe the candidate names in order — owners drop files, they shouldn't
  // have to remember an exact extension
  let img: HTMLImageElement | null = null;
  let src = '';
  for (const name of CANDIDATES) {
    try {
      img = await loadImage(`/content/home/${name}`);
      src = `/content/home/${name}`;
      break;
    } catch { /* try the next candidate */ }
  }
  if (!img) {
    console.warn('[revachol] missing media: /content/home/hero.(jpg|jpeg|png|webp) — homepage stays on the void');
    return null;
  }
  const accent = accentFromImage(img);
  document.documentElement.style.setProperty('--accent', accent);

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

  const tex = await Assets.load<Texture>(src);
  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5);
  const fit = () => {
    const sw = app.screen.width, sh = app.screen.height;
    const s = Math.max(sw / tex.width, sh / tex.height) * 1.04; // slight overscan hides split edges
    sprite.scale.set(s);
    sprite.position.set(sw / 2, sh / 2);
  };
  fit();
  app.renderer.on('resize', fit);
  app.stage.addChild(sprite);

  const rgb = new RGBSplitFilter({ red: { x: 1.5, y: 0 }, green: { x: 0, y: 0 }, blue: { x: -1.5, y: 0 } });
  if (reducedMotion()) {
    // calm mode: one quiet, static chromatic fringe — no bursts, no drive
    sprite.filters = [rgb];
    revealVeil(host, img, accent);
    return { accent, src };
  }

  const glitch = new GlitchFilter({ slices: 10, offset: 0 });

  // the shredder: a noise-driven displacement field that FOLLOWS the pointer —
  // the image warps wherever the cursor is, harder the faster it moves
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
  const disp = new DisplacementFilter({ sprite: dispSprite, scale: 4 });

  sprite.filters = [rgb, disp, glitch];

  // the drive: chromatic breathing, pointer influence + velocity, datamosh bursts
  const split = { x: 1.5, y: 0 };
  const target = { x: 1.5, y: 0 };
  let t = 0;
  let burstLeft = 0;
  let nextBurst = 1400 + Math.random() * 2800;
  let shred = 0; // pointer-velocity energy, decays every tick
  let lastPX = innerWidth / 2, lastPY = innerHeight / 2;
  burstNow = () => { burstLeft = Math.max(burstLeft, 150 + Math.random() * 160); };
  window.addEventListener('pointermove', (e) => {
    target.x = ((e.clientX - innerWidth / 2) / innerWidth) * 12;
    target.y = ((e.clientY - innerHeight / 2) / innerHeight) * 6;
    const speed = Math.hypot(e.clientX - lastPX, e.clientY - lastPY);
    lastPX = e.clientX; lastPY = e.clientY;
    shred = Math.min(150, shred + speed * 0.9);
    dispSprite.position.set(e.clientX, e.clientY);
    if (shred > 100 && burstLeft <= 0 && Math.random() < 0.2) {
      burstLeft = 80 + Math.random() * 90; // violent motion tears the image
    }
  });
  app.ticker.add((tk) => {
    t += tk.deltaMS;
    split.x += (target.x - split.x) * 0.05;
    split.y += (target.y - split.y) * 0.05;
    const breathe = Math.sin(t / 1400) * 1.6;
    rgb.red = { x: split.x + breathe + 1.2, y: split.y };
    rgb.blue = { x: -(split.x + breathe + 1.2), y: -split.y };

    // the shred field churns and cools
    shred *= Math.pow(0.88, tk.deltaMS / 16.667);
    const k = 4 + shred;
    disp.scale.x = k;
    disp.scale.y = k;
    dispSprite.rotation += 0.0008 * tk.deltaMS;

    if (burstLeft > 0) {
      burstLeft -= tk.deltaMS;
      glitch.seed = Math.random();
      glitch.offset = 26 + Math.random() * 64;
      glitch.slices = 8 + ((Math.random() * 8) | 0);
      if (burstLeft <= 0) glitch.offset = 0; // the tear, then calm
    } else {
      nextBurst -= tk.deltaMS;
      if (nextBurst <= 0) {
        burstLeft = 130 + Math.random() * 190;
        nextBurst = 1400 + Math.random() * 3000;
      }
    }
  });

  revealVeil(host, img, accent);
  return { accent, src };
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
