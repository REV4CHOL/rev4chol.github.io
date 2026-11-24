import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { portraitCandidates } from '../src/about/operator';

// THE PORTRAIT AS IT IS (owner, 2026-11-25: "change my picture in ABOUT section to this ... Also remove the effect on
// the picture in about section"). ABOUT shows the owner's photograph plain: in colour, sharp, nothing laid over it.
// Gone from the portrait: the specimen machine's canvas (the signal-green Bayer dither, its glitch bursts, chromatic
// splits, slice displacement and scan sweep), the two misregistered echo plates, the CSS scan sweep, the corner ticks
// drawn on the picture, and the site's grain and scanlines over it (punched out with the layers' own hole, as the
// film player and STORY's city are). The archive (about-old.*) keeps its machine: specimen.ts stays for it.
const read = (f: string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const html = read('about.html');
const page = read('src/pages/about.ts');
const css = read('src/styles/about.css');
/** The text of the first block that opens with `head` (up to its matching brace). */
const block = (src: string, head: string) => {
  const i = src.indexOf(head);
  expect(i, head).toBeGreaterThan(-1);
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1);
  }
  throw new Error('unclosed ' + head);
};
const figure = html.slice(html.indexOf('<figure class="a-portrait"'), html.indexOf('</figure>') + 9);

describe('ABOUT: the portrait is the photograph, no machine on it', () => {
  it('the figure holds no canvas, no echo plates and no sweep; the caption stays', () => {
    expect(figure).toContain('id="a-portrait"');
    expect(figure).not.toContain('<canvas');
    expect(figure).not.toContain('a-specimen');
    expect(figure).not.toContain('a-echo');
    expect(figure).not.toContain('a-sweep');
    expect(figure).toContain('<figcaption class="micro" id="a-portrait-cap"></figcaption>');
  });

  it('the page draws a plain <img> from the first portrait on file, never the specimen', () => {
    expect(page).not.toContain('specimen');
    expect(page).not.toContain('mountSpecimen');
    expect(page).not.toContain('burst');
    expect(page).toContain('probeFirst(portraitCandidates())');
    expect(page).toContain("document.createElement('img')");
    expect(page).toContain("img.className = 'a-photo'");
    // the caption's words stay true for a plain photo: the subject, verified; the no-file line stays as it was
    expect(page).toContain('`SUBJECT :: ${site.name.toUpperCase()} // VERIFIED`');
    expect(page).toContain("'AWAITING SUBJECT // DROP PORTRAIT.JPG'");
  });

  it('the candidates still resolve, jpg first, and the jpg is on file', () => {
    expect(portraitCandidates()[0]).toBe('/content/about/portrait.jpg');
    expect(statSync('public/content/about/portrait.jpg').isFile()).toBe(true);
  });

  it('the photo is shown as it is: sized by the 4:5 frame, cover-fitted, smooth, no filter or blend', () => {
    const fig = block(css, '.a-portrait {');
    expect(fig).toContain('aspect-ratio: 4 / 5');
    expect(fig).not.toContain('overflow: hidden'); // the ticks stand outside the picture now
    const img = block(css, '.a-portrait .a-photo {');
    expect(img).toContain('object-fit: cover');
    expect(img).toContain('width: 100%; height: 100%');
    for (const banned of ['pixelated', 'filter', 'mix-blend-mode', 'opacity']) expect(img, banned).not.toContain(banned);
    expect(css).not.toContain('.a-portrait canvas');
  });

  it('the echo plates and the sweep are gone from the sheet', () => {
    for (const gone of ['.a-echo', 'a-echo-a', 'a-echo-b', '.a-sweep', 'a-sweep-run']) expect(css, gone).not.toContain(gone);
  });

  it('the corner ticks stand OUTSIDE the picture, the caption under it, the tag off it on a phone', () => {
    const ticks = block(css, '.a-portrait::after {');
    expect(ticks).toMatch(/inset: -\d+px/);
    const cap = block(css, '.a-portrait figcaption {');
    expect(cap).toContain('top: calc(100% + ');
    expect(cap).not.toContain('bottom:');
    const phone = block(css, '@media (max-width: 760px) and (pointer: coarse) {');
    expect(phone).not.toContain('.a-subj-tag { right: 2px; }');
  });

  it('a subject column under 480 px steps the callouts down under the caption (they overlapped on narrow tablets and phones)', () => {
    expect(css).toContain('.a-subject { container: a-subject / inline-size; }');
    expect(block(css, '@container a-subject (max-width: 479px) {')).toContain('.a-callouts { margin-top: 38px; }');
    // after the base rule it overrides (equal specificity: the later one wins; placed before it, it did nothing)
    expect(css.indexOf('@container a-subject')).toBeGreaterThan(css.indexOf('.a-callouts {'));
  });

  it("the HUD's foot readouts step aside while they meet the photo (at rest they stood on its foot at 1440 x 900)", () => {
    expect(page).toContain("document.querySelectorAll<HTMLElement>('.hud-bl, .hud-br')");
    expect(page).toContain("h.classList.toggle('hud-yield',");
    expect(css).toContain('.page-about .hud.hud-yield { opacity: 0;');
  });

  it("the site's grain and scanlines carry a hole over the photo (the layers' own mask, as the player and STORY use)", () => {
    expect(page).toContain("classList.add('has-hole')");
    expect(page).toContain("document.getElementById('grain')");
    expect(page).toContain("document.querySelector<HTMLElement>('.scan-layer')");
    expect(page).toContain('posterZoom()'); // rects in viewport px, the layers lay out in plate px
    // the film page's way (project/holes.ts): clamped to the screen, a layer written only when its values change
    expect(page).toContain("import { holePad, holeProps, holeRect } from '../project/holes'");
    expect(page).toContain("holeProps([['--hole', holeRect(r, z, vw, vh, holePad(vh, z))]])");
    expect(page).toContain('written.get(el) === key');
    expect(page).toContain("addEventListener('scroll', syncHole, { passive: true })");
  });

  it('the archive keeps its machine: about-old still mounts the specimen, and specimen.ts stays', () => {
    expect(read('src/pages/about-old.ts')).toContain("import { mountSpecimen } from '../about/specimen'");
    expect(statSync('src/about/specimen.ts').isFile()).toBe(true);
  });

  it("the owner's guide says the portrait is shown as it is", () => {
    const guide = read('HOW-TO-EDIT.md');
    const about = guide.slice(guide.indexOf('## The About page'), guide.indexOf('## The site runs itself')).replace(/\s+/g, ' ');
    expect(about).not.toContain('dithered');
    expect(about).not.toContain('glitches');
    expect(about).toContain('shown as it is');
  });
});

/** Walk a JPEG's segments up to the start of scan: [marker, length] for each. */
function segments(buf: Buffer): number[] {
  expect(buf[0]).toBe(0xff);
  expect(buf[1]).toBe(0xd8);
  const out: number[] = [];
  let i = 2;
  while (i < buf.length) {
    expect(buf[i], `marker at ${i}`).toBe(0xff);
    const m = buf[i + 1];
    out.push(m);
    if (m === 0xda) break;
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return out;
}
/** Width and height from the frame header (SOF0..SOF2). */
function size(buf: Buffer): [number, number] {
  let i = 2;
  while (i < buf.length) {
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xc2) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no frame header');
}

describe("the portrait file: web-sized, 4:5, and nothing of the camera's in it (the repo is public)", () => {
  const buf = readFileSync('public/content/about/portrait.jpg');

  it('is 1440 x 1800 (4:5, the frame: sharp at 2x on the widest plate and at 3x on a phone)', () => {
    expect(size(buf)).toEqual([1440, 1800]);
  });

  it('weighs under 400 KB', () => {
    expect(buf.length).toBeLessThan(400 * 1024);
  });

  it('carries no metadata: no Exif or XMP (APP1), no Photoshop/IPTC (APP13), no ICC (APP2), no comment', () => {
    const segs = segments(buf);
    for (const [m, what] of [[0xe1, 'APP1 Exif/XMP'], [0xed, 'APP13'], [0xe2, 'APP2 ICC'], [0xfe, 'COM']] as const) {
      expect(segs, what).not.toContain(m);
    }
    // only the image's own tables, and the bare JFIF header at most
    for (const m of segs) expect([0xe0, 0xdb, 0xc0, 0xc1, 0xc2, 0xc4, 0xdd, 0xda], m.toString(16)).toContain(m);
  });
});
