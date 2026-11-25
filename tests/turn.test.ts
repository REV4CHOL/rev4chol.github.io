import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inView, turned, turnScroll } from '../src/project/turn';

// The review's walkthroughs, 2026-11-25: an iPad turned to portrait and back left the player's top at -312, -208, -203,
// -140 px; an Android phone turned on its side while a film played left the player at y 229, 251 px tall, on a 340 px
// screen: 111 px of it showed and YouTube's controls were under the edge. The page keeps its scroll in px while the
// layout above the player changes height. After a turn, a player that was in view (or whose film was playing) is
// brought back whole under the header.

describe('a turn', () => {
  it('is the screen changing between upright and on its side', () => {
    expect(turned({ w: 412, h: 785 }, { w: 915, h: 340 })).toBe(true);
    expect(turned({ w: 1366, h: 939 }, { w: 1024, h: 1281 })).toBe(true);
  });
  it('a change of size that keeps the shape is no turn (the address bar coming and going, a keyboard)', () => {
    expect(turned({ w: 412, h: 785 }, { w: 412, h: 700 })).toBe(false);
    expect(turned({ w: 915, h: 340 }, { w: 915, h: 400 })).toBe(false);
  });
});

describe('the player was in view', () => {
  it('when a fair share of it, or of the room under the header, showed', () => {
    expect(inView({ top: 200, bottom: 600 }, 939, 90)).toBe(true);
    expect(inView({ top: 800, bottom: 1300 }, 939, 90)).toBe(true); // 139 of 500
    expect(inView({ top: 880, bottom: 1300 }, 939, 90)).toBe(false); // 59 of 500: a sliver at the foot
    expect(inView({ top: -400, bottom: 120 }, 939, 90)).toBe(false); // 30 px left under the header
  });
  it('not when it is off the screen', () => {
    expect(inView({ top: 2000, bottom: 2400 }, 939, 90)).toBe(false);
    expect(inView({ top: -900, bottom: -300 }, 939, 90)).toBe(false);
  });
  it('a player taller than the room counts when it fills a fair share of the room', () => {
    expect(inView({ top: -100, bottom: 2000 }, 939, 90)).toBe(true);
  });
});

describe('where the page goes after the turn', () => {
  it('the Android phone on its side: the player whole in the room under the header, in its middle', () => {
    // scrollY 1200, the player at 229 and 251 tall on a 340 px screen, the header 72 px: the room is 268 px
    expect(turnScroll({ y: 1200, top: 229, height: 251, vh: 340, header: 72 })).toBe(1200 + 229 - 81);
  });
  it('the iPad back in landscape: the player whose top stood at -312 comes down under the header', () => {
    const to = turnScroll({ y: 3000, top: -312, height: 700, vh: 939, header: 100 })!;
    expect(3000 - to).toBeGreaterThan(312 + 100 - 1);
    const newTop = -312 + (3000 - to);
    expect(newTop).toBeGreaterThanOrEqual(100);
    expect(newTop + 700).toBeLessThanOrEqual(939);
  });
  it('a player already whole under the header stays where it is', () => {
    expect(turnScroll({ y: 1200, top: 120, height: 400, vh: 939, header: 100 })).toBeNull();
  });
  it('a player taller than the room: its top under the header', () => {
    expect(turnScroll({ y: 1200, top: 400, height: 600, vh: 340, header: 72 })).toBe(1200 + 400 - 72);
  });
  it('never above the top of the page', () => {
    expect(turnScroll({ y: 50, top: 20, height: 600, vh: 340, header: 72 })).toBe(0);
  });
});

describe('armed for touch screens only', () => {
  it('a window resized on a PC never scrolls the page: the armer stands down without a coarse pointer', () => {
    const page = readFileSync('src/pages/project.ts', 'utf8');
    const arm = page.slice(page.indexOf('function armTurn('));
    expect(arm).toContain("matchMedia('(pointer: coarse)')");
  });
});
