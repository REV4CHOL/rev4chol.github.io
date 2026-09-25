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

  it('SODA COAST holds VHS EDEN\'s slot in chapter 1, with its scope media (owner 2026-09-26)', () => {
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
    expect(p.film).toBeNull();
    expect(p.filmPending).toBe(true); // no link yet: WATCH shows, greyed
    const dir = `${root}projects/soda-coast/`;
    expect(existsSync(`${dir}poster.jpg`)).toBe(true);
    expect(existsSync(`${dir}preview.mp4`)).toBe(true);
    const stills = readdirSync(`${dir}stills`).sort();
    expect(stills).toHaveLength(51);
    expect(stills[0]).toBe('01.jpg');
    expect(stills[50]).toBe('51.jpg');
    expect(existsSync(`${root}projects/vhs-eden`)).toBe(false);
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
