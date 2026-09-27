# Wayfinding: signposts in the site's own voice — design (2026-09-27)

The owner: "I have got a lot of feedbacks from the testers of this website. They said that they feel confused, not
knowing what to do, where to go in the website, and what to click on, like completely lost. Then they just drop the
website and move on." Chosen approach: **A — signposts**, every page and the whole look kept; the button reads
"ENTER MY WORK" (owner: no film count).

## What was found (live site, real Chrome over CDP; desktop 1440 × 900, phone 375 × 812)

The controls work. Nothing says so.

1. **Arrival.** The homepage is the reel behind "PURPLE DREAMS & ELECTRIC SHEEPS" and the roles line. No sentence,
   no button. The exits are the 12 px nav (10.4 px on a phone, 25 px tall targets) and a 9 px "SCROLL ▾ WORK"
   whisper. A click on the footage fires a burst and a sound, not a destination. First-time visitors sit through
   the 1.4 s boot first.
2. **The floor.** Drag, wheel-zoom, hover-preview and click-to-open are never announced. The hover caption gives
   title · year · role · runtime, no verb. The cursor's "ENTER ▸" is 10 px and **does not show on the first pane
   hovered**: the pointer entering the canvas fires a DOM `pointerover` that bubbles to `cursor.ts`, which finds no
   `data-cursor` and wipes the label Pixi's `hover()` had just set. "CH·01 ▸ COLORIST / CH·02 AI" reads as a caption,
   not tabs. A phone opens on the seam between two featured panes (ELECTRIC FISH's centre at x = 11, MIEN VIEN's at
   x = 384 on a 375 px screen), and needs two taps to open a pane — the first only selects. Measured: desktop click
   opens the dossier in 3.8 s (burst + wipe); phone tap 1 sets `hoveredSlug`, tap 2 navigates.
3. **Fiction on the floor.** 14 of 39 panes are films (one, MIEN VIEN, awaits its link); 24 are placeholders with
   invented titles and synopses, 18–30 noise stills and no WATCH. Opening "GLASS HARVEST" gives a full dossier for a
   film that does not exist.
4. **The voice.** "PROCEDURE :: … // ONLINE", "TRANSMIT? YES ▸ INITIATE CONTACT", "COPY FREQ", "◂ RETURN",
   "SIGNAL DECAY ▸" (the next film). Decodable; on top of 1–3 it compounds "lost". STORY is a city ride.

Guidance source: standard usability rules (visible signposts, no hover-only cues, 44 px touch targets, first-visit
orientation); the ui-ux-pro-max database is not installed on this machine.

## The design

Everything speaks the house language (`micro` mono caps, `▸` verbs, `▪` separators — the STORY page's FREE-mode
controls line is the precedent). No page changes shape.

### 1. The door (homepage)

- A button under the roles bar: `<a class="home-door" id="home-door" href="/works.html" data-internal
  data-cursor="ENTER ▸">ENTER MY WORK ▸</a>` inside `<p class="home-cta-row">` (that row already rides the poster's
  parallax). Mono, `--t-sm`, accent ink on a 1 px accent rule with the roles bar's void tint; hover inverts with the
  house `rgb-flick`. ≥ 44 px tall on phones. It joins the ambient jolt list.
- **The footage is a door too.** A clean click (button 0, no drag > 8 px, not on `a`/`button`, not on the poster's
  words `#statement`) still bursts on pointerdown as today, and on pointerup leaves to WORK. The words keep the toy.
  Pure decision: `doorFromVoidClick(target, movedPx)` in `src/home/door.ts`.

### 2. The floor's legend (works)

- `works.html` gets `<p class="floor-hint micro" id="floor-hint"></p>`; `works.ts` fills it from
  `legendText(finePointer())`:
  - fine: `DRAG ▸ ROAM ▪ SCROLL ▸ ZOOM ▪ HOVER ▸ PREVIEW ▪ CLICK ▸ OPEN`
  - coarse: `DRAG ▸ ROAM ▪ PINCH ▸ ZOOM ▪ TAP ▸ SELECT ▪ TAP AGAIN ▸ OPEN`
- Top centre under the nav (below the HUD line on phones). Lit in `--signal` (`is-fresh`) until the visitor has
  opened a pane once (`localStorage rvl-floor-opened`, set from `enter()` through a new `onEnter` hook), then it stays
  at 55 % bone as a quiet reminder.
- **Cursor fix.** `cursorLabelFor(target)` in `cursor.ts`: a target inside a `canvas` returns `undefined` (the floor
  owns its label); otherwise the nearest `data-cursor` or `null`. The listener only writes on a defined answer.
- **The caption carries the verb.** `captionMeta(p, fine)`: `2025 · DIRECTOR / EDITOR / COLORIST · 1:30 ▪ CLICK ▸ OPEN`
  (coarse: `▪ TAP AGAIN ▸ OPEN`); a placeholder's starts `PLACEHOLDER ▪`.
- **Chapters read as tabs.** The inactive name wears a 1 px underline (35 % bone, signal on hover); both buttons
  carry `data-cursor="SWITCH ▸"`.

### 3. The phone's first frame

- `openingFrame(panes, screenW, minScale)` in `src/works/opening.ts`: the featured pane nearest the origin (first
  in json order on a tie; any pane if none is featured), whole and centred — scale = clamp((screenW − 36) / (2 ·
  halfW), minScale, 1), pan = −pane · scale. Applied in `WorksWorld.create` when the pointer is coarse; desktop keeps
  the cluster.
- Phone nav: links 0.7 rem with 13 px vertical padding (44 px targets); the HUD's top line moves down to clear it.

### 4. Placeholders say so

- `isPlaceholder(p) = !p.film && !p.filmPending` (`lib/content.ts`). MIEN VIEN (pending) is a film.
- Pane: `PLACEHOLDER` in 8 px Martian Mono, bone at 0.7, right-aligned on the strip that already carries `year ·
  slug`.
- Dossier: the status line reads `PROCEDURE :: SLUG // PLACEHOLDER`; where WATCH would stand: `PLACEHOLDER PANE ▪ NO
  FILM HERE YET` (`.p-placeholder micro`). The screen-reader list appends " — placeholder".

### 5. Plain words on the way out

- Dossier end nav: `◂ BACK TO THE FLOOR` and `NEXT ▸ <TITLE>`.
- STORY shows its one line in AUTO too: `AUTO ▸ THE CITY DRIVES ▪ FREE ▸ YOU FLY`; FREE keeps the controls line.

Out of scope, on purpose: the boot screen, the nav's desktop size, the HUD's SFX/MUS/MTN wording, the STORY name,
the About/Contact copy.

## Tests

- `tests/legend.test.ts` — legend text by pointer; caption verbs; placeholder prefix; a pending film is not a
  placeholder; `floorOpened`/`markFloorOpened` against a fake storage, a throwing storage reads false; the data pin:
  `projects.json` has exactly 24 placeholders, none with a film, and `mien-vien` is not one.
- `tests/opening.test.ts` — nearest featured wins (tie → first), fallback to any pane, scale fits the width and clamps
  to the floor, empty → null.
- `tests/wayfinding.test.ts` — `doorFromVoidClick` (drag, link, the words, a clean click); `cursorLabelFor` (canvas →
  undefined, labelled ancestor → its label, plain → null); the html/css/source pins (door, legend element, styles,
  end-nav words, story's AUTO line, the switch's cursor label).

## Verification

- Dev pane: the door on the poster; a footage click leaves to WORK, a click on DREAMS only bursts; the legend lit,
  then dim after opening a pane; the underline on the inactive chapter; a placeholder pane's strip and dossier.
- Real Chrome (CDP): the cursor label reads `ENTER ▸` on the FIRST pane hovered; the phone opens on one whole pane
  (a featured pane's centre within 4 px of the screen centre, scale ≈ 0.4) and its legend is the coarse line; tap 1
  shows `TAP AGAIN ▸ OPEN` in the caption; nav links ≥ 44 px tall.
- Gates: `tsc --noEmit`, `vitest run`, `vite build`; then live checks of the same after the deploy.

Success test for the owner's next round: a stranger reaches a real film's WATCH within 30 s on desktop / 45 s on a
phone, unaided, and knows how to get back.
