import type { Project } from '../lib/content';

/** The floor broadcasts on two channels. Same floor, different films. */
export type ChannelKey = 'human' | 'machine';

export interface Channel {
  key: ChannelKey;
  index: string;
  name: string;
}

export const CHANNELS: Channel[] = [
  { key: 'human', index: 'CH·01', name: 'MORE HUMAN THAN HUMAN' },
  { key: 'machine', index: 'CH·02', name: 'THINKING MACHINES' },
];

export function channelProjects(all: Project[], key: ChannelKey): Project[] {
  return all.filter((p) => p.category === key);
}

/** ?ch=machine tunes CH·02; anything else (or nothing) is CH·01. */
export function channelFromSearch(search: string): ChannelKey {
  return new URLSearchParams(search).get('ch') === 'machine' ? 'machine' : 'human';
}
