import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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

describe('ABOUT on a tablet: a skill name is never cut (android-portrait 800 px: CINEMATOGRAPHY lost its end)', () => {
  const about = css('about');
  it('a touch screen wider than a phone lets the name shrink and wrap', () => {
    const b = block(about, '@media (pointer: coarse) and (min-width: 761px) {');
    expect(b).toMatch(/\.a-bar-name \{[^}]*flex: 0 1 auto;[^}]*min-width: 0;[^}]*white-space: normal/);
  });
  it('the counter at the cartridge end is dropped from 1000 px, where two columns cannot hold it beside the longest name', () => {
    expect(block(about, '@media (pointer: coarse) and (min-width: 1000px) {')).toContain('.a-bar-cap { display: none; }');
  });
  it('below 1000 px the two columns are one, on touch only', () => {
    const b = block(about, '@media (pointer: coarse) and (min-width: 761px) and (max-width: 999px) {');
    expect(b).toContain('grid-template-columns: 1fr');
  });
});
