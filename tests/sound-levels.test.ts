import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VOLUME } from '../src/lib/music';

// The owner, 2026-11-24: "SFX a bit too loud. Music too loud too".
describe('how loud the site is', () => {
  const sfx = readFileSync('src/lib/sound.ts', 'utf8');

  it('every effect leaves through the one master bus at SFX_LEVEL, 0.7 (it stood at 1)', () => {
    expect(sfx).toContain('export const SFX_LEVEL = 0.7;');
    expect(sfx).toContain('this.master.gain.value = SFX_LEVEL;');
    expect(sfx.split('new AudioContext(').length - 1).toBe(1); // (one context, so one bus: nothing sounds around it)
  });

  it('the music plays at 0.3 (it stood at 0.55), and every page head ramps to the same number', () => {
    expect(VOLUME).toBe(0.3);
    for (const page of ['index.html', 'works.html', 'about.html', 'contact.html', 'project.html', 'story.html', '404.html']) {
      const head = readFileSync(page, 'utf8');
      expect(head, page).toContain('if(a.volume<0.3){');
      expect(head, page).toContain('a.volume=Math.min(0.3,0.03*k)');
      expect(head, page).not.toContain('0.55');
    }
  });
});
