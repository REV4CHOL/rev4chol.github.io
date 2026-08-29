import type { FilmRef } from './content';

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/);
  return m ? m[1] : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  return m ? m[1] : null;
}

/** The generic escape hatch: any platform's Share ▸ Embed iframe (Facebook,
 *  TikTok, …). Accepts the full pasted snippet or a bare player url; only
 *  https survives — anything else (javascript:, http:, prose) is refused. */
export function iframeSrc(input: string): string | null {
  const m = input.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  const url = (m ? m[1] : input).trim();
  return /^https:\/\//i.test(url) ? url : null;
}

export function embedSrc(film: FilmRef): string | null {
  if (film.type === 'youtube') {
    const id = youtubeId(film.src);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (film.type === 'vimeo') {
    const id = vimeoId(film.src);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  if (film.type === 'embed') return iframeSrc(film.src);
  return null;
}
