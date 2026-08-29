# Homepage swipe-onward navigation (mobile / tablet)

**Problem.** Touch visitors instinctively scroll down on the homepage expecting to
move deeper into the site (observed live: the owner's friend tried it). The
homepage is a fixed 100svh poster — the gesture did nothing.

**Decision (owner-approved).** A deliberate upward swipe on the homepage fires a
datamosh burst under the finger, then the site's standard page-wipe cuts to the
next page in the nav (WORK today — derived from `site.json` nav order, so
reordering the menu keeps it honest). A micro cue — the next page's label over a
pulsing down-chevron — sits fixed bottom-center on coarse-pointer devices so the
gesture is discoverable. The cue is also a tap target (a normal `data-internal`
link, so it inherits the wipe + click sound).

**Gesture contract** (`classifySwipe(dx, dy, dtMs)` in `src/home/swipe.ts`, pure,
unit-tested):
- commits: net rise ≥ 70px within 900ms, or a flick — rise ≥ 45px at ≥ 0.35px/ms
- vertical intent required both ways: rise ≥ 1.5 × |dx|
- never commits: downward motion, slow drifts, zero-duration noise

**Wiring** (`armSwipeNav`, homepage only): touch pointers only — mouse and pen
never trigger it; a second finger poisons the gesture (pinch zoom stays a
browser gesture); gestures starting on links/buttons are ignored; pointercancel
aborts. On commit: `triggerBurst()` + `sound.whoosh()` + `leaveTo(next)`.
Calm mode still navigates (the burst gates itself; navigation is function, not
decoration).

**Out of scope.** Desktop wheel/trackpad, swipe-back gestures, and chaining the
gesture onto other pages — homepage only, per the request.
