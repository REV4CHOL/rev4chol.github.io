import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { narrowCss, stripNarrow } from '../src/lib/narrow-css';

// ABOUT IN A NARROW PC WINDOW: the scroll cue is its mark alone (found on the live site, 2026-11-25, in a 1280 px
// window on a 2560 px screen). A narrow window lays ABOUT out as a tablet does, so the bio's first lines reach the foot
// of the first screen, where the cue stands: its words SCROLL DOWN stood over the running text. A tablet shows the mark
// alone there (a touch rule, which a mouse does not read), so a narrow window on ABOUT does the same. Every other page
// keeps the words in a narrow window: nothing stands under them there.
const about = readFileSync('src/styles/about.css', 'utf8').replace(/\r\n/g, '\n');

describe('ABOUT in a narrow PC window: the scroll cue without its words', () => {
  const rule = 'html.rvl-narrow .swipe-cue[data-state="scroll"] .swc-kicker { display: none; }';
  it('the rule stands in ABOUT\'s own sheet, for the plain scroll hint only (NEXT PAGE keeps its words)', () => {
    expect(about).toContain(rule);
    expect(about).not.toMatch(/html\.rvl-narrow \.swipe-cue \.swc-kicker/);
  });
  it('no other sheet takes the words away from a mouse', () => {
    for (const f of ['components.css', 'project.css', 'contact.css', 'story.css', 'base.css'])
      expect(readFileSync(`src/styles/${f}`, 'utf8'), f).not.toContain('html.rvl-narrow .swipe-cue');
  });
  it('the mirror leaves it as written, and strips back to the sheet byte for byte', () => {
    const out = narrowCss(about);
    expect(out).toContain(rule);
    expect(stripNarrow(out)).toBe(about);
  });
});
