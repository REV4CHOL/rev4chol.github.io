import { describe, expect, it } from 'vitest';
import { entryOf, listStartTop, restoredTop, returning, viewOnLoad, wallByBack } from '../src/works/back-state';

// THE BROWSER'S BACK ON WORK (the review's walkthroughs, 2026-11-25): THE LIST had no history entry of its own, so Back
// from it left WORK altogether; a Back from a film opened from the list found the list at its top. Each history entry
// of WORK now carries what it showed (works/back-state.ts).

describe('an entry of WORK, read from history.state', () => {
  it('keeps only what it knows, of the right kinds', () => {
    expect(entryOf(null)).toEqual({});
    expect(entryOf('list')).toEqual({});
    expect(entryOf({ view: 'list', pushed: true })).toEqual({ view: 'list', pushed: true });
    expect(entryOf({ view: 'grid', pushed: 'yes' })).toEqual({});
    expect(entryOf({ view: 'list', row: '/project.html?p=far-east', rowAt: 120.5 })).toEqual({ view: 'list', row: '/project.html?p=far-east', rowAt: 120.5 });
    expect(entryOf({ row: 4, rowAt: 'x' })).toEqual({});
    expect(entryOf({ row: '/project.html?p=far-east', rowAt: Number.NaN })).toEqual({ row: '/project.html?p=far-east' });
  });
});

describe('a return restores, a fresh visit starts as designed', () => {
  it('only a Back or a Forward is a return', () => {
    expect(returning('back_forward')).toBe(true);
    expect(returning('navigate')).toBe(false);
    expect(returning('reload')).toBe(false);
    expect(returning(undefined)).toBe(false);
  });
  it('the list comes back with the row the visitor left at the same height, inside the scroller', () => {
    expect(restoredTop(1800, 420, 5000)).toBe(1380);
    expect(restoredTop(300, 420, 5000)).toBe(0);
    expect(restoredTop(4900, 100, 4000)).toBe(4000);
    expect(restoredTop(Number.NaN, 100, 4000)).toBe(0);
  });
});

describe('the view an entry shows', () => {
  it('the address first, then the entry itself, then what this visit chose, then the wall', () => {
    expect(viewOnLoad('?view=list', { view: 'floor' }, 'floor')).toBe('list');
    expect(viewOnLoad('?ch=machine&view=floor', { view: 'list' }, 'list')).toBe('floor');
    // a Back that lands on the wall's own entry shows the wall, though this visit last chose the list
    expect(viewOnLoad('?ch=machine', { view: 'floor' }, 'list')).toBe('floor');
    // a list shown from memory at an address without view= comes back as the list
    expect(viewOnLoad('', { view: 'list' }, 'floor')).toBe('list');
    expect(viewOnLoad('', {}, 'list')).toBe('list');
    expect(viewOnLoad('', {}, null)).toBe('floor');
  });
  it('the wall button goes back in history only from a list entry its own toggle added', () => {
    expect(wallByBack({ view: 'list', pushed: true })).toBe(true);
    expect(wallByBack({ view: 'list' })).toBe(false); // (a list opened by its address: no wall entry behind it)
    expect(wallByBack({})).toBe(false);
    expect(wallByBack({ view: 'floor', pushed: true })).toBe(false);
  });
});

// THE LIST OPENED FROM THE AI CHAPTER (the review's walkthroughs, Android tablet): it started at CH·01, the "CH·02 ▪ AI"
// heading 1 678 px down on a 672 px screen.
describe('where the list opens by hand', () => {
  const heads = [{ key: 'human' as const, top: 34 }, { key: 'machine' as const, top: 1712 }];
  it("from a chapter after the first: that chapter's heading where the first chapter's heading stands", () => {
    expect(listStartTop('machine', heads)).toBe(1678);
  });
  it('from the first chapter, or a chapter the list does not hold: at the top', () => {
    expect(listStartTop('human', heads)).toBe(0);
    expect(listStartTop('machine', heads.slice(0, 1))).toBe(0);
    expect(listStartTop('machine', [])).toBe(0);
  });
});
