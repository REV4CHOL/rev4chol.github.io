import { ContentError } from '../lib/content';
import { reducedMotion } from '../lib/env';
import { escapeHtml } from '../lib/escape';

export interface BootTask { label: string; run: () => Promise<unknown> }

const L = {
  R: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  V: ['██╗   ██╗', '██║   ██║', '██║   ██║', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚═══╝  '],
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  H: ['██╗  ██╗', '██║  ██║', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  L2: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
};
const ORDER = [L.R, L.E, L.V, L.A, L.C, L.H, L.O, L.L2];
const LOGO = Array.from({ length: 6 }, (_, row) => ORDER.map((l) => l[row]).join(' ')).join('\n');

export function runBoot(tasks: BootTask[]): Promise<void> {
  let booted = false;
  try { booted = sessionStorage.getItem('rvl-booted') === '1'; } catch { /* ok */ }

  const el = document.createElement('div');
  el.id = 'boot';
  el.innerHTML = `<pre class="boot-logo"></pre><div class="boot-log" aria-live="polite"></div><p class="boot-skip micro">CLICK TO SKIP</p>`;
  document.body.append(el);
  (el.querySelector('.boot-logo') as HTMLElement).textContent = LOGO;
  const logEl = el.querySelector('.boot-log') as HTMLElement;

  let skipped = false;
  const MIN = booted || reducedMotion() ? 250 : 1400;
  const t0 = performance.now();
  const skip = () => { skipped = true; };
  el.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip, { once: true });

  const line = (label: string) => {
    const l = document.createElement('span');
    l.className = 'boot-line';
    l.innerHTML = `&gt; ${escapeHtml(label)} <span class="dots">……</span>`;
    logEl.append(l);
    return {
      ok: () => { l.innerHTML = `&gt; ${escapeHtml(label)} <span class="ok">OK</span>`; },
      err: () => { l.innerHTML = `&gt; ${escapeHtml(label)} <span class="err">FAIL</span>`; },
    };
  };

  const runAll = (async () => {
    for (const t of tasks) {
      const l = booted ? null : line(t.label);
      try {
        await t.run();
        l?.ok();
      } catch (e) {
        l?.err();
        throw e;
      }
      if (!booted && !skipped) await new Promise((r) => setTimeout(r, 90));
    }
  })();

  return runAll
    .then(async () => {
      const remain = MIN - (performance.now() - t0);
      if (remain > 0 && !skipped) await new Promise((r) => setTimeout(r, remain));
      try { sessionStorage.setItem('rvl-booted', '1'); } catch { /* ok */ }
      el.classList.add('hidden');
      setTimeout(() => el.remove(), 450);
    })
    .catch((e: unknown) => {
      el.classList.remove('hidden');
      el.classList.add('error');
      const box = document.createElement('div');
      box.className = 'boot-error';
      box.innerHTML =
        e instanceof ContentError
          ? `<strong>CONTENT ERROR — ${escapeHtml(e.file)}</strong><br>${escapeHtml(e.detail)}<br><br>FIX THE FILE AND REFRESH.`
          : `<strong>SYSTEM ERROR</strong><br>${escapeHtml(String(e))}`;
      logEl.after(box);
      throw e;
    });
}
