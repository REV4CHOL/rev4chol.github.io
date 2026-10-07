import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UNTOUCHED_PAGES, inlineScriptHashes, policyOf, withCsp } from '../src/lib/csp';

const sha = (s: string) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;

const CALM = "document.documentElement.classList.add('calm')";
const PAGE = [
  '<!doctype html>',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="utf-8">',
  '    <meta name="viewport" content="width=device-width">',
  '    <title>T</title>',
  `    <script>${CALM}</script>`,
  '    <link rel="stylesheet" href="/assets/a.css">',
  '    <script type="module" crossorigin src="/assets/index.js"></script>',
  '  </head>',
  '  <body><script>window.x = 1</script></body>',
  '</html>',
].join('\n');

const CSP_META = /\n\s*<meta http-equiv="Content-Security-Policy"[^>]*>\n\s*<meta name="referrer"[^>]*>/;

describe('the Content-Security-Policy (security review 2026-10-07)', () => {
  it('allows each inline script by its sha256, and none of the scripts that come from a file', async () => {
    expect(await inlineScriptHashes(PAGE)).toEqual([sha(CALM), sha('window.x = 1')]);
  });

  it('hashes a script as the browser runs it, with LF line ends, whatever the file on disk has', async () => {
    expect(await inlineScriptHashes('<head><script>a()\r\nb()\rc()</script></head>')).toEqual([sha('a()\nb()\nc()')]);
  });

  it('keeps the page to this site and the players to frames: no eval, no plugins, no <base>, no forms', async () => {
    const policy = await policyOf(PAGE);
    expect(policy.split('; ')).toEqual([
      "default-src 'self'",
      `script-src 'self' ${sha(CALM)} ${sha('window.x = 1')}`,
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
    ]);
    expect(policy).not.toMatch(/unsafe-eval|\*/);
  });

  it('puts the policy right after <meta charset>, before anything the page loads, and changes nothing else', async () => {
    const out = await withCsp(PAGE);
    const at = out.indexOf('<meta http-equiv="Content-Security-Policy"');
    expect(at).toBeGreaterThan(out.indexOf('<meta charset="utf-8">'));
    for (const tag of ['<meta name="viewport"', '<title', '<script', '<link']) expect(at).toBeLessThan(out.indexOf(tag));
    expect(out).toContain(`<meta http-equiv="Content-Security-Policy" content="${await policyOf(PAGE)}">`);
    expect(out).toContain('<meta name="referrer" content="strict-origin-when-cross-origin">');
    expect(out.replace(CSP_META, '')).toBe(PAGE);
  });

  it('looks past comments for <meta charset>; a head without one takes the policy first', async () => {
    const commented = '<head>\n  <!-- the head -->\n  <meta charset="utf-8">\n  <script>a()</script>\n</head>';
    const out = await withCsp(commented);
    expect(out.indexOf('Content-Security-Policy')).toBeGreaterThan(out.indexOf('<meta charset'));
    expect(out.replace(CSP_META, '')).toBe(commented);
    const bare = await withCsp('<html><head><script>a()</script></head><body></body></html>');
    expect(bare.indexOf('Content-Security-Policy')).toBeLessThan(bare.indexOf('<script'));
  });

  it('refuses a page with no head rather than ship it without a policy', async () => {
    await expect(withCsp('<p>no head</p>')).rejects.toThrow(/head/);
  });

  it('leaves the archived ABOUT as it is', () => {
    expect(UNTOUCHED_PAGES).toEqual(['about-old.html']);
  });
});
