import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aspectRatio, isBlank, isPlaceholder, parseFloor, parseJson, parseProjects, parseSite } from '../src/lib/content';
import { loopCandidates } from '../src/home/loops';
import { pickLoopFiles } from '../src/lib/loop-files';
import { layoutProjects } from '../src/works/layout';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const read = (f: string) => readFileSync(root + f, 'utf8');
const onDisk = (url: string) => existsSync(root + url.replace('/content/', ''));
const rawProjects = () => parseJson(read('projects.json'), 'projects.json');

/** An mp4's top-level boxes in file order, and the movie's length in seconds from moov/mvhd. */
function mp4Facts(file: string): { boxes: string[]; seconds: number; bytes: number } {
  const b = readFileSync(file);
  const boxes: string[] = [];
  let seconds = NaN;
  for (let at = 0; at + 8 <= b.length; ) {
    let size = b.readUInt32BE(at);
    let head = 8;
    if (size === 1) {
      size = Number(b.readBigUInt64BE(at + 8));
      head = 16;
    } else if (size === 0) size = b.length - at;
    const type = b.toString('latin1', at + 4, at + 8);
    boxes.push(type);
    if (type === 'moov') {
      for (let c = at + head; c + 8 <= at + size; ) {
        const childSize = b.readUInt32BE(c);
        if (b.toString('latin1', c + 4, c + 8) === 'mvhd') {
          // FullBox: version, flags; then v0 = 32-bit times, v1 = 64-bit times; then timescale, duration
          const v1 = b[c + 8] === 1;
          const timescale = b.readUInt32BE(c + (v1 ? 28 : 20));
          const duration = v1 ? Number(b.readBigUInt64BE(c + 32)) : b.readUInt32BE(c + 24);
          seconds = duration / timescale;
          break;
        }
        if (childSize < 8) break;
        c += childSize;
      }
    }
    if (size < 8) break;
    at += size;
  }
  return { boxes, seconds, bytes: b.length };
}

/** An mp4's picture size from moov/trak/tkhd (16.16 fixed point): the first track that has one. */
function mp4Size(file: string): [number, number] | null {
  const b = readFileSync(file);
  const walk = (from: number, to: number): [number, number] | null => {
    for (let at = from; at + 8 <= to; ) {
      let size = b.readUInt32BE(at);
      let head = 8;
      if (size === 1) {
        size = Number(b.readBigUInt64BE(at + 8));
        head = 16;
      } else if (size === 0) size = to - at;
      if (size < 8) return null;
      const type = b.toString('latin1', at + 4, at + 8);
      if (type === 'tkhd') {
        // FullBox; v0 = 32-bit times: width at +84, height at +88; v1 = 64-bit times: +96, +100
        const v1 = b[at + 8] === 1;
        const w = b.readUInt32BE(at + (v1 ? 96 : 84)) / 65536;
        const h = b.readUInt32BE(at + (v1 ? 100 : 88)) / 65536;
        if (w > 0 && h > 0) return [w, h];
      } else if (type === 'moov' || type === 'trak') {
        const found = walk(at + head, at + size);
        if (found) return found;
      }
      at += size;
    }
    return null;
  };
  return walk(0, b.length);
}

describe('shipped content files', () => {
  it('site.json is valid', () => {
    const site = parseSite(parseJson(read('site.json'), 'site.json'));
    expect(site.name).toBe('REVACHOL');
    expect(site.nav.map((n) => [n.label, n.href])).toEqual([
      ['HOMEPAGE', '/index.html'],
      ['WORK', '/works.html'],
      ['ABOUT', '/about.html'],
      ['CONTACT', '/contact.html'],
      ['STORY', '/story.html'],
    ]); // the chain IS the menu order (owner 2026-09-26: "Homepage => WORK => ABOUT => CONTACT"; STORY stays at the far right)
  });

  it('the homepage roles open with the AI generalist, the colorist next (owner 2026-09-26)', () => {
    const site = parseSite(parseJson(read('site.json'), 'site.json'));
    const roles = site.tagline.split(/,\s*/).map((r) => r.trim().toLowerCase());
    expect(roles[0]).toBe('ai generalist');
    expect(roles[1]).toBe('colorist');
  });

  it('SODA COAST: the owner\'s scope film, linked — since 2026-09-27 a regular pane, now in RUST CHOIR\'s place', () => {
    const projects = parseProjects(rawProjects());
    const floor = parseFloor(rawProjects());
    expect(projects.some((p) => p.slug === 'vhs-eden')).toBe(false);
    // (first to SODIUM HAZE's place, json 24; then the owner, the same day: "move SODA COAST to RUST CHOIR"; json 10
    //  since the placeholders left the stream, 2026-09-28; json 9 since SALINE THRONE left it, the same day)
    expect(floor.findIndex((it) => it.slug === 'soda-coast')).toBe(9);
    const p = projects.find((q) => q.slug === 'soda-coast')!;
    expect(p.title).toBe('Soda Coast');
    expect(p.year).toBe(2025);
    expect(p.role).toBe('Director / Colorist / Editor / Sound Designer');
    expect(p.runtime).toBe('1:56');
    expect(p.tags).toEqual(['experimental', 'supernatural']);
    expect(p.synopsis).toBe('I see summer. And then the sea.');
    // (the owner's correction the same day: the ghost line is PHILIA's, the chapter's other real film)
    expect(projects.find((q) => q.slug === 'philia')!.synopsis).toBe('A ghost of the past, the present and the future.');
    expect(p.category).toBe('human');
    expect(p.tileSize).toBe('normal'); // out of the featured cluster, onto the ring (owner 2026-09-27)
    expect(p.aspect).toBe('2.39:1');
    // (the link came with the second batch: WATCH is live, no longer greyed)
    expect(p.film).toEqual({ type: 'youtube', src: 'https://www.youtube.com/embed/mrR8hRc4XF4' });
    expect(p.filmPending).toBe(false);
    const dir = `${root}projects/soda-coast/`;
    expect(existsSync(`${dir}poster.jpg`)).toBe(true);
    expect(existsSync(`${dir}preview.mp4`)).toBe(true);
    const stills = readdirSync(`${dir}stills`).sort();
    expect(stills).toHaveLength(51);
    expect(stills[0]).toBe('01.jpg');
    expect(stills[50]).toBe('51.jpg');
    expect(existsSync(`${root}projects/vhs-eden`)).toBe(false);
  });

  // the owner's second batch (2026-09-26): three films into three placeholders' slots, each linked;
  // `slot` is the json position — the floor's stream order (renumbered 2026-09-28, when the placeholders and the
  // open gap left it, and again when SALINE THRONE did)
  const BATCH = [
    { slug: 'the-father', slot: 3, was: 'void-cartography', title: 'The Father', year: 2026, role: 'Colorist', runtime: '2:27',
      tags: ['slice of life'], synopsis: 'A father hiding secrets from his own daughter.', category: 'machine',
      tileSize: 'large', aspect: '16:9', youtube: 'Idreboecojw', stills: 23 },
    { slug: 'halide', slot: 15, was: 'paper-lantern-war', title: 'HALIDE', year: 2026, role: 'Director / Colorist / Editor', runtime: '1:06',
      tags: ['experimental'], synopsis: 'Whiter dreams and whiter lives.', category: 'human',
      tileSize: 'normal', aspect: '2.39:1', youtube: 'dMbsrk9Eeiw', stills: 29 },
    // (the owner, mid-build: "MIST CHILD must be MISTCHILD" — one word, as its YouTube title has it;
    //  and after: "mistchild is 2025", as its folder says — the brief's 2026 was a slip)
    // (…and on 2026-09-27 the owner moved it to NEON LITURGY's corner — a swap: json 18 ↔ 32; then, the same day,
    //  "bring MISTCHILD down to Neon Liturgy (chapter 1), then remove the pane where MISTCHILD once stood": back to
    //  json 32 for good, NEON LITURGY off the site, json 18 an open gap; since 2026-09-28, the placeholders and the
    //  gap gone, json 17; then 16, SALINE THRONE gone too)
    { slug: 'mistchild', slot: 16, was: 'low-tide-gospel', title: 'MISTCHILD', year: 2025, role: 'Director / Colorist / Editor', runtime: '0:47',
      tags: ['experimental'], synopsis: 'The child must have felt so lonely, in the mist.', category: 'human',
      tileSize: 'normal', aspect: '2.39:1', youtube: 'dyqpjo4eKJI', stills: 16 },
  ];

  // the owner's third batch (2026-09-27): FOREST ONSEN into TENDER MACHINES' place; SOFT HOURS & LONELY LANDS
  // "at the pane where SODA COAST just left"; "ĂN HỎI" CEREMONY into the "upper blank space", featured.
  // The owner's text verbatim — straight quotes, the ampersand, the diacritics (NFC), the curly apostrophe.
  const BATCH3 = [
    { slug: 'forest-onsen', slot: 4, where: 'takes TENDER MACHINES\' featured place in CH·02',
      title: 'FOREST ONSEN - Ecopark\'s Eco Retreat Commercial', year: 2026, role: 'AI Lead / Colorist', runtime: '0:47',
      tags: ['real estate', 'tv commercial'], synopsis: 'Change your life’s experience, with Forest Onsen.', category: 'machine',
      tileSize: 'large', aspect: '16:9', youtube: '5drz5nwLdKM', stills: 10 },
    { slug: 'soft-hours-lonely-lands', slot: 12, where: 'takes the pane SODA COAST left',
      title: 'Soft Hours & Lonely Lands', year: 2025, role: 'Director / Colorist / Editor / Sound Designer', runtime: '1:46',
      tags: ['experimental'],
      synopsis: 'The stillness of ordinary moments, in familiar places that feel strangely distant, with the extraordinary emotions for the empty spaces.',
      category: 'human', tileSize: 'normal', aspect: '2.39:1', youtube: 'G_wItkJWT2o', stills: 36 },
    { slug: 'an-hoi', slot: 6, where: 'fills the upper held place, featured',
      title: '"Ăn Hỏi" Ceremony', year: 2026, role: 'Director / Colorist / Editor / Sound Designer', runtime: '3:17',
      tags: ['experimental', 'slice of life'],
      synopsis: 'Gathering together, saying the first words, for their time spent together for all eternity.',
      category: 'human', tileSize: 'large', aspect: '4:3', youtube: 'XKkHkLVUC40', stills: 35 },
  ];

  for (const f of BATCH3) it(`${f.title.toUpperCase()} ${f.where}, linked, with its media (owner 2026-09-27)`, () => {
    checkFilm(f);
  });

  // the owner's fourth batch (2026-09-27): REMNANTS OF A DREAM for "the empty blank space in chapter 1" — the held
  // place at json 25, kept that morning for "two more" films (ĂN HỎI took the other) — and MISSION: IMPASSIBLE to
  // "Replace Copper Lullaby in chapter 1". MISSION's folder holds five stills twice (the same frames, exported with
  // two letterbox sizes): its wall shows each once, 19 of the 24.
  const BATCH4 = [
    { slug: 'remnants-of-a-dream', slot: 13, where: 'fills the last held place, featured',
      title: 'Remnants of a Dream', year: 2026, role: 'Colorist', runtime: '24:16',
      tags: ['drama', 'indie short film'], synopsis: 'Avalon promises a bright future, but at what cost?',
      category: 'human', tileSize: 'large', aspect: '16:9', youtube: 'tKWevMRBOzY', stills: 40, accent: '#ED6B85' },
    { slug: 'mission-impassible', slot: 14, where: 'takes COPPER LULLABY\'s pane',
      title: 'Mission: Impassible', year: 2025, role: 'Colorist', runtime: '1:36',
      tags: ['comedy', 'indie short film'], synopsis: 'Failure is not an option. Neither is studying.',
      category: 'human', tileSize: 'normal', aspect: '2.39:1', youtube: 'R3tSyucJERw', stills: 19, accent: '#F5AE4A' },
  ];

  for (const f of BATCH4) it(`${f.title.toUpperCase()} ${f.where}, linked, with its media (owner 2026-09-27)`, () => {
    checkFilm(f);
    expect(parseProjects(rawProjects()).find((p) => p.slug === f.slug)!.accent).toBe(f.accent);
  });

  // (owner 2026-09-27: "Change JAECOO J5 to JAECOO J5: Every Road Leads Home, and also change its embed code for
  //  watch to" IXWAZwI5Xug. The old link, EGIm1gD-KTE, is gone from YouTube; the new cut runs 2:46, not 2:43.)
  it('JAECOO J5: its new title and cut; the rest of it as it was', () => {
    expect(parseFloor(rawProjects()).findIndex((it) => it.slug === 'jaecoo-j5')).toBe(8);
    const p = parseProjects(rawProjects()).find((q) => q.slug === 'jaecoo-j5')!;
    expect(p.title).toBe('JAECOO J5: Every Road Leads Home');
    expect(p.film).toEqual({ type: 'youtube', src: 'https://www.youtube.com/embed/IXWAZwI5Xug' });
    expect(p.runtime).toBe('2:46');
    expect([p.year, p.role, p.tags, p.accent, p.aspect, p.category, p.tileSize]).toEqual(
      [2026, 'Director / Editor / Colorist / Sound Designer', ['spec advertisement'], '#FFA84D', '16:9', 'machine', 'large']);
    expect(p.synopsis).toBe('A dog, a city and one long golden hour on the road. A machine-dreamt spec ad for the JAECOO J5.');
    expect(read('projects.json')).not.toContain('EGIm1gD-KTE');
    expect(readdirSync(`${root}projects/jaecoo-j5/stills`)).toHaveLength(54); // its media stay
  });

  // (owner 2026-09-28: "Replace Terminal Bloom in chapter 2 with this" — two vertical digital ads, 867 × 1541 each:
  //  "one watch will spawn two embed YouTube videos at once, on the same row together"; and "the Stills has film1 and
  //  film2, be sure to include them all, with left pillar being ad #1, and right pillar being ad #2")
  it("GALAXY Z FOLD 8 ULTRA takes TERMINAL BLOOM's featured pane: a vertical film in two parts, every still", () => {
    expect(parseFloor(rawProjects()).findIndex((it) => it.slug === 'galaxy-z-fold-8-ultra')).toBe(11);
    const p = parseProjects(rawProjects()).find((q) => q.slug === 'galaxy-z-fold-8-ultra')!;
    expect(p.title).toBe('GALAXY Z FOLD 8 ULTRA | DIGITAL AD');
    expect([p.year, p.role, p.runtime, p.tags, p.synopsis]).toEqual(
      [2026, 'AI Generalist', '0:24 & 0:37', ['commercial advertising'], 'Welcome to the fold.']);
    expect(p.credits).toEqual([{ role: 'AI Generalist', name: 'Revachol' }]);
    expect([p.aspect, p.category, p.tileSize, p.accent]).toEqual(['9:16', 'machine', 'large', '#8C9EFF']);
    expect(p.films).toEqual([
      { type: 'youtube', src: 'https://www.youtube.com/embed/hfq64ykkQs4', label: 'Digital Ad #1' },
      { type: 'youtube', src: 'https://www.youtube.com/embed/60ga3V46lk4', label: 'Digital Ad #2' },
    ]);
    expect(p.film).toBe(p.films[0]);
    expect([p.filmPending, p.filmPrivate]).toEqual([false, false]);
    const dir = `${root}projects/galaxy-z-fold-8-ultra/`;
    expect(existsSync(`${dir}poster.jpg`)).toBe(true);
    const loop = mp4Facts(`${dir}preview.mp4`);
    expect(loop.seconds).toBeCloseTo(5.97, 1); // the source's 179 frames at 29.97 fps
    expect(loop.boxes.indexOf('moov')).toBeGreaterThanOrEqual(0);
    expect(loop.boxes.indexOf('moov')).toBeLessThan(loop.boxes.indexOf('mdat')); // faststart
    expect(loop.bytes).toBeLessThan(3 * 1024 * 1024);
    expect(mp4Size(`${dir}preview.mp4`)).toEqual([720, 1280]); // native and vertical: never cropped to 16:9
    // every still, named by its part: 1- is ad #1 (the left pillar), 2- is ad #2 (the right)
    const stills = readdirSync(`${dir}stills`).sort();
    expect(stills.filter((s) => s.startsWith('1-'))).toEqual(['01', '02', '03', '04', '05', '06'].map((n) => `1-${n}.jpg`));
    expect(stills.filter((s) => s.startsWith('2-'))).toEqual(
      ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].map((n) => `2-${n}.jpg`));
    expect(stills).toHaveLength(17);
    // TERMINAL BLOOM is off the site, folder and all
    expect(parseFloor(rawProjects()).some((it) => it.slug === 'terminal-bloom')).toBe(false);
    expect(existsSync(`${root}projects/terminal-bloom`)).toBe(false);
  });

  for (const f of BATCH) it(`${f.title.toUpperCase()} takes ${f.was}'s slot, linked, with its media (owner 2026-09-26)`, () => {
    const projects = parseProjects(rawProjects());
    expect(projects.some((p) => p.slug === f.was)).toBe(false);
    expect(existsSync(`${root}projects/${f.was}`)).toBe(false);
    checkFilm(f);
  });

  function checkFilm(f: Omit<(typeof BATCH)[number], 'was'>): void {
    const projects = parseProjects(rawProjects());
    expect(parseFloor(rawProjects()).findIndex((it) => it.slug === f.slug)).toBe(f.slot);
    const p = projects.find((q) => q.slug === f.slug)!;
    expect(p.title).toBe(f.title);
    expect(p.year).toBe(f.year);
    expect(p.role).toBe(f.role);
    expect(p.credits).toEqual([{ role: f.role, name: 'Revachol' }]); // no placeholder credit left behind
    expect(p.runtime).toBe(f.runtime);
    expect(p.tags).toEqual(f.tags);
    expect(p.synopsis).toBe(f.synopsis);
    expect(p.category).toBe(f.category);
    expect(p.tileSize).toBe(f.tileSize); // the slot's own size
    expect(p.aspect).toBe(f.aspect);
    expect(p.film).toEqual({ type: 'youtube', src: `https://www.youtube.com/embed/${f.youtube}` });
    expect(p.filmPending).toBe(false);
    const dir = `${root}projects/${f.slug}/`;
    expect(existsSync(`${dir}poster.jpg`)).toBe(true);
    expect(existsSync(`${dir}preview.mp4`)).toBe(true);
    const stills = readdirSync(`${dir}stills`).sort();
    expect(stills).toHaveLength(f.stills);
    expect(stills[0]).toBe('01.jpg');
    expect(stills[f.stills - 1]).toBe(`${String(f.stills).padStart(2, '0')}.jpg`);
  }

  // (owner 2026-09-27: "Change all Sound Mixer roles written on every project to Sound Designer")
  it('no project credits a Sound Mixer: the owner\'s sound role is Sound Designer', () => {
    expect(read('projects.json')).not.toMatch(/sound mixer/i);
    const projects = parseProjects(rawProjects());
    for (const slug of ['katara', 'jaecoo-j5', 'electric-fish']) {
      const p = projects.find((q) => q.slug === slug)!;
      expect(p.role, slug).toBe('Director / Editor / Colorist / Sound Designer');
      expect(p.credits, slug).toEqual([{ role: 'Director / Editor / Colorist / Sound Designer', name: 'Revachol' }]);
    }
  });

  // (owner 2026-09-27, first: "move Soda Coast to Sodium Haze / And Far East to Motel Eden / Then leave the
  //  original panes as they left blank, i am about to fill in two more to those two positions"; then, the same
  //  day: "move FAR EAST to Copper Lullaby", "move SODA COAST to RUST CHOIR", SOFT HOURS "at the pane where
  //  SODA COAST just left", "ĂN HỎI" CEREMONY into the "upper blank space"; and last, REMNANTS OF A DREAM into
  //  "the empty blank space", MISSION: IMPASSIBLE in place of "Copper Lullaby")
  // (the json positions renumbered 2026-09-28, when the placeholders and the open gap left the stream, and again
  //  when SALINE THRONE left it)
  it('the CH·01 moves: FAR EAST and SODA COAST in their new places; both held places filled, none left', () => {
    const floor = parseFloor(rawProjects());
    expect(floor).toHaveLength(17);
    expect(floor.some(isBlank)).toBe(false);
    const slot = (i: number) => [floor[i].slug, floor[i].tileSize];
    expect(slot(6)).toEqual(['an-hoi', 'large']); // the upper held place
    expect(slot(13)).toEqual(['remnants-of-a-dream', 'large']); // the lower one
    expect(slot(5)).toEqual(['far-east', 'normal']); // COPPER LULLABY's place
    expect(slot(14)).toEqual(['mission-impassible', 'normal']); // FAR EAST's old one: COPPER LULLABY's, until the fourth batch
    expect(slot(9)).toEqual(['soda-coast', 'normal']); // RUST CHOIR's place
    for (const gone of ['sodium-haze', 'motel-eden', 'rust-choir', 'tender-machines', 'copper-lullaby']) {
      expect(floor.some((it) => it.slug === gone), gone).toBe(false);
      expect(existsSync(`${root}projects/${gone}`), `${gone} folder`).toBe(false);
    }
    // FAR EAST moves whole: only its place changed
    const fe = parseProjects(rawProjects()).find((p) => p.slug === 'far-east')!;
    expect(fe.film).toEqual({ type: 'youtube', src: 'https://www.youtube.com/embed/DrezQ5zlHqI' });
    expect([fe.title, fe.year, fe.aspect, fe.category]).toEqual(['FAR EAST', 2025, '2.39:1', 'human']);
  });

  // (owner 2026-09-27: "bring MISTCHILD down to Neon Liturgy (chapter 1), then remove the pane where MISTCHILD once
  //  stood" — MISTCHILD took NEON LITURGY's place, last in CH·01's order, and the corner it left stayed open floor.
  //  On 2026-09-28 the placeholders left and the floor re-flowed; the open gap, kept only so no neighbour would
  //  slide into that corner, went with them)
  it("MISTCHILD stays last in CH·01's order; NEON LITURGY and the open gap are gone", () => {
    const floor = parseFloor(rawProjects());
    expect(floor.filter((it) => it.category === 'human').at(-1)!.slug).toBe('mistchild');
    expect(floor.some(isBlank)).toBe(false);
    expect(floor.some((it) => it.slug === 'neon-liturgy')).toBe(false);
    expect(existsSync(`${root}projects/neon-liturgy`)).toBe(false);
  });

  // (owner 2026-09-28: "also completely remove all placeholder panes from the work section"; then, of the one that
  //  slipped through that cut on its generated test film: "Also in chapter 1, remove the placeholder Saline Throne
  //  pane")
  const PLACEHOLDERS_GONE = [
    'static-hymn', 'glass-harvest', 'midnight-protocol', 'signal-decay', 'last-transmission', 'pale-circuitry',
    'hollow-signal', 'acid-pastoral', 'dead-channel', 'iron-lullaby', 'gasoline-hymn', 'salt-cathedral', 'velvet-static',
    'winter-arcade', 'dream-compiler', 'latent-scripture', 'neural-drift', 'oracle-fatigue', 'phantom-dataset',
    'silicon-vespers', 'weight-of-ghosts', 'saline-throne',
  ];
  it('no placeholder anywhere: every entry a real film, every folder a film on the list', () => {
    const floor = parseFloor(rawProjects());
    const films = parseProjects(rawProjects());
    expect(floor).toHaveLength(films.length); // no held place, no gap
    expect(films.filter(isPlaceholder).map((p) => p.slug)).toEqual([]);
    // nor one the placeholder generator made: isPlaceholder sees only a missing film, and SALINE THRONE had one (a
    // synthetic 12 s film.mp4, made to try the self-hosted player)
    const ps1 = readFileSync(fileURLToPath(new URL('../scripts/gen-placeholders.ps1', import.meta.url)), 'utf8');
    const generated = /\$slugs = @\(([^)]*)\)/.exec(ps1)![1].match(/[a-z0-9-]+/g)!;
    expect(generated).toContain('saline-throne');
    expect(films.filter((p) => generated.includes(p.slug)).map((p) => p.slug)).toEqual([]);
    for (const slug of PLACEHOLDERS_GONE) {
      expect(floor.some((it) => it.slug === slug), slug).toBe(false);
      expect(existsSync(`${root}projects/${slug}`), `${slug} folder`).toBe(false);
    }
    const folders = readdirSync(`${root}projects`, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(folders.sort()).toEqual(films.map((p) => p.slug).sort());
  });

  // a chapter's floor as the layout lays it (a vertical film stands tall): slug → [column, row] of its pane slot
  const placedOf = (category: 'human' | 'machine') => {
    const items = parseFloor(rawProjects()).filter((it) => it.category === category);
    return layoutProjects(items.map((it) => ({
      slug: it.slug, tileSize: it.tileSize, position: it.position, tall: !isBlank(it) && aspectRatio(it.aspect) < 1,
    })));
  };
  const cells = (category: 'human' | 'machine') => {
    const placed = placedOf(category);
    const c0 = Math.min(...placed.map((p) => p.col));
    const r0 = Math.min(...placed.map((p) => p.row));
    return Object.fromEntries(placed.map((p) => [p.slug, [(p.col - c0) / 2, (p.row - r0) / 2]]));
  };

  // (2026-09-28: the placeholders gone, then SALINE THRONE: CH·01's twelve fill a 4 × 3 block, no slot empty — the
  //  six featured 3 × 2 at its top left, the regular films after them in json order, MISTCHILD last, in the corner)
  it('CH·01 lies cell by cell: a full 4 × 3 block, every pane a real film', () => {
    expect(cells('human')).toEqual({
      philia: [0, 0], 'mien-vien': [1, 0], 'an-hoi': [2, 0], 'far-east': [3, 0],
      'lien-quan': [0, 1], 'electric-fish': [1, 1], 'remnants-of-a-dream': [2, 1], 'soda-coast': [3, 1],
      'soft-hours-lonely-lands': [0, 2], 'mission-impassible': [1, 2], halide: [2, 2], mistchild: [3, 2],
    });
  });

  // (owner 2026-09-28: "The verticle pane must be bigger and larger, as they are allowed to run irregular sizing")
  it('CH·02: the four landscape films 2 × 2, GALAXY standing the height of both rows at their right', () => {
    expect(cells('machine')).toEqual({
      katara: [0, 0], 'the-father': [1, 0], 'galaxy-z-fold-8-ultra': [2, 0],
      'forest-onsen': [0, 1], 'jaecoo-j5': [1, 1],
    });
    expect(placedOf('machine').filter((p) => p.tall).map((p) => p.slug)).toEqual(['galaxy-z-fold-8-ultra']);
  });

  it('projects.json is valid: CH·01 holds 12 films (6 featured), CH·02 5 (all featured): 17 in all', () => {
    const films = parseProjects(rawProjects());
    const human = films.filter((p) => p.category === 'human');
    const machine = films.filter((p) => p.category === 'machine');
    expect(machine).toHaveLength(5);
    expect(machine.filter((p) => p.tileSize === 'large')).toHaveLength(5);
    expect(human).toHaveLength(12);
    expect(human.filter((p) => p.tileSize === 'large')).toHaveLength(6);
    expect(films).toHaveLength(17);
  });

  it('the homepage has a first frame: a hero image or at least one loop', () => {
    // the poster falls back to the first loop's first frame, so either works
    const hasHero = ['jpg', 'jpeg', 'png', 'webp'].some((e) => existsSync(`${root}home/hero.${e}`));
    const hasLoop = loopCandidates().flat().some((c) => onDisk(c.url));
    expect(hasHero || hasLoop, 'home/hero.* or home/loop-N.*').toBe(true);
  });

  it("chapter 2's new webloops (owner 2026-09-28): JAECOO J5 4.46 s, FOREST ONSEN 9.875 s — faststart, light", () => {
    // FOREST ONSEN's source ends on one pure black frame (it flashed at every wrap): 238 frames cut to 237 at 24 fps
    for (const [slug, seconds] of [['jaecoo-j5', 4.463], ['forest-onsen', 9.875]] as const) {
      const f = mp4Facts(`${root}projects/${slug}/preview.mp4`);
      expect(f.seconds, `${slug} length`).toBeCloseTo(seconds, 2);
      // the index before the pictures: a pane starts playing before the whole file is in
      expect(f.boxes.indexOf('moov'), `${slug} faststart`).toBeGreaterThanOrEqual(0);
      expect(f.boxes.indexOf('moov'), `${slug} faststart`).toBeLessThan(f.boxes.indexOf('mdat'));
      expect(f.bytes, `${slug} weight`).toBeLessThan(3 * 1024 * 1024);
    }
  });

  it('every project folder has its required media', () => {
    const projects = parseProjects(rawProjects());
    for (const p of projects) {
      expect(existsSync(`${root}projects/${p.slug}/poster.jpg`), `${p.slug} poster`).toBe(true);
      // the pane loop can live under ANY video filename (the manifest lists it)
      const folderVideos = pickLoopFiles(
        readdirSync(`${root}projects/${p.slug}`),
        p.film?.type === 'local' ? [p.film.src] : [],
      );
      expect(folderVideos.length > 0, `${p.slug} loop clip (any video file)`).toBe(true);
      for (const s of p.stills)
        expect(existsSync(`${root}projects/${p.slug}/stills/${s}`), `${p.slug} still ${s}`).toBe(true);
      if (p.film?.type === 'local')
        expect(existsSync(`${root}projects/${p.slug}/${p.film.src}`), `${p.slug} local film`).toBe(true);
    }
  });
});
