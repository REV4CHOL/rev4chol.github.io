# WORK: almost every pane plays at once — design (2026-11-08)

The owner: "also in work section, I want almost all panes to load at once. Only panes at the far end not loaded until I
drag the view over them. Currently, there are too many unloaded panes, which confused my eyes".

## What the floor did

- A pane that is not playing shows its dithered poster. Every poster is ready before the floor appears. Only the loops
  are rationed.
- Two rules choose the loops (`computePlaySet`, `src/works/priority.ts`):
  - a pane must touch the view plus a 160-unit margin;
  - the panes nearest the view's middle go first, up to a cap. The hovered pane goes in first and counts inside the cap.
- The cap came from the tier (`videoCapFor`, `src/lib/quality.ts`): 10 · 6 · 3 on a desktop (FULL · BALANCED · LITE),
  4 · 3 · 2 on a tablet or in a window under 820 px.
- CH·01 has twelve films. At 1366 to 2560 px wide and the opening zoom, 11 touch the window (MISTCHILD lies past it).
  - FULL played 10 of them.
  - BALANCED played 6 and left 5 posters on screen.
  - The site remembers a step down for a day, so a machine that stepped down once opened at BALANCED on later visits.

## The design

- The desktop cap is 12 at FULL and at BALANCED. Every pane in the window plays. The far panes, outside it, keep their
  posters until the view comes near; that rule is unchanged. CH·02's five all play, as before.
- LITE stays at 3. It is for software renderers, Save-Data, 2g, and the governor's last step down for a machine that
  can't keep up.
- Tablets and narrow windows keep 4 · 3 · 2. Phones have their strip, which is untouched.
- Nothing else moves:
  - a texture uploads only on a new frame;
  - `autoPlay: false`;
  - the frame gate;
  - no resting glows at LITE;
  - video elements at twice the cap.

## Why 12 is safe

- The number of loops was not the cause of the 2026-09-27 lag. The causes were uploads on every display refresh,
  running blurs, and sleeping panes that kept decoding (`2026-09-27-works-floor-lag-design.md`). With those fixed, ten
  loops cost 0.41 ms of GPU time a frame at 4K.
- The 2026-09-28 A/B on a software GPU: going from 10 loops to 3 moved nothing. The cost was the resting glows.
- 12 is one whole chapter today. The playback tests' fake floor holds 30 panes, enough for a cap of 12.
- Untested: more than ten hardware decodes at once on an integrated GPU. The governor watches frames, not decoders, so
  the owner's eye on their own machines is the check.

## Design calls for the owner

- BALANCED gets the same 12 as FULL. The alternative is 10, which is more cautious on integrated GPUs.
- Tablets and windows under 820 px keep 4 · 3 · 2.
- 12 covers a whole chapter today. A chapter that grows past it shows posters at its far end again, by the same rule.
