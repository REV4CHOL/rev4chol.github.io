import { describe, expect, it } from 'vitest';
import type { Project } from '../src/lib/content';
import { readFileSync } from 'node:fs';
import { CHANNELS, channelFromSearch, channelProjects } from '../src/works/channels';

const proj = (slug: string, category: 'human' | 'machine'): Project => ({
  slug,
  title: slug,
  year: 2026,
  role: '',
  runtime: '',
  client: '',
  short: '',
  tags: [],
  accent: '#C8FF00',
  tileSize: 'normal',
  aspect: '16:9',
  filmPending: false,
  category,
  synopsis: '',
  credits: [],
  film: null,
  stills: [],
  position: null,
});

describe('the two channels', () => {
  it('broadcasts exactly CH·01 human and CH·02 machine', () => {
    expect(CHANNELS.map((c) => c.key)).toEqual(['human', 'machine']);
    expect(CHANNELS[0].name).toBe('COLORIST'); // (owner 2026-09-26: chapter 1 is COLORIST, chapter 2 is AI)
    expect(CHANNELS[1].name).toBe('AI');
    expect(CHANNELS.map((c) => c.index)).toEqual(['CH·01', 'CH·02']);
  });

  it('filters the floor by category, preserving json order', () => {
    const all = [proj('a', 'human'), proj('b', 'machine'), proj('c', 'human'), proj('d', 'machine')];
    expect(channelProjects(all, 'human').map((p) => p.slug)).toEqual(['a', 'c']);
    expect(channelProjects(all, 'machine').map((p) => p.slug)).toEqual(['b', 'd']);
  });

  it('tunes from the url, defaulting to CH·01 on anything unknown', () => {
    expect(channelFromSearch('?ch=machine')).toBe('machine');
    expect(channelFromSearch('?ch=human')).toBe('human');
    expect(channelFromSearch('?ch=MACHINE')).toBe('human'); // exact key only
    expect(channelFromSearch('?ch=junk')).toBe('human');
    expect(channelFromSearch('')).toBe('human');
  });
});

describe('a chapter name reads bigger than its label (owner: "the AI must be bigger than ch02 on top. Same goes for COLORIST" — then, of 40 px names: "too damn big")', () => {
  const css = readFileSync('src/styles/components.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); // (comments out: a selector reads clean)
  const blocks = (sel: string) =>
    [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter((m) => m[1].split(',').some((s) => s.trim() === sel))
      .map((m) => m[2]);

  it('sets the name in the label\'s own type times --ch-k — bigger letters, not a wide-as-the-label giant', () => {
    const k = Number(/--ch-k:\s*([\d.]+)/.exec(blocks('.ch-switch').join(''))?.[1]);
    expect(k).toBeGreaterThanOrEqual(2.2); // AI's letters stand well over CH·02's (16 px was the owner's fear)
    expect(k).toBeLessThanOrEqual(2.8); // …and nowhere near the 4x (40 px) the width rule forced
    expect(blocks('.ch-idx').join('')).toMatch(/font-size:\s*calc\(var\(--t-2xs\) \* var\(--uiz\)\)/);
  });

  it('holds on every screen: one font-size for the name, tied to the label, no phone override, no measured scale', () => {
    const sizes = blocks('.ch-name').flatMap((b) => [...b.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim()));
    expect(sizes).toEqual(['calc(var(--t-2xs) * var(--ch-k) * var(--uiz))']);
    expect(css).not.toMatch(/--ch-scale/);
  });
});
