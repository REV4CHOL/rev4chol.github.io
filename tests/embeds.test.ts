import { describe, expect, it } from 'vitest';
import { embedSrc, iframeSrc, vimeoId, youtubeId } from '../src/lib/embeds';

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

describe('pasted embed codes', () => {
  // HOW-TO-EDIT promises `src` accepts the platform's full Share ▸ Embed
  // snippet verbatim — the id must come out of the surrounding iframe markup
  it('extracts the id from a pasted YouTube embed snippet', () => {
    expect(
      youtubeId(
        '<iframe width="560" height="315" src="https://www.youtube.com/embed/aqz-KE-bpKQ?si=x1Y_z" title="YouTube video player" frameborder="0" allowfullscreen></iframe>',
      ),
    ).toBe('aqz-KE-bpKQ');
  });
  it('extracts the id from a pasted Vimeo embed snippet', () => {
    expect(
      vimeoId(
        '<iframe src="https://player.vimeo.com/video/76979871?h=8272103f6e&badge=0" width="640" height="360" frameborder="0" allowfullscreen></iframe>',
      ),
    ).toBe('76979871');
  });
});

describe('the generic embed type — any platform\'s iframe, verbatim', () => {
  const FB =
    '<iframe src="https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1026445899822328%2F&show_text=false&width=560&t=0" width="560" height="314" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen="true"></iframe>';

  it('pulls the player url out of a pasted Facebook reel snippet', () => {
    expect(iframeSrc(FB)).toBe(
      'https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1026445899822328%2F&show_text=false&width=560&t=0',
    );
  });

  it('passes a bare https url through untouched', () => {
    expect(iframeSrc('https://www.facebook.com/plugins/video.php?href=x')).toBe(
      'https://www.facebook.com/plugins/video.php?href=x',
    );
  });

  it('refuses non-https payloads', () => {
    expect(iframeSrc('http://evil.example/embed')).toBeNull();
    expect(iframeSrc('<iframe src="javascript:alert(1)"></iframe>')).toBeNull();
    expect(iframeSrc('just words')).toBeNull();
  });

  it('embedSrc serves the embed type verbatim from the pasted snippet', () => {
    expect(embedSrc({ type: 'embed', src: FB })).toBe(
      'https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1026445899822328%2F&show_text=false&width=560&t=0',
    );
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
