import { describe, expect, it } from 'vitest';
import type { Project } from '../src/lib/content';
import { CHANNELS, channelFromSearch, channelProjects } from '../src/works/channels';

const proj = (slug: string, category: 'human' | 'machine'): Project => ({
  slug,
  title: slug,
  year: 2026,
  role: '',
  runtime: '',
  client: '',
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
    expect(CHANNELS[0].name).toBe('FOR NO MANKIND');
    expect(CHANNELS[1].name).toBe('THINKING MACHINES');
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
