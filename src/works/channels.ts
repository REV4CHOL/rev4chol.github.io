import type { Project } from '../lib/content';

/** The floor broadcasts on two channels. Same floor, different films. */
export type ChannelKey = 'human' | 'machine';

export interface Channel {
  key: ChannelKey;
  index: string;
  name: string;
}

export const CHANNELS: Channel[] = [
  { key: 'human', index: 'CH·01', name: 'COLORIST' },
  { key: 'machine', index: 'CH·02', name: 'AI' },
];
/** A chapter's name reads BIGGER than the CH·NN label over it (owner: "the AI must be bigger than ch02 on
 *  top. Same goes for COLORIST"): at its type size a two-letter name comes out narrower than the five-glyph
 *  mono label above it (AI measured 19 px under CH·02's 44), so the name's size floors where it spans this
 *  many times its label — wider as well as taller. */
export const NAME_OVER_INDEX = 1.1;

/** The factor a set of names must grow by so each spans at least `ratio` times its label — 1 when they all
 *  do. Widths are measured at the base size (type width is linear in its size, so the factor is exact); the
 *  set shares the largest need so its names stay one size. A width that cannot be measured (the fonts not
 *  in yet, a hidden dial) leaves the size alone. */
export function nameScale(pairs: { name: number; index: number }[], ratio = NAME_OVER_INDEX): number {
  let s = 1;
  for (const { name, index } of pairs) {
    if (!(name > 0) || !(index > 0)) continue;
    const need = (ratio * index) / name;
    if (need > s + 1e-9) s = need; // (a float hair over 1 is not a need)
  }
  return s;
}

export function channelProjects(all: Project[], key: ChannelKey): Project[] {
  return all.filter((p) => p.category === key);
}

/** ?ch=machine tunes CH·02; anything else (or nothing) is CH·01. */
export function channelFromSearch(search: string): ChannelKey {
  return new URLSearchParams(search).get('ch') === 'machine' ? 'machine' : 'human';
}
