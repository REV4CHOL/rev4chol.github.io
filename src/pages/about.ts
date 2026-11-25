import { AboutContent, loadAbout, SiteContent } from '../lib/content';
import { crossedHtml } from '../lib/cross';
import { escapeHtml } from '../lib/escape';
import { scrambleEl } from '../lib/scramble';
import { armStamps } from '../lib/stamps';
import { capabilitiesFromTagline, portraitCandidates } from '../about/operator';
import { rackKeepsCaps } from '../about/rack';
import { armPosterLock, posterZoom } from '../lib/poster-lock';
import { armGlideNav, navNeighbors } from '../lib/swipe-nav';
import { holePad, holeProps, holeRect } from '../project/holes';
import { keepPlace } from '../lib/keep-place';
import { startPage } from '../shell/page';
import '../styles/about.css';

// the visitor's place after a reload or Back (lib/keep-place.ts): armed before the boot builds the page
keepPlace();

startPage(
  'about',
  async ({ site }) => {
    // the page is a fixed 1440px plate — zoom and window width scale it as
    // one poster, they never reflow it (owner decree: benchmark 100% only)
    armPosterLock();
    // this page scrolls, so the glide only arms at the respective end of the
    // scroll — normal thumb-scrolling never drags the page itself
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
  },
  [{ label: 'LOAD OPERATOR FILE', run: () => loadAbout() }],
);

const pad2 = (n: number) => String(n).padStart(2, '0');

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

function render(site: SiteContent, about: AboutContent): void {
  // -- hero -------------------------------------------------------------
  void scrambleEl(document.getElementById('a-status-line')!, `PERSONNEL :: ${site.name.toUpperCase()} // CLEARED`, 900);
  const nameEl = document.getElementById('a-name')!;
  // the chromatic plate copies read attr(data-text): the full name from frame
  // one, while the visible layer is still scrambling in
  const fullName = site.name.toUpperCase();
  nameEl.dataset.text = fullName;
  // the name never leaves its column: measure the full glyphs at CSS size and
  // cap the font to fit (the dossier-title fit-to-measure, fourth outing)
  nameEl.textContent = fullName;
  const idCol = document.querySelector<HTMLElement>('.a-id')!;
  const fitName = () => {
    nameEl.style.fontSize = '';
    const w = idCol.clientWidth;
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
    ['STATUS', 'ACTIVE'], // (no arrow: the arrow is the buttons')
  ];
  document.getElementById('a-callouts')!.innerHTML = callouts
    .map(
      ([k, v], i) =>
        `<div class="a-callout" style="--d:${i * 90}ms"><span class="ac-line"></span><span>${k} :: ${crossedHtml(v)}${k === 'STATUS' ? '<span class="a-caret" aria-hidden="true">▮</span>' : ''}</span></div>`,
    )
    .join('');

  // -- the portrait: the owner's photograph, shown as it is --------------
  void mountPortrait(site);

  // -- OP: dossier ------------------------------------------------------
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
    .map((f) => `<dt>${escapeHtml(f.k.toUpperCase())}</dt><dd><span>${crossedHtml(f.v.toUpperCase())}</span></dd>`)
    .join('');

  // -- CAP: the skill board ---------------------------------------------
  // two banks in the ident grammar — creative rides the alert plate,
  // technical rides the field plate, a hazard spine between them and an
  // oversized ghost SKILL stamped behind. Falls back to the chip matrix
  // when about.json carries no skills.
  const capsEl = document.getElementById('a-caps')!;
  const hasSkills = about.skills.creative.length > 0 || about.skills.technical.length > 0;
  if (hasSkills) {
    // the machine rack: every skill is one uniform cartridge bar — index
    // plate, name, machined rail, category cap — color-coded per bank and
    // inverting on hover. Uniform hardware, so nothing can ever clip.
    const bank = (kind: 'c' | 't', label: string, items: string[]) => {
      const bars = items
        .map(
          (s, i) =>
            `<div class="a-bar" data-kind="${kind}" data-stamp>
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
    armRackCaps(capsEl.querySelector<HTMLElement>('.a-rack')!);
  } else {
    capsEl.innerHTML = caps
      .map((c, i) => `<span class="a-chip" data-stamp><em>${pad2(i + 1)}</em> ▸ ${escapeHtml(c)}</span>`)
      .join('');
  }

  // -- TRANSMIT? finale -------------------------------------------------
  const socials = site.socials
    .map((s) => `<a class="a-social" href="${escapeHtml(s.href)}" target="_blank" rel="noopener">${escapeHtml(s.label.toUpperCase())}</a>`)
    .join('');
  document.getElementById('a-transmit')!.innerHTML = `
    <h2 class="a-transmit-q" data-stamp>TRANSMIT?</h2>
    <div class="a-yesno" data-stamp>
      <a class="a-yes" href="/contact.html" data-internal data-cursor="SEND ▸">YES ▸ INITIATE CONTACT</a>
    </div>
    ${site.email ? `<p class="a-mail micro" data-stamp>DIRECT LINE :: <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email.toUpperCase())}</a></p>` : ''}
    ${socials ? `<div class="a-socials" data-stamp>${socials}</div>` : ''}`;

  document.getElementById('a-eof')!.innerHTML =
    `<span>EOF ▪ P·OP/01 ▪ ${escapeHtml(site.name.toUpperCase())}</span>`;

  armStamps();
}

/** The rack's counters show only where every one stands whole (about/rack.ts): judged when the rack is built, when the
 *  fonts arrive (the names' widths change) and when the window changes. Each judgement shows the counters first, so
 *  they are measured where they would stand; the bars' padding and border are plate px under the poster lock, their
 *  boxes viewport px, hence the zoom. */
function armRackCaps(rack: HTMLElement): void {
  const judge = () => {
    rack.classList.remove('is-bare');
    rack.style.width = '';
    const z = posterZoom();
    // (the rack is sized by its contents, counters included: a bare rack keeps the width it had with them, so only the
    // counters leave and nothing else moves)
    const width = rack.getBoundingClientRect().width / z;
    const rows = [...rack.querySelectorAll<HTMLElement>('.a-bar')].flatMap((bar) => {
      const c = bar.querySelector<HTMLElement>('.a-bar-cap')?.getBoundingClientRect();
      if (!c || c.width === 0) return []; // (dropped by the styles: a phone, a wide tablet)
      const cs = getComputedStyle(bar);
      const inset = (parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)) * z;
      return [{ capRight: c.right, edge: bar.getBoundingClientRect().right - inset }];
    });
    const bare = !rackKeepsCaps(rows);
    rack.classList.toggle('is-bare', bare);
    if (bare) rack.style.width = `${width}px`;
  };
  judge();
  void document.fonts?.ready?.then(judge);
  window.addEventListener('resize', judge);
}

/** THE PORTRAIT AS IT IS (owner, 2026-11-25: "remove the effect on the picture in about section"). The photograph is
 *  a plain <img> in the 4:5 frame, cover-fitted, in colour: no dither, no glitch, no echo plates, no sweep. It joins
 *  the frame once decoded (the frame holds its size from the first paint, black until then). No file on hand: the
 *  frame stays black and says so. The archive (about-old) keeps its glitch machine. */
async function mountPortrait(site: SiteContent): Promise<void> {
  const fig = document.getElementById('a-portrait')!;
  const cap = document.getElementById('a-portrait-cap')!;
  armPhotoHole(fig);
  const awaiting = () => { cap.textContent = 'AWAITING SUBJECT // DROP PORTRAIT.JPG'; };

  const url = await probeFirst(portraitCandidates());
  if (!url) { awaiting(); return; }
  const img = document.createElement('img');
  img.className = 'a-photo';
  img.alt = `${site.name}, portrait`;
  img.decoding = 'async';
  img.draggable = false;
  img.src = url;
  try {
    await img.decode();
  } catch {
    // a browser may refuse decode() for a picture it can still show: wait for the load itself
    const shown = img.complete
      ? img.naturalWidth > 0
      : await new Promise<boolean>((done) => {
        img.addEventListener('load', () => done(img.naturalWidth > 0), { once: true });
        img.addEventListener('error', () => done(false), { once: true });
      });
    if (!shown) { awaiting(); return; }
  }
  fig.prepend(img);
  cap.textContent = `SUBJECT :: ${site.name.toUpperCase()} // VERIFIED`;
}

/** The site's film layers (grain + scanlines, src/shell/grain.ts) off the photograph: the overlay grain lands hardest
 *  on mid-tones, which is a photo's whole range. The layers' own punched hole (base.css `.has-hole`, the one the film
 *  player and STORY's city use) follows the frame on scroll and resize, the film page's way (project/holes.ts): every
 *  box read before anything is written, the hole clamped to the screen, and a layer written only when its values
 *  change, so a scroll with the photo off the screen paints nothing again (the owner's phone, 2026-11-25). Rects arrive
 *  in viewport px; the layers lay out in plate px under the poster lock, hence the zoom. */
function armPhotoHole(target: HTMLElement): void {
  const written = new WeakMap<HTMLElement, string>();
  const syncHole = () => {
    const layers = [document.getElementById('grain'), document.querySelector<HTMLElement>('.scan-layer')];
    const z = posterZoom();
    const de = document.documentElement;
    const vw = Math.max(window.innerWidth, de.clientWidth), vh = Math.max(window.innerHeight, de.clientHeight);
    const r = target.getBoundingClientRect();
    const huds = [...document.querySelectorAll<HTMLElement>('.hud-bl, .hud-br')].map((h) => [h, h.getBoundingClientRect()] as const);
    const props = holeProps([['--hole', holeRect(r, z, vw, vh, holePad(vh, z))]]);
    const key = props.map(([k, v]) => `${k}:${v}`).join(';');
    for (const el of layers) {
      if (!el || written.get(el) === key) continue;
      written.set(el, key);
      el.classList.add('has-hole');
      for (const [k, v] of props) el.style.setProperty(k, v);
    }
    // the HUD's foot readouts (fixed, over the page) step aside while they meet the photo, as they do for a film's
    // player: on a 1440 x 900 screen (and a short tablet) the timecode stood across the picture's foot at rest
    for (const [h, b] of huds) {
      h.classList.toggle('hud-yield', r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom);
    }
  };
  syncHole();
  window.addEventListener('scroll', syncHole, { passive: true });
  window.addEventListener('resize', syncHole);
  window.addEventListener('load', syncHole);
  void document.fonts?.ready?.then(syncHole);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncHole).observe(target);
  // the layers are dealt by the shell; if they arrive after this page's first sync, the next frame catches them
  requestAnimationFrame(syncHole);
}

