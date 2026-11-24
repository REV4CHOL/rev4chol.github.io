import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  Hold, HOLD_MS, HOLD_NEAR_S, HOLD_RELOAD_MS, HOLD_SETTLE_MS, holdAsked, holdCommands, holdNext, holdSaid, holdSee, holdStart, holdWanted,
  levelRank, silenceLeft, silenceNote,
} from '../src/project/hold';
import { barView } from '../src/project/player-bar';
import { NO_INFO, PartInfo } from '../src/project/parts';
import { clearPlayerRecords, playerLine, playerRecords, recordPlayer } from '../src/lib/player-record';

// THE HOLD (owner, 2026-11-25: "force the Player to always play at 2160p no matter what"; told that no command does it
// and shown three ways, they chose "Wait, then start sharp"). Measured headless on the live site (XIEU LONG, KATARA):
//  - left alone, a film plays 360p or 480p for about its first 10 s (those seconds are loaded low before the player
//    moves up); the player SAYS 2160p after 3 to 6 s; the picture is 2160p from about 10 to 12 s;
//  - a seek does not help (to where the film stands, or back to its start: the low seconds play again);
//  - pausing does not help either (paused at 0.35 s, 20 s loaded at 360p, the level never rose in 26 s);
//  - the same film loaded again in the same player, once it says 2160p, plays 2160p from its first frame within
//    0.25 s (`loadVideoById`), and under the browser's own autoplay rules it plays with its sound (muted for the
//    wait, unmuted with the reload).
// So: at a film's first start the page silences it and covers it, waits for the level to rise, loads it again, and
// uncovers it as it starts over.

const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const EDGE = `${PC} Edg/142.0.0.0`;
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0';

const info = (over: Partial<PartInfo> = {}): PartInfo => ({ ...NO_INFO, started: true, state: 1, ...over });

describe('where the hold runs', () => {
  it("Chrome's engine, where it was measured", () => {
    expect(holdWanted(PC)).toBe(true);
    expect(holdWanted(EDGE)).toBe(true);
  });

  // (nothing of it is proven there: whether a film loaded again plays, and with its sound, without a new press)
  it('not Safari, not Firefox: they start as before', () => {
    expect(holdWanted(IPAD)).toBe(false);
    expect(holdWanted(FIREFOX)).toBe(false);
  });

  it('`?hold=1` turns it on anywhere, to try it on a screen that could not be measured', () => {
    expect(holdWanted(IPAD, '?p=katara&hold=1')).toBe(true);
    expect(holdWanted(IPAD, '?hold=1')).toBe(true);
    expect(holdWanted(IPAD, '?p=katara&hold=10')).toBe(false);
    expect(holdWanted(IPAD, '?p=hold=1x')).toBe(false);
  });
});

describe('the levels in order', () => {
  it('2160p stands above 1440p, 480p above 360p; a level never heard of is none', () => {
    expect(levelRank('hd2160')).toBeGreaterThan(levelRank('hd1440'));
    expect(levelRank('large')).toBeGreaterThan(levelRank('medium'));
    expect(levelRank('hd2880')).toBeGreaterThan(levelRank('hd2160'));
    expect(levelRank('unknown')).toBe(-1);
    expect(levelRank(null)).toBe(-1);
  });
});

describe('the wait', () => {
  it('begins at the first start: the film is silenced unless the visitor had it muted already', () => {
    expect(holdStart(info({ level: 'medium' }), 1000)).toMatchObject({ step: 'waiting', since: 1000, silenced: true, first: 'medium', level: 'medium' });
    expect(holdStart(info({ muted: true }), 1000).silenced).toBe(false);
    // a level the player has not named yet is no level
    expect(holdStart(info({ level: 'unknown' }), 1000).first).toBeNull();
  });

  it('waits while the level stands where it started', () => {
    const h = holdStart(info({ level: 'medium' }), 0);
    expect(holdNext(h, info({ level: 'medium' }), 3000)).toBe('wait');
    expect(holdNext(h, info({ level: 'medium' }), HOLD_MS - 1)).toBe('wait');
  });

  it('2160p said: the film is loaded again, at once', () => {
    let h = holdStart(info({ level: 'large' }), 0);
    h = holdSee(h, info({ level: 'hd2160' }), 5256);
    expect(h).toMatchObject({ first: 'large', level: 'hd2160', levelAt: 5256 });
    expect(holdNext(h, info({ level: 'hd2160' }), 5256)).toBe('reload');
  });

  it('the first level is the first one named, when the film started before the player named any', () => {
    let h = holdStart(info({ level: null }), 0);
    h = holdSee(h, info({ level: 'medium' }), 300);
    expect(h.first).toBe('medium');
    h = holdSee(h, info({ level: 'hd2160' }), 4000);
    expect(holdNext(h, info({ level: 'hd2160' }), 4000)).toBe('reload');
  });

  // measured once: with two films streaming at once the player said 720p at 6 s and never moved again
  it('a level above the first but under 2160p: a moment more for a further step, then loaded again at that level', () => {
    let h = holdStart(info({ level: 'medium' }), 0);
    h = holdSee(h, info({ level: 'hd720' }), 6000);
    expect(holdNext(h, info({ level: 'hd720' }), 6000 + HOLD_SETTLE_MS - 1)).toBe('wait');
    expect(holdNext(h, info({ level: 'hd720' }), 6000 + HOLD_SETTLE_MS)).toBe('reload');
    h = holdSee(h, info({ level: 'hd2160' }), 6500);
    expect(holdNext(h, info({ level: 'hd2160' }), 6500)).toBe('reload');
  });

  it(`gives up after ${HOLD_MS / 1000} s: a level that never rose starts over from what is loaded, one that rose is loaded again`, () => {
    const h = holdStart(info({ level: 'medium' }), 0);
    expect(holdNext(h, info({ level: 'medium' }), HOLD_MS)).toBe('restart');
    const none = holdStart(info({ level: null }), 0);
    expect(holdNext(none, info({ level: null }), HOLD_MS)).toBe('restart');
    const up = holdSee(h, info({ level: 'hd1080' }), HOLD_MS - 200);
    expect(holdNext(up, info({ level: 'hd1080' }), HOLD_MS)).toBe('reload');
  });

  it('a film that starts sharp is not loaded again: only back to its first frame', () => {
    const h = holdStart(info({ level: 'hd2160' }), 0);
    expect(holdNext(h, info({ level: 'hd2160' }), 100)).toBe('restart');
  });

  it('a film shorter than the wait, ended under the cover: back to its first frame', () => {
    const h = holdStart(info({ level: 'medium' }), 0);
    expect(holdNext(h, info({ level: 'medium', state: 0 }), 4000)).toBe('restart');
  });

  it('a level going down is no rise', () => {
    let h = holdStart(info({ level: 'large' }), 0);
    h = holdSee(h, info({ level: 'medium' }), 2000);
    expect(holdNext(h, info({ level: 'medium' }), 2000 + HOLD_SETTLE_MS)).toBe('wait');
  });
});

describe('the film asked for again', () => {
  const again = (since: number): Hold => holdAsked(holdStart(info({ level: 'medium' }), 0), since);

  it('is uncovered when the player has been seen starting over and plays', () => {
    let h = again(5256);
    expect(holdNext(h, info({ state: 1, time: 5.6, at: 5200 }), 5300)).toBe('wait');
    h = holdSee(h, info({ state: 3 }), 5350);
    expect(h.restarted).toBe(true);
    expect(holdNext(h, info({ state: 3 }), 5350)).toBe('wait');
    expect(holdNext(h, info({ state: 1, time: 5.6, at: 5200 }), 5440)).toBe('release');
  });

  it('or when it says a time near its start, said after the ask (a seek back plays on without a new state)', () => {
    const h = again(8000);
    expect(holdNext(h, info({ state: 1, time: 7.9, at: 7900 }), 8100)).toBe('wait');
    expect(holdNext(h, info({ state: 1, time: 0.1, at: 8150 }), 8200)).toBe('release');
    expect(holdNext(h, info({ state: 1, time: HOLD_NEAR_S + 0.5, at: 8150 }), 8200)).toBe('wait');
  });

  it(`or after ${HOLD_RELOAD_MS / 1000} s, whatever the player says: the visitor is never left behind a cover`, () => {
    const h = again(5000);
    expect(holdNext(h, info({ state: -1 }), 5000 + HOLD_RELOAD_MS - 1)).toBe('wait');
    expect(holdNext(h, info({ state: -1 }), 5000 + HOLD_RELOAD_MS)).toBe('release');
    expect(holdNext(h, info({ state: 2 }), 5000 + HOLD_RELOAD_MS)).toBe('release');
  });
});

describe('what the page asks of the player', () => {
  it('loaded again: the same film from its start, then its sound back', () => {
    expect(holdCommands('reload', 'abc123', true)).toEqual([['loadVideoById', ['abc123', 0]], ['unMute', []]]);
  });

  it('the sound is given back only when the page took it', () => {
    expect(holdCommands('reload', 'abc123', false)).toEqual([['loadVideoById', ['abc123', 0]]]);
    expect(holdCommands('restart', 'abc123', false)).toEqual([['seekTo', [0, true]], ['playVideo', []]]);
  });

  it('started over from what is loaded: back to the first frame, playing, then its sound', () => {
    expect(holdCommands('restart', 'abc123', true)).toEqual([['seekTo', [0, true]], ['playVideo', []], ['unMute', []]]);
  });

  it('a film whose id cannot be read is started over, never loaded as nothing', () => {
    expect(holdCommands('reload', '', true)).toEqual([['seekTo', [0, true]], ['playVideo', []], ['unMute', []]]);
  });
});

// A visitor who leaves in the middle of a wait leaves the player muted by the page, and the player may remember it
// for its next load. The page keeps a note while it holds a film's sound, and gives the sound back when it finds
// the note at the next load.
describe('the sound the page took is never left taken', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
  };

  it('a note while the page holds the sound; gone when it gives it back', () => {
    const s = store();
    expect(silenceLeft(s)).toBe(false);
    silenceNote(s, true);
    expect(silenceLeft(s)).toBe(true);
    silenceNote(s, false);
    expect(silenceLeft(s)).toBe(false);
  });

  it('a store that throws, or none, is no note', () => {
    const bad = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
    expect(() => silenceNote(bad, true)).not.toThrow();
    expect(silenceLeft(bad)).toBe(false);
    expect(silenceLeft(null)).toBe(false);
  });
});

describe('the bar while the film is held', () => {
  it('says LOADING, shows no time, no level, no seek, no catcher: the cover stands', () => {
    const v = barView(true, info({ time: 4.2, duration: 260, level: 'medium', loaded: 0.08 }), 0, {}, true);
    expect(v.phase).toBe('holding');
    expect(v.play).toEqual({ label: 'LOADING', aria: 'Loading the film' });
    expect(v.time).toBeNull();
    expect(v.progress).toBe(0);
    expect(v.loaded).toBeNull();
    expect(v.seekable).toBe(false);
    expect(v.level).toBeNull();
    expect(v.cc).toBeNull();
    expect(v.mark).toBe(false);
    expect(v.catcher).toBe(false);
    expect(v.hold).toBe(true);
  });

  it('not held: nothing changes, and no cover', () => {
    const v = barView(true, info({ time: 4.2, duration: 260, level: 'hd2160' }), 0, {});
    expect(v.phase).toBe('playing');
    expect(v.hold).toBe(false);
    expect(v.level).toBe('2160P');
    expect(barView(true, { ...NO_INFO }, 0, {}).hold).toBe(false);
  });
});

describe("the hold in the player's record", () => {
  it('says how long the film was held and what it started at', () => {
    expect(holdSaid('reload', 5256, 'hd2160')).toBe('HELD 5.3 S · LOADED AGAIN AT 2160P');
    expect(holdSaid('restart', 10000, 'medium')).toBe('HELD 10.0 S · ITS LEVEL DID NOT RISE (360P)');
    expect(holdSaid('restart', 10000, null)).toBe('HELD 10.0 S · ITS LEVEL DID NOT RISE');
    expect(holdSaid('skip', 2100, 'medium')).toBe('HELD 2.1 S · THE VISITOR PRESSED ON');
  });

  it('is the last part of the PLAYER line', () => {
    clearPlayerRecords();
    const r = recordPlayer('FILM', 'site', 'ANSWERED 37 MS AFTER ITS LOAD');
    r.frame = 'FRAME 1452 × 817 AT 0.59';
    expect(playerLine(playerRecords())).toBe("PLAYER     THE SITE'S · ANSWERED 37 MS AFTER ITS LOAD · FRAME 1452 × 817 AT 0.59");
    r.hold = 'HELD 5.3 S · LOADED AGAIN AT 2160P';
    expect(playerLine(playerRecords())).toBe("PLAYER     THE SITE'S · ANSWERED 37 MS AFTER ITS LOAD · FRAME 1452 × 817 AT 0.59 · HELD 5.3 S · LOADED AGAIN AT 2160P");
    clearPlayerRecords();
  });
});

describe('the page', () => {
  const bar = readFileSync('src/project/player-bar.ts', 'utf8');
  const css = readFileSync('src/styles/project.css', 'utf8');

  it('the cover stands in the picture box, over the frame and the catcher, hidden until a hold', () => {
    expect(bar).toMatch(/hold\.className = 'p-film-hold'/);
    expect(bar).toMatch(/hold\.hidden = true/);
    expect(bar).toMatch(/pic\.append\(frame, mark, catcher, hold\)/);
    expect(css).toMatch(/\.p-film-hold \{[^}]*position: absolute; inset: 0; z-index: 2;/);
    expect(css).toMatch(/\.p-film-hold\[hidden\] \{ display: none; \}/);
  });

  it('its dots stand still in calm mode', () => {
    expect(css).toMatch(/\.rvl-calm \.p-film-hold-dots i \{ animation: none; \}/);
  });

  it('a film that got the plain player is never held', () => {
    expect(bar).toMatch(/if \(plain \|\| !holds\) return;/);
  });
});
