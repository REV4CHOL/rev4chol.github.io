import { describe, expect, it } from 'vitest';
import type { Project } from '../src/lib/content';
import { CHANNELS, channelFromSearch, channelProjects, NAME_OVER_INDEX, nameScale } from '../src/works/channels';

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

describe('a chapter name reads bigger than its label (owner: "the AI must be bigger than ch02 on top. Same goes for COLORIST")', () => {
  it('leaves names that already span the ratio alone', () => {
    expect(nameScale([{ name: 90, index: 44 }])).toBe(1);
    expect(nameScale([{ name: 48.4, index: 44 }])).toBe(1); // exactly 1.1 times
  });

  it('grows a short name until it spans NAME_OVER_INDEX times its label (AI measured 19.1 under CH·02 at 44)', () => {
    expect(NAME_OVER_INDEX).toBeGreaterThan(1);
    const s = nameScale([{ name: 19.1, index: 44 }]);
    expect(s).toBeCloseTo((NAME_OVER_INDEX * 44) / 19.1, 6);
    expect(19.1 * s).toBeGreaterThan(44); // wider than the label, not just taller
  });

  it('shares the largest need across the set, so the names stay one size', () => {
    const s = nameScale([{ name: 90, index: 44 }, { name: 19.1, index: 44 }]);
    expect(s).toBeCloseTo(nameScale([{ name: 19.1, index: 44 }]), 9);
    expect(90 * s).toBeGreaterThan(19.1 * s); // COLORIST keeps its lead at the shared size
  });

  it('ignores what it cannot measure (fonts not in, a hidden dial)', () => {
    expect(nameScale([])).toBe(1);
    expect(nameScale([{ name: 0, index: 44 }])).toBe(1);
    expect(nameScale([{ name: 19.1, index: 0 }])).toBe(1);
    expect(nameScale([{ name: Number.NaN, index: 44 }, { name: 19.1, index: 44 }])).toBeCloseTo((NAME_OVER_INDEX * 44) / 19.1, 6);
  });
});
