import { describe, expect, it } from 'vitest';
import { SESSION_TAG, sessionTag } from '../src/shell/session-tag';

describe('the HUD session tag (security review 2026-10-07)', () => {
  it('keeps a stored tag of its own shape, so one visit shows one tag on every page', () => {
    expect(sessionTag('RVL-3F0A')).toBe('RVL-3F0A');
  });

  it('replaces anything else in storage with a new tag and never shows it', () => {
    for (const stored of ['<b>planted</b>', 'RVL-3f0a', 'RVL-3F0', 'RVL-3F0AB', ' RVL-3F0A', 'RVL-3F0A\n', '']) {
      expect(sessionTag(stored, () => 0.5)).toBe('RVL-8000');
    }
  });

  it('makes a new tag when none is stored: always four hex digits', () => {
    expect(sessionTag(null, () => 0)).toBe('RVL-0000');
    expect(sessionTag(null, () => 0.999999)).toBe('RVL-FFFF');
    // Math.random().toString(16) cut 0.5 down to "RVL-8"; a short tag would now be refused on the next page
    expect(sessionTag(null, () => 0.5)).toBe('RVL-8000');
    for (let i = 0; i < 200; i++) expect(sessionTag(null)).toMatch(SESSION_TAG);
  });
});
