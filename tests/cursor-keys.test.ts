import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cursorParts } from '../src/shell/cursor';

// THE CURSOR'S TAG FOR A KEYBOARD USER (the review's walkthroughs, 2026-11-25): Tab to a pane on WORK and the floor names
// it OPEN ▸ on the site's cursor, which had never moved: the tag and its box stood in the screen's top-left corner.
describe('the cursor is drawn only where the pointer has been, and the keyboard never writes on it', () => {
  it('before any pointer move nothing of it shows', () => {
    expect(cursorParts({ moved: false, keyed: false, onLink: false }).shown).toBe(false);
    expect(cursorParts({ moved: false, keyed: true, onLink: false }).shown).toBe(false);
  });
  it('a mouse that moved shows its cross, its tag and its box', () => {
    expect(cursorParts({ moved: true, keyed: false, onLink: false })).toEqual({ shown: true, tag: true, box: true });
  });
  it('while the keyboard drives, the resting cross stays without a tag; its box only over a link under it', () => {
    expect(cursorParts({ moved: true, keyed: true, onLink: false })).toEqual({ shown: true, tag: false, box: false });
    expect(cursorParts({ moved: true, keyed: true, onLink: true })).toEqual({ shown: true, tag: false, box: true });
  });
  it('the styles carry the three states after the box rule they override', () => {
    const css = readFileSync('src/styles/base.css', 'utf8');
    const box = css.indexOf('#cursor.has-label .x, #cursor.on-link .x');
    expect(box).toBeGreaterThan(-1);
    expect(css.indexOf('#cursor.is-unmoved { visibility: hidden; }')).toBeGreaterThan(-1);
    expect(css.indexOf('#cursor.no-tag .cursor-label { visibility: hidden; }')).toBeGreaterThan(-1);
    expect(css.indexOf('#cursor.no-box .x { outline: none; }')).toBeGreaterThan(box);
  });
});
