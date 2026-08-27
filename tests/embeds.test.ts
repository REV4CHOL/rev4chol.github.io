import { describe, expect, it } from 'vitest';
import { embedSrc, vimeoId, youtubeId } from '../src/lib/embeds';

describe('youtubeId', () => {
  it('parses common url shapes', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(youtubeId('https://youtu.be/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(youtubeId('https://www.youtube.com/shorts/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(youtubeId('https://www.youtube.com/embed/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
  });
  it('rejects junk', () => {
    expect(youtubeId('https://example.com/watch?v=nope')).toBeNull();
  });
});

describe('vimeoId', () => {
  it('parses plain and /video/ urls', () => {
    expect(vimeoId('https://vimeo.com/76979871')).toBe('76979871');
    expect(vimeoId('https://vimeo.com/video/76979871')).toBe('76979871');
  });
  it('rejects junk', () => {
    expect(vimeoId('https://vimeo.com/about')).toBeNull();
  });
});

describe('embedSrc', () => {
  it('builds privacy-friendly embed urls', () => {
    expect(embedSrc({ type: 'youtube', src: 'https://youtu.be/aqz-KE-bpKQ' })).toBe(
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0',
    );
    expect(embedSrc({ type: 'vimeo', src: 'https://vimeo.com/76979871' })).toBe(
      'https://player.vimeo.com/video/76979871?autoplay=1',
    );
  });
  it('returns null for local films and unparseable urls', () => {
    expect(embedSrc({ type: 'local', src: 'film.mp4' })).toBeNull();
    expect(embedSrc({ type: 'youtube', src: 'https://example.com/x' })).toBeNull();
  });
});
