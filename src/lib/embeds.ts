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

/** The player url for a film. `autoplay` (default true): a part of a film in parts that waits its turn starts
 *  without it. `origin`: a YouTube player that talks back over postMessage (enablejsapi) to this page. */
export function embedSrc(film: FilmRef, opts: { autoplay?: boolean; origin?: string } = {}): string | null {
  const auto = opts.autoplay === false ? 0 : 1;
  if (film.type === 'youtube') {
    const id = youtubeId(film.src);
    if (!id) return null;
    const api = opts.origin ? `&enablejsapi=1&origin=${encodeURIComponent(opts.origin)}` : '';
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=${auto}&rel=0${api}`;
  }
  if (film.type === 'vimeo') {
    const id = vimeoId(film.src);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=${auto}` : null;
  }
  if (film.type === 'embed') return iframeSrc(film.src);
  return null;
}
