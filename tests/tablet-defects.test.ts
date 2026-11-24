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

describe('the film page on a portrait tablet: the format stamp clears the status line (it stood on PROCEDURE :: XIEU-LONG // ONLINE)', () => {
  const project = css('project');
  it('the stamp stays 124 px or more from the top once the band can hold it, and is capped to the room above the rail', () => {
    const b = block(project, '@media (pointer: coarse) and (min-width: 761px) and (orientation: portrait) {');
    expect(b).toContain('.p-band-t::after {');
    expect(b).toContain('top: max(calc(50% - 0.5em), clamp(0px, calc((100% - 189px) * 200), 124px));');
    expect(b).toMatch(/font-size: min\(var\(--t-2xl\), calc\(var\(--bh\) - 142px/);
  });
  it('a desktop (fine pointer) and a phone never see it', () => {
    expect(block(project, '@media (pointer: coarse) and (min-width: 761px) and (orientation: portrait) {')).not.toContain('max-width');
    expect(project.indexOf('@media (pointer: coarse) and (min-width: 761px) and (orientation: portrait)')).toBeGreaterThan(project.indexOf('.p-band-t::after { display: none; }'));
  });
});

describe('WORK on a tablet: the legend over the floor fits the screen (800 px: it ran off both edges, "G TO MOVE AROUND")', () => {
  const components = css('components');
  it('a touch screen wider than a phone sets the legend balanced between its pieces, inside the screen', () => {
    const b = block(components, '@media (pointer: coarse) and (min-width: 641px) {');
    expect(b).toContain('.floor-hint { width: max-content; max-width: calc(100vw - 32px); }');
    expect(b).toContain('.fh-text { display: block; white-space: normal; text-wrap: balance; }');
    expect(b).toContain('.fh-seg { display: inline-block; white-space: nowrap; }');
  });
  it('the block stands above the reveal, which stays the last rule', () => {
    expect(components.trimEnd().endsWith('body { visibility: visible; }')).toBe(true);
  });
  it("works.ts sets the legend in pieces that join back to the same words", () => {
    const src = readFileSync('src/pages/works.ts', 'utf8');
    expect(src).toContain("className = 'fh-seg'");
    expect(src).toContain("legend.split(' ▪ ')");
    expect(src).toContain('if (finePointer()) words.textContent = legend;'); // a fine pointer keeps its one text
  });
});

describe('touch targets on a tablet: the menu links and the three switches are 44 px tall to a finger', () => {
  const components = css('components');
  const head = '@media (pointer: coarse) and (min-width: 641px) {\n  .nav-links a::after, .hud-tr button::after';
  it('an invisible box, 44 px tall, on touch only and not on a phone: no padding, no margin, no layout of its own', () => {
    const b = block(components, head);
    expect(b).toContain(".nav-links a::after, .hud-tr button::after { content: ''; position: absolute; left: 0; right: 0; height: 44px; }");
    expect(b).toContain('.nav-links a::after { top: calc((100% - 44px) / 2); }');
    expect(b).toContain('.hud-tr button { position: relative; }');
    expect(b).toContain('.hud-tr button::after { top: -10px; }');
    expect(b).not.toMatch(/padding|margin/);
  });
  it('from 1100 px, where the two rows stand 10 px apart, the boxes meet no closer than 4 px each way', () => {
    const b = block(components, '@media (pointer: coarse) and (min-width: 1100px) {');
    expect(b).toContain('.nav-links a::after { top: calc(100% - 40px); }');
    expect(b).toContain('.hud-tr button::after { top: -4px; }');
  });
  it('stands after the phone block (the phone keeps its own padding trick)', () => {
    expect(components.indexOf(head)).toBeGreaterThan(components.indexOf('.hud-tr button { padding: 10px 4px 14px; margin: -10px 0 -14px; }'));
  });
});
