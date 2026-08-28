import { reducedMotion } from '../lib/env';
import { escapeHtml } from '../lib/escape';
import { mulberry32 } from '../lib/rng';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { armStamps } from '../lib/stamps';
import { hashSlug } from '../project/dossier';
import { startPage } from '../shell/page';
import '../styles/contact.css';

const BARS = 24;

startPage('contact', ({ site }) => {
  void scrambleEl(document.getElementById('c-status-line')!, 'UPLINK :: CHANNEL OPEN // AWAITING SIGNAL', 900);
  void scrambleEl(document.getElementById('c-heading')!, 'OPEN A CHANNEL', 650);

  // -- the frequency: the page's one loud thing --------------------------
  const email = site.email || 'hello@example.com';
  const freq = document.getElementById('c-freq') as HTMLAnchorElement;
  freq.href = `mailto:${email}?subject=${encodeURIComponent('TRANSMISSION :: REVACHOL')}`;
  freq.dataset.cursor = 'SEND ▸';
  void scrambleEl(freq, email.toUpperCase(), 800);

  const copy = document.getElementById('c-copy') as HTMLButtonElement;
  let copyTimer = 0;
  const confirmCopied = () => {
    sound.click();
    copy.textContent = 'COPIED ▸';
    copy.classList.add('is-done');
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copy.textContent = 'COPY FREQ';
      copy.classList.remove('is-done');
    }, 1600);
  };
  const legacyCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = email;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* denied */ }
    ta.remove();
    if (ok) confirmCopied();
    else console.warn('[revachol] clipboard unavailable — select the address by hand');
  };
  copy.addEventListener('click', () => {
    // the async clipboard can hang pending permission — race it against the
    // legacy path so the button always answers within a beat
    if (!navigator.clipboard?.writeText) { legacyCopy(); return; }
    let handled = false;
    const t = window.setTimeout(() => { handled = true; legacyCopy(); }, 350);
    navigator.clipboard.writeText(email).then(
      () => { if (handled) return; handled = true; clearTimeout(t); confirmCopied(); },
      () => { if (handled) return; handled = true; clearTimeout(t); legacyCopy(); },
    );
  });

  // -- callouts ----------------------------------------------------------
  const domain = (email.split('@')[1] ?? '').toUpperCase();
  const callouts: [string, string][] = [
    ['FREQ', domain],
    ['RESPONSE', '< 48H'],
    ['STATUS', 'RECEIVING ▸'],
  ];
  document.getElementById('c-callouts')!.innerHTML = callouts
    .filter(([, v]) => v)
    .map(
      ([k, v], i) =>
        `<div class="c-callout" style="--d:${i * 90}ms"><span class="cc-line"></span><span>${k} :: ${escapeHtml(v)}${k === 'STATUS' ? '<span class="c-caret" aria-hidden="true">▮</span>' : ''}</span></div>`,
    )
    .join('');

  // -- aux channels ------------------------------------------------------
  document.getElementById('c-socials')!.innerHTML = site.socials
    .map((s) => `<a class="c-social" href="${escapeHtml(s.href)}" target="_blank" rel="noopener">${escapeHtml(s.label.toUpperCase())}</a>`)
    .join('');

  // -- seeded plus-glyphs ------------------------------------------------
  const rand = mulberry32(hashSlug('uplink-revachol'));
  const console_ = document.querySelector('.c-console')!;
  for (const tone of ['sig', 'alr'] as const) {
    const s = document.createElement('span');
    s.className = `c-plus c-plus-${tone}`;
    s.textContent = '✚';
    s.setAttribute('aria-hidden', 'true');
    s.style.left = `${58 + Math.floor(rand() * 34)}%`;
    s.style.top = `${12 + Math.floor(rand() * 60)}%`;
    console_.append(s);
  }

  // -- the live signal meter --------------------------------------------
  // Real instrument: the bars ride the site's actual audio analyser. The
  // room hum makes them breathe; every blip spikes them. Silent or locked
  // audio (and calm mode) holds a seeded static skyline instead.
  const meter = document.getElementById('c-meter')!;
  const weights: number[] = [];
  for (let i = 0; i < BARS; i++) {
    const b = document.createElement('i');
    const idle = 0.12 + rand() * 0.5;
    weights.push(0.5 + rand());
    b.style.transform = `scaleY(${idle.toFixed(3)})`;
    meter.append(b);
  }
  if (!reducedMotion()) {
    const bars = [...meter.children] as HTMLElement[];
    const heights = bars.map(() => 0.1);
    const tick = () => {
      const lv = Math.min(1, sound.level() * 14);
      for (let i = 0; i < bars.length; i++) {
        const target = lv > 0.02 ? Math.min(1, lv * weights[i] * (0.6 + Math.abs(Math.sin(performance.now() / 260 + i)))) : 0.08 + 0.06 * Math.sin(performance.now() / 900 + i * 1.7);
        heights[i] += (target - heights[i]) * (target > heights[i] ? 0.5 : 0.12);
        bars[i].style.transform = `scaleY(${Math.max(0.04, heights[i]).toFixed(3)})`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  armStamps();
});
