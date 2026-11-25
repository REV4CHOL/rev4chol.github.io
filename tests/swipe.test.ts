import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { classifySwipe, glideCommit, navNeighbors, scrollEdge } from '../src/lib/swipe-nav';

// dx/dy are net pointer travel in px (screen coords: up is negative dy), dtMs gesture duration.
describe('classifySwipe — the calm-mode swipe gesture', () => {
  it('commits a deliberate upward swipe', () => {
    expect(classifySwipe(8, -90, 320)).toBe(true);
  });

  it('commits a short fast flick', () => {
    expect(classifySwipe(4, -50, 110)).toBe(true);
  });

  it('rejects a downward swipe (pull-to-refresh territory)', () => {
    expect(classifySwipe(0, 90, 300)).toBe(false);
  });

  it('rejects horizontal intent even with some rise', () => {
    expect(classifySwipe(120, -80, 300)).toBe(false);
  });

  it('rejects a slow drift — resting a thumb is not a swipe', () => {
    expect(classifySwipe(0, -80, 2000)).toBe(false);
  });

  it('rejects tiny movements even when fast', () => {
    expect(classifySwipe(0, -30, 60)).toBe(false);
  });

  it('rejects a zero-time gesture instead of dividing by it', () => {
    expect(classifySwipe(0, -50, 0)).toBe(false);
  });
});

// dragPx is travel in the gesture's own direction, vh the viewport height,
// vel the release velocity in px/ms along that direction.
describe('glideCommit — release decision for the physical glide', () => {
  it('commits once the page has been dragged 22% of the viewport', () => {
    expect(glideCommit(200, 800, 0)).toBe(true);
  });

  it('springs back from a shallow, slow drag', () => {
    expect(glideCommit(100, 800, 0.2)).toBe(false);
  });

  it('commits a fast flick even when shallow', () => {
    expect(glideCommit(60, 800, 0.9)).toBe(true);
  });

  it('never commits a tiny drag, however fast', () => {
    expect(glideCommit(30, 800, 2)).toBe(false);
  });
});

describe('navNeighbors — the page chain comes from nav order', () => {
  const nav = [
    { label: 'HOMEPAGE', href: '/index.html' },
    { label: 'WORK', href: '/works.html' },
    { label: 'ABOUT', href: '/about.html' },
    { label: 'CONTACT', href: '/contact.html' },
  ];

  it('homepage: no back, onward to WORK', () => {
    const n = navNeighbors(nav, '/index.html');
    expect(n.prev).toBeNull();
    expect(n.next?.label).toBe('WORK');
  });

  it('treats the bare root path as the homepage', () => {
    expect(navNeighbors(nav, '/')?.next?.href).toBe('/works.html');
  });

  it('about: back to WORK, onward to CONTACT', () => {
    const n = navNeighbors(nav, '/about.html');
    expect(n.prev?.href).toBe('/works.html');
    expect(n.next?.href).toBe('/contact.html');
  });

  it('contact: back to ABOUT, no onward', () => {
    const n = navNeighbors(nav, '/contact.html');
    expect(n.prev?.href).toBe('/about.html');
    expect(n.next).toBeNull();
  });

  it('unknown pages get no neighbors at all', () => {
    const n = navNeighbors(nav, '/project.html');
    expect(n.prev).toBeNull();
    expect(n.next).toBeNull();
  });
});

// The review's walkthroughs (2026-11-25): on a phone CONTACT's lower part (FREQ, the AUX CHANNELS row) could never be
// scrolled to: the page armed the glide with no boundary check, so every swipe up dragged the page toward STORY. A page
// that scrolls hands a direction to the glide only at that end of its own length, as ABOUT does.
describe('scrollEdge: a page that scrolls passes a swipe on only at its end', () => {
  it('a page taller than the screen, at its top: onward is not yet allowed, back is', () => {
    expect(scrollEdge(1, 0, 668, 870)).toBe(false);
    expect(scrollEdge(-1, 0, 668, 870)).toBe(true);
  });

  it('scrolled to its end (within 6 px): onward is allowed, back is not', () => {
    expect(scrollEdge(1, 202, 668, 870)).toBe(true);
    expect(scrollEdge(1, 196, 668, 870)).toBe(true);
    expect(scrollEdge(1, 195, 668, 870)).toBe(false);
    expect(scrollEdge(-1, 202, 668, 870)).toBe(false);
  });

  it('a page that fits its screen allows both ways at once', () => {
    expect(scrollEdge(1, 0, 900, 900)).toBe(true);
    expect(scrollEdge(-1, 0, 900, 900)).toBe(true);
  });

  it('CONTACT arms the glide with that check (it was armed with none)', () => {
    const src = readFileSync('src/pages/contact.ts', 'utf8');
    expect(src).toMatch(/armGlideNav\(\{[\s\S]*?allow: \(dir\) => scrollEdge\(dir, /);
  });
});
