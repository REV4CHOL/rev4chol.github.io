import { AboutContent, loadAbout, SiteContent } from '../lib/content';
import { escapeHtml } from '../lib/escape';
import { armPosterLock } from '../lib/poster-lock';
import { LOOKS, nextTime, parseTime, TimeOfDay, TIMES } from '../about/city-sky';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { capabilitiesFromTagline, portraitCandidates } from '../about/operator';
import { mountSpecimen } from '../about/specimen';
import { armGlideNav, navNeighbors } from '../lib/swipe-nav';
import { hashSlug } from '../project/dossier';
import { startPage } from '../shell/page';
import '../styles/about.css';

/** The five stations of the flight — waypoints on the camera route. */
const STOPS = ['SIGNAL', 'SUBJECT', 'DOSSIER', 'CAP', 'TRANSMIT'];

startPage(
  'about',
  async ({ site }) => {
    // the page rides the plate; the CITY keeps true viewport pixels
    armPosterLock({ exempt: '#a3c' });
    // this page scrolls (the scroll IS the flight), so the glide only arms
    // at the ends of the runway — mid-flight thumb-scrolling just flies
    const se = document.scrollingElement ?? document.documentElement;
    armGlideNav({
      ...navNeighbors(site.nav, location.pathname),
      allow: (dir) =>
        dir > 0
          ? se.scrollTop + window.innerHeight >= se.scrollHeight - 6
          : se.scrollTop <= 6,
    });
    const about = await loadAbout();
    render(site, about);
    await armFlight(site);
  },
  [{ label: 'LOAD OPERATOR FILE', run: () => loadAbout() }],
);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The time of day in force: the address first (?tod=dawn), then what was chosen last, else the night. */
function storedTime(): TimeOfDay {
  const fromUrl = new URLSearchParams(location.search).get('tod');
  if (fromUrl) return parseTime(fromUrl);
  try { return parseTime(localStorage.getItem('rvl-tod')); } catch { return 'night'; }
}

/** The city mounts lazily (three.js is the about page's private cargo);
 *  scroll drives the camera, and the stations light as their waypoints
 *  come into range. */
async function armFlight(site: SiteContent): Promise<void> {
  const canvas = document.getElementById('a3c') as HTMLCanvasElement | null;
  if (!canvas) return;
  const { mountCity3D } = await import('../about/city3d');
  const ride = mountCity3D(canvas, hashSlug('revachol-night-city'));
  (window as unknown as { rvlRide: typeof ride }).rvlRide = ride; // debug handle for verification

  // -- the flight dial: TOUR (the scroll story) / AUTO (endless drift) /
  // FREE (drag-look + WASD, fine pointers only) -------------------------
  type Mode = 'tour' | 'auto' | 'free';
  const fly = document.getElementById('a3-fly')!;
  const hint = document.getElementById('a3-hint')!;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const modes: Mode[] = fine ? ['tour', 'auto', 'free'] : ['tour', 'auto'];
  fly.innerHTML = modes
    .map((m) => `<button type="button" data-m="${m}"${m === 'tour' ? ' class="on"' : ''}>${m.toUpperCase()}</button>`)
    .join('');
  let mode: Mode = 'tour';
  const setMode = (m: Mode) => {
    mode = m;
    ride.setMode(m);
    document.body.classList.toggle('a3-solo', m !== 'tour');
    hint.hidden = m !== 'free';
    for (const b of fly.querySelectorAll('button')) b.classList.toggle('on', b.dataset.m === m);
    sound.click();
  };
  fly.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (b) setMode(b.dataset.m as Mode);
  });
  // -- the clock: NIGHT / DUSK / DAWN / HAZE / DAY (owner: a time-of-day
  // system) — remembered, settable from the address (?tod=dawn), T cycles it
  const clock = document.getElementById('a3-tod')!;
  clock.innerHTML = TIMES.map((t) => `<button type="button" data-t="${t}">${LOOKS[t].label}</button>`).join('');
  const status = document.getElementById('a-status-line');
  let tod = storedTime();
  const setTime = (t: TimeOfDay, instant = false) => {
    tod = t;
    ride.setTime(t, instant);
    for (const b of clock.querySelectorAll('button')) b.classList.toggle('on', b.dataset.t === t);
    try { localStorage.setItem('rvl-tod', t); } catch { /* private mode */ }
    if (status && !instant) void scrambleEl(status, `SIGNAL :: LIVE FROM ${site.name.toUpperCase()} // ${LOOKS[t].label} FEED`, 700);
  };
  setTime(tod, true);
  clock.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (b) { setTime(b.dataset.t as TimeOfDay); sound.click(); }
  });
  // free flight: drag anywhere to look (the stations are inert in solo
  // modes, so the whole page is the windshield), WASD/arrows to move
  let dragging = false;
  let lx = 0, ly = 0;
  window.addEventListener('pointerdown', (e) => {
    if (mode !== 'free') return;
    if ((e.target as Element).closest?.('.a3-fly, .nav, .hud, a, button')) return;
    dragging = true; lx = e.clientX; ly = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging || mode !== 'free') return;
    ride.look(e.clientX - lx, e.clientY - ly);
    lx = e.clientX; ly = e.clientY;
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('keydown', (e) => {
    ride.keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 't' && !e.repeat && !(e.target as Element).closest?.('input, textarea')) { setTime(nextTime(tod)); sound.click(); }
    // the windshield owns these keys mid-flight — the page must not scroll
    if (mode === 'free' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => ride.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => ride.keys.clear());

  const se = document.scrollingElement ?? document.documentElement;
  const stations = [...document.querySelectorAll<HTMLElement>('.a3-st')];
  const rail = document.getElementById('a3-rail')!;
  rail.innerHTML = STOPS
    .map((s, i) => `<button type="button" data-w="${i}">${pad2(i)} ${s}</button>`)
    .join('');
  const ticks = [...rail.querySelectorAll<HTMLButtonElement>('button')];
  const wp = (i: number) => i / (STOPS.length - 1);
  for (const b of ticks) {
    b.addEventListener('click', () => {
      const max = se.scrollHeight - window.innerHeight;
      window.scrollTo({ top: wp(Number(b.dataset.w)) * max, behavior: 'smooth' });
    });
  }

  const onScroll = () => {
    const max = se.scrollHeight - window.innerHeight;
    const p = max > 0 ? se.scrollTop / max : 0;
    ride.setProgress(p);
    let nearest = 0;
    for (let i = 0; i < stations.length; i++) {
      const d = Math.abs(p - wp(i));
      stations[i].classList.toggle('on', d < 0.085);
      if (d < Math.abs(p - wp(nearest))) nearest = i;
    }
    ticks.forEach((b, i) => b.classList.toggle('on', i === nearest));
  };
  // three delivery paths, all idempotent: an immediate call (nothing waits
  // on a frame), the scroll/resize events, AND a frame-clock poll — some
  // environments swallow the events, others starve rAF; between the three
  // the flight can never strand.
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  let lastTop = -1;
  let lastMax = -1;
  const sync = () => {
    requestAnimationFrame(sync);
    if (document.hidden) return;
    const max = se.scrollHeight - window.innerHeight;
    if (se.scrollTop === lastTop && max === lastMax) return;
    lastTop = se.scrollTop;
    lastMax = max;
    onScroll();
  };
  sync();
}

function render(site: SiteContent, about: AboutContent): void {
  // -- station 00: the signal -------------------------------------------
  void scrambleEl(document.getElementById('a-status-line')!, `SIGNAL :: LIVE FROM ${site.name.toUpperCase()} // ${LOOKS[storedTime()].label} FEED`, 900);
  const nameEl = document.getElementById('a-name')!;
  const fullName = site.name.toUpperCase();
  nameEl.dataset.text = fullName;
  nameEl.textContent = fullName;
  // the landmark never leaves its station: measure and cap (fit-to-measure)
  const heroCol = document.querySelector<HTMLElement>('.a3-in-hero')!;
  const fitName = () => {
    nameEl.style.fontSize = '';
    const w = heroCol.clientWidth;
    if (nameEl.scrollWidth > w && w > 0) {
      const base = parseFloat(getComputedStyle(nameEl).fontSize);
      nameEl.style.fontSize = `${Math.floor(base * (w / nameEl.scrollWidth) * 98) / 100}px`;
    }
  };
  fitName();
  void document.fonts?.ready?.then(fitName);
  window.addEventListener('resize', fitName);
  void scrambleEl(nameEl, fullName, 650);
  document.getElementById('a-statement')!.textContent = about.statement;

  const caps = about.capabilities.length ? about.capabilities : capabilitiesFromTagline(site.tagline);
  const callouts: [string, string][] = [
    ['ALIAS', site.name.toUpperCase()],
    ['CLASS', caps.join(' / ')],
    ['STATUS', 'ACTIVE ▸'],
  ];
  document.getElementById('a-callouts')!.innerHTML = callouts
    .map(
      ([k, v], i) =>
        `<div class="a-callout" style="--d:${i * 90}ms"><span class="ac-line"></span><span>${k} :: ${escapeHtml(v)}${k === 'STATUS' ? '<span class="a-caret" aria-hidden="true">▮</span>' : ''}</span></div>`,
    )
    .join('');

  // -- station 01: the billboard ----------------------------------------
  void mountPortrait(site);

  // -- station 02: the dossier ------------------------------------------
  const bioEl = document.getElementById('a-bio')!;
  if (about.bio.length) {
    bioEl.innerHTML = about.bio
      .map((p, i) => `<p class="${i === 0 ? 'a-bio-lead' : 'a-bio-p'}">${escapeHtml(p)}</p>`)
      .join('');
  } else {
    bioEl.remove();
  }
  const facts = about.facts.length
    ? about.facts
    : [
        { k: 'CLASS', v: caps.join(' / ') },
        { k: 'STATUS', v: 'ACTIVE — ACCEPTING PROCEDURES' },
        { k: 'CONTACT', v: site.email || 'SEE TRANSMIT BELOW' },
      ];
  document.getElementById('a-facts')!.innerHTML = facts
    .map((f) => `<dt>${escapeHtml(f.k.toUpperCase())}</dt><dd><span>${escapeHtml(f.v.toUpperCase())}</span></dd>`)
    .join('');

  // -- station 03: the wall of signs ------------------------------------
  const capsEl = document.getElementById('a-caps')!;
  const hasSkills = about.skills.creative.length > 0 || about.skills.technical.length > 0;
  if (hasSkills) {
    const bank = (kind: 'c' | 't', label: string, items: string[]) => {
      const bars = items
        .map(
          (s, i) =>
            `<div class="a-bar" data-kind="${kind}">
              <em class="a-bar-idx micro">${kind.toUpperCase()}·${pad2(i + 1)}</em>
              <span class="a-bar-name">${escapeHtml(s.toUpperCase())}</span>
              <i class="a-bar-rail" aria-hidden="true"></i>
              <span class="a-bar-cap micro" aria-hidden="true">${label.slice(0, 3)} ▪ ${pad2(i + 1)}/${pad2(items.length)}</span>
            </div>`,
        )
        .join('');
      return `<div class="a-rack-group">
        <h3 class="a-skill-head micro a-skill-head--${kind}">${label}</h3>${bars}</div>`;
    };
    capsEl.innerHTML = `<div class="a-rack">
      ${bank('c', 'CREATIVE', about.skills.creative)}
      ${bank('t', 'TECHNICAL', about.skills.technical)}
    </div>`;
  } else {
    capsEl.innerHTML = caps
      .map((c, i) => `<span class="a-chip"><em>${pad2(i + 1)}</em> ▸ ${escapeHtml(c)}</span>`)
      .join('');
  }

  // -- station 04: transmit ---------------------------------------------
  const socials = site.socials
    .map((s) => `<a class="a-social" href="${escapeHtml(s.href)}" target="_blank" rel="noopener">${escapeHtml(s.label.toUpperCase())}</a>`)
    .join('');
  document.getElementById('a-transmit')!.innerHTML = `
    <h2 class="a-transmit-q">TRANSMIT?</h2>
    <div class="a-yesno">
      <a class="a-yes" href="/contact.html" data-internal data-cursor="SEND ▸">YES ▸ INITIATE CONTACT</a>
    </div>
    ${site.email ? `<p class="a-mail micro">DIRECT LINE :: <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email.toUpperCase())}</a></p>` : ''}
    ${socials ? `<div class="a-socials">${socials}</div>` : ''}`;

  document.getElementById('a-eof')!.innerHTML =
    `<span>EOF ▪ P·OP/01 ▪ ${escapeHtml(site.name.toUpperCase())} ▪ CITY LIMITS</span>`;
}

/** HEAD-probe a list of urls; first real hit wins. Dev servers answer missing
 *  files with the SPA's index.html, so a text/html body is a miss. */
async function probeFirst(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok && !(res.headers.get('content-type') ?? '').includes('text/html')) return url;
    } catch { /* next */ }
  }
  return null;
}

async function mountPortrait(site: SiteContent): Promise<void> {
  const canvas = document.getElementById('a-specimen') as HTMLCanvasElement;
  const cap = document.getElementById('a-portrait-cap')!;
  const seed = hashSlug(`operator-${site.name.toLowerCase()}`);

  const url = await probeFirst(portraitCandidates());
  if (!url) {
    cap.textContent = 'AWAITING SUBJECT // DROP PORTRAIT.JPG';
    const spec = mountSpecimen(canvas, null, 0, 0, seed);
    wireBursts(canvas, spec);
    return;
  }
  const img = new Image();
  img.addEventListener('load', () => {
    cap.textContent = `SUBJECT :: ${site.name.toUpperCase()} // VERIFIED`;
    const spec = mountSpecimen(canvas, img, img.naturalWidth, img.naturalHeight, seed);
    wireBursts(canvas, spec);
  });
  img.addEventListener('error', () => {
    cap.textContent = 'AWAITING SUBJECT // DROP PORTRAIT.JPG';
    const spec = mountSpecimen(canvas, null, 0, 0, seed);
    wireBursts(canvas, spec);
  });
  img.src = url;
}

function wireBursts(canvas: HTMLCanvasElement, spec: { burst(ms?: number): void }): void {
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    spec.burst(520);
    sound.zap();
  });
}
