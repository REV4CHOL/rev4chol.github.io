import { AboutContent, loadAbout, SiteContent } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { escapeHtml } from '../lib/escape';
import { scrambleEl } from '../lib/scramble';
import { sound } from '../lib/sound';
import { armStamps } from '../lib/stamps';
import { capabilitiesFromTagline, portraitCandidates, sheetCandidates } from '../about/operator';
import { mountSpecimen } from '../about/specimen';
import { barcodeSvg, hashSlug, specimenCodes } from '../project/dossier';
import { startPage } from '../shell/page';
import '../styles/about.css';

startPage(
  'about',
  async ({ site }) => {
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
  const codes = specimenCodes(`operator-${site.name.toLowerCase()}`);

  // -- hero -------------------------------------------------------------
  void scrambleEl(document.getElementById('a-status-line')!, `PERSONNEL :: ${site.name.toUpperCase()} // CLEARED`, 900);
  document.getElementById('a-index')!.innerHTML = `<span>P·OP/01</span>${barcodeSvg(codes.bars, 16)}`;
  void scrambleEl(document.getElementById('a-name')!, site.name.toUpperCase(), 650);
  document.getElementById('a-statement')!.textContent = about.statement;

  const caps = about.capabilities.length ? about.capabilities : capabilitiesFromTagline(site.tagline);
  const callouts: [string, string][] = [
    ['ALIAS', site.name.toUpperCase()],
    ['CLASS', caps.join(' / ')],
    ['FILE', codes.code],
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

  // -- CAP: matrix ------------------------------------------------------
  document.getElementById('a-caps')!.innerHTML = caps
    .map((c, i) => `<span class="a-chip" data-stamp><em>${pad2(i + 1)}</em> ▸ ${escapeHtml(c)}</span>`)
    .join('');

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
    `<span>EOF ▪ P·OP/01 ▪ ${escapeHtml(site.name.toUpperCase())}</span>${barcodeSvg(codes.bars)}`;

  // -- SHT: contact sheet -----------------------------------------------
  void mountSheet(site);

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

async function mountSheet(site: SiteContent): Promise<void> {
  const found: string[] = [];
  for (const slot of sheetCandidates()) {
    const hit = await probeFirst(slot);
    if (hit) found.push(hit);
  }
  if (!found.length) return; // section stays hidden

  const sec = document.getElementById('a-sheet-sec')!;
  sec.hidden = false;
  const sheet = document.getElementById('a-sheet')!;
  const lightbox = document.getElementById('lightbox') as HTMLDialogElement;
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  document.getElementById('lightbox-close')!.addEventListener('click', () => lightbox.close());

  found.forEach((url, i) => {
    const fig = document.createElement('figure');
    fig.className = 'a-frame';
    fig.dataset.cursor = 'VIEW +';
    const im = new Image();
    im.loading = 'lazy';
    im.alt = `${site.name} — frame ${i + 1}`;
    im.src = url;
    const veil = document.createElement('canvas');
    im.addEventListener('load', () => {
      // dither-first: the veil IS the resting state; truth only on hover.
      // Cover-crop to the cell's 4:3 before dithering so the veil and the
      // photo underneath crop identically — any aspect ratio welcome.
      const cw = 440;
      const ch = 330;
      const crop = document.createElement('canvas');
      crop.width = cw;
      crop.height = ch;
      const cctx = crop.getContext('2d')!;
      const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      cctx.drawImage(im, (cw - im.naturalWidth * s) / 2, (ch - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
      const d = ditherImageToCanvas(crop, cw, ch, 220, '#060606', '#C8FF00');
      veil.width = d.width;
      veil.height = d.height;
      veil.getContext('2d')?.drawImage(d, 0, 0);
      fig.classList.add('ready'); // photo may show only once its dither exists
    });
    im.addEventListener('error', () => fig.remove());
    const num = document.createElement('figcaption');
    num.className = 'micro';
    num.textContent = `FR·${pad2(i + 1)}`;
    fig.append(im, veil, num);
    fig.addEventListener('click', () => {
      lightboxImg.src = im.src;
      lightbox.showModal();
    });
    sheet.append(fig);
  });
}
