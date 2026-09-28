import { describe, expect, it } from 'vitest';
import { ytCommand, ytState } from '../src/project/parts';

// The owner, 2026-09-28: "one watch will spawn two embed YouTube videos at once, on the same row together". Both
// stand; the first plays; a part that starts pauses the others, and a part that ends hands over to the next.

describe("the parts hear each other through the YouTube player's messages", () => {
  it("reads the player's state: from a state change, or from an info delivery", () => {
    expect(ytState('{"event":"onStateChange","info":1,"id":1,"channel":"widget"}')).toBe(1);
    expect(ytState('{"event":"infoDelivery","info":{"playerState":0,"currentTime":24}}')).toBe(0);
    expect(ytState({ event: 'onStateChange', info: 2 })).toBe(2);
  });

  it('anything else is no state', () => {
    expect(ytState('{"event":"infoDelivery","info":{"currentTime":3}}')).toBeNull();
    expect(ytState('{"event":"onReady"}')).toBeNull();
    expect(ytState('not json')).toBeNull();
    expect(ytState(null)).toBeNull();
  });

  it('builds the commands the player takes', () => {
    expect(JSON.parse(ytCommand('pauseVideo', 2))).toEqual({ event: 'command', func: 'pauseVideo', args: [], id: 2, channel: 'widget' });
    expect(JSON.parse(ytCommand('playVideo', 1)).func).toBe('playVideo');
  });
});
