import { describe, expect, it } from 'vitest';
import type { QualityReport } from '../src/lib/quality';
import { floorReadings, offerFloorReadings, readoutLines, statsWanted, type FloorReadings } from '../src/lib/readout';

// THE READOUT (spec 2026-11-24-work-wall-video-design, §4.8): `?stats=1` shows eight lines. They are what the owner
// reads back from the old laptop, so their words are pinned here.

const report = (over: Partial<QualityReport> = {}): QualityReport => ({
  tier: 1, label: 'balanced', ceiling: 1, hardwareCeiling: 1, opened: 1, downs: [0, 0, 0], governed: true, pinned: null,
  weak: 'memory', lastSignal: null, stalls: 0, discarded: false,
  device: { memory: 4, threads: 4, coarse: false, gpu: 'ANGLE (Intel, Intel(R) HD Graphics 4000, OpenGL 4.1)', dataSaver: false },
  ...over,
});
const floor = (over: Partial<FloorReadings> = {}): FloorReadings => ({
  mode: 'wall',
  wall: {
    file: 'human.mp4', ready: true, fps: 23.6, dropped: 3, decoded: 1200,
    paused: false, readyState: 4, time: 12.34, restarts: 0, lastEvent: null, counts: true, pictures: 4810,
  },
  playing: 1,
  health: { counted: 0, presented: null, due: null, judged: false, failed: false },
  textures: 40 * 1024 * 1024,
  videos: ['1904×1080'],
  budget: 96,
  page: null,
  verdict: 'ok',
  contextLost: false,
  ...over,
});
const MB = 1024 * 1024;

describe('the readout: eight lines, in plain words', () => {
  it('the old laptop on the wall', () => {
    expect(readoutLines(report(), 58.4, floor(), 9 * MB, 'no reading', 60000)).toEqual([
      'LEVEL      BALANCED · CEILING BALANCED · HARDWARE CEILING BALANCED · OPENED BALANCED · NO SIGNAL YET',
      'FRAMES     58 FPS · 0 STALLS',
      'WALL       MODE WALL · HUMAN.MP4 · 24 FPS PRESENTED · 3 DROPPED OF 1200 DECODED',
      'OWN LOOPS  1 PLAYING · NO LOOP COUNTED',
      'MEMORY     MACHINE 4 GB · TEXTURES 40 MB · HEAP 9 MB · BUDGET 96 MB',
      'PRESSURE   NO READING',
      'DEVICE     4 THREADS · FINE POINTER · WEAK BY ITS MEMORY · ANGLE (Intel, Intel(R) HD Graphics 4000, OpenGL 4.1)',
      'PLAYBACK   PLAYING · READY 4 · AT 12.3 S · PICTURES 4810 · RESTARTED 0 · NO VIDEO EVENT YET · NO PAGE EVENT YET · VERDICT OK · WEBGL OK',
    ]);
  });

  it('a strong machine on its own loops, after a step down', () => {
    const q = report({
      tier: 1, ceiling: 1, hardwareCeiling: 2, opened: 2, weak: null, stalls: 1, lastSignal: { name: 'slow frames', at: 48000 },
      device: { memory: 32, threads: 24, coarse: false, gpu: null, dataSaver: false },
    });
    const f = floor({
      mode: 'own', wall: null, playing: 12, textures: 122 * MB, budget: 256,
      health: { counted: 12, presented: 1150, due: 1440, judged: true, failed: false },
    });
    const lines = readoutLines(q, 119.7, f, null, 'nominal', 60000);
    expect(lines[0]).toBe('LEVEL      BALANCED · CEILING BALANCED · HARDWARE CEILING FULL · OPENED FULL · LAST SIGNAL SLOW FRAMES 12 S AGO');
    expect(lines[1]).toBe('FRAMES     120 FPS · 1 STALL');
    expect(lines[2]).toBe('WALL       MODE OWN · NO WALL VIDEO');
    expect(lines[3]).toBe('OWN LOOPS  12 PLAYING · 1150 OF 1440 FRAMES OVER 5 S · KEEPING UP');
    expect(lines[4]).toBe('MEMORY     MACHINE 32 GB · TEXTURES 122 MB · HEAP NOT REPORTED · BUDGET 256 MB');
    expect(lines[5]).toBe('PRESSURE   NOMINAL');
    expect(lines[6]).toBe('DEVICE     24 THREADS · FINE POINTER · NOT WEAK · GPU NOT NAMED');
  });

  it('every reading has its plain words when it is missing, starving or over', () => {
    const starving = floor({ mode: 'own', wall: null, playing: 12, health: { counted: 12, presented: 400, due: 1440, judged: true, failed: true } });
    expect(readoutLines(report(), 30, starving, 0, 'serious', 0)[3]).toBe('OWN LOOPS  12 PLAYING · 400 OF 1440 FRAMES OVER 5 S · STARVING');
    const early = floor({ mode: 'own', wall: null, playing: 12, health: { counted: 12, presented: null, due: null, judged: false, failed: false } });
    expect(readoutLines(report(), 30, early, 0, 'serious', 0)[3]).toBe('OWN LOOPS  12 PLAYING · NO READING YET');
    const single = floor({ health: { counted: 1, presented: 110, due: 120, judged: false, failed: false } });
    expect(readoutLines(report(), 30, single, 0, 'serious', 0)[3]).toBe('OWN LOOPS  1 PLAYING · 110 OF 120 FRAMES OVER 5 S · NOT JUDGED');
    const starting = floor({
      wall: { file: 'human-s.mp4', ready: false, fps: null, dropped: 0, decoded: 0, paused: false, readyState: 0, time: 0, restarts: 0, lastEvent: null, counts: true, pictures: 0 },
      mode: 'wall-small',
    });
    expect(readoutLines(report(), 30, starting, 0, 'serious', 0)[2]).toBe('WALL       MODE WALL-SMALL · HUMAN-S.MP4 · STARTING');
    expect(readoutLines(report(), 30, floor({ mode: 'posters', wall: null }), 0, 'critical', 0)[2]).toBe('WALL       MODE POSTERS · NO WALL VIDEO');
    const over = floor({ textures: 90 * MB });
    expect(readoutLines(report(), 30, over, 9 * MB, 'fair', 0)[4]).toBe('MEMORY     MACHINE 4 GB · TEXTURES 90 MB · HEAP 9 MB · BUDGET 96 MB · OVER');
    expect(readoutLines(report(), null, floor(), 0, 'not offered', 0).slice(1, 2)).toEqual(['FRAMES     COUNTING · 0 STALLS']);
    expect(readoutLines(report(), 30, floor(), 0, 'not offered', 0)[5]).toBe('PRESSURE   NOT OFFERED');
  });

  it('a pinned page, a page that steers itself, a tablet, Save-Data and a discarded tab say so', () => {
    expect(readoutLines(report({ pinned: 2, tier: 2, ceiling: 2, governed: false }), 60, floor(), 0, 'no reading', 0)[0]).toMatch(/ · PINNED BY THE ADDRESS$/);
    expect(readoutLines(report({ governed: false, stalls: null }), 60, null, 0, 'no reading', 0).slice(0, 2)).toEqual([
      'LEVEL      BALANCED · CEILING BALANCED · HARDWARE CEILING BALANCED · OPENED BALANCED · NO SIGNAL YET · NOT STEERED ON THIS PAGE',
      'FRAMES     60 FPS · STALLS NOT COUNTED ON THIS PAGE',
    ]);
    const tablet = report({
      weak: 'pointer', discarded: true,
      device: { memory: null, threads: null, coarse: true, gpu: 'Apple GPU', dataSaver: true },
    });
    const lines = readoutLines(tablet, 60, null, null, 'not offered', 0);
    expect(lines[6]).toBe('DEVICE     THREADS NOT REPORTED · COARSE POINTER · WEAK BY ITS POINTER · Apple GPU · SAVE-DATA OR 2G · THIS TAB WAS DISCARDED AND LOADED AGAIN');
    // a page with no floor (the homepage, a film's page): the three floor lines say so
    expect(lines.slice(2, 5)).toEqual([
      'WALL       NO FLOOR ON THIS PAGE',
      'OWN LOOPS  NO FLOOR ON THIS PAGE',
      'MEMORY     MACHINE NOT REPORTED · HEAP NOT REPORTED · NO FLOOR ON THIS PAGE',
    ]);
    expect(lines[7]).toBe('PLAYBACK   NO FLOOR ON THIS PAGE');
  });

  // THE FROZEN WALL (owner, on the iPad: "after a while on tablet, the work section got frozen (no panes playing
  // stuff)"): the eighth line says what the wall video is doing and what the page last lived through, so the iPad
  // itself can tell a wall the browser paused from one the page gave up on.
  it('the playback line: a paused wall, its last event, the page back from the cache, a remembered verdict, a lost context', () => {
    const paused = floor({
      wall: {
        file: 'human-s.mp4', ready: true, fps: 0, dropped: 0, decoded: 300,
        paused: true, readyState: 2, time: 3.06, restarts: 2, lastEvent: { name: 'pause', at: 46000 }, counts: true, pictures: null,
      },
      page: { name: 'shown from the back cache', at: 30000 },
      verdict: 'small',
    });
    expect(readoutLines(report(), 60, paused, 0, 'not offered', 60000)[7]).toBe(
      'PLAYBACK   PAUSED · READY 2 · AT 3.1 S · PICTURES NOT COUNTED · RESTARTED 2 · LAST VIDEO EVENT PAUSE 14 S AGO · ' +
      'LAST PAGE EVENT SHOWN FROM THE BACK CACHE 30 S AGO · VERDICT SMALL · WEBGL OK',
    );
    const dead = floor({ mode: 'starved', wall: null, verdict: 'starved', contextLost: true, page: { name: 'hidden', at: 59000 } });
    expect(readoutLines(report(), 60, dead, 0, 'not offered', 60000)[7]).toBe(
      'PLAYBACK   NO WALL VIDEO · LAST PAGE EVENT HIDDEN 1 S AGO · VERDICT STARVED · WEBGL LOST',
    );
  });

  it('a wall whose browser reports no frame counts says so on the wall line', () => {
    const silent = floor({
      wall: {
        file: 'human.mp4', ready: true, fps: null, dropped: 0, decoded: 0,
        paused: false, readyState: 4, time: 8, restarts: 0, lastEvent: null, counts: false, pictures: 190,
      },
    });
    expect(readoutLines(report(), 60, silent, 0, 'not offered', 0)[2]).toBe('WALL       MODE WALL · HUMAN.MP4 · FRAME COUNTS NOT REPORTED');
  });

  it('only ?stats=1 asks for it', () => {
    expect(statsWanted('?stats=1')).toBe(true);
    expect(statsWanted('?ch=machine&stats=1&gfx=full')).toBe(true);
    expect(statsWanted('?stats=0')).toBe(false);
    expect(statsWanted('?stats')).toBe(false);
    expect(statsWanted('')).toBe(false);
  });

  it('the floor hands its readings over while it stands, and takes them back', () => {
    expect(floorReadings()).toBeNull();
    offerFloorReadings(() => floor({ playing: 7 }));
    expect(floorReadings()?.playing).toBe(7);
    offerFloorReadings(null);
    expect(floorReadings()).toBeNull();
  });
});
