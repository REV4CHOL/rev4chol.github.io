import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Three findings the owner ticked on 2026-11-24 (the tablet round's closing list). Each rule is pinned the way
// tablet-defects.test.ts and home-tablet.test.ts pin theirs: the media query, the values, and that the PC and the
// phone are left as they were.
const css = (file: string) => readFileSync(`src/styles/${file}.css`, 'utf8').replace(/\r\n/g, '\n');
/** The text of the first block that opens with `head` (up to its matching brace). */
const block = (src: string, head: string) => {
  const i = src.indexOf(head);
  expect(i, head).toBeGreaterThan(-1);
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1);
  }
  throw new Error('unclosed ' + head);
};
describe('ABOUT on a short screen: the name stands on the first screen beside the portrait (owner, 2026-11-24)', () => {
  const about = css('about');
  const HEAD = '@media (min-width: 761px) and (max-height: 899px) {';
  it('under 900 px tall, on the wide two-column layout, the hero grid stands from the top: the name beside the portrait, not under the fold', () => {
    const b = block(about, HEAD);
    expect(b).toContain('.a-hero-grid { align-items: start; }');
    expect(b.match(/\{/g)!.length).toBe(2); // that one rule and nothing else moves
  });
  it('the base rule (end-aligned: what 900 px and taller keep) and the phone block stand as they were', () => {
    expect(about).toContain('gap: clamp(24px, 4vw, 56px); align-items: end;');
    expect(block(about, '@media (max-width: 760px) and (pointer: coarse) {')).toContain('.a-hero-grid { grid-template-columns: 1fr; gap: 44px; align-items: start; }');
    expect(about).toContain('.a-hero { position: relative; padding: 168px 44px 84px 28px; }'); // the portrait keeps its top and its size
    expect(about).toContain('.a-hero-grid { gap: 56px; }');
  });
  it('the block reaches no phone (it starts at 761 px) and stands after the rule it overrides', () => {
    expect(about.indexOf(HEAD)).toBeGreaterThan(about.indexOf('gap: clamp(24px, 4vw, 56px); align-items: end;'));
    expect(HEAD).not.toContain('pointer');
  });
});

describe("STORY's switches: a 44 px touch area, the look unchanged (owner, 2026-11-24)", () => {
  const story = css('story');
  const touch = block(story, '@media (pointer: coarse) {\n  .a3-fly button, .a3-tod button { position: relative; }');
  it('every switch carries an invisible box 44 px tall and at least 44 px wide, centred on it: no padding, no margin, no new size', () => {
    expect(touch).toContain(".a3-fly button::after, .a3-tod button::after {\n    content: ''; position: absolute; left: 50%; top: 50%; translate: -50% -50%;\n    width: max(100%, 44px); height: 44px;");
    expect(touch).not.toMatch(/padding|margin|font|color|background/);
  });
  it('on the two stacked rows (wider than the phone block) the boxes split the 4.8 px gap (2 px each, 0.8 px of air) and never meet', () => {
    const b = block(story, '@media (pointer: coarse) and (min-width: 721px) {');
    expect(b).toContain('.a3-fly button::after { top: -2px; translate: -50% 0; }');
    expect(b).toContain('.a3-tod button::after { top: calc(100% - 42px); translate: -50% 0; }');
  });
  it('on the phone the clock row stands 12 px apart, so a box reaches at most 6 px past its word on each side: neighbours never overlap', () => {
    const b = block(story, '@media (pointer: coarse) and (max-width: 720px) {');
    expect(b).toContain('.a3-tod button::after { width: max(100%, min(44px, calc(100% + 12px))); }');
    expect(story).toContain('.a3-tod { right: 50%; translate: 50% 0; bottom: 60px; gap: 12px; }'); // the gap the half of 12 is taken from
  });
  it('the phone block (its buttons are already 44 px tall) is not edited, and a fine pointer sees none of it', () => {
    expect(story).toContain('.a3-fly button, .a3-tod button { min-height: 44px; display: inline-flex; align-items: center; }');
    expect(story).toContain('cursor: pointer; padding: 3px 2px;');
    expect(story.indexOf('@media (pointer: coarse) {\n  .a3-fly button')).toBeGreaterThan(story.indexOf('@media (max-width: 720px) {'));
  });
});
