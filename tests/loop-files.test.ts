import { describe, expect, it } from 'vitest';
import { pickLoopFiles, sortLoopFiles } from '../src/lib/loop-files';

describe('project loop file rules', () => {
  it('any video name counts; canonical names outrank, the rest go A→Z', () => {
    expect(sortLoopFiles(['zeta.mp4', 'loop.mp4', 'alpha.webm', 'preview.mp4'])).toEqual([
      'preview.mp4',
      'loop.mp4',
      'alpha.webm',
      'zeta.mp4',
    ]);
  });

  it('filters to video files and drops reserved names + the self-hosted film', () => {
    expect(
      pickLoopFiles(
        ['MY CUT v2.MP4', 'hover.mp4', 'film.mp4', 'poster.jpg', 'notes.txt', 'final.mov'],
        ['final.mov'],
      ),
    ).toEqual(['MY CUT v2.MP4']);
  });

  it('reserved matching is case-insensitive', () => {
    expect(pickLoopFiles(['HOVER.MP4', 'clip.mov'])).toEqual(['clip.mov']);
  });
});
