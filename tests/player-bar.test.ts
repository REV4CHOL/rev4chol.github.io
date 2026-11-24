import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { barView, captionCommand, fullWords, handshake, HANDSHAKE_MS, knownTrack, levelLabel, phaseOf, seekTo, timeText, volumeCommands, volumeKey } from '../src/project/player-bar';
import { GREETING_MS, GREETINGS, mergeInfo, NO_INFO, ytInfo } from '../src/project/parts';
import { embedSrc } from '../src/lib/embeds';

// The owner, 2026-11-24, shown the choice as a picture, chose "2160p + site's own controls": the same 2160p-size player,
// YouTube's shrunken controls hidden, and the site's own play, seek, sound and fullscreen bar at normal size.

describe("the player's level, in the site's words", () => {
  it('names each level YouTube reports by its height', () => {
    expect(levelLabel('hd2160')).toBe('2160P');
    expect(levelLabel('hd1440')).toBe('1440P');
    expect(levelLabel('hd1080')).toBe('1080P');
    expect(levelLabel('hd720')).toBe('720P');
    expect(levelLabel('large')).toBe('480P');
    expect(levelLabel('medium')).toBe('360P');
    expect(levelLabel('small')).toBe('240P');
    expect(levelLabel('tiny')).toBe('144P');
  });

  it('says nothing until it is known', () => {
    for (const q of ['unknown', 'auto', '', null, undefined]) expect(levelLabel(q)).toBeNull();
  });
});

describe('time, as the bar writes it', () => {
  it('minutes and seconds, hours when a film runs that long', () => {
    expect(timeText(0)).toBe('0:00');
    expect(timeText(7.9)).toBe('0:07');
    expect(timeText(260)).toBe('4:20');
    expect(timeText(3723)).toBe('1:02:03');
  });

  it('nothing sensible in, zero out', () => {
    expect(timeText(NaN)).toBe('0:00');
    expect(timeText(-3)).toBe('0:00');
  });
});

describe("reading the player's messages", () => {
  it('reads time, duration, sound, volume, level and state from an info delivery', () => {
    expect(ytInfo('{"event":"infoDelivery","info":{"currentTime":7.02,"duration":260,"muted":false,"volume":100,"playerState":1,"playbackQuality":"hd2160"}}'))
      .toEqual({ time: 7.02, duration: 260, muted: false, volume: 100, state: 1, level: 'hd2160' });
  });

  it('a delivery carries only what changed', () => {
    expect(ytInfo({ event: 'infoDelivery', info: { currentTime: 9.5 } })).toEqual({ time: 9.5 });
    expect(ytInfo({ event: 'infoDelivery', info: { muted: true, volume: 40 } })).toEqual({ muted: true, volume: 40 });
  });

  it('the first delivery, a state change and a level change say the same things', () => {
    expect(ytInfo({ event: 'initialDelivery', info: { playerState: 5, currentTime: 0, duration: 260, muted: false, volume: 100, playbackQuality: 'unknown' } }))
      .toEqual({ state: 5, time: 0, duration: 260, muted: false, volume: 100, level: 'unknown' });
    expect(ytInfo({ event: 'onStateChange', info: 2 })).toEqual({ state: 2 });
    expect(ytInfo({ event: 'onPlaybackQualityChange', info: 'hd1440' })).toEqual({ level: 'hd1440' });
  });

  it('anything else is no news', () => {
    expect(ytInfo('{"event":"onReady","info":null}')).toBeNull();
    expect(ytInfo('not json')).toBeNull();
    expect(ytInfo(null)).toBeNull();
  });

  it('a part has started once it plays or buffers towards playing, and stays started', () => {
    let s = mergeInfo(NO_INFO, { state: 5, duration: 260 });
    expect(s.started).toBe(false);
    s = mergeInfo(s, { state: 3 });
    expect(s.started).toBe(true);
    s = mergeInfo(s, { state: 2 });
    expect(s.started).toBe(true);
    expect(s.duration).toBe(260);
  });
});

// The owner, 2026-11-24, ticked "Captions always off: Turn YouTube's captions off on every film, so no caption box ever
// appears over the picture" and "A captions switch: A CC button in the bar, so a visitor can turn captions on or off
// where a film has them". The player says what captions it has when its captions module loads (measured: an
// `apiInfoDelivery` about 0.65 s after the start, `captions.track` the auto-generated English track on GALAXY part 1,
// `{}` on XIÊU LÒNG; `tracklist` was empty on both).
describe("the player's captions", () => {
  const api = (captions: unknown) => ({ event: 'apiInfoDelivery', info: { namespaces: ['captions'], captions } });

  it('a captions delivery names the track the player offers', () => {
    expect(ytInfo(api({ track: { languageCode: 'en', kind: 'asr' }, tracklist: [] }))).toEqual({ captions: 'en' });
    expect(ytInfo(api({ track: {}, tracklist: [{ languageCode: 'vi' }] }))).toEqual({ captions: 'vi' });
  });

  it('a captions delivery with no track says so: the module loaded, nothing to show', () => {
    expect(ytInfo(api({ track: {}, tracklist: [] }))).toEqual({ captions: null });
  });

  it('another namespace is no news', () => {
    expect(ytInfo({ event: 'apiInfoDelivery', info: { namespaces: ['other'] } })).toBeNull();
  });

  it('each load of the module is counted, and a track once offered stays known (the off the page sends empties it)', () => {
    let s = mergeInfo(NO_INFO, { captions: 'en' });
    expect(s.captions).toBe('en');
    expect(s.captionLoads).toBe(1);
    s = mergeInfo(s, { captions: null });
    expect(s.captions).toBe('en');
    expect(s.captionLoads).toBe(2);
    s = mergeInfo(s, { time: 3 });
    expect(s.captionLoads).toBe(2);
  });
});

describe('the big frame asks for no controls of its own', () => {
  const film = { type: 'youtube' as const, src: 'https://www.youtube.com/embed/wZNPHtoPZzk' };
  it('controls=0 only when asked', () => {
    expect(embedSrc(film, { autoplay: false, origin: 'https://x.test', controls: false })).toBe(
      'https://www.youtube-nocookie.com/embed/wZNPHtoPZzk?autoplay=0&rel=0&controls=0&enablejsapi=1&origin=https%3A%2F%2Fx.test',
    );
    expect(embedSrc(film, { autoplay: false, origin: 'https://x.test' })).not.toContain('controls');
  });
  it('another platform takes no such parameter', () => {
    expect(embedSrc({ type: 'vimeo', src: 'https://vimeo.com/76979871' }, { autoplay: false, controls: false })).toBe('https://player.vimeo.com/video/76979871?autoplay=0');
  });
});

describe("the bar's states", () => {
  const at = (o: Partial<typeof NO_INFO>) => mergeInfo(NO_INFO, o);

  it('waiting until the player has answered: nothing of the bar is trusted yet', () => {
    expect(phaseOf(false, at({ state: 1 }))).toBe('waiting');
    expect(barView(false, NO_INFO).mark).toBe(false);
  });

  it('resting: the play mark stands as a picture, no catcher, no time (the site shows no running time before a film plays)', () => {
    const v = barView(true, at({ state: 5, duration: 260 }));
    expect(v.phase).toBe('resting');
    expect(v.mark).toBe(true);
    expect(v.catcher).toBe(false);
    expect(v.time).toBeNull();
    expect(v.seekable).toBe(false);
    expect(v.play.aria).toBe('Play');
  });

  it('playing: the catcher covers the picture, the time shows, the button pauses', () => {
    const v = barView(true, at({ state: 1, time: 7, duration: 260, level: 'hd2160' }));
    expect(v.phase).toBe('playing');
    expect(v.mark).toBe(false);
    expect(v.catcher).toBe(true);
    expect(v.time).toEqual({ elapsed: '0:07', total: '4:20' });
    expect(v.progress).toBeCloseTo(7 / 260, 6);
    expect(v.seekable).toBe(true);
    expect(v.play.aria).toBe('Pause');
    expect(v.level).toBe('2160P');
  });

  it('paused: nothing is drawn over the picture (a colorist\'s paused frame stays clean)', () => {
    const v = barView(true, mergeInfo(at({ state: 1, time: 30, duration: 260 }), { state: 2 }));
    expect(v.phase).toBe('paused');
    expect(v.mark).toBe(false);
    expect(v.catcher).toBe(true);
    expect(v.play.aria).toBe('Play');
  });

  it('ended: a press plays it again from the start', () => {
    const v = barView(true, mergeInfo(at({ state: 1, duration: 260 }), { state: 0, time: 260 }));
    expect(v.phase).toBe('ended');
    expect(v.play.aria).toBe('Play again');
    expect(v.progress).toBe(1);
  });

  it('the sound button says the sound as it stands', () => {
    expect(barView(true, at({ state: 1, muted: false })).sound).toEqual({ label: 'SOUND ON', aria: 'Mute', pressed: true });
    expect(barView(true, at({ state: 1, muted: true })).sound).toEqual({ label: 'SOUND OFF', aria: 'Unmute', pressed: false });
  });

  it('the level readout is hidden until known', () => {
    expect(barView(true, at({ state: 1, level: 'unknown' })).level).toBeNull();
  });

  it('the CC switch stands only on a started film whose player offered a track, off unless the visitor turned it on', () => {
    expect(barView(true, at({ state: 1 })).cc).toBeNull();
    expect(barView(true, at({ state: 5, captions: 'en' }), undefined, { track: 'en' }).cc).toBeNull();
    expect(barView(true, at({ state: 1 }), undefined, { track: 'en' }).cc).toEqual({ label: 'CC OFF', aria: 'Turn captions on', pressed: false });
    expect(barView(true, mergeInfo(at({ state: 1 }), { state: 2 }), undefined, { track: 'en', cc: true }).cc).toEqual({ label: 'CC ON', aria: 'Turn captions off', pressed: true });
  });

  it('the volume slider draws the player\'s own volume, and nothing while muted', () => {
    expect(barView(true, at({ state: 1, volume: 40 })).volume).toEqual({ value: 40, text: '40%' });
    expect(barView(true, at({ state: 1, volume: 40, muted: true })).volume).toEqual({ value: 0, text: 'muted' });
    expect(barView(true, NO_INFO).volume).toEqual({ value: 100, text: '100%' });
  });
});

describe('the volume slider', () => {
  it('arrows step 5, Home and End go to the ends, inside 0..100', () => {
    expect(volumeKey('ArrowUp', 40)).toBe(45);
    expect(volumeKey('ArrowRight', 98)).toBe(100);
    expect(volumeKey('ArrowDown', 40)).toBe(35);
    expect(volumeKey('ArrowLeft', 3)).toBe(0);
    expect(volumeKey('Home', 40)).toBe(0);
    expect(volumeKey('End', 40)).toBe(100);
    expect(volumeKey('a', 40)).toBeNull();
  });

  it('above 0 it sets the volume and unmutes; at 0 it mutes and keeps the last level for SOUND ON', () => {
    expect(volumeCommands(60, false)).toEqual([['setVolume', [60]]]);
    expect(volumeCommands(60, true)).toEqual([['setVolume', [60]], ['unMute', []]]);
    expect(volumeCommands(0, false)).toEqual([['mute', []]]);
    expect(volumeCommands(0, true)).toEqual([]);
    expect(volumeCommands(33.6, false)).toEqual([['setVolume', [34]]]);
  });
});

describe('the CC switch, as commands', () => {
  it('on asks for the offered track, off for none', () => {
    expect(captionCommand(true, 'en')).toEqual(['setOption', ['captions', 'track', { languageCode: 'en' }]]);
    expect(captionCommand(false, 'en')).toEqual(['setOption', ['captions', 'track', {}]]);
    expect(captionCommand(true, null)).toEqual(['setOption', ['captions', 'track', {}]]);
  });

  // measured: the player may remember the page's off across loads (after the off, a reload offered `track: {}` on
  // GALAXY part 1 in the one run measured), so the page remembers, per film, the track its player once offered
  it('a track once offered is remembered for that film; a film never offering one has none', () => {
    const m = new Map<string, string>();
    const store = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(knownTrack(store, 'hfq64ykkQs4', 'en')).toBe('en');
    expect(knownTrack(store, 'hfq64ykkQs4', null)).toBe('en');
    expect(knownTrack(store, 'wZNPHtoPZzk', null)).toBeNull();
    expect(knownTrack(null, 'x', 'fr')).toBe('fr');
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(knownTrack(broken, 'x', 'fr')).toBe('fr');
    expect(knownTrack(broken, 'x', null)).toBeNull();
  });
});

// The owner, 2026-11-25: "Player: FULL SCREEN should be FULLSCREEN". One word, in what the button shows and what it
// says to a screen reader; the markup and the bar's repaint take their words from one place.
describe('the fullscreen button, in one word', () => {
  it('reads FULLSCREEN out of fullscreen, EXIT in it, and its labels say the same word', () => {
    expect(fullWords(false)).toEqual({ aria: 'Fullscreen', icon: 'full', word: 'FULLSCREEN' });
    expect(fullWords(true)).toEqual({ aria: 'Exit fullscreen', icon: 'exit', word: 'EXIT' });
  });
  it('no "full screen" in two words is left in the bar', () => {
    const bar = readFileSync('src/project/player-bar.ts', 'utf8');
    // (in a string or the markup: the owner's own words are quoted in a comment)
    expect(bar).not.toMatch(/['`>][^'`<\n]*full screen[^'`<\n]*['`<]/i);
    expect(bar).not.toMatch(/aria-label="[^"]*full screen/i);
    expect(bar).toContain('fullWords(false)');
    expect(bar).toContain('fullWords(on)');
  });
});

describe('the seek track, by key', () => {
  it('arrows step 5 s, Home and End go to the ends, inside the film', () => {
    expect(seekTo('ArrowRight', 10, 260)).toBe(15);
    expect(seekTo('ArrowLeft', 3, 260)).toBe(0);
    expect(seekTo('ArrowRight', 258, 260)).toBe(260);
    expect(seekTo('Home', 100, 260)).toBe(0);
    expect(seekTo('End', 100, 260)).toBe(260);
    expect(seekTo('a', 100, 260)).toBeNull();
  });
});

// Safari and every browser that could not be tested: the site's bar is trusted only once the player has answered the
// page. A big frame whose player has not answered within 15 s of its load, counted only while the page is seen, is
// swapped for the plain frame with YouTube's own controls, and the bar goes. Never the other way round.
// (6 s of clock time until the owner's "YouTube player is appearing now wtf", 2026-11-24: a tab loaded in the
//  background, or a slow line, must not cost the film its player.)
describe('the handshake', () => {
  afterEach(() => vi.useRealTimers());

  it('a player that answers keeps the big frame', () => {
    vi.useFakeTimers();
    let answered = false;
    const fail = vi.fn();
    const h = handshake({ talks: () => answered, fail });
    h.loaded();
    vi.advanceTimersByTime(2000);
    answered = true;
    vi.advanceTimersByTime(10000);
    expect(fail).not.toHaveBeenCalled();
  });

  it('a player silent 15 s after its load falls back, once, and says how long it waited', () => {
    vi.useFakeTimers();
    const fail = vi.fn();
    const h = handshake({ talks: () => false, fail });
    expect(HANDSHAKE_MS).toBe(15000);
    h.loaded();
    vi.advanceTimersByTime(14700);
    expect(fail).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(fail.mock.calls[0][0]).toBeGreaterThanOrEqual(15000);
    h.loaded(); // (the plain frame's own load)
    vi.advanceTimersByTime(20000);
    expect(fail).toHaveBeenCalledTimes(1);
  });

  it('time the page is not seen does not count (a tab loaded in the background)', () => {
    vi.useFakeTimers();
    let seen = false;
    const fail = vi.fn();
    const h = handshake({ talks: () => false, fail, visible: () => seen });
    h.loaded();
    vi.advanceTimersByTime(120000);
    expect(fail).not.toHaveBeenCalled();
    seen = true;
    vi.advanceTimersByTime(14000);
    expect(fail).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(fail).toHaveBeenCalledTimes(1);
  });

  it('an answer ends the wait for good: a player that has spoken is never swapped', () => {
    vi.useFakeTimers();
    let answered = false;
    const fail = vi.fn();
    const h = handshake({ talks: () => answered, fail });
    h.loaded();
    vi.advanceTimersByTime(3000);
    answered = true;
    vi.advanceTimersByTime(1000);
    answered = false;
    vi.advanceTimersByTime(60000);
    expect(fail).not.toHaveBeenCalled();
  });

  it('the greeting outlasts the wait: a silent player is still spoken to when the wait ends', () => {
    expect(GREETINGS * GREETING_MS).toBeGreaterThanOrEqual(HANDSHAKE_MS * 2);
    const link = readFileSync('src/project/parts.ts', 'utf8');
    expect(link).toContain('document.hidden'); // (greetings sent to a page nobody sees are not counted)
  });

  it('the count starts afresh at each load, and a stopped handshake never fires', () => {
    vi.useFakeTimers();
    const fail = vi.fn();
    const h = handshake({ talks: () => false, fail });
    h.loaded();
    vi.advanceTimersByTime(10000);
    h.loaded();
    vi.advanceTimersByTime(10000);
    expect(fail).not.toHaveBeenCalled();
    h.stop();
    vi.advanceTimersByTime(10000);
    expect(fail).not.toHaveBeenCalled();
  });
});

describe('the page wires it', () => {
  const page = readFileSync('src/pages/project.ts', 'utf8');
  it('the big frame is decided once, at mount, from the film and the browser: never from the quality tier', () => {
    expect(page).toContain('plainReason({');
    expect(page).not.toContain('quality.tier()');
    expect(page).not.toMatch(/\blite\s*:/);
  });
  // (measured in the Claude browser pane, 2026-11-24: a film page loaded in a tab not yet laid out got YouTube's own
  //  player for the whole visit, because the big player gave up on a box without a size)
  it('a box without a size at mount still gets the site\'s player: mountBig never gives up', () => {
    const bar = readFileSync('src/project/player-bar.ts', 'utf8');
    const mount = bar.slice(bar.indexOf('export function mountBig('), bar.indexOf('export function armBar('));
    expect(mount).toContain('): BigFilm {');
    expect(mount).not.toContain('return null');
    expect(mount).not.toContain('.remove()');
  });
  it('every player leaves its record, and the readout shows it', () => {
    expect(page).toContain('recordPlayer(');
    expect(page).toContain('rvlPlayer');
    expect(readFileSync('src/shell/stats.ts', 'utf8')).toContain('playerLine(playerRecords())');
  });
  it("the plain frame's address is today's", () => {
    expect(page).toContain('embedSrc(film, { autoplay: false, origin: location.origin })');
    expect(page).toContain('controls: false');
  });
});
