# THE LIST's city and its machines — design (2026-10-13)

The owner, on THE LIST (`works.html?view=list`), with a screenshot at 2,560 wide — the list a column in the middle,
black on both sides:

- "I want decoration art filling up the two sides' negative space and the background. Preferably a lot of our art
  direction mixing with 8bit. And an animated 8bit city in the black background too."
- "Still need to keep all the projects all perfectly readable in the middle, remember this."

Then, while it was being built:

- "please no AI tools. Colorist, filmmaking tools, computer tools in general is okay"
- "the designs for these objects must not be generic, but highly customised to our overall art direction"
- with an exploded isometric drawing of a handheld console: "we go mix between 3D and pixel arts like this. They have to
  feel like they are floating around in the space"
- after a first cast of a monitor, a grading panel, a camera and a keyboard: "go more crazy with the design ideas. Edit
  tools and colorist tools too damn generic"

## The taste read (tastemaker)

- **The brief:** the margins and backdrop of THE LIST. It is an identity surface, so it should reach the top rung (Convicted). The
  reading column stays deliberately plain.
- **The reference's decision is the exploded view:** every part separated along the way it comes out, one ink line,
  one light, one body colour with rationed accents, a character hidden in the machinery.
- **The first plan stalled at the second rung (Coherent).** Four equal framed widgets a side were a listed dashboard (TS-010), and the
  owner's "generic" was right.
- **What carries over:** one light from the moon's side (CR-301); the machines drawn on the city's own pixel grid with one
  void ink line (TS-006); bodies in the field blue, lime and pink only where light is carried (CR-203); every motion
  meaning something (TS-004); the exploded view as the form (TS-001).

## Design

### 1. The reading column (CSS — the guarantee)

- `.film-list` keeps its black in a band 1,192 plate px wide about the middle (the rows and 36 px a side) and lets the
  rest through, once a city is built (`html.rvl-list-city`). The band is plain CSS, so nothing is ever drawn under a
  title, whatever the script does. A phone never gets the class: its sheet stays black, and nothing of the city exists.

### 2. Three layers on one 8-bit grid (`works/list-deco.ts`)

- One grid of 8-bit pixels: about 290 rows, each pixel a whole number of the screen's pixels (five at 1,440 tall).
  - **The city** (`works/pixel-city.ts`): a sky banded and Bayer-dithered from the void into the night's blues.
    Twinkling stars and a crescent moon high in the left margin, the margins' one light. Three skylines; windows kept to the night's dim tones so the backdrop
    recedes. A few neon strips, two dithered searchlights, a train on the elevated line, the street's lamps, craft with
    nav lights. The column's own rule, dotted field blue with lime ticks, and the black dithered out into the city.
  - **The machines** (`works/list-machines.ts`, three.js, loaded the first time THE LIST opens on a wide screen).
  - **The ink:** the callouts' dotted leaders, ending in lime dots on the parts.

### 3. The machines (`works/machines.ts`)

- **How they are drawn.** Real 3D at the 2:1 pixel isometric angle, on the city's grid:
  - three tones an ink from the one light, the seams Bayer-dithered;
  - a second pass inks one void pixel round every part (on the farther part, as a drawing would);
  - light itself (beams, the scan, pulses) is dithered see-through with no line;
  - the machines hold the isometric angle and step a whole pixel at a time; what turns (the orrery's arms, the
    platters, the LUT cube, the loose parts) turns in 3D.
- **The GRADE bay (left):**
  - **THE PRISM ORRERY.** The moon's beam enters a glass prism that splits it into the site's three accents, SGN, ALT
    and FLD. Each beam feeds a planet (lift, gamma, gain) with a hue ring in the site's colours, orbiting a brass hub, a
    turn a minute.
  - **THE LUT CUBE.** A 3D lookup table made solid: a 4 × 4 × 4 lattice of the cued film's grade (shadows into the field
    blue, highlights toward the film's own accent), in crop marks. Its slices lift apart while a lime plane scans
    through and the cube turns.
- **The CUT bay (right):**
  - **THE CRT TOTEM.** Five televisions on a mast (two cream among the blue), each on a film. The head set is one big
    pixel eye that watches the film pointed at in the list, its iris in that film's accent, and blinks.
  - **THE FLATBED.** Three platters wound with film. The strip is unwound from the first in an arch, under the splicer's
    blade (it drops on the beat: the cut), behind the viewer (its screen on the cued film), down into the last. The
    films run on it in 8-bit, turned to the eye.
  - **THE ELECTRIC SHEEP.** After the homepage's "&_ELECTRIC_SHEEPS": purple wool, a television for a head (a face,
    pink cheeks), a cable for a tail with a lime plug, drifting between the machines.
- **Across, THE CONDUIT:** from the LUT cube to the flatbed, behind the list, where the column's black swallows it. Lime
  pulses run through it: the grade feeds the cut.
- **Loose parts:**
  - the GRADE bay: CAL chips in the site's colours, screws;
  - the CUT bay: a floppy disk, cut frames of the films, a razor blade;
  - both bays: the site's lime `+`, always flat to the eye.
- **The films are the content:** every poster dithered to 8-bit colour into one atlas, NO SIGNAL (the site's CAL bars) until
  it lands; a vertical film stands vertical, a scope film letterboxed.

### 4. The margins' hardware (`works/list-art.ts`)

- A slanted lime plate naming the bay (`GRADE ▸ BAY 01`, `CUT ▸ BAY 02`, the about page's plate) and under it the
  cued film (`CUE ▸ FAR-EAST ▮`), a spine of readouts at the screen's edge.
- The machines keep to the column's side. With room on the outer side (2,560 wide), the exploded-view callouts stand
  there in the site's readout grammar, `KEY ::` in lime over its value in bone, a dotted leader to the part:
  `LIGHT :: MOON ▸ PRISM`, `TRK :: LIFT ▪ GAMMA ▪ GAIN`, `LUT :: FAR-EAST.CUBE`, `WATCHING ▸ FAR-EAST`,
  `&_ELECTRIC_SHEEP ▮`, `UPLINK :: GRADE ▸ CUT`…
- No AI tool, and no AI word, anywhere in it (a test holds it).

### 5. Motion and states

- Everything steps twelve times a second: the machines breathe open and closed along their own axes and ride up and
  down a pixel or two; a film holds the screens four seconds, then the next.
- Pointing at a film in the list cues it on every screen and in the LUT's grade; the machines close up to take it and
  the totem's eye turns to it.
- CALM (the MOTION switch) draws one still frame, redrawn when a film is pointed at. The LITE tier draws the city's
  still and no machines. The list's closing or a hidden tab stops it all.
- Margins under 80 plate px a side (a phone, a tablet) build nothing; under 300 (1,440 wide) the city and the hardware
  but no machines; the callouts only where the margin has room (2,560).

## Tests

- `list-city.test.ts`:
  - the city's plan is the same for a seed, its skylines cover the width, and nothing rises into the header's fifth;
  - windows and signs stand inside their buildings;
  - the moon is in the left margin;
  - colours come only from the palette;
  - the traffic and signs run on the clock;
  - the scale is whole, at about 290 rows.
- `list-art.test.ts`:
  - nothing crosses into the column at five screens;
  - phones and tablets build nothing, 1,440 keeps only the hardware, 2,560 has machines and callouts;
  - the callouts stand outside the machines;
  - the conduit runs from bay to bay below them;
  - no AI word appears.
- `machines.test.ts`:
  - the isometric basis and 2:1 slope;
  - whole-pixel snapping that keeps depth;
  - one light: tops light, left faces the side tone, right faces dark, clear of the dither seams;
  - the inks are the palette's, in three ordered tones;
  - the clock: breath, float, orbit, blade, scan, pulses, sheep, eye, blink, cue;
  - the LUT grade;
  - films keep their own shape on the screens, in 8-bit colour;
  - the callout grammar.
- `floor-ways.test.ts`: the CSS band is the layout's column, the sheet's own black stays for phones, the deco stands
  under the list, and the class comes only with a city built.

## Verification

- Renders of the built site (with its CSP) at 2,560 × 1,440 and 1,920 × 1,080, at rest and with a film pointed at,
  and at 1,440 × 900 (city slivers, no machines).
- 390 and 375 touch phones: the sheet is black, nothing is built, no overflow.
- CALM gives identical frames, redrawn once on pointing. LITE gives the city still and no machines.
- A step's cost on a software renderer.
- check, test and build; the live site after the push.

## Design calls for the owner

- The cast:
  - the GRADE bay's prism orrery and LUT cube;
  - the CUT bay's CRT totem with the watching eye, the flatbed, and the electric sheep;
  - the conduit behind the list.
- The site's three accents as the prism's split light (SGN, ALT, FLD for lift, gamma, gain).
- The bodies in field blue, two cream televisions for contrast; lime and pink only where light is carried.
- The callouts at 2,560 only (at 1,920 the machines take the whole margin).
- The machines close up to take a pointed film; the eye watches it.
- Twelve steps a second for everything; the city's windows muted so the machines lead.
- 1,440-wide screens get the city in slivers and no machines; phones keep the plain black list.
