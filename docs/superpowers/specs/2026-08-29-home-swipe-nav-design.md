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

---

## v2 — physical glide + site-wide chain (owner revision, same day)

Owner, after trying v1: *"I still want to use my finger thumb, and physically
slide down on the homepage to move to another page. And yes bring that swipe
chaining to the rest of the site"* — plus: remove the `noice weather innit?`
CTA on touch devices. Reading: the burst+wipe cut is not physical enough (the
same correction as the channel flip: the page itself must move), and the
gesture goes site-wide. "Slide down" = scroll-down intent = finger travels up.

**The glide.** While a touch drag runs, `document.body` translates 1:1 with the
finger (soft resistance past 35% of the viewport, capped at 60%); behind it —
a fixed panel appended to `<html>`, painting between the root background and
the body (z-index −1) — the destination's station card: micro `TUNING ▸`
kicker + the next page's name in outlined Clash with the chromatic ident
shadows. Release past `glideCommit` (drag ≥ 22% of viewport height, or a flick
≥ 40px at ≥ 0.5 px/ms) → the body slides fully off, whoosh, and the browser
navigates (the slide IS the transition — no wipe on top). Release short →
spring back. Calm mode: no drag-follow; a completed swipe (classifySwipe)
navigates via the standard wipe.

**The chain** (from `site.json` nav order, via `navNeighbors`): finger up =
onward, finger down = back. HOMEPAGE → WORK (no back). ABOUT: up → CONTACT,
down → WORK, but only when the page is scrolled to the respective end
(boundary-armed so normal scrolling never glides). CONTACT: down → ABOUT (no
onward). WORK is excluded — the floor's pan/pinch owns every touch there.
Dossier pages keep their own RETURN/NEXT endnav. The `⌄` cue (class
`swipe-cue`) mounts on every armed page, coarse pointers only.

**Guards unchanged:** touch pointers only, second finger poisons (pinch wins),
link/button starts ignored, pointercancel aborts. While a glide is engaged, a
non-passive touchmove preventDefault stops the browser scrolling/refreshing
underneath. Module: `src/lib/swipe-nav.ts` (replaces `src/home/swipe.ts`).
