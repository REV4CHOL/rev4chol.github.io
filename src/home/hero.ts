import { Application, Assets, Sprite, Texture } from 'pixi.js';
import { GlitchFilter, RGBSplitFilter } from 'pixi-filters';
import { ditherImageToCanvas } from '../lib/dither';
import { dprCap, reducedMotion } from '../lib/env';

/** The homepage hero: whatever image lives at /content/home/hero.jpg, cover-fit
 *  and datamoshed live. Everything is derived from the image at runtime — the
 *  cover fit, the accent color, the effect drive — so swapping the file always
 *  adapts, no code or JSON edit. Missing image degrades to the plain void. */

const HERO_URL = '/content/home/hero.jpg';

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
  // to HSL, then saturate + lift so the accent reads against the void
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

export async function mountHero(host: HTMLElement): Promise<void> {
  // sample the accent from a plain <img> first — cheap, and it also tells us
  // early whether the file exists at all
  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = HERO_URL;
    });
  } catch {
    console.warn(`[revachol] missing media: ${HERO_URL} — homepage stays on the void`);
    return;
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

  const tex = await Assets.load<Texture>(HERO_URL);
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
    return;
  }

  const glitch = new GlitchFilter({ slices: 10, offset: 0 });
  sprite.filters = [rgb, glitch];

  // the drive: slow chromatic breathing, pointer influence, and datamosh bursts
  const split = { x: 1.5, y: 0 };
  const target = { x: 1.5, y: 0 };
  let t = 0;
  let burstLeft = 0;
  let nextBurst = 1800 + Math.random() * 2600;
  window.addEventListener('pointermove', (e) => {
    target.x = ((e.clientX - innerWidth / 2) / innerWidth) * 10;
    target.y = ((e.clientY - innerHeight / 2) / innerHeight) * 5;
  });
  app.ticker.add((tk) => {
    t += tk.deltaMS;
    split.x += (target.x - split.x) * 0.05;
    split.y += (target.y - split.y) * 0.05;
    const breathe = Math.sin(t / 1400) * 1.4;
    rgb.red = { x: split.x + breathe + 1.2, y: split.y };
    rgb.blue = { x: -(split.x + breathe + 1.2), y: -split.y };

    if (burstLeft > 0) {
      burstLeft -= tk.deltaMS;
      glitch.seed = Math.random();
      glitch.offset = 26 + Math.random() * 60;
      glitch.slices = 8 + ((Math.random() * 8) | 0);
      if (burstLeft <= 0) glitch.offset = 0; // settle instantly — the tear, then calm
    } else {
      nextBurst -= tk.deltaMS;
      if (nextBurst <= 0) {
        burstLeft = 120 + Math.random() * 180;
        nextBurst = 1800 + Math.random() * 3200;
      }
    }
  });

  revealVeil(host, img, accent);
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
