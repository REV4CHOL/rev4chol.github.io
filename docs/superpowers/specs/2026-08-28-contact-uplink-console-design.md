# Contact page — UPLINK CONSOLE (design)

Date: 2026-08-28 · Status: approved by user (concept + design), building

## Intent

Replace the Contact stub with the transmission console the About page's
`TRANSMIT? YES ▸ INITIATE CONTACT` promises. One committed screen —
contact is a conversion surface (ceiling: Characterful): the email is the
single loud thing; everything else is instrument and dressing.

## Layout (one console screen, ~1 viewport)

- Typed status top-left: `UPLINK :: CHANNEL OPEN // AWAITING SIGNAL` +
  blinking caret. `TX:` outline rail tag. `P·TX/01` stamp top-right.
- **The email**: site.json `email`, uppercased, mega Clash type spanning
  the content width, scramble-in, signal green; `href="mailto:...?subject=
  TRANSMISSION :: REVACHOL"`; hover inverts. Sized with a phone clamp so
  the unbroken string always fits the column (the About mega-name lesson).
- `COPY FREQ` pill (alert pink) under it: clipboard-copies the address,
  swaps to `COPIED ▸` + sound.click(), reverts after ~1.6 s. Clipboard
  failure keeps the label and warns in console only.
- **Live signal meter**: ~24 bars driven each frame by the site audio
  engine's real analyser (`sound.level()` RMS), scaled + per-bar seeded
  weighting so the hum makes it breathe and blips spike it. Before unlock,
  and whenever level is 0, bars hold a seeded static skyline. Calm mode:
  static skyline, no rAF loop.
- Callouts with dotted leaders: `FREQ :: <email domain>`,
  `RESPONSE :: < 48H`, `STATUS :: RECEIVING ▸` (blinking).
- Bodoni italic line: “Every transmission is answered. Bring something
  strange.”
- `AUX CHANNELS` label + socials as flourish-lavender pills (site.json).
- Pink hazard strip, `EOF ▪ P·TX/01 ▪ REVACHOL` stamp. Two seeded
  plus-glyphs. Entry stamps via shared lib/stamps.

## Implementation

- `contact.html` + `src/pages/contact.ts` rewrites; new
  `src/styles/contact.css` (c- prefix classes, calm overrides, ≤760 block
  AFTER base rules — the components.css cascade lesson).
- Meter: divs + one rAF loop; `sound.level()` already public; loop gated
  off under `reducedMotion()`; destroyed on pagehide not needed (page
  navigations reload).
- No content-schema change. HOW-TO-EDIT: one line (contact reads email +
  socials from site.json).

## Verification

tsc + vitest + build; live: desktop 1440 + phone 375 (email fits, no
overflow, meter animates after a click, COPY FREQ copies + confirms, mailto
href correct, calm static); commit.
