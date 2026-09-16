# ABOUT restored, the city becomes STORY — design (2026-09-16)

The owner: "Move the TOUR part in the ABOUT section, turn it into the original full-fledged ABOUT section again, then place it between HOMEPAGE and WORK. The City remains as it is, but now renamed to the STORY section, and placed after CONTACT, beside it on the far right."

## What exists

The city took over `about.html` when it shipped; the original ABOUT was archived **live** as `about-old.html` + `src/pages/about-old.ts` + `src/styles/about-old.css` (decree: never touched). The nav lives in `public/content/site.json` and everything follows it: the header links (`mountShell`), the glide chain (`navNeighbors(site.nav, path)`), the onward cues. The nav today: HOMEPAGE · WORK · ABOUT · CONTACT.

## The design

**The nav** (site.json, order = the chain): HOMEPAGE `/index.html` · ABOUT `/about.html` · WORK `/works.html` · CONTACT `/contact.html` · STORY `/story.html`. The glide chain, the header and the cues all follow by data: home glides onward to ABOUT, contact onward to STORY, STORY is the line's end.

**STORY = the city, renamed, nothing else.** `about.html` → `story.html` (git mv; the file keeps its head, body, canvas, stations, dial, clock); only the title (`STORY — REVACHOL`), the description, and the entry (`/src/pages/story.ts`) change. `src/pages/about.ts` → `src/pages/story.ts` (`startPage('story')`, imports `../styles/story.css`); `src/styles/about.css` → `src/styles/story.css` (unchanged content). The debug handle, the poster-lock exemption, the tour/auto/free dial, `?tod=`, calm — all ride along untouched.

**ABOUT = the original, fresh copies of the archive.** New `about.html`: the archive's body verbatim (hero grid, CAL bars, OP/CAP sections, transmit, EOF), under the *current* standard head (calm class, background style, stale-deploy self-heal, the music boot — the archive predates the music boot and stays without it), title `ABOUT — REVACHOL`, entry `/src/pages/about.ts`. New `src/pages/about.ts`: the archive entry's code with one changed line (imports `../styles/about.css`); new `src/styles/about.css`: a copy of `about-old.css`. The archive trio stays byte-identical — the copies evolve, the archive never does.

**The shell**: `PageKey` gains `'story'`; `HREF_FOR.story = '/story.html'`. **Vite**: `story: p('story.html')` joins the inputs; `about` and `aboutOld` stay.

## What does not change

`about-old.html` / `about-old.ts` / `about-old.css` (the decree); the city and all its modules (`src/about/*`); works, contact, home, project pages; the poster-lock; calm; the shared `/content/about/*` data both ABOUT and STORY read.

## Tests

- content-files: site.json's nav is exactly the five stops, labels and hrefs in order.
- music-boot: `story.html` joins PAGES (identical boot, self-heal before it, before the title); `about-old.html` still has none.
- sections (new): `story.html` carries the city (the canvas, the story entry, the STORY title); `about.html` carries the original (the hero grid, the about entry, the ABOUT title, no canvas); the archive still points at its own entry; vite lists the story input; the shell maps story to `/story.html`.

## Verification in the pane

Home: the header reads HOMEPAGE · ABOUT · WORK · CONTACT · STORY. `/about.html`: the original page renders (PERSONNEL status, portrait, TRANSMIT?), ABOUT highlighted. `/story.html`: the city boots (`rvlRide` up, the five stations, the dial), STORY highlighted. `/about-old.html`: still alive. Contact and works render with the new header. Screenshots of the restored ABOUT and the STORY city.

## As built (2026-09-16)

- As specced, nothing extra. The city moved by git mv (its history rides along); the fresh about trio was copied from the archive by script, and the archive shows zero changes in git.
- The pane, all five pages at 1,280-wide desktop: the header reads HOMEPAGE · ABOUT · WORK · CONTACT · STORY on every page with the right link lit; /about.html renders the original (PERSONNEL status, the acid portrait, CAL bars, OP/CAP, TRANSMIT?), no canvas; /story.html boots the city (rvlRide up, five stations, the TOUR/AUTO/FREE dial, the clock), title STORY — REVACHOL; /about-old.html still boots as its own page.
- Gates: tsc clean, 265 passed / 3 skipped (five new sections assertions; content-files now pins the exact five-stop nav; music-boot covers story.html and still proves the archive carries no boot), vite build emits all seven pages.
- The glide chain re-drew itself from the data: home onward is ABOUT now, contact onward is STORY, STORY ends the line — no swipe code changed.
