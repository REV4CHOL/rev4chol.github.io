import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isBlank, parseFloor, parseJson, parseProjects, parseSite } from '../src/lib/content';
import { loopCandidates } from '../src/home/loops';
import { pickLoopFiles } from '../src/lib/loop-files';
import { layoutProjects } from '../src/works/layout';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const read = (f: string) => readFileSync(root + f, 'utf8');
const onDisk = (url: string) => existsSync(root + url.replace('/content/', ''));
const rawProjects = () => parseJson(read('projects.json'), 'projects.json');

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
    // (first to SODIUM HAZE's place, json 24; then the owner, the same day: "move SODA COAST to RUST CHOIR")
    expect(floor.findIndex((it) => it.slug === 'soda-coast')).toBe(16);
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
  // `slot` is the json position — the floor's stream order, held places included
  const BATCH = [
    { slug: 'the-father', slot: 4, was: 'void-cartography', title: 'The Father', year: 2026, role: 'Colorist', runtime: '2:27',
      tags: ['slice of life'], synopsis: 'A father hiding secrets from his own daughter.', category: 'machine',
      tileSize: 'large', aspect: '16:9', youtube: 'Idreboecojw', stills: 23 },
    { slug: 'halide', slot: 31, was: 'paper-lantern-war', title: 'HALIDE', year: 2026, role: 'Director / Colorist / Editor', runtime: '1:06',
      tags: ['experimental'], synopsis: 'Whiter dreams and whiter lives.', category: 'human',
      tileSize: 'normal', aspect: '2.39:1', youtube: 'dMbsrk9Eeiw', stills: 29 },
    // (the owner, mid-build: "MIST CHILD must be MISTCHILD" — one word, as its YouTube title has it;
    //  and after: "mistchild is 2025", as its folder says — the brief's 2026 was a slip)
    // (…and on 2026-09-27 the owner moved it to NEON LITURGY's corner — a swap: json 18 ↔ 32)
    { slug: 'mistchild', slot: 18, was: 'low-tide-gospel', title: 'MISTCHILD', year: 2025, role: 'Director / Colorist / Editor', runtime: '0:47',
      tags: ['experimental'], synopsis: 'The child must have felt so lonely, in the mist.', category: 'human',
      tileSize: 'normal', aspect: '2.39:1', youtube: 'dyqpjo4eKJI', stills: 16 },
  ];

  // the owner's third batch (2026-09-27): FOREST ONSEN into TENDER MACHINES' place; SOFT HOURS & LONELY LANDS
  // "at the pane where SODA COAST just left"; "ĂN HỎI" CEREMONY into the "upper blank space", featured.
  // The owner's text verbatim — straight quotes, the ampersand, the diacritics (NFC), the curly apostrophe.
  const BATCH3 = [
    { slug: 'forest-onsen', slot: 5, where: 'takes TENDER MACHINES\' featured place in CH·02',
      title: 'FOREST ONSEN - Ecopark\'s Eco Retreat Commercial', year: 2026, role: 'AI Lead / Colorist', runtime: '0:47',
      tags: ['real estate', 'tv commercial'], synopsis: 'Change your life’s experience, with Forest Onsen.', category: 'machine',
      tileSize: 'large', aspect: '16:9', youtube: '5drz5nwLdKM', stills: 10 },
    { slug: 'soft-hours-lonely-lands', slot: 24, where: 'takes the pane SODA COAST left',
      title: 'Soft Hours & Lonely Lands', year: 2025, role: 'Director / Colorist / Editor / Sound Designer', runtime: '1:46',
      tags: ['experimental'],
      synopsis: 'The stillness of ordinary moments, in familiar places that feel strangely distant, with the extraordinary emotions for the empty spaces.',
      category: 'human', tileSize: 'normal', aspect: '2.39:1', youtube: 'G_wItkJWT2o', stills: 36 },
    { slug: 'an-hoi', slot: 12, where: 'fills the upper held place, featured',
      title: '"Ăn Hỏi" Ceremony', year: 2026, role: 'Director / Colorist / Editor / Sound Designer', runtime: '3:17',
      tags: ['experimental', 'slice of life'],
      synopsis: 'Gathering together, saying the first words, for their time spent together for all eternity.',
      category: 'human', tileSize: 'large', aspect: '4:3', youtube: 'XKkHkLVUC40', stills: 35 },
  ];

  for (const f of BATCH3) it(`${f.title.toUpperCase()} ${f.where}, linked, with its media (owner 2026-09-27)`, () => {
    checkFilm(f);
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
  //  SODA COAST just left", "ĂN HỎI" CEREMONY into the "upper blank space")
  it('the CH·01 moves: FAR EAST ↔ COPPER LULLABY, SODA COAST in RUST CHOIR\'s place; one held place left', () => {
    const floor = parseFloor(rawProjects());
    expect(floor).toHaveLength(40);
    expect(floor.filter(isBlank)).toHaveLength(1);
    expect(floor[25]).toEqual({ blank: true, slug: 'blank-25', category: 'human', tileSize: 'large', position: null });
    const slot = (i: number) => [floor[i].slug, floor[i].tileSize];
    expect(slot(9)).toEqual(['far-east', 'normal']); // COPPER LULLABY's place, top row
    expect(slot(27)).toEqual(['copper-lullaby', 'normal']); // …which takes FAR EAST's old one: a swap
    expect(slot(16)).toEqual(['soda-coast', 'normal']); // RUST CHOIR's place, top row
    for (const gone of ['sodium-haze', 'motel-eden', 'rust-choir', 'tender-machines']) {
      expect(floor.some((it) => it.slug === gone), gone).toBe(false);
      expect(existsSync(`${root}projects/${gone}`), `${gone} folder`).toBe(false);
    }
    // FAR EAST moves whole: only its place changed
    const fe = parseProjects(rawProjects()).find((p) => p.slug === 'far-east')!;
    expect(fe.film).toEqual({ type: 'youtube', src: 'https://www.youtube.com/embed/DrezQ5zlHqI' });
    expect([fe.title, fe.year, fe.aspect, fe.category]).toEqual(['FAR EAST', 2025, '2.39:1', 'human']);
  });

  // a chapter's floor as the layout lays it: slug → [column, row] on its 5 × 4 pane grid
  const cells = (category: 'human' | 'machine') => {
    const items = parseFloor(rawProjects()).filter((it) => it.category === category);
    const placed = layoutProjects(items.map((it) => ({ slug: it.slug, tileSize: it.tileSize, position: it.position })));
    const c0 = Math.min(...placed.map((p) => p.col));
    const r0 = Math.min(...placed.map((p) => p.row));
    return Object.fromEntries(placed.map((p) => [p.slug, [(p.col - c0) / 2, (p.row - r0) / 2]]));
  };

  it('CH·01 lies as the owner asked, cell by cell', () => {
    expect(cells('human')).toEqual({
      'glass-harvest': [0, 0], 'saline-throne': [1, 0], 'far-east': [2, 0], 'soda-coast': [3, 0], mistchild: [4, 0],
      'acid-pastoral': [0, 1], philia: [1, 1], 'mien-vien': [2, 1], 'an-hoi': [3, 1], 'soft-hours-lonely-lands': [4, 1],
      'gasoline-hymn': [0, 2], 'lien-quan': [1, 2], 'electric-fish': [2, 2], 'blank-25': [3, 2], 'copper-lullaby': [4, 2],
      'salt-cathedral': [0, 3], 'velvet-static': [1, 3], 'winter-arcade': [2, 3], halide: [3, 3], 'neon-liturgy': [4, 3],
    });
  });

  it('CH·02: FOREST ONSEN stands where TENDER MACHINES stood, in the featured cluster', () => {
    const at = cells('machine');
    expect(at['forest-onsen']).toEqual([1, 2]);
    expect([at['static-hymn'], at.katara, at['the-father']]).toEqual([[1, 1], [2, 1], [3, 1]]);
    expect([at['jaecoo-j5'], at['terminal-bloom']]).toEqual([[2, 2], [3, 2]]);
  });

  it('projects.json is valid: CH·02 holds 20 films (6 featured); CH·01 19 films (5 featured) and 1 held place', () => {
    const films = parseProjects(rawProjects());
    const human = films.filter((p) => p.category === 'human');
    const machine = films.filter((p) => p.category === 'machine');
    expect(machine).toHaveLength(20);
    expect(machine.filter((p) => p.tileSize === 'large')).toHaveLength(6);
    expect(human).toHaveLength(19);
    expect(human.filter((p) => p.tileSize === 'large')).toHaveLength(5);
    const humanFloor = parseFloor(rawProjects()).filter((it) => it.category === 'human');
    expect(humanFloor).toHaveLength(20); // still a full 5 × 4 floor
    expect(humanFloor.filter((it) => it.tileSize === 'large')).toHaveLength(6); // its cluster: 5 films + 1 held
  });

  it('the homepage has a first frame: a hero image or at least one loop', () => {
    // the poster falls back to the first loop's first frame, so either works
    const hasHero = ['jpg', 'jpeg', 'png', 'webp'].some((e) => existsSync(`${root}home/hero.${e}`));
    const hasLoop = loopCandidates().flat().some((c) => onDisk(c.url));
    expect(hasHero || hasLoop, 'home/hero.* or home/loop-N.*').toBe(true);
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
