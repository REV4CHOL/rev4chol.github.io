/** THE HOLD (owner, 2026-11-25: "force the Player to always play at 2160p no matter what"; told that no command does
 *  it and shown three ways, they chose "Wait, then start sharp"). A YouTube player picks its level by itself. Measured
 *  headless on the live site (XIEU LONG, KATARA), the big frame in place:
 *  - left alone, a film plays 360p or 480p for about its first 10 s (those seconds are loaded low before the player
 *    moves up); the player SAYS 2160p after 3 to 6 s; the picture is 2160p from about 10 to 12 s;
 *  - a seek does not help (to where the film stands, or back to its start: the low seconds play again); pausing does
 *    not either (paused at 0.35 s with 20 s loaded at 360p, the level never rose in 26 s);
 *  - the same film loaded again in the same player (`loadVideoById`) once it says 2160p plays 2160p from its first
 *    frame, within 0.25 s; under the browser's own autoplay rules it plays, with its sound (muted for the wait,
 *    unmuted with the reload).
 *  So at a film's first start the page silences it and covers it (player-bar.ts), waits for the level to rise, loads
 *  the film again and uncovers it as it starts over. The player still chooses by the visitor's line: a level that
 *  rises only part of the way is taken as it is, and one that never rises starts over from what is loaded.
 *  This is the one time the page paints over the player (the owner's choice, 2026-11-25). */

import type { PartInfo } from './parts';

/** the longest wait for the level to rise */
export const HOLD_MS = 10000;
/** a level above the first but under 2160p: this long for a further step before it is taken */
export const HOLD_SETTLE_MS = 1200;
/** the film asked for again: uncovered after this long whatever the player says */
export const HOLD_RELOAD_MS = 5000;
/** a time this near the film's start, said after the ask, is the film starting over */
export const HOLD_NEAR_S = 2.5;

const ORDER = ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'hd2880', 'highres'];
const SHARP = ORDER.indexOf('hd2160');
const WORDS: Record<string, string> = {
  hd2880: '2880P', hd2160: '2160P', hd1440: '1440P', hd1080: '1080P', hd720: '720P', large: '480P', medium: '360P', small: '240P', tiny: '144P',
};

/** A level's place among the levels (-1 for none, or one the player has not named: 'unknown', 'auto'). */
export function levelRank(q: string | null | undefined): number {
  return q ? ORDER.indexOf(q) : -1;
}
const named = (q: string | null): string | null => (levelRank(q) >= 0 ? q : null);

/** Where the hold runs: Chrome's engine, where it was measured. Safari and Firefox start as before (not proven there:
 *  whether a film loaded again plays, and with its sound, without a new press); `?hold=1` turns it on anywhere, to
 *  try it on a screen that could not be measured. (Android and the iPhone keep YouTube's own player: frame-size.ts.) */
export function holdWanted(userAgent: string, search = ''): boolean {
  if (/[?&]hold=1(&|$)/.test(search)) return true;
  return /\bChrome\/\d/.test(userAgent);
}

export interface Hold {
  /** waiting for the level to rise, or the film asked for again and not yet seen starting over */
  step: 'waiting' | 'reloading';
  /** when this step began (performance.now) */
  since: number;
  /** the page took the film's sound for the wait (the visitor had not muted it) */
  silenced: boolean;
  /** the first level the player named in this hold, the one it names now, and when that last changed */
  first: string | null;
  level: string | null;
  levelAt: number;
  /** after the ask: the player has been seen leaving its playing state (starting over) */
  restarted: boolean;
}

/** A film's first start: the wait begins. */
export function holdStart(info: PartInfo, now: number): Hold {
  const level = named(info.level);
  return { step: 'waiting', since: now, silenced: !info.muted, first: level, level, levelAt: now, restarted: false };
}

/** The hold with the player's latest word in it. */
export function holdSee(h: Hold, info: PartInfo, now: number): Hold {
  let next = h;
  const level = named(info.level);
  if (level !== null && level !== h.level) next = { ...next, first: h.first ?? level, level, levelAt: now };
  if (h.step === 'reloading' && !h.restarted && info.state !== null && info.state !== 1) next = { ...next, restarted: true };
  return next;
}

/** wait on; load the film again (its level rose); start it over from what is loaded (it never rose, it started sharp,
 *  or it ended under the cover); uncover it */
export type HoldAsk = 'wait' | 'reload' | 'restart' | 'release';

export function holdNext(h: Hold, info: PartInfo, now: number): HoldAsk {
  if (h.step === 'waiting') {
    if (info.state === 0) return 'restart';
    const r = levelRank(h.level), r0 = levelRank(h.first);
    if (r >= SHARP) return r0 >= SHARP ? 'restart' : 'reload';
    const rose = r0 >= 0 && r > r0;
    if (rose && now - h.levelAt >= HOLD_SETTLE_MS) return 'reload';
    if (now - h.since >= HOLD_MS) return rose ? 'reload' : 'restart';
    return 'wait';
  }
  if (info.state === 1 && (h.restarted || (info.at >= h.since && info.time < HOLD_NEAR_S))) return 'release';
  if (now - h.since >= HOLD_RELOAD_MS) return 'release';
  return 'wait';
}

/** The hold once the film has been asked for again. */
export function holdAsked(h: Hold, now: number): Hold {
  return { ...h, step: 'reloading', since: now, restarted: false };
}

/** What the page asks of the player: the same film from its start (loaded again, or started over from what is
 *  loaded), then its sound back if the page took it. In that order: measured, the film loaded again was playing with
 *  its sound 0.19 s later. A film whose id cannot be read is started over. */
export function holdCommands(ask: 'reload' | 'restart', id: string, silenced: boolean): [string, unknown[]][] {
  const back: [string, unknown[]][] = ask === 'reload' && id ? [['loadVideoById', [id, 0]]] : [['seekTo', [0, true]], ['playVideo', []]];
  return silenced ? [...back, ['unMute', []]] : back;
}

/** The hold in the player's record (lib/player-record.ts): how long, and how it ended (`skip`: the visitor pressed
 *  the cover or the bar and did not wait). */
export function holdSaid(how: 'reload' | 'restart' | 'skip', ms: number, level: string | null): string {
  const held = `HELD ${(ms / 1000).toFixed(1)} S`;
  const word = (level && WORDS[level]) || null;
  if (how === 'skip') return `${held} · THE VISITOR PRESSED ON`;
  if (how === 'reload') return `${held} · LOADED AGAIN${word ? ` AT ${word}` : ''}`;
  return `${held} · ITS LEVEL DID NOT RISE${word ? ` (${word})` : ''}`;
}

/** THE SOUND THE PAGE TOOK IS NEVER LEFT TAKEN: a visitor who leaves in the middle of a wait leaves the player muted
 *  by the page, and the player may remember that for its next load. The page keeps a note while it holds a film's
 *  sound; a note found at the next load means the sound is given back as the player answers. A store that throws is
 *  no note. */
const HOLD_KEY = 'rvl-hold-v1';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function silenceNote(store: Store | null, on: boolean): void {
  try {
    if (on) store?.setItem(HOLD_KEY, '1');
    else store?.removeItem(HOLD_KEY);
  } catch { /* no note */ }
}
export function silenceLeft(store: Store | null): boolean {
  try {
    return store?.getItem(HOLD_KEY) === '1';
  } catch {
    return false;
  }
}
