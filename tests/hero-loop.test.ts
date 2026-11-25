import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { heroMode, imageNext, veilLifted } from '../src/project/hero-loop';

// THE PHONE'S TOP LOOP PLAYS AT ONCE, WITH NO PLAY BUTTON (owner, 2026-11-25, an iPhone in Safari with Low Power Mode on:
// "I dont like the play button on the top previewer in the film's page. Remove it. I want the preview loop to
// automatically already play at the start"). iOS refused the hero video's play() and drew its own start glyph on it.
// The film page now does what the homepage and WORK's phone strip do (lib/autoplay.ts): on a refusal the loop stands as
// an MP4 inside an <img>, which Safari plays as a silent looping picture outside the video rules.
const page = readFileSync('src/pages/project.ts', 'utf8');
const css = readFileSync('src/styles/project.css', 'utf8');
const html = readFileSync('project.html', 'utf8');

describe('which picture carries the hero loop', () => {
  it('the video, while nothing has refused it, and whenever it is playing', () => {
    expect(heroMode({ playing: false, refused: false, imageLoops: null })).toBe('video');
    expect(heroMode({ playing: true, refused: true, imageLoops: true })).toBe('video'); // (a touch started it after all)
    expect(heroMode({ playing: true, refused: true, imageLoops: false })).toBe('video');
  });

  it('the image, once a play() was refused (on this page or earlier in the visit), until the browser says it cannot', () => {
    expect(heroMode({ playing: false, refused: true, imageLoops: null })).toBe('image');
    expect(heroMode({ playing: false, refused: true, imageLoops: true })).toBe('image');
  });

  it('the dithered poster, where a refused video cannot stand as an image either (a touch then starts the video)', () => {
    expect(heroMode({ playing: false, refused: true, imageLoops: false })).toBe('poster');
  });
});

describe('when the dither veil lifts', () => {
  const base = { poster: true, dead: false, videoReady: true, imageShown: true };
  it('never before the poster is drawn, never on a dead hero', () => {
    expect(veilLifted({ ...base, poster: false, mode: 'video' })).toBe(false);
    expect(veilLifted({ ...base, dead: true, mode: 'video' })).toBe(false);
    expect(veilLifted({ ...base, dead: true, mode: 'image' })).toBe(false);
  });

  it("on the video's canplay, as before; on the image's first frame; never in the poster's mode", () => {
    expect(veilLifted({ ...base, mode: 'video' })).toBe(true);
    expect(veilLifted({ ...base, videoReady: false, mode: 'video' })).toBe(false);
    expect(veilLifted({ ...base, mode: 'image' })).toBe(true);
    expect(veilLifted({ ...base, imageShown: false, mode: 'image' })).toBe(false); // (let go off screen, or still loading)
    expect(veilLifted({ ...base, mode: 'poster' })).toBe(false); // (a refused video's still frame is not the loop)
  });
});

describe("an image that fails", () => {
  it('walks on through the loop names the folder may hold', () => {
    expect(imageNext(0, 4, false)).toBe(1);
    expect(imageNext(2, 4, false)).toBe(3);
  });

  it('at the end of the names, or on a file the video has already loaded from, this browser shows no MP4 in an image', () => {
    expect(imageNext(3, 4, false)).toBeNull();
    expect(imageNext(0, 4, true)).toBeNull(); // (a real file: no need to ask for every other name)
  });
});

describe('the page wires it', () => {
  it('a refused play() is noted, and a visit already refused starts on the image', () => {
    expect(page).toContain("import { autoplayRefused, imageLoopsWork, isRefusal, noteImageLoops, noteRefusal, onRefusal } from '../lib/autoplay';");
    expect(page).toContain('if (isRefusal(e)) noteRefusal();');
    expect(page).toContain('onRefusal(apply);');
    expect(page).toContain('heroMode({ playing, refused: autoplayRefused(), imageLoops: imageLoopsWork() })');
  });

  it('the image is the video\'s twin: same box, same fit, same hiccup, the same calm', () => {
    expect(css).toContain('.p-hero video, .p-hero #p-hero-img, .p-hero #p-hero-veil {');
    expect(css).toContain('.p-hero--fit video, .p-hero--fit #p-hero-img, .p-hero--fit #p-hero-veil {');
    expect(css).toContain('#p-hero-video, #p-hero-img { animation: p-vhs 13s steps(2) infinite; }');
    expect(css).toContain('.rvl-calm #p-hero-video, .rvl-lite #p-hero-video, .rvl-calm #p-hero-img, .rvl-lite #p-hero-img { animation: none; }');
  });

  it("iOS's own start glyph is never drawn on the hero video (its own rule: a selector list would drop it elsewhere)", () => {
    expect(css).toMatch(/\n#p-hero-video::-webkit-media-controls-start-playback-button \{ display: none !important; -webkit-appearance: none; \}/);
    expect(css).not.toMatch(/,\s*#p-hero-video::-webkit-media-controls-start-playback-button/);
  });

  // The owner, 2026-11-25, after the first fix: "for brief seconds when the film page is loading, I can still see the
  // play button as visuals before it dissapear". The veil is a canvas, blank until the poster is dithered onto it, and a
  // blank canvas is see-through: the refused video showed under it, with iOS's glyph, until the poster arrived.
  it('the veil covers the video from the first paint: it is opaque before the poster is drawn on it', () => {
    expect(css).toMatch(/\n#p-hero-veil \{[^}]*background: #000;[^}]*\}/);
    expect(css).toMatch(/\n#p-hero-veil \{[^}]*z-index: 1;[^}]*\}/); // (over the video and the image)
    expect(html.indexOf('id="p-hero-veil"')).toBeGreaterThan(html.indexOf('id="p-hero-video"'));
  });

  it('let go while the hero is off the screen, back when it returns; a touch anywhere tries the real video again', () => {
    expect(page).toContain('new IntersectionObserver(');
    expect(page).toContain("img.removeAttribute('src');");
    expect(page).toContain("window.addEventListener('pointerdown', retry, { passive: true });");
    expect(page).toContain("window.addEventListener('touchend', retry, { passive: true });");
    // (a video the system stops after it took over hands the loop back, and a touch tries it again)
    expect(page).toMatch(/hero\.addEventListener\('pause', \(\) => \{\s+if \(!playing \|\| hero\.ended\) return;\s+playing = false;\s+apply\(\);/);
  });

  it('the hero still plays the film when pressed, and the frames still wait for the hero', () => {
    expect(page).toContain("hero.classList.add('p-hero--plays');");
    expect(page).toContain("if (!(e.target as Element).closest('a, button')) open();");
    expect(html).toContain('<video id="p-hero-video" muted loop playsinline autoplay></video>');
  });
});
