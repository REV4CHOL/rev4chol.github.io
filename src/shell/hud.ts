import { calmActive, toggleCalm } from '../lib/motion';
import { music } from '../lib/music';
import { sound } from '../lib/sound';
import { switchLabel } from './switches';

export interface Hud {
  setCoords(x: number, y: number): void;
  setCount(n: number): void;
}

const pad = (n: number, w: number) => String(Math.max(0, Math.floor(n))).padStart(w, '0');

export function mountHud(): Hud {
  const bl = document.createElement('div');
  bl.className = 'hud hud-bl micro';
  bl.innerHTML = `<span id="hud-coords">X:0000 Y:0000</span>`;

  const br = document.createElement('div');
  br.className = 'hud hud-br micro';
  let sid = 'RVL-0000';
  try {
    const stored = sessionStorage.getItem('rvl-sid');
    sid = stored ?? `RVL-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
    sessionStorage.setItem('rvl-sid', sid);
  } catch { /* ok */ }
  br.innerHTML = `<span id="hud-tc">00:00:00:00</span> · <span>${sid}</span>`;

  const tr = document.createElement('div');
  tr.className = 'hud hud-tr micro';
  // the switches in full words (owner 2026-09-28, plain words: MUS and MTN were the house's abbreviations), each
  // saying its state in words too (switchLabel; owner's testers, 2026-09-30), a mark between them
  const sep = '<span class="hud-sep" aria-hidden="true">▪</span>';
  tr.innerHTML = `<span id="hud-count"></span> <button id="hud-snd" aria-pressed="${sound.enabled}" title="Sound effects: on / off">${switchLabel('SFX', sound.enabled)}</button>${sep}<button id="hud-mus" aria-pressed="${music.enabled}" title="Music: on / off">${switchLabel('MUSIC', music.enabled)}</button>${sep}<button id="hud-mtn" aria-pressed="${!calmActive()}" title="Motion: full / calm (the page reloads)">${switchLabel('MOTION', !calmActive())}</button>`;

  document.body.append(bl, br, tr);

  const tc = br.querySelector('#hud-tc') as HTMLElement;
  const t0 = performance.now();
  setInterval(() => {
    const ms = performance.now() - t0;
    const f = Math.floor((ms % 1000) / (1000 / 24));
    const s = Math.floor(ms / 1000);
    tc.textContent = `${pad(s / 3600, 2)}:${pad((s / 60) % 60, 2)}:${pad(s % 60, 2)}:${pad(f, 2)}`;
  }, 42);

  const snd = tr.querySelector('#hud-snd') as HTMLButtonElement;
  snd.addEventListener('click', () => {
    const on = sound.toggle();
    snd.textContent = switchLabel('SFX', on);
    snd.setAttribute('aria-pressed', String(on));
    if (on) {
      sound.click(); // audible confirmation — re-enabling must be heard
    }
  });

  const mus = tr.querySelector('#hud-mus') as HTMLButtonElement; // MUSIC (owner): the one track, site-wide, its own switch
  mus.addEventListener('click', () => {
    const on = music.toggle();
    mus.textContent = switchLabel('MUSIC', on);
    mus.setAttribute('aria-pressed', String(on));
    sound.click();
  });
  const mtn = tr.querySelector('#hud-mtn') as HTMLButtonElement;
  mtn.addEventListener('click', () => {
    toggleCalm();
    // every page wires its motion at mount — a reload is the honest re-wire
    location.reload();
  });

  const coords = bl.querySelector('#hud-coords') as HTMLElement;
  const count = tr.querySelector('#hud-count') as HTMLElement;
  return {
    setCoords: (x, y) => { coords.textContent = `X:${pad(Math.abs(x), 4)} Y:${pad(Math.abs(y), 4)}`; },
    setCount: (n) => { count.textContent = `${pad(n, 2)} PROJECTS LOADED ·`; },
  };
}
