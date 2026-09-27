import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isPlaceholder, parseJson, parseProjects, type Project } from '../src/lib/content';
import { FLOOR_LEGEND, captionMeta, floorOpened, legendText, markFloorOpened } from '../src/works/legend';

type Meta = Pick<Project, 'year' | 'role' | 'runtime' | 'film' | 'filmPending'>;
const film = (over: Partial<Meta> = {}): Meta => ({
  year: 2025,
  role: 'Director / Editor / Colorist',
  runtime: '1:30',
  film: { type: 'youtube', src: 'abc' },
  filmPending: false,
  ...over,
});

describe("the floor's legend (owner's testers, 2026-09-27: 'not knowing what to do … what to click on')", () => {
  it('names the controls for a mouse and for a thumb', () => {
    expect(legendText(true)).toBe('DRAG ▸ ROAM ▪ SCROLL ▸ ZOOM ▪ HOVER ▸ PREVIEW ▪ CLICK ▸ OPEN');
    expect(legendText(false)).toBe('DRAG ▸ ROAM ▪ PINCH ▸ ZOOM ▪ TAP ▸ SELECT ▪ TAP AGAIN ▸ OPEN');
    expect(FLOOR_LEGEND.fine).toBe(legendText(true));
  });

  it('the caption ends with the verb that opens the pane', () => {
    expect(captionMeta(film(), true)).toBe('2025 · DIRECTOR / EDITOR / COLORIST · 1:30 ▪ CLICK ▸ OPEN');
    expect(captionMeta(film(), false)).toBe('2025 · DIRECTOR / EDITOR / COLORIST · 1:30 ▪ TAP AGAIN ▸ OPEN');
    expect(captionMeta(film({ runtime: '' }), true)).toBe('2025 · DIRECTOR / EDITOR / COLORIST ▪ CLICK ▸ OPEN'); // empty fields drop out, as before
  });

  it('a placeholder says so first; a film awaiting its link is a film', () => {
    expect(captionMeta(film({ film: null }), true)).toBe('PLACEHOLDER ▪ 2025 · DIRECTOR / EDITOR / COLORIST · 1:30 ▪ CLICK ▸ OPEN');
    expect(captionMeta(film({ film: null, filmPending: true }), true)).toBe('2025 · DIRECTOR / EDITOR / COLORIST · 1:30 ▪ CLICK ▸ OPEN');
  });

  it('remembers the first opened pane; a storage that throws reads as never opened', () => {
    const m = new Map<string, string>();
    const storage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(floorOpened(storage)).toBe(false);
    markFloorOpened(storage);
    expect(floorOpened(storage)).toBe(true);
    const broken = {
      getItem: (): string | null => { throw new Error('private mode'); },
      setItem: (): void => { throw new Error('private mode'); },
    };
    expect(floorOpened(broken)).toBe(false);
    expect(() => markFloorOpened(broken)).not.toThrow();
  });
});

describe('placeholders: no film and none pending (14 films + MIEN VIEN pending; the rest stand in)', () => {
  it('isPlaceholder', () => {
    expect(isPlaceholder(film())).toBe(false);
    expect(isPlaceholder(film({ film: null, filmPending: true }))).toBe(false);
    expect(isPlaceholder(film({ film: null }))).toBe(true);
  });

  it('projects.json today: 24 placeholders, none with a film; mien-vien is not one', () => {
    const root = fileURLToPath(new URL('../public/content/', import.meta.url));
    const projects = parseProjects(parseJson(readFileSync(root + 'projects.json', 'utf8'), 'projects.json'));
    const ph = projects.filter(isPlaceholder);
    expect(ph.length).toBe(24);
    expect(ph.every((p) => p.film === null && !p.filmPending)).toBe(true);
    expect(ph.some((p) => p.slug === 'mien-vien')).toBe(false);
    expect(projects.length - ph.length).toBe(15);
  });
});
