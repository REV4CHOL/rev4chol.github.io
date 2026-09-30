# The whole site's UI and UX, reviewed; and what this round changes — design

2026-09-30. The owner, after the REC:/EOF fix (38d68d4):

> "make a complete review of the whole UI and user experience. Many testers complain that they dont know how to
> navigate the website or click or do actions, and they feel lost, as they have never seen a website like this before"

This document is the review and the design of what ships with it. The floor, the city and the homepage are the
site's own ideas and stay. What changes is everything a first-time visitor needs in order to use them: where the
film is, what can be pressed, where they are, and the way back.

## 1. How the review was made

- **Every page measured in real Chrome**, at 1440 × 900 with a mouse and 390 × 844 with touch: every state captured
  (boot, top, scrolled, foot, hover, tap, the film open), every control's size, every text's size, every overlap of
  text on text, every page's width.
- **Two simulated first visits to the live site**: two AI agents, each allowed to learn about the site only by looking
  at the screen (no source, no markup), one on a laptop with a mouse (84 actions), one on a phone with touch (91). Each
  was given the errands a visitor has: find the films, watch one, find a film by its name, find who made this and how
  to reach them, get back. They reported what they expected, what they pressed and what happened. Every errand was
  finished; none was easy. They are not the owner's testers: wherever this document says "the visitors", it means
  these two runs. The owner's testers are quoted once, at the top.
- **The guidance of the ui-ux-pro-max skill** for a portfolio: navigation that does not cover content, no element that
  looks pressable and is not, state that can be read, a single-pointer way to do whatever a drag does, targets of
  44 px, text of 12 px, video on a press and not on its own.

## 2. What was found, worst first

### 2.1 A film's page hides the film

- The hero picture looks like a player. Both visitors pressed it first. Nothing happened.
- WATCH stood 1.7 screens down, under the synopsis.
- Pressed, the film opened 245 × 138 px on a 1440 screen, in the field right of the synopsis, above the part of the
  page on screen: it played unseen ("I thought the button was broken"). Cause: the player was placed in the grid's
  second column (owner's markup of 2026-08-29); the poster lock later pinned the plate to 1440, and the first column
  takes 880 of it.
- The way back to all films stood only after the last still: 40 stills on REMNANTS OF A DREAM, a page 15,000 px long.
- The ratio stamp (2.39:1, 4:3) was drawn through the menu; ROLE / YR / RT stood white on a white sky.

### 2.2 The WORK floor has no plain way around it

- No way to see every film at once, none to find one by its name.
- Five of the seventeen films stand behind the AI tab, which read as a caption: half-ink, small, no count.
- The hover title was placed from the pane's resting size: it sat on the lifted picture, or ran off the screen's edge
  (MR_PURPLE_DREAMS_IN_ELECTRIC… cut off).
- On a phone a tapped pane stood up where it lay: half off the screen, a 45 px sliver at its edge, or (pinched in)
  wider than the screen. Its title, the legend and the count line shared one spot.
- On a phone one drag threw the wall into empty floor, with nothing to say where the films went.
- A pane's strip said ELECTRIC-FISH, MIEN-VIEN (the address's slug); the page says something else.
- The legend itself worked for both: they read it and did what it said.

### 2.3 The fixed chrome is printed over the page

- The menu and the switches had a backing on the homepage and the floor only. Everywhere else a page that scrolls ran
  its own text through them; over a bright picture the menu vanished.
- On a phone the bottom readouts and the film count were printed over the text being read.

### 2.4 What looks pressable is not, and what is pressable does not look it

- Pressed and dead: the hero picture, the genre pills (the shape of COPY EMAIL), the skill rows (they filled under the
  pointer), `STATUS :: RECEIVING ▸` (the arrow the buttons wear), the stills, the `[01]` `[02]` marks, the timecode.
- Alive and unseen: the AI tab; `SFX ● MUSIC ● MOTION ●`, which read as a status line (the state was a 5 px dot);
  AUTO / FREE and the times of day on STORY (8 px, 45 % ink); every link the cursor did not label (the native hand is
  hidden, and the cross did not change).

### 2.5 A phone's pages break

- ABOUT was 498 px wide on a 390 px screen: it slid sideways and MOTION hung off the edge. Cause: the rings of
  `.a-reticle`, 702 px wide, widened the layout viewport.
- SODA COAST was 481 px wide. Cause: the next film's title, one unbreakable word.
- CONTACT's first line shared the switches' row. STORY's one line of instructions was overprinted by them: its phone
  rule stood above the rule it overrides and never applied.
- The boot screen said CLICK TO SKIP on a touch screen.

### 2.6 The scroll cue

- `SCROLL DOWN ▾ CONTACT` stood over ABOUT from its first screen to its last, across the skill rows; at the top it named
  a page a scroll would not yet reach. On CONTACT it was printed on the end mark.
- It was 9 px at 80 % over a moving picture: nobody read it, and the scroll that changed the page came as a surprise.

### 2.7 Left for the owner (section 6)

The words and the ideas: ENTER ▸, the scroll that changes the page, STORY, MOTION's reload, no name or plain sentence
of who this is, the rail tags and status codes, the headline that changes word, MIEN VIEN featured yet private.

## 3. The film page

- **WATCH on the first screen**: `#p-hero-watch`, the site's filled pill, inside the scan frame, clear of the title
  (left 116, bottom 152; a phone: left 32, bottom 146). The synopsis's WATCH stays.
- **The picture plays the film**: a press on the hero that is not on a link or a button opens the player; the cursor
  says PLAY ▸.
- **The film opens large**: the player takes the page's full row under the synopsis, as wide as the page and no taller
  than the screen shows whole: `width: min(100%, min(74svh / plate, 760px) × ratio)`, in its own ratio (vertical
  footage stands vertical). The page travels to it and centres it in the screen under the header
  (`scroll-margin-top: 66px`). 1184 × 666 at 1440 × 900; 1421 × 799 at 1920 × 1080; 1010 × 568 at 1366 × 768;
  354 × 199 on a phone.
- **`◂ ALL FILMS` at the top**, under the wordmark, in the words of the link at the foot.
- The ratio stamp stands mid-band (none on a phone); the status line, the index, the callouts and the link wear the
  chrome's void halo.
- What stands where WATCH would is decided in one place (`project/watch.ts`, `watchKind`): WATCH, the private note, the
  coming-soon note, the placeholder note. A private film has no hero WATCH.

## 4. The chrome

- **The header's veil on every page**: a fade of the page's own black behind the menu (no plate: it has no edge); full
  ink and the void halo on the wordmark, the links and the switches. Once a page has scrolled under the header
  (`html.rvl-scrolled`) the veil deepens and holds through the switches' row; on a phone it is solid through that row.
- **The switches say their state**: `SFX ON ▪ MUSIC ON ▪ MOTION ON` (`shell/switches.ts`); one that is off is half ink.
- **A phone's chrome**: the bottom readouts and the film count leave every page; the switches take a thumb's target;
  `body { overflow-x: clip }`: no page is wider than its screen; CONTACT's first line and STORY's hint stand under the
  switches; the boot says TAP TO SKIP.
- **The scroll cue follows the page** (`cueState`): it names the next page only when scrolling on would leave for it; at
  the top of a page with more of itself below it is a plain scroll hint, and a press scrolls one screen; mid-page it
  stands down. 11 px, full ink, the halo. Its small first line tells a mouse the gesture (`SCROLL DOWN ▾`) and a touch
  screen what the word under it is (`NEXT PAGE`, `cueKicker`: the page's name alone at a phone's foot, "WORK", said
  nothing of what it was). CONTACT's end mark stands 96 px clear of it.
- **Only what can be pressed looks pressable**: a genre is a dotted square tag; a skill row no longer fills under the
  pointer; the STATUS lines lose their arrow; the cross boxes itself over every link and button, labelled or not.
- **Small words**: the menu 14 px; the homepage's one plain line (who this is) 13 px; STORY's dials 12 px at 75 %, 44 px
  tall on a phone; the rail tags stop under the veil (top 136).

## 5. The floor

- **THE LIST** (`works/index-list.ts`): under the legend a button in the site's button shape, `LIST ALL 17 FILMS ▸`. It
  turns the floor into a plain page of links: both chapters under their names and counts, each row a thumbnail in the
  film's own shape (never cropped: a 9:16 film's stands vertical), the title, year · role · running time (a private
  film says PRIVATE FILM), OPEN ▸. `◂ BACK TO THE FILM WALL` leads back. The address carries `?view=list`; the visit
  remembers the view (`sessionStorage`), so the way back from a film returns to the list. The floor behind it stops
  (no loop plays, the ticker rests). The list scrolls under the header and the button, never under them. The keys:
  Tab reaches the button first after the menu; in the list the arrows scroll and Tab walks the rows.
- **The chapter tabs count their films**: `CH·01 ▪ 12 FILMS` on the chapter showing, `CH·02 ▪ 5 MORE FILMS` on the
  other; the tab not showing is 88 % ink with the halo, not half ink. The names keep the owner's size (`--ch-k`). On a
  phone both stand on one row, 30 px off the foot.
- **A phone's preview comes to the middle**: the first tap brings the pane to the middle of its box (under the header,
  over the caption's room and the tabs) and fits the lifted card to the box's width as well as its height
  (`previewBox`, `hoverFitIn`); the legend stands down while a pane is awake. A mouse still lifts a pane where it
  lies; at the floor's own zoom nothing changes for it, and zoomed in the preview no longer outgrows the screen (also
  when the wheel zooms under a pane already awake).
- **The caption stands by its card** (`works/caption.ts`): under it, flush with its left edge; over it when there is
  no room under; beside it, wrapping into the room it has, when the card fills the height; as a last resort over the
  picture's foot. Always whole on the screen. It travels with its card. A title written with underscores wraps at
  them (`softBreaks`). Its last line is 12 px.
- **Never lost in empty floor** (`works/stray.ts`): four times a second, once the floor has come to rest, if the middle
  of the screen holds no film the floor glides back to the nearest one. Nothing moves under a finger, during a fling,
  or while a chapter's panes fly in.
- **One name**: a pane's strip speaks the slug in words (`2026 · ELECTRIC FISH`); the owner's `short` names stay.
- A keyboard's focus on a film (the hidden list of links) now lands on its pane at any zoom: it missed by the zoom's
  factor. The page has an `h1`.

## 6. Left for the owner

Each of these is the owner's word or the owner's idea; none is changed. What the visitors said, and the smallest
change that would answer it:

| What | What the visitors said | The smallest answer |
| --- | --- | --- |
| `ENTER ▸` (owner, 09-28: "ENTER" only) | both asked what it enters | `ENTER ▸ THE FILMS`, or a second line under it |
| A scroll on the homepage leaves for WORK | one scroll and the page was gone | the cue now says so, legibly; or arm it only after a second scroll |
| STORY | it is a city to fly, not a story | CITY, or PLAY |
| MOTION reloads the page | the page's state is lost; loops and the city still move | say "calm" in the label; or apply without the reload |
| No name, no plain sentence of who this is | "whose site is this?" | one line on the homepage and on ABOUT |
| `SYN:` `REC:` `OP:` `CAP:`, `PROCEDURE ::`, `UPLINK ▸ FULL TRANSMISSION`, `P·11/17`, `X:0000 Y:0000`, `RVL-xxxx` | read as codes | plain words beside them, or fewer |
| The homepage's headline changes word | read as a film's title | hold one word, or sign it |
| MIEN VIEN is FEATURED and private | opened it to watch, could not | the list now says PRIVATE FILM; the floor could too |
| ABOUT: "Based wherever the project is" beside `SAIGON / REMOTE` | two answers | one |
| A film's stills do nothing when pressed | pressed them | open a still large |
| The bottom readouts on a laptop | they cross the page's text as it scrolls | hide them once a page scrolls |

## 7. Design calls made without the owner

1. The film opens as a full row under the synopsis, not in the field at its right (the other way: keep the field and
   narrow the spec sheet).
2. WATCH in the hero, and the hero picture plays.
3. `◂ ALL FILMS` at the top of a film's page.
4. The header's veil on every page, deeper once a page scrolls.
5. A phone loses the bottom readouts and the film count on every page.
6. The switches say ON / OFF.
7. Genres are dotted square tags; skill rows do not fill; STATUS lines have no arrow.
8. The menu 14 px; the homepage's roles line 13 px; STORY's dials 12 px.
9. The scroll cue's three states, 11 px; NEXT PAGE over it on a touch screen.
10. THE LIST, its button under the legend, its words (`LIST ALL 17 FILMS ▸`, `◂ BACK TO THE FILM WALL`), remembered for
    the visit.
11. The tabs' counts and the word MORE.
12. A phone's first tap moves the floor to centre the pane.
13. The floor returns on its own when no film is in the middle of the screen.
14. The strip's slug in words.

## 8. Tests

- `tests/watch.test.ts`: `watchKind`, `playerRatio`; pins for the hero WATCH, the hero's press, the large player and its
  place under the header, `◂ ALL FILMS`, the ratio stamp, the halo, the foot links' wrap.
- `tests/chrome.test.ts`: the veil, the switches' words, a phone's chrome, `cueState`, the shapes of what is and is
  not pressable, the small words.
- `tests/floor-ways.test.ts`: `listGroups`, `rowMeta`, `thumbSize`, `toggleText`, `viewFromSearch`, `searchForView`,
  `chapterTabLabel`, `stripName`, `softBreaks`, `hoverFitIn`, `previewBox`, `captionSpot`, `strayed`, `nearestPane`,
  `PanController.coasting`; pins for the world's and the page's wiring and the stylesheet.
- `tests/wayfinding.test.ts`: the switches' pins follow `switchLabel`.
