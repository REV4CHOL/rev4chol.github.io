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
