import { sound } from '../lib/sound';

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
  tr.innerHTML = `<span id="hud-count"></span> <button id="hud-snd" aria-pressed="${sound.enabled}">SND ${sound.enabled ? '●' : '○'}</button>`;

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
    snd.textContent = `SND ${on ? '●' : '○'}`;
    snd.setAttribute('aria-pressed', String(on));
    if (on && document.body.classList.contains('page-work')) sound.startHum();
  });

  const coords = bl.querySelector('#hud-coords') as HTMLElement;
  const count = tr.querySelector('#hud-count') as HTMLElement;
  return {
    setCoords: (x, y) => { coords.textContent = `X:${pad(Math.abs(x), 4)} Y:${pad(Math.abs(y), 4)}`; },
    setCount: (n) => { count.textContent = `${pad(n, 2)} PROJECTS LOADED ·`; },
  };
}
