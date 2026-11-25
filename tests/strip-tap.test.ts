import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FOCUS_AFTER_FINGER_MS, focusCentres } from '../src/works/reel';

// A TAP MUST NOT MOVE THE STRIP (found 2026-11-25, while checking the phone strip's own order of films). In Chrome's
// engine a tap gives the film's link the focus before its click. The strip's keyboard rule (a focus brings its pane to
// the screen's middle and holds the strip there) then moved the pane from under the finger: the press began on one
// pane and ended on the next, so its click belonged to neither link and no film opened. Every tap in the lower or the
// upper quarter of the screen went that way; a tap near the middle stayed inside its pane and opened it. Only a
// keyboard's focus moves the strip.

const view = readFileSync(fileURLToPath(new URL('../src/works/reel-view.ts', import.meta.url)), 'utf8');

describe('a focus that lands on a pane (works/reel.ts: focusCentres)', () => {
  it('a keyboard\'s focus brings its pane to the middle of the screen', () => {
    expect(focusCentres(true, Infinity)).toBe(true);
    expect(focusCentres(true, 60_000)).toBe(true);
  });
  it('a focus the browser does not show is a finger\'s or a mouse\'s: the strip stays where it is', () => {
    expect(focusCentres(false, Infinity)).toBe(false);
    expect(focusCentres(false, 0)).toBe(false);
  });
  it('nor does any focus that lands just after a finger, whatever the browser says of it', () => {
    expect(focusCentres(true, 0)).toBe(false);
    expect(focusCentres(true, 40)).toBe(false);
    expect(focusCentres(true, FOCUS_AFTER_FINGER_MS)).toBe(false);
    expect(focusCentres(true, FOCUS_AFTER_FINGER_MS + 1)).toBe(true);
  });
  it('the wait covers a tap\'s own focus (it comes with the lift) and is over before a keyboard is taken up', () => {
    expect(FOCUS_AFTER_FINGER_MS).toBeGreaterThanOrEqual(300);
    expect(FOCUS_AFTER_FINGER_MS).toBeLessThanOrEqual(1500);
  });
});

describe('the strip\'s view asks before a focus moves it (works/reel-view.ts)', () => {
  it('the focus rule stands between the pane found and the strip moved', () => {
    const at = view.indexOf("root.addEventListener('focusin'");
    const body = view.slice(at, view.indexOf("root.addEventListener('focusout'", at));
    expect(at).toBeGreaterThan(0);
    const rule = body.indexOf('if (!focusCentres(focusShown(e.target), performance.now() - fingerAt)) return;');
    expect(rule).toBeGreaterThan(body.indexOf('if (i < 0) return;'));
    expect(body.indexOf('pinned = true;')).toBeGreaterThan(rule);
    expect(body.indexOf('offset = offsetForPane(')).toBeGreaterThan(rule);
  });
  it('a finger is noted when it lands and when it lifts, before either handler can leave early', () => {
    expect(view).toMatch(/s\.ol\.addEventListener\('pointerdown', \(e\) => \{\s*fingerAt = performance\.now\(\);/);
    expect(view).toMatch(/const up = \(e: PointerEvent\) => \{\s*fingerAt = performance\.now\(\);/);
  });
  it('the browser is asked whether it shows the focus; one that cannot say is taken as a keyboard\'s', () => {
    expect(view).toMatch(/const focusShown = \(t: EventTarget \| null\): boolean => \{/);
    expect(view).toContain("t.matches(':focus-visible')");
    expect(view).toMatch(/catch \{ return true; \}/);
  });
});
