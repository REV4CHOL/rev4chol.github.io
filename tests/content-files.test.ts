import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loopSrcChain, parseJson, parseProjects, parseSite } from '../src/lib/content';
import { loopCandidates } from '../src/home/loops';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const read = (f: string) => readFileSync(root + f, 'utf8');
const onDisk = (url: string) => existsSync(root + url.replace('/content/', ''));

describe('shipped content files', () => {
  it('site.json is valid', () => {
    const site = parseSite(parseJson(read('site.json'), 'site.json'));
    expect(site.name).toBe('REVACHOL');
    expect(site.nav.length).toBe(4);
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
      expect(
        loopSrcChain(p.slug).some(onDisk),
        `${p.slug} loop clip (preview.mp4 or an accepted loop name)`,
      ).toBe(true);
      for (const s of p.stills)
        expect(existsSync(`${root}projects/${p.slug}/stills/${s}`), `${p.slug} still ${s}`).toBe(true);
      if (p.film?.type === 'local')
        expect(existsSync(`${root}projects/${p.slug}/${p.film.src}`), `${p.slug} local film`).toBe(true);
    }
  });
});
