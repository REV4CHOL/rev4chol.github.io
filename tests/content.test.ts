import { describe, expect, it } from 'vitest';
import {
  ContentError,
  getSlugFromSearch,
  loopSrcChain,
  parseJson,
  parseProjects,
  parseSite,
  projectAssetUrl,
} from '../src/lib/content';

const validProject = () => ({
  slug: 'neon-dream',
  title: 'Neon Dream',
  year: 2025,
  role: 'Director / DoP',
  runtime: '12:40',
  tags: ['short film'],
  accent: '#C8FF00',
  tileSize: 'large',
  synopsis: 'A courier crosses the city.',
  credits: [{ role: 'Director', name: 'Revachol' }],
  film: { type: 'vimeo', src: 'https://vimeo.com/76979871' },
  stills: ['01.jpg', '02.jpg'],
  position: { col: 0, row: 0 },
});

const validSite = () => ({
  name: 'REVACHOL',
  tagline: 'cinematic filmmaker',
  email: 'mail@example.com',
  nav: [
    { label: 'HOMEPAGE', href: '/index.html' },
    { label: 'WORK', href: '/works.html' },
  ],
  socials: [{ label: 'INSTAGRAM', href: 'https://instagram.com/x' }],
});

describe('parseSite', () => {
  it('accepts a full valid site', () => {
    const s = parseSite(validSite());
    expect(s.name).toBe('REVACHOL');
    expect(s.nav).toHaveLength(2);
    expect(s.socials[0].label).toBe('INSTAGRAM');
  });

  it('defaults tagline, email, socials', () => {
    const s = parseSite({ name: 'X', nav: [{ label: 'A', href: '/a' }] });
    expect(s.tagline).toBe('');
    expect(s.email).toBe('');
    expect(s.socials).toEqual([]);
  });

  it('rejects missing name and empty nav', () => {
    expect(() => parseSite({ nav: [{ label: 'A', href: '/a' }] })).toThrow(ContentError);
    expect(() => parseSite({ name: 'X', nav: [] })).toThrow(/nav/);
  });
});

describe('parseProjects', () => {
  it('accepts a full valid project', () => {
    const [p] = parseProjects([validProject()]);
    expect(p.slug).toBe('neon-dream');
    expect(p.tileSize).toBe('large');
    expect(p.film).toEqual({ type: 'vimeo', src: 'https://vimeo.com/76979871' });
    expect(p.position).toEqual({ col: 0, row: 0 });
  });

  it('fills defaults for optional fields', () => {
    const [p] = parseProjects([{ slug: 'a-b', title: 'AB', year: 2024 }]);
    expect(p.role).toBe('');
    expect(p.runtime).toBe('');
    expect(p.tags).toEqual([]);
    expect(p.accent).toBe('#C8FF00');
    expect(p.tileSize).toBe('normal');
    expect(p.credits).toEqual([]);
    expect(p.film).toBeNull();
    expect(p.stills).toEqual([]);
    expect(p.position).toBeNull();
  });

  it('rejects bad slugs, duplicate slugs, bad accent, bad year, bad film type, bad tileSize', () => {
    expect(() => parseProjects([{ ...validProject(), slug: 'Neon Dream' }])).toThrow(/slug/);
    expect(() => parseProjects([validProject(), validProject()])).toThrow(/duplicate/);
    expect(() => parseProjects([{ ...validProject(), accent: 'green' }])).toThrow(/accent/);
    expect(() => parseProjects([{ ...validProject(), year: 'yesterday' }])).toThrow(/year/);
    expect(() => parseProjects([{ ...validProject(), film: { type: 'dvd', src: 'x' } }])).toThrow(/film.type/);
    expect(() => parseProjects([{ ...validProject(), tileSize: 'huge' }])).toThrow(/tileSize/);
  });

  it('rejects non-array root and empty array', () => {
    expect(() => parseProjects({})).toThrow(/array/);
    expect(() => parseProjects([])).toThrow(/at least one/);
  });

  it('names the offending project in the error', () => {
    try {
      parseProjects([{ ...validProject(), year: -1 }]);
      expect.unreachable();
    } catch (e) {
      expect((e as ContentError).message).toContain('neon-dream');
    }
  });
});

describe('parseJson', () => {
  it('wraps syntax errors as ContentError with the file name', () => {
    try {
      parseJson('{ "a": ', 'projects.json');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ContentError);
      expect((e as ContentError).file).toBe('projects.json');
      expect((e as ContentError).detail).toContain('JSON');
    }
  });
});

describe('helpers', () => {
  it('builds asset urls', () => {
    expect(projectAssetUrl('neon-dream', 'preview.mp4')).toBe('/content/projects/neon-dream/preview.mp4');
  });

  it('aspect: defaults 16:9, accepts 4:3, rejects junk', () => {
    expect(parseProjects([validProject()])[0].aspect).toBe('16:9');
    expect(parseProjects([{ ...validProject(), aspect: '4:3' }])[0].aspect).toBe('4:3');
    expect(() => parseProjects([{ ...validProject(), aspect: 'wide' }])).toThrow(ContentError);
  });

  it('loop chain: preview.mp4 first, then the loop spellings — pane and hero share it', () => {
    expect(loopSrcChain('x')).toEqual([
      '/content/projects/x/preview.mp4',
      '/content/projects/x/loop.mp4',
      '/content/projects/x/loop_1.mp4',
      '/content/projects/x/loop-1.mp4',
    ]);
  });

  it('reads slug from search strings', () => {
    expect(getSlugFromSearch('?p=neon-dream')).toBe('neon-dream');
    expect(getSlugFromSearch('?x=1')).toBeNull();
    expect(getSlugFromSearch('')).toBeNull();
  });
});
