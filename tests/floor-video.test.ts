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
