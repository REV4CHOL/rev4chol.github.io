import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cueKicker, cueState } from '../src/lib/swipe-nav';
import { switchLabel } from '../src/shell/switches';

// The owner's testers, 2026-09-30: "they dont know how to navigate the website or click or do actions, and they feel
// lost". Two first-time visitors (a laptop, a phone) were walked through the live site. What they met in the page's
// chrome: text printed on text wherever a page scrolled under the fixed header; switches that read as a status line;
// decoration shaped like buttons; a scroll cue riding over the text being read.

const css = (file: string) => readFileSync(`src/styles/${file}.css`, 'utf8');
/** A top-level rule's body (top-level rules start their line; the phone overrides inside @media are indented). */
const rule = (sheet: string, sel: string) => {
  const at = sheet.indexOf(`\n${sel} {`);
  return at < 0 ? '' : sheet.slice(at, sheet.indexOf('}', at));
};

describe("the header's veil, on every page", () => {
  const c = css('components');

  it('the fade of the page\'s own black stands behind the header everywhere, not only on the homepage and the floor', () => {
    expect(rule(c, '.nav')).toContain('position: fixed');
    expect(c).toMatch(/\n\.nav \{\s+background: linear-gradient\(180deg, var\(--void\) 0%/);
    expect(c).not.toMatch(/\.page-work \.nav,\s*\.page-home \.nav \{/);
  });

  it('full ink and the void halo on the wordmark, the links and the switches, on every page', () => {
    expect(c).toContain('\n.nav-links a { color: var(--bone); }');
    expect(c).toMatch(/\n\.brand, \.nav-links a, \.hud-tr \{\s+text-shadow: 0 0 4px rgba\(6, 6, 6, 0\.95\)/);
  });

  it('once a page has scrolled under the header, the veil holds dark through the switches\' row', () => {
    expect(c).toContain('.rvl-scrolled .nav::before { opacity: 1; }');
    expect(readFileSync('src/shell/shell.ts', 'utf8')).toContain("classList.toggle('rvl-scrolled', window.scrollY > 8)");
  });

  it("the switches stand above the header's veil, never dimmed by it", () => {
    const z = (sel: string) => Number(/z-index: (\d+)/.exec(rule(c, sel))?.[1]);
    expect(z('.hud-tr')).toBeGreaterThan(z('.nav'));
  });

  it('a rail tag that travels with its section stops under the veil, not inside it', () => {
    expect(rule(css('project'), '.p-rail-tag')).toContain('top: 136px');
    expect(rule(css('about'), '.a-rail-tag')).toContain('top: 136px');
  });
});

describe('the switches say their state', () => {
  it('in words: a 5 px dot, filled or hollow, was the whole state', () => {
    expect(switchLabel('SFX', true)).toBe('SFX ON');
    expect(switchLabel('MUSIC', false)).toBe('MUSIC OFF');
    const hud = readFileSync('src/shell/hud.ts', 'utf8');
    expect(hud).not.toMatch(/[●○]/);
    expect(hud).toContain("switchLabel('MOTION', !calmActive())");
  });

  it('a switch that is off looks off', () => {
    expect(css('components')).toContain('.hud button[aria-pressed="false"]');
  });
});

describe("a phone's chrome", () => {
  const c = css('components');
  const phone = c.slice(c.indexOf("/* A PHONE'S CHROME"));

  it('drops the bottom readouts and the film count on every page (they were printed over the page\'s text)', () => {
    expect(phone).toContain('.hud-bl, .hud-br { display: none; }');
    expect(phone).toContain('#hud-count { display: none; }');
  });

  it("holds the scrolled veil solid through the switches' row (the page's text showed through them as a ghost)", () => {
    expect(phone).toContain('.nav::before { height: 184px; background: linear-gradient(180deg, var(--void) 0%, var(--void) 70%, transparent 100%); }');
  });

  it('gives the switches a thumb\'s target', () => {
    expect(phone).toMatch(/\.hud-tr button \{ padding: 10px 4px 14px; margin: -10px 0 -14px; \}/);
  });

  it('no page is wider than its screen: the body clips what reaches past it', () => {
    expect(rule(css('base'), 'body')).toContain('overflow-x: clip');
  });

  it("the contact page's first line stands under the switches, not on their row", () => {
    expect(css('contact')).toMatch(/\.c-status \{ left: 16px; right: 16px; top: 136px; \}/);
  });

  it("the city's one line of instructions stands under the switches: its phone rule comes after the rule it overrides", () => {
    const s = css('story');
    const base = s.indexOf('\n.a3-hint {');
    const over = s.search(/\n[ \t]+\.a3-hint \{ top: /);
    expect(base).toBeGreaterThan(-1);
    expect(over).toBeGreaterThan(base);
  });
});

describe('the scroll cue', () => {
  it('names the next page only when scrolling on would leave for it', () => {
    expect(cueState(true, 0)).toBe('next');
    expect(cueState(true, 900)).toBe('next');
  });

  it('on a page with more of itself below, it is a plain scroll hint at the top', () => {
    expect(cueState(false, 0)).toBe('scroll');
    expect(cueState(false, 40)).toBe('scroll');
  });

  it('it stands down while the visitor reads mid-page (it rode over the text)', () => {
    expect(cueState(false, 41)).toBe('hidden');
    expect(cueState(false, 5000)).toBe('hidden');
  });

  it('the page wires it, and a press in the hint state scrolls a screen instead of leaving', () => {
    const src = readFileSync('src/lib/swipe-nav.ts', 'utf8');
    expect(src).toContain('cue.dataset.state = cueState(may(1), top());');
    expect(src).toContain("if (cue.dataset.state === 'scroll') {");
    const c = css('components');
    expect(c).toContain('.swipe-cue[data-state="hidden"] { opacity: 0; pointer-events: none; }');
    expect(c).toContain('.swipe-cue[data-state="scroll"] .swc-label { display: none; }');
  });

  it('a touch screen is told what the word at its foot is: NEXT PAGE over the page\'s name, nothing over a plain scroll hint', () => {
    expect(cueKicker(true)).toBe('SCROLL DOWN ▾');
    expect(cueKicker(false)).toBe('NEXT PAGE');
    expect(readFileSync('src/lib/swipe-nav.ts', 'utf8')).toContain('kicker.textContent = cueKicker(finePointer());');
    const c = css('components');
    expect(c).toMatch(/\n\.swipe-cue \.swc-kicker \{ display: block;/);
    expect(c).toContain('@media (pointer: coarse) { .swipe-cue[data-state="scroll"] .swc-kicker { display: none; } }');
  });

  it('it can be read: 11 px, full ink, the void halo (it was 9 px at 80 % over a moving picture)', () => {
    const cue = rule(css('components'), '.swipe-cue');
    expect(cue).toContain('font-size: 11px');
    expect(cue).toContain('text-shadow: 0 0 4px rgba(6, 6, 6, 0.95)');
    expect(cue).not.toContain('opacity: 0.8');
  });

  it("the contact page's end mark stands clear of it", () => {
    expect(rule(css('contact'), '.c-eof')).toContain('padding: 56px 28px 96px');
  });
});

describe('only what can be pressed looks pressable', () => {
  it("a genre is a tag, not the site's pill button", () => {
    const pill = rule(css('project'), '.p-pill');
    expect(pill).toContain('border: 1px dotted');
    expect(pill).not.toContain('border-radius: 999px');
  });

  it('a skill row no longer fills on hover, as the real links do', () => {
    expect(css('about')).not.toContain('.a-bar:hover');
  });

  it('a status line does not end in the arrow the buttons wear', () => {
    expect(readFileSync('src/pages/contact.ts', 'utf8')).toContain("['STATUS', 'RECEIVING'],");
    expect(readFileSync('src/pages/about.ts', 'utf8')).toContain("['STATUS', 'ACTIVE'],");
  });

  it('the crosshair boxes itself over every link and button, labelled or not', () => {
    expect(readFileSync('src/shell/cursor.ts', 'utf8')).toContain("c.classList.toggle('on-link', !!(e.target as Element).closest?.('a, button'))");
    expect(css('base')).toContain('#cursor.has-label .x, #cursor.on-link .x {');
  });
});

describe('small words', () => {
  it('a touch screen is told to TAP, not to CLICK', () => {
    expect(readFileSync('src/shell/boot.ts', 'utf8')).toContain("finePointer() ? 'CLICK TO SKIP' : 'TAP TO SKIP'");
  });

  it("the homepage's one plain line, who this is, is no longer its smallest type", () => {
    expect(rule(css('components'), '.home-data')).toContain('font-size: 13px');
  });

  it("the city's dials are readable and a thumb can hit them", () => {
    const s = css('story');
    expect(rule(s, '.a3-fly button')).toContain('font-size: var(--t-xs)');
    expect(rule(s, '.a3-tod button')).toContain('font-size: var(--t-xs)');
    expect(s).toMatch(/\.a3-fly button, \.a3-tod button \{ min-height: 44px;/);
  });
});
