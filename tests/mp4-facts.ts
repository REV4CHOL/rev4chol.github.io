import { readFileSync } from 'node:fs';

// Two readers of an MP4's boxes for the content tests. No ffmpeg: plain bytes. (tests/content-files.test.ts carries
// the same two of its own.)

/** An mp4's top-level boxes in file order, and the movie's length in seconds from moov/mvhd. */
export function mp4Facts(file: string): { boxes: string[]; seconds: number; bytes: number } {
  const b = readFileSync(file);
  const boxes: string[] = [];
  let seconds = NaN;
  for (let at = 0; at + 8 <= b.length; ) {
    let size = b.readUInt32BE(at);
    let head = 8;
    if (size === 1) {
      size = Number(b.readBigUInt64BE(at + 8));
      head = 16;
    } else if (size === 0) size = b.length - at;
    const type = b.toString('latin1', at + 4, at + 8);
    boxes.push(type);
    if (type === 'moov') {
      for (let c = at + head; c + 8 <= at + size; ) {
        const childSize = b.readUInt32BE(c);
        if (b.toString('latin1', c + 4, c + 8) === 'mvhd') {
          // FullBox: version, flags; then v0 = 32-bit times, v1 = 64-bit times; then timescale, duration
          const v1 = b[c + 8] === 1;
          const timescale = b.readUInt32BE(c + (v1 ? 28 : 20));
          const duration = v1 ? Number(b.readBigUInt64BE(c + 32)) : b.readUInt32BE(c + 24);
          seconds = duration / timescale;
          break;
        }
        if (childSize < 8) break;
        c += childSize;
      }
    }
    if (size < 8) break;
    at += size;
  }
  return { boxes, seconds, bytes: b.length };
}

/** An mp4's picture size from moov/trak/tkhd (16.16 fixed point): the first track that has one. */

export function mp4Size(file: string): [number, number] | null {
  const b = readFileSync(file);
  const walk = (from: number, to: number): [number, number] | null => {
    for (let at = from; at + 8 <= to; ) {
      let size = b.readUInt32BE(at);
      let head = 8;
      if (size === 1) {
        size = Number(b.readBigUInt64BE(at + 8));
        head = 16;
      } else if (size === 0) size = to - at;
      if (size < 8) return null;
      const type = b.toString('latin1', at + 4, at + 8);
      if (type === 'tkhd') {
        // FullBox; v0 = 32-bit times: width at +84, height at +88; v1 = 64-bit times: +96, +100
        const v1 = b[at + 8] === 1;
        const w = b.readUInt32BE(at + (v1 ? 96 : 84)) / 65536;
        const h = b.readUInt32BE(at + (v1 ? 100 : 88)) / 65536;
        if (w > 0 && h > 0) return [w, h];
      } else if (type === 'moov' || type === 'trak') {
        const found = walk(at + head, at + size);
        if (found) return found;
      }
      at += size;
    }
    return null;
  };
  return walk(0, b.length);
}
