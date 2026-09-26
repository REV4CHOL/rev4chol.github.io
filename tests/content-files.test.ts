import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseJson, parseProjects, parseSite } from '../src/lib/content';
import { loopCandidates } from '../src/home/loops';
import { pickLoopFiles } from '../src/lib/loop-files';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const read = (f: string) => readFileSync(root + f, 'utf8');
const onDisk = (url: string) => existsSync(root + url.replace('/content/', ''));

describe('shipped content files', () => {
  it('site.json is valid', () => {
    const site = parseSite(parseJson(read('site.json'), 'site.json'));
    expect(site.name).toBe('REVACHOL');
    expect(site.nav.map((n) => [n.label, n.href])).toEqual([
      ['HOMEPAGE', '/index.html'],
      ['ABOUT', '/about.html'],
      ['WORK', '/works.html'],
      ['CONTACT', '/contact.html'],
      ['STORY', '/story.html'],
    ]); // the chain IS the menu order: ABOUT between HOMEPAGE and WORK, STORY at the far right
  });

  it('the homepage roles open with the AI generalist, the colorist next (owner 2026-09-26)', () => {
    const site = parseSite(parseJson(read('site.json'), 'site.json'));
    const roles = site.tagline.split(/,\s*/).map((r) => r.trim().toLowerCase());
    expect(roles[0]).toBe('ai generalist');
    expect(roles[1]).toBe('colorist');
  });

  it('SODA COAST holds VHS EDEN\'s slot in chapter 1, with its scope media and its link (owner 2026-09-26)', () => {
    const projects = parseProjects(parseJson(read('projects.json'), 'projects.json'));
    expect(projects.some((p) => p.slug === 'vhs-eden')).toBe(false);
    const i = projects.findIndex((p) => p.slug === 'soda-coast');
    expect(i).toBe(12);
    const p = projects[i];
    expect(p.title).toBe('Soda Coast');
    expect(p.year).toBe(2025);
    expect(p.role).toBe('Director / Colorist / Editor / Sound Designer');
    expect(p.runtime).toBe('1:56');
    expect(p.tags).toEqual(['experimental', 'supernatural']);
    expect(p.synopsis).toBe('I see summer. And then the sea.');
    // (the owner's correction the same day: the ghost line is PHILIA's, the chapter's other real film)
    expect(projects.find((q) => q.slug === 'philia')!.synopsis).toBe('A ghost of the past, the present and the future.');
    expect(p.category).toBe('human');
    expect(p.tileSize).toBe('large');
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

  // the owner's second batch (2026-09-26): three films into three placeholders' slots, each linked
  const BATCH = [
    { slug: 'the-father', slot: 4, was: 'void-cartography', title: 'The Father', role: 'Colorist', runtime: '2:27',
      tags: ['slice of life'], synopsis: 'A father hiding secrets from his own daughter.', category: 'machine',
      tileSize: 'large', aspect: '16:9', youtube: 'Idreboecojw', stills: 23 },
    { slug: 'halide', slot: 31, was: 'paper-lantern-war', title: 'HALIDE', role: 'Director / Colorist / Editor', runtime: '1:06',
      tags: ['experimental'], synopsis: 'Whiter dreams and whiter lives.', category: 'human',
      tileSize: 'normal', aspect: '2.39:1', youtube: 'dMbsrk9Eeiw', stills: 29 },
    // (the owner, mid-build: "MIST CHILD must be MISTCHILD" — one word, as its YouTube title has it)
    { slug: 'mistchild', slot: 32, was: 'low-tide-gospel', title: 'MISTCHILD', role: 'Director / Colorist / Editor', runtime: '0:47',
      tags: ['experimental'], synopsis: 'The child must have felt so lonely, in the mist.', category: 'human',
      tileSize: 'normal', aspect: '2.39:1', youtube: 'dyqpjo4eKJI', stills: 16 },
  ];

  for (const f of BATCH) it(`${f.title.toUpperCase()} takes ${f.was}'s slot, linked, with its media (owner 2026-09-26)`, () => {
    const projects = parseProjects(parseJson(read('projects.json'), 'projects.json'));
    expect(projects.some((p) => p.slug === f.was)).toBe(false);
    expect(existsSync(`${root}projects/${f.was}`)).toBe(false);
    const p = projects[f.slot];
    expect(p.slug).toBe(f.slug);
    expect(p.title).toBe(f.title);
    expect(p.year).toBe(2026);
    expect(p.role).toBe(f.role);
    expect(p.credits).toEqual([{ role: f.role, name: 'Revachol' }]); // no placeholder credit left behind
    expect(p.runtime).toBe(f.runtime);
    expect(p.tags).toEqual(f.tags);
    expect(p.synopsis).toBe(f.synopsis);
    expect(p.category).toBe(f.category);
    expect(p.tileSize).toBe(f.tileSize); // the slot's own size: each chapter keeps its six featured
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

  it('projects.json is valid: 20 films per channel, 6 featured each', () => {
    const projects = parseProjects(parseJson(read('projects.json'), 'projects.json'));
    const human = projects.filter((p) => p.category === 'human');
    const machine = projects.filter((p) => p.category === 'machine');
    expect(human).toHaveLength(20);
    expect(machine).toHaveLength(20);
    expect(human.filter((p) => p.tileSize === 'large')).toHaveLength(6);
    expect(machine.filter((p) => p.tileSize === 'large')).toHaveLength(6);
  });

  it('the homepage has a first frame: a hero image or at least one loop', () => {
    // the poster falls back to the first loop's first frame, so either works
    const hasHero = ['jpg', 'jpeg', 'png', 'webp'].some((e) => existsSync(`${root}home/hero.${e}`));
    const hasLoop = loopCandidates().flat().some((c) => onDisk(c.url));
    expect(hasHero || hasLoop, 'home/hero.* or home/loop-N.*').toBe(true);
  });

  it('every project folder has its required media', () => {
    const projects = parseProjects(parseJson(read('projects.json'), 'projects.json'));
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
