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

  it('SODA COAST: the owner\'s scope film, linked — since 2026-09-27 a regular pane in SODIUM HAZE\'s place', () => {
    const projects = parseProjects(rawProjects());
    const floor = parseFloor(rawProjects());
    expect(projects.some((p) => p.slug === 'vhs-eden')).toBe(false);
    expect(floor.findIndex((it) => it.slug === 'soda-coast')).toBe(24);
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
    { slug: 'mistchild', slot: 32, was: 'low-tide-gospel', title: 'MISTCHILD', year: 2025, role: 'Director / Colorist / Editor', runtime: '0:47',
      tags: ['experimental'], synopsis: 'The child must have felt so lonely, in the mist.', category: 'human',
      tileSize: 'normal', aspect: '2.39:1', youtube: 'dyqpjo4eKJI', stills: 16 },
  ];

  for (const f of BATCH) it(`${f.title.toUpperCase()} takes ${f.was}'s slot, linked, with its media (owner 2026-09-26)`, () => {
    const projects = parseProjects(rawProjects());
    expect(projects.some((p) => p.slug === f.was)).toBe(false);
    expect(existsSync(`${root}projects/${f.was}`)).toBe(false);
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
  });

  // (owner 2026-09-27: "move Soda Coast to Sodium Haze / And Far East to Motel Eden / Then leave the
  //  original panes as they left blank, i am about to fill in two more to those two positions")
  it('SODA COAST and FAR EAST take SODIUM HAZE\'s and MOTEL EDEN\'s places; two held places keep theirs', () => {
    const floor = parseFloor(rawProjects());
    expect(floor).toHaveLength(40);
    expect(floor.filter(isBlank)).toHaveLength(2);
    expect(floor[12]).toEqual({ blank: true, slug: 'blank-12', category: 'human', tileSize: 'large', position: null });
    expect(floor[25]).toEqual({ blank: true, slug: 'blank-25', category: 'human', tileSize: 'large', position: null });
    expect([floor[24].slug, floor[24].tileSize]).toEqual(['soda-coast', 'normal']);
    expect([floor[27].slug, floor[27].tileSize]).toEqual(['far-east', 'normal']);
    for (const gone of ['sodium-haze', 'motel-eden']) {
      expect(floor.some((it) => it.slug === gone), gone).toBe(false);
      expect(existsSync(`${root}projects/${gone}`), `${gone} folder`).toBe(false);
    }
    // FAR EAST moves whole: only its size changed
    const fe = parseProjects(rawProjects()).find((p) => p.slug === 'far-east')!;
    expect(fe.film).toEqual({ type: 'youtube', src: 'https://www.youtube.com/embed/DrezQ5zlHqI' });
    expect([fe.title, fe.year, fe.aspect, fe.category]).toEqual(['FAR EAST', 2025, '2.39:1', 'human']);
  });

  it('CH·01 lies as the owner asked: the held places where the two stood, the two just right of them, the rest unmoved', () => {
    const human = parseFloor(rawProjects()).filter((it) => it.category === 'human');
    const placed = layoutProjects(human.map((it) => ({ slug: it.slug, tileSize: it.tileSize, position: it.position })));
    const c0 = Math.min(...placed.map((p) => p.col));
    const r0 = Math.min(...placed.map((p) => p.row));
    const at = new Map(placed.map((p) => [p.slug, [(p.col - c0) / 2, (p.row - r0) / 2]]));
    expect(at.get('philia')).toEqual([1, 1]);
    expect(at.get('mien-vien')).toEqual([2, 1]);
    expect(at.get('blank-12')).toEqual([3, 1]); // where SODA COAST stood
    expect(at.get('soda-coast')).toEqual([4, 1]); // where SODIUM HAZE stood
    expect(at.get('lien-quan')).toEqual([1, 2]);
    expect(at.get('electric-fish')).toEqual([2, 2]);
    expect(at.get('blank-25')).toEqual([3, 2]); // where FAR EAST stood
    expect(at.get('far-east')).toEqual([4, 2]); // where MOTEL EDEN stood
    expect(at.get('glass-harvest')).toEqual([0, 0]);
    expect(at.get('acid-pastoral')).toEqual([0, 1]);
    expect(at.get('gasoline-hymn')).toEqual([0, 2]);
    expect(at.get('mistchild')).toEqual([4, 3]);
  });

  it('projects.json is valid: CH·02 holds 20 films (6 featured); CH·01 18 films (4 featured) and 2 held places', () => {
    const films = parseProjects(rawProjects());
    const human = films.filter((p) => p.category === 'human');
    const machine = films.filter((p) => p.category === 'machine');
    expect(machine).toHaveLength(20);
    expect(machine.filter((p) => p.tileSize === 'large')).toHaveLength(6);
    expect(human).toHaveLength(18);
    expect(human.filter((p) => p.tileSize === 'large')).toHaveLength(4);
    const humanFloor = parseFloor(rawProjects()).filter((it) => it.category === 'human');
    expect(humanFloor).toHaveLength(20); // still a full 5 × 4 floor
    expect(humanFloor.filter((it) => it.tileSize === 'large')).toHaveLength(6); // its cluster: 4 films + 2 held
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
