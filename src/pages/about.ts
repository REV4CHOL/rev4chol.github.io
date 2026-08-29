import { AboutContent, loadAbout, SiteContent } from '../lib/content';
import { escapeHtml } from '../lib/escape';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { armStamps } from '../lib/stamps';
import { capabilitiesFromTagline, portraitCandidates } from '../about/operator';
import { mountSpecimen } from '../about/specimen';
import { armGlideNav, navNeighbors } from '../lib/swipe-nav';
import { hashSlug } from '../project/dossier';
import { startPage } from '../shell/page';
import '../styles/about.css';

startPage(
  'about',
  async ({ site }) => {
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
  document.getElementById('a-index')!.innerHTML = `<span>P·OP/01</span>`;
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
    ['STATUS', 'ACTIVE ▸'],
  ];
  document.getElementById('a-callouts')!.innerHTML = callouts
    .map(
      ([k, v], i) =>
        `<div class="a-callout" style="--d:${i * 90}ms"><span class="ac-line"></span><span>${k} :: ${escapeHtml(v)}${k === 'STATUS' ? '<span class="a-caret" aria-hidden="true">▮</span>' : ''}</span></div>`,
    )
    .join('');

  // -- the specimen (portrait through the machine) ----------------------
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
    .map((f) => `<dt>${escapeHtml(f.k.toUpperCase())}</dt><dd><span>${escapeHtml(f.v.toUpperCase())}</span></dd>`)
    .join('');

  // -- CAP: the skill board ---------------------------------------------
  // two banks in the ident grammar — creative rides the alert plate,
  // technical rides the field plate, a hazard spine between them and an
  // oversized ghost SKILL stamped behind. Falls back to the chip matrix
  // when about.json carries no skills.
  const capsEl = document.getElementById('a-caps')!;
  const hasSkills = about.skills.creative.length > 0 || about.skills.technical.length > 0;
  if (hasSkills) {
    const bank = (kind: 'creative' | 'technical', items: string[]) => {
      const tag = kind === 'creative' ? 'C' : 'T';
      const rows = items
        .map(
          (s, i) =>
            `<div class="a-skill-row" data-stamp><em class="micro">${tag}·${pad2(i + 1)}</em><span class="a-skill-name">${escapeHtml(s.toUpperCase())}</span><i class="a-skill-lead" aria-hidden="true"></i><b aria-hidden="true">▸</b></div>`,
        )
        .join('');
      return `<div class="a-skill-col a-skill-col--${kind}">
        <h3 class="a-skill-head micro">${kind.toUpperCase()}</h3>${rows}</div>`;
    };
    capsEl.innerHTML = `<div class="a-skill-board">
      <span class="a-skill-ghost" aria-hidden="true">SKILL</span>
      ${bank('creative', about.skills.creative)}
      <i class="a-skill-spine" aria-hidden="true"></i>
      ${bank('technical', about.skills.technical)}
    </div>`;
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

async function mountPortrait(site: SiteContent): Promise<void> {
  const canvas = document.getElementById('a-specimen') as HTMLCanvasElement;
  const cap = document.getElementById('a-portrait-cap')!;
  const seed = hashSlug(`operator-${site.name.toLowerCase()}`);

  const url = await probeFirst(portraitCandidates());
  if (!url) {
    // no portrait on file yet — the machine scans static instead
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

