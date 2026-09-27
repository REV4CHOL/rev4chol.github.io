# MISTCHILD back down, its corner removed; the cursor's label tells the truth — design (2026-09-27)

The owner:
- "Also, bring MISTCHILD down to Neon Liturgy (chapter 1), then remove the pane where MISTCHILD once stood"
- "When hover on Chapter 1 or 2, it said switch on the cursor. But when I hover to somewhere else, that "Switch" still stick on the cursor. Fix."

## What was found

### The floor

CH·01 today (json order fills the featured cluster, then the ring first-fit, row-major):

```
glass-harvest  | saline-throne | far-east      | soda-coast | mistchild      ← json 18
acid-pastoral  | PHILIA        | MIEN-VIEN     | AN-HOI     | soft-hours
gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH | [ held ]   | copper-lullaby
salt-cathedral | velvet-static | winter-arcade | halide     | neon-liturgy   ← json 32 (a placeholder)
```

- Deleting an entry cannot empty the top-right corner: the ring refills first-fit, so ACID PASTORAL would jump up into it and every later ring pane would shift. The only hole a deletion leaves is the ring's *last* slot, the bottom-right.
- A held place (`{ "blank": true }`) keeps a slot but draws an unlit screen. That is still a pane, and the owner's word is "remove". When they wanted a spot kept for a film, they said "leave … blank, i am about to fill in two more".
- So the layout needs a third kind of entry: one that keeps its slot in the fill order and draws nothing.

### The label (measured in headless Chrome, 1440 × 900, `scratchpad/ux/sticky.mjs`)

1. **The owner's bug.** On the CH·01 tab the label reads SWITCH ▸. After moving to bare floor it still reads SWITCH ▸, with no pane hovered.
   - Cause: `cursorLabelFor` returns `undefined` over any canvas ("the canvas owns its label"), so the page listener stands aside.
   - The floor only writes the label when a pane is hovered or unhovered. Over bare floor nobody writes it, and whatever the chrome left stays.
2. **Found on the way: panes wake under the tabs.** On the CH·02 tab the label read ENTER ▸, and HALIDE, lying under the tab, was hovered.
   - Pixi v8 listens for `pointermove` on the whole document and hit-tests every move, so a pane under a tab wakes through it.
   - The pane lifts, its loop starts, its caption shows, and the label becomes ENTER ▸ while the pointer is on a button that switches chapters.
3. **Not a bug.** Leaving a hovered pane for bare floor does unhover it: the label clears and `hoveredSlug` goes null (`scratchpad/ux/unhover.mjs`). My first "bare" probe point lay inside the lifted pane.

An audit of what catches the pointer above the floor (`scratchpad/ux/chrome-audit.mjs`) found only interactive chrome: the nav's links, the two chapter tabs, and the HUD's SND / MUS / MTN buttons. The legend, HUD text, grain and cursor are all see-through.

## The design

### A. The move

- **MISTCHILD takes json 32**, NEON LITURGY's place, so it stands in the bottom-right corner again. Its entry moves whole, byte for byte.
- **NEON LITURGY leaves the site**: its entry goes, and so does its folder (`public/content/projects/neon-liturgy/`, a placeholder's poster, loops and 30 stills).
- **Json 18 becomes an open gap: `{ "gap": true, "category": "human", "tileSize": "normal" }`.**
  - It keeps the top-right slot in the fill order, so nothing else moves.
  - It draws nothing: no screen, no frame, no brackets. The floor's faint lime cell grid shows through, as it does all around the carpet.
  - It never takes the pointer.
- The other 38 entries are untouched, and so is CH·02.

```
glass-harvest  | saline-throne | far-east      | soda-coast | ·  (open floor)
acid-pastoral  | PHILIA        | MIEN-VIEN     | AN-HOI     | soft-hours
gasoline-hymn  | LIEN-QUAN     | ELECTRIC-FISH | [ held ]   | copper-lullaby
salt-cathedral | velvet-static | winter-arcade | halide     | mistchild
```

### B. The open gap in code

- **Parser.** `parseFloor` reads `gap: true` as a floor item that is not a film: `FloorBlank` with `gap: true`, keyed `gap-<json index>`.
  - A held place now carries `gap: false`.
  - Every films-only path already filters on `isBlank`, so a gap is never a dossier, a count, a stop on the chain, or an entry in the screen-reader list.
  - `gap-N` joins `blank-N` as a slug a film may not take.
- **Layout.** It already takes the whole stream, so the gap keeps its slot, and the lego pass gives it a 16:9 width like a held place.
- **World.** Films get tiles, held places get unlit screens, and gaps are measured but never put on the floor (`w.gaps`).
  - A gap is not in `panes()`, so it takes no part in flights.
  - It still counts toward the carpet's bounds. *Corrected in verification:* this design first said the bounds were unchanged, because that row and that column keep their other panes. In the isometric view, though, the top-right cell is the carpet's rightmost point: maxX is 2306 with it and 2244 without. Unmeasured, the carpet shrank on the right, and the furniture ringing it slid into the corner the pane left.
  - `destroy()` disposes the measures, which the app's teardown never sees.
- **Filling it later** works as for a held place: replace the gap's line with a film's entry and the film lands in the corner.
- **Design call, flagged to the owner.** "Remove" was read as open floor, not an unlit held screen. If a film is coming for that corner, the line becomes `"blank": true` and it lights as a held screen.

### C. The label tells the truth

- **Chrome labels do not ride onto the floor.** `src/shell/cursor.ts` remembers who wrote the label on show: the page's chrome (a `data-cursor` under the pointer) or a canvas's own code (`setCursorLabel`, called by the floor).
  - When the pointer comes over a canvas, the canvas's own label stays. The floor's ENTER ▸ on the first pane hovered must survive the bubbling `pointerover`: that was the 81d985e fix, and it holds.
  - A label the chrome left behind is cleared.
  - `cursorLabelFor(target, chromeWrote)` stays the pure rule, and is tested.
- **Only the floor itself hovers.** A pane's `pointerover` wakes it only when the element under the pointer is the floor's own canvas (`document.elementFromPoint(e.clientX, e.clientY) === app.canvas`).
  - Tabs, nav links and HUD buttons are opaque to the floor.
  - See-through chrome (`pointer-events: none`) is not in the way.
  - Pixi's ticker re-sends the last pointer position every frame, so a pane gliding under a resting pointer still wakes when the pointer rests on the floor, and never through a tab.

## What does not change

- CH·02.
- The other CH·01 panes' places.
- The held place at json 25.
- The layout engine.
- The dossiers' content: counts go from P·NN/39 to /38 on their own.
- Touch: the floor's two-tap protocol, and no custom cursor on a coarse pointer.
- The other pages' labels.
- `about-old.*`.

## Tests

- **`content.test.ts`:**
  - a gap parses as `{ blank: true, gap: true, slug: 'gap-<i>', … }`;
  - held places carry `gap: false`;
  - `parseProjects` skips gaps;
  - a film may not take `gap-N`;
  - a gap's bad category is refused.
- **`content-files.test.ts`:**
  - json 18 is the gap and json 32 is MISTCHILD;
  - NEON LITURGY has neither an entry nor a folder;
  - the CH·01 cells are as drawn above (`gap-18` at [4, 0], MISTCHILD at [4, 3]);
  - CH·01 has 18 films (5 featured), 1 held place and 1 gap, still a full 5 × 4 floor;
  - the floor has 40 entries.
- **`legend.test.ts`:** 23 placeholders and 15 films.
- **`wayfinding.test.ts`:**
  - over a canvas, a chrome label is cleared (the stuck SWITCH ▸);
  - over a canvas, the canvas's own label stays;
  - `data-cursor` names the label, and nothing labelled clears it;
  - pins in `world.ts`: the gap measured into the bounds but never put on the floor, and the hover guard.

## Verification (real Chrome over CDP, dev then live)

- **The label:**
  - CH·01 tab → SWITCH ▸;
  - bare floor → empty;
  - CH·02 tab → SWITCH ▸ with no pane hovered;
  - a pane → ENTER ▸;
  - bare floor → empty;
  - the first pane hovered on arrival still shows ENTER ▸.
- **The floor:**
  - the CH·01 grid read back from the world: the top-right cell holds no pane and no unlit screen;
  - one held screen;
  - MISTCHILD's loop in the bottom-right corner;
  - HUD "18 PROJECTS LOADED";
  - a flip each way with no errors.
- **The dossiers:** MISTCHILD reads P·NN/38 with WATCH live; NEON LITURGY's old address reads SIGNAL LOST.
