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

describe('the generic embed type — a known platform\'s iframe, verbatim', () => {
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

  it('takes a player only from a platform the films play from (security review 2026-10-07)', () => {
    for (const url of [
      'https://www.facebook.com/plugins/video.php?href=x',
      'https://facebook.com/plugins/video.php?href=x',
      'https://www.tiktok.com/embed/v2/7212345678901234567',
      'https://www.instagram.com/reel/abc/embed',
      'https://player.vimeo.com/video/76979871',
      'https://www.youtube.com/embed/aqz-KE-bpKQ',
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
      'HTTPS://WWW.FACEBOOK.COM/plugins/video.php?href=x',
    ]) {
      expect(iframeSrc(url), url).toBe(url);
    }
    for (const url of [
      'https://player.example/embed/1',
      'https://www.facebook.com.player.example/plugins/video.php',
      'https://www.facebook.com@player.example/plugins/video.php',
      'https://player.example/?u=https://www.facebook.com/',
      'https://www.facebook.com:8443/plugins/video.php',
      'https://vimeo.com.player.example/video/1',
    ]) {
      expect(iframeSrc(url), url).toBeNull();
    }
    expect(iframeSrc('<iframe src="https://player.example/embed/1" allowfullscreen></iframe>')).toBeNull();
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
  it("a film in parts (owner 2026-09-28): a part that waits has no autoplay, and each part's player talks", () => {
    const f = { type: 'youtube' as const, src: 'https://www.youtube.com/embed/60ga3V46lk4' };
    expect(embedSrc(f, { autoplay: false, origin: 'https://rev4chol.github.io' })).toBe(
      'https://www.youtube-nocookie.com/embed/60ga3V46lk4?autoplay=0&rel=0&enablejsapi=1&origin=https%3A%2F%2Frev4chol.github.io',
    );
    expect(embedSrc({ type: 'vimeo', src: 'https://vimeo.com/76979871' }, { autoplay: false })).toBe(
      'https://player.vimeo.com/video/76979871?autoplay=0',
    );
  });
});
