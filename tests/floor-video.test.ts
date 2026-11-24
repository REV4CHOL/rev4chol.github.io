import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// THE FLOOR'S VIDEO, AS SOURCE PINS (spec 2026-11-24-work-wall-video-design). The rules themselves are tested where
// they live (tests/quality.test.ts, wall-files, wall, wall-watch, playback); these pins hold the wiring between them,
// which no unit test reaches: the world needs a GPU. Every pin is one line of source or a pattern that crosses line
// ends with \s, so it reads the same on an LF and a CRLF checkout.
const read = (file: string): string => readFileSync(file, 'utf8');

describe("a pane's tile of the wall video (pins)", () => {
  const tile = read('src/works/tile.ts');

  it('lies above the poster and under the own loop', () => {
    expect(tile).toContain('this.card.addChildAt(s, this.card.getChildIndex(this.posterSprite) + 1);');
    expect(tile).toContain('this.card.addChildAt(s, this.card.getChildIndex(this.wallSprite ?? this.posterSprite) + 1);');
  });

  it('is given back by the pane without destroying what is shared: the sprite alone, no texture, no source', () => {
    expect(tile).toContain('setWall(tex: Texture | null): void {');
    expect(tile).toContain('this.wallSprite.destroy();');
    expect(tile).not.toMatch(/wallSprite\.destroy\(\{/);
  });
});

describe("the floor's video follows the mode (pins)", () => {
  const world = read('src/works/world.ts');

  it('pausing gives every video back, and one guard keeps every playback pass asleep under the list', () => {
    expect(world).toMatch(/pause\(\): void \{[\s\S]*?this\.playback\.releaseAll\(\);\s+this\.dropWall\(\);\s+this\.app\.stop\(\);/);
    expect(world).toContain('paused: () => w.paused,');
    expect(read('src/works/playback.ts')).toContain('if (this.policy.paused()) return;');
  });

  it('the mode is worked out at a build, at once on a step down, never on a step up', () => {
    expect(world).toContain('w.takeMode(w.modeNow());'); // the build: a load, a chapter flip
    expect(world).toMatch(/resume\(\): void \{[\s\S]*?this\.takeMode\(this\.modeNow\(\)\);/); // the return from THE LIST
    expect(world).toContain('modeAfterTierChange(w.mode, tierWas, t, w.facts())');
  });

  it("the mode rations the panes' own loops: how many, which panes, and how long a sleeping pane keeps its video", () => {
    expect(world).toContain('cap: () => ownLoopCap(w.mode, quality.tier(), isMobile()),');
    expect(world).toContain('releaseAfter: () => releaseAfterMs(w.mode),');
    expect(world).toMatch(/mayPlay: \(slug\) => w\.mode === 'own' \|\| w\.mode === 'posters'/);
  });

  it('the page tells the floor its chapter', () => {
    expect(read('src/pages/works.ts')).toContain('}, key);');
  });

  it("the wall unit is the world's: the panes give their tiles back before it is destroyed, at THE LIST and at a flip", () => {
    expect(world).toMatch(/private dropWall\(\): void \{[\s\S]*?tile\.setWall\(null\);[\s\S]*?this\.wall\.destroy\(\);/);
    expect(world).toMatch(/destroy\(\): void \{[\s\S]*?this\.dropWall\(\);[\s\S]*?this\.app\.destroy\(true, \{ children: true \}\);/);
  });

  it('a pinned page obeys no watch, and a floor on its way out takes up no new video', () => {
    expect(world).toMatch(/onVerdict: \(\) => \{\s+if \(this\.wall !== wall \|\| this\.exiting \|\| quality\.pinned\(\) !== null\) return;/);
    expect(world).toMatch(/onFail: \(\) => \{\s+if \(this\.wall !== wall \|\| this\.exiting\) return;/);
  });
});

describe('waste removed on every tier (pins)', () => {
  const tile = read('src/works/tile.ts');
  const world = read('src/works/world.ts');

  it('a pane asks for a hover clip only when the manifest lists one for its film', () => {
    expect(tile).toContain('if (!hasHoverClip(this.project.slug) || this.hoverMissing) return;');
  });

  it("each pane's poster texture is destroyed with its source, before the app is", () => {
    expect(tile).toMatch(/destroyPoster\(\): void \{[\s\S]*?tex\.destroy\(true\);/);
    expect(world).toMatch(/destroy\(\): void \{[\s\S]*?tile\.destroyPoster\(\);[\s\S]*?this\.app\.destroy\(true, \{ children: true \}\);/);
  });
});

describe("a pane reports its own loop to the health reading (pins)", () => {
  const tile = read('src/works/tile.ts');

  it("the frames presented are the element's own totals: decoded, less dropped", () => {
    expect(tile).toContain('loopSample(now: number, fps: number): LoopSample | null {');
    expect(tile).toContain('presented: q.totalVideoFrames - q.droppedVideoFrames,');
  });

  it('the clock starts when the pane is told to play, and a browser without the totals reports nothing', () => {
    expect(tile).toContain('this.playSince = performance.now();');
    expect(tile).toContain("typeof v.getVideoPlaybackQuality !== 'function'");
  });
});
