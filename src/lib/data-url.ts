/** A base64 data: URL's bytes and media type (empty bytes for anything else). The grain (shell/grain.ts) turns its
 *  noise frames into blob: URLs this way: the same PNG, named by a short URL instead of 100 KB of text. */
export function dataUrlBytes(url: string): { type: string; bytes: Uint8Array } {
  const m = /^data:([^;,]*)(?:;[^,]*)?;base64,(.*)$/s.exec(url);
  if (!m) return { type: '', bytes: new Uint8Array(0) };
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { type: m[1], bytes };
}
