/**
 * The site's Content-Security-Policy (security review 2026-10-07). GitHub Pages lets a site send no headers of its
 * own, so the policy rides in a <meta> at the head of every page, put there at build time (vite.config.ts). Each
 * page's own inline scripts (the calm-mode class, the stale-deploy self-heal, the music boot) are allowed by their
 * sha256, worked out from the built page itself, so an edit to one can never outrun its hash.
 *
 * What each source is for:
 *  - script, connect, font: this site only. PixiJS runs without eval (pixi.js/unsafe-eval, in hero.ts and world.ts);
 *  - style 'unsafe-inline': the pages build style="--d:…" attributes;
 *  - img and media data:/blob:, worker blob:: PixiJS's video probe, its uploads and its workers;
 *  - frame https:: the film players (embeds.ts lets through only the platforms the films play from);
 *  - no plugins, no <base>, no forms.
 * Tried report-only on the live site first: PixiJS's eval and its data: video probe were all it raised.
 * Built in Node and tested in it, so it uses only what Node and a browser both have (crypto.subtle).
 */
const directives = (hashes: readonly string[]): string[] => [
  "default-src 'self'",
  ["script-src 'self'", ...hashes].join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  'frame-src https:',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];

/** The pages the build leaves exactly as they are: the archived ABOUT is never touched. */
export const UNTOUCHED_PAGES: readonly string[] = ['about-old.html'];

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

/** The sha256 of each inline script, as a CSP source. The HTML parser turns CR LF into LF before a script runs, so
 *  the hash is of the text with LF line ends, whatever the file on disk has. */
export async function inlineScriptHashes(html: string): Promise<string[]> {
  const out = new Set<string>();
  for (const [, attrs, body] of html.matchAll(SCRIPT)) {
    if (/(?:^|\s)src\s*=/i.test(attrs)) continue;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.replace(/\r\n?/g, '\n')));
    out.add(`'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`);
  }
  return [...out];
}

export async function policyOf(html: string): Promise<string> {
  return directives(await inlineScriptHashes(html)).join('; ');
}

/** The page with the policy and a referrer policy at the top of its head: right after <meta charset>, which belongs
 *  in the first 1024 bytes, or first when there is none. A policy in a <meta> covers only what comes after it. */
export async function withCsp(html: string): Promise<string> {
  const head = /<head\b[^>]*>/i.exec(html);
  if (!head) throw new Error('a page without <head> cannot carry the Content-Security-Policy');
  let at = head.index + head[0].length;
  const lead = /^(?:\s+|<!--[\s\S]*?-->)*/.exec(html.slice(at))![0];
  const lineBreak = lead.lastIndexOf('\n');
  const indent = lineBreak >= 0 && /^[ \t]*$/.test(lead.slice(lineBreak + 1)) ? lead.slice(lineBreak + 1) : '';
  const charset = /^<meta\s+charset\s*=[^>]*>/i.exec(html.slice(at + lead.length));
  if (charset) at += lead.length + charset[0].length;
  const tags =
    `\n${indent}<meta http-equiv="Content-Security-Policy" content="${await policyOf(html)}">` +
    `\n${indent}<meta name="referrer" content="strict-origin-when-cross-origin">`;
  return html.slice(0, at) + tags + html.slice(at);
}
