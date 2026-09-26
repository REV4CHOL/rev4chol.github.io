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

/** One chapter's slice of any list that knows its channel — the films, or the
 *  floor's stream with its held places — in json order. */
export function channelProjects<T extends { category: ChannelKey }>(all: T[], key: ChannelKey): T[] {
  return all.filter((p) => p.category === key);
}

/** ?ch=machine tunes CH·02; anything else (or nothing) is CH·01. */
export function channelFromSearch(search: string): ChannelKey {
  return new URLSearchParams(search).get('ch') === 'machine' ? 'machine' : 'human';
}
