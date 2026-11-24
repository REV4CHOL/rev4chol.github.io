import { describe, expect, it } from 'vitest';
import { entryOf, viewOnLoad, wallByBack } from '../src/works/back-state';

// THE BROWSER'S BACK ON WORK (the review's walkthroughs, 2026-11-25): THE LIST had no history entry of its own, so Back
// from it left WORK altogether. Each history entry of WORK now carries what it showed (works/back-state.ts).

describe('an entry of WORK, read from history.state', () => {
  it('keeps only what it knows, of the right kinds', () => {
    expect(entryOf(null)).toEqual({});
    expect(entryOf('list')).toEqual({});
    expect(entryOf({ view: 'list', pushed: true })).toEqual({ view: 'list', pushed: true });
    expect(entryOf({ view: 'grid', pushed: 'yes' })).toEqual({});
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
