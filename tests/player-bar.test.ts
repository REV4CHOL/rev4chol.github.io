import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { barView, handshake, levelLabel, phaseOf, seekTo, timeText } from '../src/project/player-bar';
import { mergeInfo, NO_INFO, ytInfo } from '../src/project/parts';
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
  it('reads time, duration, sound, level and state from an info delivery', () => {
    expect(ytInfo('{"event":"infoDelivery","info":{"currentTime":7.02,"duration":260,"muted":false,"volume":100,"playerState":1,"playbackQuality":"hd2160"}}'))
      .toEqual({ time: 7.02, duration: 260, muted: false, state: 1, level: 'hd2160' });
  });

  it('a delivery carries only what changed', () => {
    expect(ytInfo({ event: 'infoDelivery', info: { currentTime: 9.5 } })).toEqual({ time: 9.5 });
    expect(ytInfo({ event: 'infoDelivery', info: { muted: true, volume: 100 } })).toEqual({ muted: true });
  });

  it('the first delivery, a state change and a level change say the same things', () => {
    expect(ytInfo({ event: 'initialDelivery', info: { playerState: 5, currentTime: 0, duration: 260, muted: false, playbackQuality: 'unknown' } }))
      .toEqual({ state: 5, time: 0, duration: 260, muted: false, level: 'unknown' });
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
// page. A big frame whose player has not answered within about 6 s of its load is swapped for the plain frame with
// YouTube's own controls, and the bar goes. Never the other way round.
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

  it('a player silent 6 s after its load falls back, once', () => {
    vi.useFakeTimers();
    const fail = vi.fn();
    const h = handshake({ talks: () => false, fail });
    h.loaded();
    vi.advanceTimersByTime(5900);
    expect(fail).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fail).toHaveBeenCalledTimes(1);
    h.loaded(); // (the plain frame's own load)
    vi.advanceTimersByTime(20000);
    expect(fail).toHaveBeenCalledTimes(1);
  });

  it('the count starts afresh at each load, and a stopped handshake never fires', () => {
    vi.useFakeTimers();
    const fail = vi.fn();
    const h = handshake({ talks: () => false, fail });
    h.loaded();
    vi.advanceTimersByTime(4000);
    h.loaded();
    vi.advanceTimersByTime(4000);
    expect(fail).not.toHaveBeenCalled();
    h.stop();
    vi.advanceTimersByTime(10000);
    expect(fail).not.toHaveBeenCalled();
  });
});

describe('the page wires it', () => {
  const page = readFileSync('src/pages/project.ts', 'utf8');
  it('the big frame is decided once, at mount, from the tier the page opened at', () => {
    expect(page).toContain('bigFrameWanted({');
    expect(page).toContain("lite: quality.tier() === 0");
  });
  it("the plain frame's address is today's", () => {
    expect(page).toContain('embedSrc(film, { autoplay: false, origin: location.origin })');
    expect(page).toContain('controls: false');
  });
});
