# REVACHOL Portfolio — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phase 1 of the REVACHOL cinematic portfolio: site shell (boot, nav, HUD, cursor, sound, transitions), the draggable isometric WebGL Works world with tiered video playback and hover-magnify, and the JSON-skinned project detail page — per the approved spec at `docs/superpowers/specs/2026-08-27-revachol-portfolio-design.md`.

**Architecture:** Vite + TypeScript multi-page app (5 HTML entries). PixiJS v8 renders only the Works world; everything readable (nav, HUD, detail pages) is DOM. Content (`public/content/`) is fetched at runtime — media/JSON changes never require a rebuild. Pure logic (validation, layout, playback priority, dither math, scramble, embed URLs) lives in dependency-free modules with Vitest coverage; browser behavior is verified live at every milestone.

**Tech Stack:** Vite ^7, TypeScript ~5.6, PixiJS ^8.6, pixi-filters ^6.1, GSAP ^3.12, Vitest ^3. Fonts self-hosted woff2 (converted once via fonttools).

**Spec refinements (approved intent, cheaper mechanics — visible result identical):**
- Bayer dither is **precomputed once per poster onto a canvas texture** (duotone: void → project accent), not a per-frame shader. Frame cost ~0; "resolve to clean" is a crossfade.
- Grain/scanlines/vignette are a **DOM overlay shared by all pages** (consistency + one implementation); WebGL filters (GlitchFilter, RGBSplitFilter from pixi-filters) still run real pixel effects on video during hover/burst.

## Global Constraints

- Palette (exact): `--void:#060606` `--surface:#0A0A12` `--signal:#C8FF00` `--field:#2418FF` `--alert:#FF2E63` `--flourish:#B79CFF` `--bone:#EDEDE6`. One dominant accent per view.
- Fonts: Clash Display = big headings/hero/section titles only. Bodoni Moda = REVACHOL wordmark + film titles, **never side-by-side with Clash at the same size** (Clash owns scale steps ≥ `--t-xl`). Geist Mono = all body/UI. Martian Mono = micro-labels only, ≤11px, uppercase.
- Live video caps: **10 desktop / 4 mobile**; above cap → animated dithered poster. `devicePixelRatio` cap 2 desktop / 1.5 mobile.
- Works world: drag only, **no auto-drift**; inertia + rubber-band bounds.
- `prefers-reduced-motion` → calm mode (no scramble/wipes/rain/inertia; static grain; native cursor).
- Sound: WebAudio-synthesized only (zero audio files); muted until first user gesture; toggle in HUD; persisted in `localStorage` key `rvl-sound`.
- Content contract: runtime-fetched `/content/site.json` + `/content/projects.json` + `/content/projects/<slug>/{poster.jpg, preview.mp4, hover.mp4?, film.mp4?, stills/*}`. Detail route `project.html?p=<slug>`. 12 placeholder projects ship in phase 1.
- Content errors surface on the boot screen as `CONTENT ERROR` with file + human-readable detail; missing media degrades gracefully (poster-only) with console listing.
- Boot: 1.2–2 s, skippable (click/key), once per session (`sessionStorage` key `rvl-booted`).
- All internal navigation links carry `data-internal` and go through the glitch-wipe transition.
- Node ≥ 20. All commands below run from `D:\WORK\PROJECT\JOB\AI\WEBSITE_AI\SITE` unless stated.

## File Structure (final state)

```
SITE/
  index.html works.html about.html contact.html project.html
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  .gitignore  README.md
  HOW-TO-EDIT.md
  scripts/
    convert_fonts.py         one-time font → woff2
    gen-placeholders.ps1     12 placeholder projects via ffmpeg
    make-preview.ps1         user helper: master file → poster/preview/hover
  public/
    fonts/*.woff2
    content/  site.json  projects.json  projects/<slug>/...
  src/
    styles/   tokens.css  base.css  components.css  project.css
    lib/      env.ts  content.ts  rng.ts  dither.ts  scramble.ts  sound.ts
              transitions.ts  embeds.ts
    shell/    shell.ts  page.ts  boot.ts  hud.ts  cursor.ts  grain.ts
    works/    constants.ts  layout.ts  priority.ts  tile.ts  playback.ts
              input.ts  rain.ts  debris.ts  world.ts
    pages/    index.ts  works.ts  about.ts  contact.ts  project.ts
  tests/      content.test.ts  content-files.test.ts  layout.test.ts
              priority.test.ts  dither.test.ts  scramble.test.ts  embeds.test.ts
  docs/superpowers/{specs,plans}/
```

Module responsibilities: `lib/` = dependency-free logic + page-agnostic services; `shell/` = chrome shared by all pages; `works/` = the Pixi world only; `pages/` = thin entry glue. Files that must stay pure (unit-tested in node, **no `window` access at module top level**): `content.ts` (parse fns), `rng.ts`, `dither.ts` (math core), `scramble.ts` (frame core), `layout.ts`, `priority.ts`, `embeds.ts`.

---

### Task 1: Scaffold — Vite MPA, TypeScript, Vitest, five pages

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`, `README.md`
- Create: `index.html`, `works.html`, `about.html`, `contact.html`, `project.html`
- Create: `src/styles/tokens.css` (palette only; fonts arrive in Task 2), `src/styles/base.css` (minimal)
- Create: `src/pages/index.ts`, `src/pages/works.ts`, `src/pages/about.ts`, `src/pages/contact.ts`, `src/pages/project.ts` (stub entries)
- Test: `tests/sanity.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `npm run dev|build|check|test` scripts; page skeleton IDs used later: `#floor`, `#sr-projects` (works.html); `#p-hero`, `#p-hero-video`, `#p-hero-veil`, `#p-title`, `#p-meta`, `#p-synopsis`, `#p-watch-btn`, `#p-player`, `#p-stills`, `#p-credits`, `#p-pager`, `#lightbox`, `#lightbox-img`, `#lightbox-close` (project.html); `#statement` (stubs). Body classes `page-home|page-work|page-about|page-contact|page-project`.

- [ ] **Step 1: Write config + manifest files**

`package.json`:

```json
{
  "name": "revachol-site",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "gsap": "^3.12.5",
    "pixi-filters": "^6.1.0",
    "pixi.js": "^8.6.0"
  },
  "devDependencies": {
    "typescript": "~5.6.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const p = (f: string) => fileURLToPath(new URL(f, import.meta.url));

export default defineConfig({
  appType: 'mpa',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: p('index.html'),
        works: p('works.html'),
        about: p('about.html'),
        contact: p('contact.html'),
        project: p('project.html'),
      },
    },
  },
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

`.gitignore`:

```
node_modules/
dist/
.fonttool-venv/
*.local
```

`README.md`:

```markdown
# REVACHOL — portfolio site

Dev: `npm run dev` · Build: `npm run build` (static output in `dist/`) · Tests: `npm test`

Content (projects, media, site text) lives in `public/content/` — see `HOW-TO-EDIT.md`.
Design spec: `docs/superpowers/specs/2026-08-27-revachol-portfolio-design.md`.
```

- [ ] **Step 2: Write the five HTML skeletons**

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>REVACHOL — Cinematic Filmmaker</title>
  <meta name="description" content="REVACHOL — cinematic filmmaker. Films, direction, cinematography." />
</head>
<body class="page-home">
  <main id="app" class="stub-main">
    <h1 class="statement" id="statement">CINEMA IS A MACHINE THAT DREAMS</h1>
    <p class="micro" id="tagline"></p>
    <p class="stub-cta"><a class="btn" href="/works.html" data-internal>ENTER THE FLOOR ▸</a></p>
  </main>
  <script type="module" src="/src/pages/index.ts"></script>
</body>
</html>
```

`works.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WORK — REVACHOL</title>
  <meta name="description" content="Selected films by REVACHOL — an explorable floor of moving images." />
</head>
<body class="page-work">
  <main id="app" class="works-main">
    <div id="floor" aria-hidden="true"></div>
    <ul id="sr-projects" class="sr-only" aria-label="Projects"></ul>
    <aside id="tile-label" hidden>
      <h2 class="tl-title"></h2>
      <p class="tl-meta micro"></p>
    </aside>
  </main>
  <script type="module" src="/src/pages/works.ts"></script>
</body>
</html>
```

`about.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ABOUT — REVACHOL</title>
  <meta name="description" content="About REVACHOL — cinematic filmmaker." />
</head>
<body class="page-about">
  <main id="app" class="stub-main">
    <h1 class="statement" id="statement">THE EYE BEHIND THE MACHINE</h1>
    <p class="micro">SECTION UNDER CONSTRUCTION // SIGNAL PENDING</p>
    <p class="stub-cta"><a class="btn" href="/works.html" data-internal>ENTER THE FLOOR ▸</a></p>
  </main>
  <script type="module" src="/src/pages/about.ts"></script>
</body>
</html>
```

`contact.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CONTACT — REVACHOL</title>
  <meta name="description" content="Contact REVACHOL." />
</head>
<body class="page-contact">
  <main id="app" class="stub-main">
    <h1 class="statement" id="statement">OPEN A CHANNEL</h1>
    <p class="micro" id="contact-email"></p>
    <p class="stub-cta"><a class="btn" href="/works.html" data-internal>ENTER THE FLOOR ▸</a></p>
  </main>
  <script type="module" src="/src/pages/contact.ts"></script>
</body>
</html>
```

`project.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PROJECT — REVACHOL</title>
  <meta name="description" content="A film by REVACHOL." />
</head>
<body class="page-project">
  <main id="app" class="project-main">
    <section class="p-hero" id="p-hero">
      <video id="p-hero-video" muted loop playsinline autoplay></video>
      <canvas id="p-hero-veil" aria-hidden="true"></canvas>
      <h1 class="p-title" id="p-title"></h1>
    </section>
    <section class="p-meta micro" id="p-meta"></section>
    <section class="p-synopsis" id="p-synopsis"></section>
    <section class="p-watch">
      <button class="btn" id="p-watch-btn" hidden>WATCH FILM ▸</button>
      <div class="p-player" id="p-player" hidden></div>
    </section>
    <section class="p-stills" id="p-stills"></section>
    <section class="p-credits" id="p-credits"></section>
    <nav class="p-pager" id="p-pager" aria-label="More projects"></nav>
  </main>
  <dialog class="lightbox" id="lightbox">
    <img id="lightbox-img" alt="" />
    <button id="lightbox-close" class="btn">CLOSE ✕</button>
  </dialog>
  <script type="module" src="/src/pages/project.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Write minimal styles + stub page entries + sanity test**

`src/styles/tokens.css` (palette only for now — Task 2 completes it):

```css
:root {
  --void: #060606;
  --surface: #0A0A12;
  --signal: #C8FF00;
  --field: #2418FF;
  --alert: #FF2E63;
  --flourish: #B79CFF;
  --bone: #EDEDE6;
  --accent: var(--signal);
}
```

`src/styles/base.css`:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { color-scheme: dark; }
body {
  background: var(--void);
  color: var(--bone);
  font-family: 'Geist Mono', ui-monospace, monospace;
  min-height: 100vh;
}
img, video, canvas { display: block; max-width: 100%; }
a { color: inherit; }
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
::selection { background: var(--accent); color: var(--void); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}
```

Each of the five files in `src/pages/` gets the same two lines for now (shown for `index.ts`; repeat verbatim in `works.ts`, `about.ts`, `contact.ts`, `project.ts` changing only the log text):

```ts
import '../styles/tokens.css';
import '../styles/base.css';

console.log('[revachol] index entry ok');
```

`tests/sanity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Install and verify everything runs**

Run: `npm install`
Expected: completes without errors; `node_modules/` created.

Run: `npm test`
Expected: `1 passed` (sanity).

Run: `npm run check`
Expected: no TypeScript errors.

Run: `npm run build`
Expected: `dist/` contains `index.html works.html about.html contact.html project.html` + assets.

Start dev server in background (`npm run dev`), open browser at `http://localhost:5173/`, `/works.html`, `/about.html`, `/contact.html`, `/project.html` — each renders its skeleton text on near-black background, console shows its `[revachol] … entry ok` line, no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold vite mpa with five pages, vitest, base styles"
```

---

### Task 2: Font pipeline — woff2 conversion, @font-face, full design tokens

**Files:**
- Create: `scripts/convert_fonts.py`
- Create: `public/fonts/` (7 woff2 outputs)
- Modify: `src/styles/tokens.css` (complete it)

**Interfaces:**
- Consumes: font sources in `D:\WORK\PROJECT\JOB\AI\WEBSITE_AI\FONT` (read-only — never modify originals).
- Produces: CSS custom properties used by ALL later tasks: font stacks `--f-display`, `--f-serif`, `--f-mono`, `--f-micro`; type scale `--t-2xs --t-xs --t-sm --t-md --t-lg --t-xl --t-2xl --t-3xl`; easing `--ease-out`. Loaded families named exactly `'Clash Display'`, `'Bodoni Moda'`, `'Geist Mono'`, `'Martian Mono'`.

- [ ] **Step 1: Write the conversion script**

`scripts/convert_fonts.py`:

```python
"""One-time font conversion: TTF/OTF sources -> woff2 in public/fonts.
Originals are never modified. Requires: pip install fonttools brotli
"""
from pathlib import Path
from fontTools.ttLib import TTFont

SRC = Path(r"D:\WORK\PROJECT\JOB\AI\WEBSITE_AI\FONT")
OUT = Path(__file__).resolve().parents[1] / "public" / "fonts"

FILES = [
    ("Clash Display/ClashDisplay-Regular.otf", "ClashDisplay-Regular.woff2"),
    ("Clash Display/ClashDisplay-Medium.otf", "ClashDisplay-Medium.woff2"),
    ("Clash Display/ClashDisplay-Bold.otf", "ClashDisplay-Bold.woff2"),
    ("Bodoni_Moda/BodoniModa-VariableFont_opsz,wght.ttf", "BodoniModa-Var.woff2"),
    ("Bodoni_Moda/BodoniModa-Italic-VariableFont_opsz,wght.ttf", "BodoniModa-Italic-Var.woff2"),
    ("Geist Mono/GeistMono-VariableFont_wght.ttf", "GeistMono-Var.woff2"),
    ("Martian Mono/MartianMono-VariableFont_wdth,wght.ttf", "MartianMono-Var.woff2"),
]

OUT.mkdir(parents=True, exist_ok=True)
missing = []
for src, dst in FILES:
    p = SRC / src
    if not p.exists():
        missing.append(str(p))
        print(f"!! MISSING {p}")
        continue
    f = TTFont(str(p))
    f.flavor = "woff2"
    f.save(str(OUT / dst))
    print(f"ok {dst}")

if missing:
    raise SystemExit(f"{len(missing)} source font(s) missing - fix paths above")
print("done")
```

- [ ] **Step 2: Run the conversion**

Run (PowerShell):

```powershell
python -m venv .fonttool-venv
.\.fonttool-venv\Scripts\pip install fonttools brotli
.\.fonttool-venv\Scripts\python scripts\convert_fonts.py
```

Expected: seven `ok …woff2` lines then `done`. (If `python` is not on PATH, use `py -3` for the venv line.) If a Clash weight file is missing, list the actual `Clash Display` folder contents and substitute the closest weight (e.g. Semibold for Bold) in both the script and the `@font-face` rules below.

Verify: `Get-ChildItem public\fonts` shows 7 `.woff2` files, each smaller than its source.

- [ ] **Step 3: Complete tokens.css**

Replace the whole of `src/styles/tokens.css` with:

```css
@font-face { font-family: 'Clash Display'; src: url('/fonts/ClashDisplay-Regular.woff2') format('woff2'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'Clash Display'; src: url('/fonts/ClashDisplay-Medium.woff2') format('woff2'); font-weight: 500; font-display: swap; }
@font-face { font-family: 'Clash Display'; src: url('/fonts/ClashDisplay-Bold.woff2') format('woff2'); font-weight: 700; font-display: swap; }
@font-face { font-family: 'Bodoni Moda'; src: url('/fonts/BodoniModa-Var.woff2') format('woff2'); font-weight: 400 900; font-display: swap; }
@font-face { font-family: 'Bodoni Moda'; src: url('/fonts/BodoniModa-Italic-Var.woff2') format('woff2'); font-weight: 400 900; font-style: italic; font-display: swap; }
@font-face { font-family: 'Geist Mono'; src: url('/fonts/GeistMono-Var.woff2') format('woff2'); font-weight: 100 900; font-display: swap; }
@font-face { font-family: 'Martian Mono'; src: url('/fonts/MartianMono-Var.woff2') format('woff2'); font-weight: 100 800; font-display: swap; }

:root {
  /* palette — spec §3.1 */
  --void: #060606;
  --surface: #0A0A12;
  --signal: #C8FF00;
  --field: #2418FF;
  --alert: #FF2E63;
  --flourish: #B79CFF;
  --bone: #EDEDE6;
  --accent: var(--signal); /* per-view dominant accent; project pages override */

  /* voices — spec §3.2 */
  --f-display: 'Clash Display', system-ui, sans-serif;
  --f-serif: 'Bodoni Moda', 'Didot', serif;
  --f-mono: 'Geist Mono', ui-monospace, 'Cascadia Mono', monospace;
  --f-micro: 'Martian Mono', ui-monospace, monospace;

  /* type scale. RULE: Clash Display owns >= --t-xl. Bodoni next to Clash
     must sit at <= --t-lg. Never the same step side by side. */
  --t-2xs: 0.625rem;  /* micro labels — Martian Mono ceiling is 11px */
  --t-xs: 0.75rem;
  --t-sm: 0.875rem;
  --t-md: 1rem;
  --t-lg: clamp(1.4rem, 2.5vw, 2rem);
  --t-xl: clamp(2.2rem, 5vw, 3.6rem);
  --t-2xl: clamp(3rem, 8vw, 6rem);
  --t-3xl: clamp(4rem, 11vw, 8.5rem);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

Append to `src/styles/base.css`:

```css
body { font-size: var(--t-md); line-height: 1.6; }
.micro {
  font-family: var(--f-micro);
  font-size: var(--t-2xs);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: color-mix(in srgb, var(--bone) 55%, transparent);
}
.statement {
  font-family: var(--f-display);
  font-weight: 700;
  font-size: var(--t-2xl);
  line-height: 0.95;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  max-width: 12ch;
}
```

- [ ] **Step 4: Verify in the browser**

Run `npm run check` (expect clean), start dev server, open `http://localhost:5173/about.html`. The statement renders in Clash Display (geometric, wide). In the browser console run:

```js
await document.fonts.load('700 1rem "Clash Display"');
await document.fonts.load('400 1rem "Bodoni Moda"');
await document.fonts.load('400 1rem "Geist Mono"');
await document.fonts.load('400 1rem "Martian Mono"');
[...document.fonts].filter(f => f.status === 'loaded').length >= 4;
```

Expected: `true`; Network tab shows woff2 responses with status 200.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: self-hosted woff2 fonts and full design tokens"
```

---

### Task 3: Content module — types, validation, loaders (TDD)

**Files:**
- Create: `src/lib/content.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: design tokens only conceptually; no code imports.
- Produces (exact — every later task relies on these):
  - Types: `NavItem{label,href}`, `Social{label,href}`, `SiteContent{name,tagline,email,nav,socials}`, `FilmRef{type:'vimeo'|'youtube'|'local',src}`, `Credit{role,name}`, `GridPos{col,row}`, `Project{slug,title,year,role,runtime,tags,accent,tileSize:'normal'|'large',synopsis,credits,film:FilmRef|null,stills,position:GridPos|null}`
  - `class ContentError extends Error { file: string; detail: string }`
  - `parseJson(text: string, file: string): unknown`
  - `parseSite(raw: unknown): SiteContent`
  - `parseProject(raw: unknown, i: number): Project`
  - `parseProjects(raw: unknown): Project[]`
  - `projectAssetUrl(slug: string, file: string): string` → `/content/projects/<slug>/<file>`
  - `getSlugFromSearch(search: string): string | null`
  - `loadSite(): Promise<SiteContent>`, `loadProjects(): Promise<Project[]>` (fetch + cache; browser-only, not unit-tested)

- [ ] **Step 1: Write the failing tests**

`tests/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ContentError,
  getSlugFromSearch,
  parseJson,
  parseProjects,
  parseSite,
  projectAssetUrl,
} from '../src/lib/content';

const validProject = () => ({
  slug: 'neon-dream',
  title: 'Neon Dream',
  year: 2025,
  role: 'Director / DoP',
  runtime: '12:40',
  tags: ['short film'],
  accent: '#C8FF00',
  tileSize: 'large',
  synopsis: 'A courier crosses the city.',
  credits: [{ role: 'Director', name: 'Revachol' }],
  film: { type: 'vimeo', src: 'https://vimeo.com/76979871' },
  stills: ['01.jpg', '02.jpg'],
  position: { col: 0, row: 0 },
});

const validSite = () => ({
  name: 'REVACHOL',
  tagline: 'cinematic filmmaker',
  email: 'mail@example.com',
  nav: [
    { label: 'HOMEPAGE', href: '/index.html' },
    { label: 'WORK', href: '/works.html' },
  ],
  socials: [{ label: 'INSTAGRAM', href: 'https://instagram.com/x' }],
});

describe('parseSite', () => {
  it('accepts a full valid site', () => {
    const s = parseSite(validSite());
    expect(s.name).toBe('REVACHOL');
    expect(s.nav).toHaveLength(2);
    expect(s.socials[0].label).toBe('INSTAGRAM');
  });

  it('defaults tagline, email, socials', () => {
    const s = parseSite({ name: 'X', nav: [{ label: 'A', href: '/a' }] });
    expect(s.tagline).toBe('');
    expect(s.email).toBe('');
    expect(s.socials).toEqual([]);
  });

  it('rejects missing name and empty nav', () => {
    expect(() => parseSite({ nav: [{ label: 'A', href: '/a' }] })).toThrow(ContentError);
    expect(() => parseSite({ name: 'X', nav: [] })).toThrow(/nav/);
  });
});

describe('parseProjects', () => {
  it('accepts a full valid project', () => {
    const [p] = parseProjects([validProject()]);
    expect(p.slug).toBe('neon-dream');
    expect(p.tileSize).toBe('large');
    expect(p.film).toEqual({ type: 'vimeo', src: 'https://vimeo.com/76979871' });
    expect(p.position).toEqual({ col: 0, row: 0 });
  });

  it('fills defaults for optional fields', () => {
    const [p] = parseProjects([{ slug: 'a-b', title: 'AB', year: 2024 }]);
    expect(p.role).toBe('');
    expect(p.runtime).toBe('');
    expect(p.tags).toEqual([]);
    expect(p.accent).toBe('#C8FF00');
    expect(p.tileSize).toBe('normal');
    expect(p.credits).toEqual([]);
    expect(p.film).toBeNull();
    expect(p.stills).toEqual([]);
    expect(p.position).toBeNull();
  });

  it('rejects bad slugs, duplicate slugs, bad accent, bad year, bad film type, bad tileSize', () => {
    expect(() => parseProjects([{ ...validProject(), slug: 'Neon Dream' }])).toThrow(/slug/);
    expect(() => parseProjects([validProject(), validProject()])).toThrow(/duplicate/);
    expect(() => parseProjects([{ ...validProject(), accent: 'green' }])).toThrow(/accent/);
    expect(() => parseProjects([{ ...validProject(), year: 'yesterday' }])).toThrow(/year/);
    expect(() => parseProjects([{ ...validProject(), film: { type: 'dvd', src: 'x' } }])).toThrow(/film.type/);
    expect(() => parseProjects([{ ...validProject(), tileSize: 'huge' }])).toThrow(/tileSize/);
  });

  it('rejects non-array root and empty array', () => {
    expect(() => parseProjects({})).toThrow(/array/);
    expect(() => parseProjects([])).toThrow(/at least one/);
  });

  it('names the offending project in the error', () => {
    try {
      parseProjects([{ ...validProject(), year: -1 }]);
      expect.unreachable();
    } catch (e) {
      expect((e as ContentError).message).toContain('neon-dream');
    }
  });
});

describe('parseJson', () => {
  it('wraps syntax errors as ContentError with the file name', () => {
    try {
      parseJson('{ "a": ', 'projects.json');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ContentError);
      expect((e as ContentError).file).toBe('projects.json');
      expect((e as ContentError).detail).toContain('JSON');
    }
  });
});

describe('helpers', () => {
  it('builds asset urls', () => {
    expect(projectAssetUrl('neon-dream', 'preview.mp4')).toBe('/content/projects/neon-dream/preview.mp4');
  });

  it('reads slug from search strings', () => {
    expect(getSlugFromSearch('?p=neon-dream')).toBe('neon-dream');
    expect(getSlugFromSearch('?x=1')).toBeNull();
    expect(getSlugFromSearch('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL — cannot resolve `../src/lib/content`.

- [ ] **Step 3: Implement the module**

`src/lib/content.ts`:

```ts
export interface NavItem { label: string; href: string }
export interface Social { label: string; href: string }
export interface SiteContent {
  name: string;
  tagline: string;
  email: string;
  nav: NavItem[];
  socials: Social[];
}
export interface FilmRef { type: 'vimeo' | 'youtube' | 'local'; src: string }
export interface Credit { role: string; name: string }
export interface GridPos { col: number; row: number }
export interface Project {
  slug: string;
  title: string;
  year: number;
  role: string;
  runtime: string;
  tags: string[];
  accent: string;
  tileSize: 'normal' | 'large';
  synopsis: string;
  credits: Credit[];
  film: FilmRef | null;
  stills: string[];
  position: GridPos | null;
}

export class ContentError extends Error {
  constructor(public file: string, public detail: string) {
    super(`[${file}] ${detail}`);
    this.name = 'ContentError';
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9-]+$/;

function fail(file: string, msg: string): never {
  throw new ContentError(file, msg);
}

function str(v: unknown, file: string, name: string, fallback?: string): string {
  if (v === undefined || v === null) {
    if (fallback !== undefined) return fallback;
    fail(file, `"${name}" is required`);
  }
  if (typeof v !== 'string') fail(file, `"${name}" must be a string`);
  return v;
}

function obj(v: unknown, file: string, name: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(file, `${name} must be an object`);
  return v as Record<string, unknown>;
}

export function parseJson(text: string, file: string): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    fail(file, `broken JSON — ${(e as Error).message}`);
  }
}

export function parseSite(raw: unknown): SiteContent {
  const file = 'site.json';
  const r = obj(raw, file, 'root');
  const name = str(r.name, file, 'name');
  if (!name.trim()) fail(file, '"name" must not be empty');
  if (!Array.isArray(r.nav) || r.nav.length === 0) fail(file, '"nav" must be a non-empty array');
  const nav = r.nav.map((n, i) => {
    const o = obj(n, file, `nav[${i}]`);
    return { label: str(o.label, file, `nav[${i}].label`), href: str(o.href, file, `nav[${i}].href`) };
  });
  const socialsRaw = r.socials ?? [];
  if (!Array.isArray(socialsRaw)) fail(file, '"socials" must be an array');
  const socials = socialsRaw.map((s, i) => {
    const o = obj(s, file, `socials[${i}]`);
    return { label: str(o.label, file, `socials[${i}].label`), href: str(o.href, file, `socials[${i}].href`) };
  });
  return {
    name,
    tagline: str(r.tagline, file, 'tagline', ''),
    email: str(r.email, file, 'email', ''),
    nav,
    socials,
  };
}

export function parseProject(raw: unknown, i: number): Project {
  const file = 'projects.json';
  const r = obj(raw, file, `projects[${i}]`);
  const slug = str(r.slug, file, `projects[${i}].slug`);
  if (!SLUG.test(slug)) fail(file, `projects[${i}].slug "${slug}" must be lowercase letters, digits and hyphens only`);
  const where = `project "${slug}"`;

  const title = str(r.title, file, `${where} title`);
  if (!title.trim()) fail(file, `${where} title must not be empty`);

  if (typeof r.year !== 'number' || !Number.isInteger(r.year) || r.year < 1900 || r.year > 2100)
    fail(file, `${where} year must be an integer between 1900 and 2100`);

  const accent = r.accent === undefined ? '#C8FF00' : str(r.accent, file, `${where} accent`);
  if (!HEX.test(accent)) fail(file, `${where} accent must look like "#C8FF00"`);

  const tileSize = r.tileSize === undefined ? 'normal' : r.tileSize;
  if (tileSize !== 'normal' && tileSize !== 'large') fail(file, `${where} tileSize must be "normal" or "large"`);

  const tags = r.tags ?? [];
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string'))
    fail(file, `${where} tags must be an array of strings`);

  const stills = r.stills ?? [];
  if (!Array.isArray(stills) || stills.some((s) => typeof s !== 'string'))
    fail(file, `${where} stills must be an array of file names`);

  const creditsRaw = r.credits ?? [];
  if (!Array.isArray(creditsRaw)) fail(file, `${where} credits must be an array`);
  const credits = creditsRaw.map((c, ci) => {
    const o = obj(c, file, `${where} credits[${ci}]`);
    return {
      role: str(o.role, file, `${where} credits[${ci}].role`),
      name: str(o.name, file, `${where} credits[${ci}].name`),
    };
  });

  let film: FilmRef | null = null;
  if (r.film !== undefined && r.film !== null) {
    const f = obj(r.film, file, `${where} film`);
    if (f.type !== 'vimeo' && f.type !== 'youtube' && f.type !== 'local')
      fail(file, `${where} film.type must be "vimeo", "youtube" or "local"`);
    film = { type: f.type, src: str(f.src, file, `${where} film.src`) };
  }

  let position: GridPos | null = null;
  if (r.position !== undefined && r.position !== null) {
    const p = obj(r.position, file, `${where} position`);
    if (
      typeof p.col !== 'number' || !Number.isInteger(p.col) ||
      typeof p.row !== 'number' || !Number.isInteger(p.row)
    )
      fail(file, `${where} position needs integer "col" and "row"`);
    position = { col: p.col, row: p.row };
  }

  return {
    slug,
    title,
    year: r.year,
    role: str(r.role, file, `${where} role`, ''),
    runtime: str(r.runtime, file, `${where} runtime`, ''),
    tags: tags as string[],
    accent,
    tileSize,
    synopsis: str(r.synopsis, file, `${where} synopsis`, ''),
    credits,
    film,
    stills: stills as string[],
    position,
  };
}

export function parseProjects(raw: unknown): Project[] {
  const file = 'projects.json';
  if (!Array.isArray(raw)) fail(file, 'root must be an array of projects');
  if (raw.length === 0) fail(file, 'add at least one project');
  const out = raw.map((r, i) => parseProject(r, i));
  const seen = new Set<string>();
  for (const p of out) {
    if (seen.has(p.slug)) fail(file, `duplicate slug "${p.slug}" — slugs must be unique`);
    seen.add(p.slug);
  }
  return out;
}

const CONTENT_BASE = '/content';

export function projectAssetUrl(slug: string, file: string): string {
  return `${CONTENT_BASE}/projects/${slug}/${file}`;
}

export function getSlugFromSearch(search: string): string | null {
  return new URLSearchParams(search).get('p');
}

async function fetchParsed(path: string, file: string): Promise<unknown> {
  const res = await fetch(path);
  if (!res.ok) fail(file, `could not load (HTTP ${res.status})`);
  return parseJson(await res.text(), file);
}

let sitePromise: Promise<SiteContent> | null = null;
export function loadSite(): Promise<SiteContent> {
  return (sitePromise ??= fetchParsed(`${CONTENT_BASE}/site.json`, 'site.json').then(parseSite));
}

let projectsPromise: Promise<Project[]> | null = null;
export function loadProjects(): Promise<Project[]> {
  return (projectsPromise ??= fetchParsed(`${CONTENT_BASE}/projects.json`, 'projects.json').then(parseProjects));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/content.test.ts`
Expected: all tests PASS. Then `npm run check` — clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: content types, validation and runtime loaders"
```

### Task 4: Real content files + placeholder media generator

**Files:**
- Create: `public/content/site.json`, `public/content/projects.json`
- Create: `scripts/gen-placeholders.ps1` (then run it → `public/content/projects/<slug>/…` for 12 slugs)
- Test: `tests/content-files.test.ts`

**Interfaces:**
- Consumes: `parseSite`, `parseProjects`, `parseJson` from Task 3.
- Produces: the 12 placeholder slugs (exact): `neon-dream, static-hymn, chrome-orchard, red-telemetry, void-cartography, tender-machines, glass-harvest, midnight-protocol, saline-throne, copper-lullaby, signal-decay, last-transmission`. Every slug folder contains `poster.jpg`, `preview.mp4`, `hover.mp4`, `stills/01..03.jpg`; `saline-throne` additionally `film.mp4`.

- [ ] **Step 1: Write site.json and projects.json**

`public/content/site.json`:

```json
{
  "name": "REVACHOL",
  "tagline": "cinematic filmmaker",
  "email": "mnguyen4403@gmail.com",
  "nav": [
    { "label": "HOMEPAGE", "href": "/index.html" },
    { "label": "WORK", "href": "/works.html" },
    { "label": "ABOUT", "href": "/about.html" },
    { "label": "CONTACT", "href": "/contact.html" }
  ],
  "socials": [
    { "label": "INSTAGRAM", "href": "https://instagram.com/" },
    { "label": "VIMEO", "href": "https://vimeo.com/" }
  ]
}
```

`public/content/projects.json` (12 entries; two `large`; film types demonstrate all three modes):

```json
[
  {
    "slug": "neon-dream",
    "title": "Neon Dream",
    "year": 2026,
    "role": "Director / DoP",
    "runtime": "12:40",
    "tags": ["short film", "sci-fi"],
    "accent": "#C8FF00",
    "tileSize": "large",
    "synopsis": "A night courier crosses a city that keeps rearranging itself. Shot on empty streets between 2 and 5 AM.",
    "credits": [
      { "role": "Director", "name": "Revachol" },
      { "role": "Cinematography", "name": "Revachol" },
      { "role": "Edit", "name": "Revachol" }
    ],
    "film": { "type": "vimeo", "src": "https://vimeo.com/76979871" },
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "static-hymn",
    "title": "Static Hymn",
    "year": 2026,
    "role": "Director",
    "runtime": "04:12",
    "tags": ["music video"],
    "accent": "#FF2E63",
    "synopsis": "A choir sings through dead televisions. One take, four broken CRTs, no cuts.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "chrome-orchard",
    "title": "Chrome Orchard",
    "year": 2025,
    "role": "DoP",
    "runtime": "18:05",
    "tags": ["short film", "drama"],
    "accent": "#B79CFF",
    "synopsis": "Two brothers inherit a greenhouse full of machines that grow nothing. A story about maintenance as love.",
    "credits": [{ "role": "Cinematography", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "red-telemetry",
    "title": "Red Telemetry",
    "year": 2025,
    "role": "Director / Edit",
    "runtime": "07:33",
    "tags": ["experimental"],
    "accent": "#FF2E63",
    "synopsis": "Every heartbeat of a marathon runner, rendered as light. A portrait made entirely of data.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": { "type": "youtube", "src": "https://www.youtube.com/watch?v=aqz-KE-bpKQ" },
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "void-cartography",
    "title": "Void Cartography",
    "year": 2025,
    "role": "Director / DoP",
    "runtime": "22:18",
    "tags": ["documentary"],
    "accent": "#C8FF00",
    "synopsis": "Mapping the empty floors of a mall that never opened. The security guard has named every corridor.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "tender-machines",
    "title": "Tender Machines",
    "year": 2024,
    "role": "Director",
    "runtime": "09:57",
    "tags": ["short film"],
    "accent": "#EDEDE6",
    "tileSize": "large",
    "synopsis": "A repair shop for things nobody makes anymore, and the woman who refuses to let them die.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "glass-harvest",
    "title": "Glass Harvest",
    "year": 2024,
    "role": "DoP",
    "runtime": "14:44",
    "tags": ["short film", "thriller"],
    "accent": "#B79CFF",
    "synopsis": "Sea glass collectors work a beach that used to be a city. High tide keeps returning pieces of it.",
    "credits": [{ "role": "Cinematography", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "midnight-protocol",
    "title": "Midnight Protocol",
    "year": 2024,
    "role": "Director / Edit",
    "runtime": "03:26",
    "tags": ["music video"],
    "accent": "#C8FF00",
    "synopsis": "A dance piece performed for security cameras across one city block. The cameras were the only audience.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "saline-throne",
    "title": "Saline Throne",
    "year": 2023,
    "role": "Director / DoP",
    "runtime": "16:20",
    "tags": ["short film", "fantasy"],
    "accent": "#EDEDE6",
    "synopsis": "A salt-flat kingdom with a population of one. Shot over six days of white horizon.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": { "type": "local", "src": "film.mp4" },
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "copper-lullaby",
    "title": "Copper Lullaby",
    "year": 2023,
    "role": "Director",
    "runtime": "06:08",
    "tags": ["experimental"],
    "accent": "#FF2E63",
    "synopsis": "Recorded inside a decommissioned power station: the building's last week of electrical hum, set to images.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "signal-decay",
    "title": "Signal Decay",
    "year": 2023,
    "role": "Director / Edit",
    "runtime": "11:11",
    "tags": ["short film", "sci-fi"],
    "accent": "#B79CFF",
    "synopsis": "The last analog TV transmitter in the country shuts down, and one viewer refuses to change channels.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  },
  {
    "slug": "last-transmission",
    "title": "Last Transmission",
    "year": 2022,
    "role": "Director / DoP",
    "runtime": "19:59",
    "tags": ["short film", "drama"],
    "accent": "#C8FF00",
    "synopsis": "A radio operator keeps broadcasting to a station that stopped answering years ago. Then someone answers.",
    "credits": [{ "role": "Director", "name": "Revachol" }],
    "film": null,
    "stills": ["01.jpg", "02.jpg", "03.jpg"]
  }
]
```

- [ ] **Step 2: Write the placeholder generator**

`scripts/gen-placeholders.ps1`:

```powershell
# Generates 12 placeholder projects (poster/preview/hover/stills) with ffmpeg.
# Usage: powershell -File scripts/gen-placeholders.ps1
param([string]$OutDir = (Join-Path $PSScriptRoot "..\public\content\projects"))

$ErrorActionPreference = "Stop"
try { ffmpeg -version | Out-Null } catch {
  Write-Error "ffmpeg not found on PATH. Install it (e.g. winget install Gyan.FFmpeg) and retry."
  exit 1
}

$slugs = @("neon-dream","static-hymn","chrome-orchard","red-telemetry","void-cartography","tender-machines","glass-harvest","midnight-protocol","saline-throne","copper-lullaby","signal-decay","last-transmission")
$accents = @("C8FF00","FF2E63","B79CFF","FF2E63","C8FF00","EDEDE6","B79CFF","C8FF00","EDEDE6","FF2E63","B79CFF","C8FF00")

function Src([int]$i, [string]$size, [string]$acc) {
  switch ($i % 4) {
    0 { "gradients=s=${size}:speed=0.06:nb_colors=4" }
    1 { "mandelbrot=s=${size}:end_scale=0.08" }
    2 { "testsrc2=s=${size}:rate=24" }
    3 { "life=s=${size}:ratio=0.07:mold=14:life_color=#${acc}:death_color=#0a0a12" }
  }
}

for ($i = 0; $i -lt $slugs.Count; $i++) {
  $slug = $slugs[$i]; $acc = $accents[$i]
  $dir = Join-Path $OutDir $slug
  New-Item -ItemType Directory -Force (Join-Path $dir "stills") | Out-Null
  $vf = "hue=h=$($i * 33),noise=alls=10:allf=t,format=yuv420p"
  Write-Host ">> $slug"
  ffmpeg -y -loglevel error -f lavfi -i (Src $i "640x360" $acc)  -vf $vf -t 4 -r 24 -c:v libx264 -preset veryfast -crf 27 (Join-Path $dir "preview.mp4")
  ffmpeg -y -loglevel error -f lavfi -i (Src $i "960x540" $acc)  -vf $vf -t 9 -r 24 -c:v libx264 -preset veryfast -crf 26 (Join-Path $dir "hover.mp4")
  ffmpeg -y -loglevel error -f lavfi -i (Src $i "1280x720" $acc) -vf $vf -frames:v 1 -update 1 (Join-Path $dir "poster.jpg")
  foreach ($s in 1..3) {
    ffmpeg -y -loglevel error -ss $s -i (Join-Path $dir "preview.mp4") -frames:v 1 -vf "scale=1280:-2" -update 1 (Join-Path $dir ("stills\0" + $s + ".jpg"))
  }
  if ($slug -eq "saline-throne") {
    ffmpeg -y -loglevel error -f lavfi -i (Src $i "1280x720" $acc) -vf $vf -t 12 -r 24 -c:v libx264 -preset veryfast -crf 24 (Join-Path $dir "film.mp4")
  }
}
Write-Host "done — $($slugs.Count) placeholder projects in $OutDir"
```

- [ ] **Step 3: Run it and eyeball the output**

Run: `powershell -ExecutionPolicy Bypass -File scripts/gen-placeholders.ps1`
Expected: `>> <slug>` lines ×12, then `done`. Spot-check: `public/content/projects/neon-dream/` contains `poster.jpg` (1280×720), `preview.mp4` (~4 s), `hover.mp4` (~9 s), `stills/01.jpg..03.jpg`; `saline-throne/film.mp4` exists. Open one preview.mp4 in a player — it moves.

- [ ] **Step 4: Write the content-files guard test**

`tests/content-files.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseJson, parseProjects, parseSite } from '../src/lib/content';

const root = fileURLToPath(new URL('../public/content/', import.meta.url));
const read = (f: string) => readFileSync(root + f, 'utf8');

describe('shipped content files', () => {
  it('site.json is valid', () => {
    const site = parseSite(parseJson(read('site.json'), 'site.json'));
    expect(site.name).toBe('REVACHOL');
    expect(site.nav.length).toBe(4);
  });

  it('projects.json is valid and has 12 projects', () => {
    const projects = parseProjects(parseJson(read('projects.json'), 'projects.json'));
    expect(projects).toHaveLength(12);
  });

  it('every project folder has its required media', () => {
    const projects = parseProjects(parseJson(read('projects.json'), 'projects.json'));
    for (const p of projects) {
      expect(existsSync(`${root}projects/${p.slug}/poster.jpg`), `${p.slug} poster`).toBe(true);
      expect(existsSync(`${root}projects/${p.slug}/preview.mp4`), `${p.slug} preview`).toBe(true);
      for (const s of p.stills)
        expect(existsSync(`${root}projects/${p.slug}/stills/${s}`), `${p.slug} still ${s}`).toBe(true);
      if (p.film?.type === 'local')
        expect(existsSync(`${root}projects/${p.slug}/${p.film.src}`), `${p.slug} local film`).toBe(true);
    }
  });
});
```

- [ ] **Step 5: Run tests, then commit**

Run: `npm test`
Expected: content + content-files + sanity all PASS.

```bash
git add -A
git commit -m "feat: site/projects content and generated placeholder media"
```

Note: generated media is committed on purpose — it is the demo content contract until real films replace it.

---

### Task 5: Sound engine (WebAudio, zero assets)

**Files:**
- Create: `src/lib/sound.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: singleton `sound` with exact API: `enabled: boolean`, `unlock(): void`, `onUnlock(cb: () => void): void`, `hover(): void`, `click(): void`, `whoosh(): void`, `startHum(): void`, `stopHum(): void`, `toggle(): boolean`. Persistence key `localStorage['rvl-sound']` (`'on' | 'off'`). No AudioContext is created before `unlock()` (browser autoplay law).

- [ ] **Step 1: Implement**

`src/lib/sound.ts`:

```ts
let ctxRef: AudioContext | null = null;

class SoundEngine {
  enabled = true;
  private hum: { gain: GainNode; stop: () => void } | null = null;
  private unlocked = false;
  private unlockCbs: (() => void)[] = [];

  constructor() {
    try { this.enabled = localStorage.getItem('rvl-sound') !== 'off'; } catch { /* private mode */ }
  }

  /** Call from the first user gesture. Idempotent. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.ctx();
    for (const cb of this.unlockCbs) cb();
    this.unlockCbs = [];
  }

  onUnlock(cb: () => void): void {
    if (this.unlocked) cb();
    else this.unlockCbs.push(cb);
  }

  private ctx(): AudioContext | null {
    if (!this.unlocked) return null;
    if (!ctxRef) {
      try { ctxRef = new AudioContext(); } catch { return null; }
    }
    if (ctxRef.state === 'suspended') void ctxRef.resume();
    return ctxRef;
  }

  private blip(freq: number, durS: number, type: OscillatorType, peak: number): void {
    if (!this.enabled) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durS);
    osc.connect(bp).connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durS + 0.02);
  }

  hover(): void { this.blip(2400, 0.04, 'square', 0.06); }
  click(): void { this.blip(300, 0.1, 'triangle', 0.18); }

  whoosh(): void {
    if (!this.enabled) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.45);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + 0.18);
    lp.frequency.exponentialRampToValueAtTime(150, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t);
  }

  startHum(): void {
    if (!this.enabled || this.hum) return;
    const ctx = this.ctx();
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 2);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 65;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.2);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.015;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start();
    lfo.start();
    this.hum = { gain: g, stop: () => { src.stop(); lfo.stop(); } };
  }

  stopHum(): void {
    if (!this.hum) return;
    if (ctxRef) this.hum.gain.gain.linearRampToValueAtTime(0, ctxRef.currentTime + 0.4);
    const h = this.hum;
    this.hum = null;
    setTimeout(() => h.stop(), 500);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try { localStorage.setItem('rvl-sound', this.enabled ? 'on' : 'off'); } catch { /* ok */ }
    if (!this.enabled) this.stopHum();
    return this.enabled;
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const sound = new SoundEngine();
```

- [ ] **Step 2: Verify in the browser console**

`npm run check` clean. Dev server running, open any page, in console:

```js
const { sound } = await import('/src/lib/sound.ts');
sound.unlock();          // simulates the first-gesture call
sound.hover(); sound.click(); sound.whoosh(); sound.startHum();
```

Expected: audible tick, thunk, whoosh, then a low hum; `sound.toggle()` silences and returns `false`; `localStorage.getItem('rvl-sound')` is `'off'`; toggle back on.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: synthesized sound engine with unlock gating and persistence"
```

---

### Task 6: Interaction primitives — env, rng, scramble (TDD), cursor, atmosphere, transitions

**Files:**
- Create: `src/lib/env.ts`, `src/lib/rng.ts`, `src/lib/scramble.ts`, `src/lib/transitions.ts`, `src/shell/cursor.ts`, `src/shell/grain.ts`
- Modify: `src/styles/base.css` (append atmosphere/cursor/wipe styles)
- Modify: `src/pages/index.ts` (temporary wiring for visual verification — replaced in Task 8)
- Test: `tests/scramble.test.ts`

**Interfaces:**
- Consumes: `sound` (Task 5).
- Produces (exact):
  - `env.ts`: `reducedMotion(): boolean`, `finePointer(): boolean`, `isMobile(): boolean`, `liveVideoCap(): number` (4 mobile / 10 desktop), `dprCap(): number` (1.5 mobile / 2 desktop). All lazy functions — safe to import in node tests.
  - `rng.ts`: `mulberry32(seed: number): () => number` (deterministic 0..1).
  - `scramble.ts`: `GLYPHS: string`, `scrambleFrame(target: string, progress: number, rand: () => number): string`, `scrambleEl(el: HTMLElement, text?: string, durationMs?: number): Promise<void>`.
  - `transitions.ts`: `initTransitions(): void` (delegates clicks on `a[data-internal]`), `leaveTo(href: string): void`.
  - `cursor.ts`: `initCursor(): void`, `setCursorLabel(text: string | null): void`. Elements opt in to labels via `data-cursor="LABEL"`.
  - `grain.ts`: `mountAtmosphere(): void` (grain canvas + scanlines + vignette).

- [ ] **Step 1: Write the failing scramble tests**

`tests/scramble.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/lib/rng';
import { GLYPHS, scrambleFrame } from '../src/lib/scramble';

describe('scrambleFrame', () => {
  it('returns the target at progress 1', () => {
    expect(scrambleFrame('NEON DREAM', 1, mulberry32(1))).toBe('NEON DREAM');
  });

  it('preserves spaces and length at progress 0, with no real characters', () => {
    const out = scrambleFrame('AB CD', 0, mulberry32(2));
    expect(out).toHaveLength(5);
    expect(out[2]).toBe(' ');
    for (const ch of out.replace(' ', '')) expect(GLYPHS).toContain(ch);
  });

  it('reveals a prefix proportional to progress', () => {
    const out = scrambleFrame('ABCDEFGHIJ', 0.5, mulberry32(3));
    expect(out.slice(0, 5)).toBe('ABCDE');
  });

  it('is deterministic for a given rand', () => {
    expect(scrambleFrame('SIGNAL', 0.2, mulberry32(9))).toBe(scrambleFrame('SIGNAL', 0.2, mulberry32(9)));
  });
});

describe('mulberry32', () => {
  it('is deterministic and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/scramble.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement the six modules**

`src/lib/env.ts`:

```ts
export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const finePointer = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

export const isMobile = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;

export const liveVideoCap = (): number => (isMobile() ? 4 : 10);

export const dprCap = (): number => Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
```

`src/lib/rng.ts`:

```ts
/** Deterministic PRNG — same seed, same sequence. Used for debris layout and tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`src/lib/scramble.ts`:

```ts
import { reducedMotion } from './env';

export const GLYPHS = '░▒▓█<>/|\\=+*#@$%&0123456789';

export function scrambleFrame(target: string, progress: number, rand: () => number): string {
  const p = Math.min(1, Math.max(0, progress));
  const reveal = Math.floor(target.length * p);
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (ch === ' ' || ch === '\n') { out += ch; continue; }
    out += i < reveal ? ch : GLYPHS[Math.floor(rand() * GLYPHS.length)];
  }
  return out;
}

export function scrambleEl(el: HTMLElement, text?: string, durationMs = 700): Promise<void> {
  const target = text ?? el.textContent ?? '';
  if (reducedMotion() || durationMs <= 0) {
    el.textContent = target;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const p = (now - t0) / durationMs;
      if (p >= 1) { el.textContent = target; resolve(); return; }
      el.textContent = scrambleFrame(target, p, Math.random);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
```

`src/lib/transitions.ts`:

```ts
import gsap from 'gsap';
import { reducedMotion } from './env';
import { sound } from './sound';

const SLICES = 7;
let wipeEl: HTMLDivElement | null = null;
let leaving = false;

function ensureWipe(): HTMLDivElement {
  if (wipeEl) return wipeEl;
  wipeEl = document.createElement('div');
  wipeEl.id = 'wipe';
  for (let i = 0; i < SLICES; i++) {
    const s = document.createElement('div');
    s.className = 'wipe-slice';
    s.style.top = `${(i * 100) / SLICES}%`;
    s.style.height = `${100 / SLICES + 0.5}%`;
    wipeEl.append(s);
  }
  document.body.append(wipeEl);
  gsap.set(wipeEl.querySelectorAll('.wipe-slice'), { xPercent: -101 });
  return wipeEl;
}

export function leaveTo(href: string): void {
  if (leaving) return;
  leaving = true;
  const wipe = ensureWipe();
  const slices = wipe.querySelectorAll('.wipe-slice');
  sound.whoosh();
  if (reducedMotion()) {
    gsap.set(slices, { xPercent: 0 });
    gsap.fromTo(wipe, { opacity: 0 }, { opacity: 1, duration: 0.2, onComplete: () => { location.href = href; } });
    return;
  }
  gsap.to(slices, {
    xPercent: 0,
    duration: 0.3,
    stagger: 0.035,
    ease: 'power3.in',
    onComplete: () => { location.href = href; },
  });
}

export function initTransitions(): void {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a[data-internal]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    e.preventDefault();
    sound.click();
    leaveTo(href);
  });
  // Back/forward cache restore: uncover the page again.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && wipeEl) {
      leaving = false;
      wipeEl.style.opacity = '';
      gsap.set(wipeEl.querySelectorAll('.wipe-slice'), { xPercent: -101 });
    }
  });
}
```

`src/shell/cursor.ts`:

```ts
import { finePointer, reducedMotion } from '../lib/env';

let labelEl: HTMLSpanElement | null = null;

export function setCursorLabel(text: string | null): void {
  if (!labelEl) return;
  labelEl.textContent = text ?? '';
  labelEl.parentElement?.classList.toggle('has-label', !!text);
}

export function initCursor(): void {
  if (!finePointer() || reducedMotion()) return;
  const c = document.createElement('div');
  c.id = 'cursor';
  c.innerHTML = `<div class="x"></div><span class="cursor-label"></span><span class="cursor-coords"></span>`;
  document.body.append(c);
  document.body.classList.add('cursor-live');
  labelEl = c.querySelector('.cursor-label');
  const coordsEl = c.querySelector('.cursor-coords') as HTMLSpanElement;
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    const { clientX, clientY } = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      c.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      coordsEl.textContent = `${String(clientX).padStart(4, '0')} ${String(clientY).padStart(4, '0')}`;
    });
  });
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element).closest?.('[data-cursor]');
    setCursorLabel(t ? (t as HTMLElement).dataset.cursor || null : null);
  });
}
```

`src/shell/grain.ts`:

```ts
import { reducedMotion } from '../lib/env';

export function mountAtmosphere(): void {
  const grain = document.createElement('canvas');
  grain.id = 'grain';
  grain.width = 160;
  grain.height = 90;
  const scan = document.createElement('div');
  scan.className = 'scan-layer';
  const vig = document.createElement('div');
  vig.className = 'vignette-layer';
  document.body.append(grain, scan, vig);
  const ctx = grain.getContext('2d');
  if (!ctx) return;
  const draw = () => {
    const img = ctx.createImageData(160, 90);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };
  draw();
  if (!reducedMotion()) {
    setInterval(() => { if (!document.hidden) draw(); }, 120);
  }
}
```

Append to `src/styles/base.css`:

```css
/* ---- atmosphere ---- */
#grain {
  position: fixed; inset: 0; width: 100vw; height: 100vh;
  z-index: 8999; pointer-events: none; opacity: 0.07; image-rendering: pixelated;
}
.scan-layer {
  position: fixed; inset: 0; z-index: 9000; pointer-events: none; opacity: 0.5;
  background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0 1px, transparent 1px 3px);
}
.vignette-layer {
  position: fixed; inset: 0; z-index: 9001; pointer-events: none;
  background: radial-gradient(120% 100% at 50% 45%, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
}

/* ---- glitch wipe ---- */
#wipe { position: fixed; inset: 0; z-index: 9500; pointer-events: none; }
.wipe-slice {
  position: absolute; left: 0; width: 100%;
  background: var(--void);
  border-top: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  will-change: transform;
}

/* ---- custom cursor ---- */
@media (pointer: fine) {
  body.cursor-live, body.cursor-live * { cursor: none !important; }
}
#cursor { position: fixed; left: 0; top: 0; z-index: 9999; pointer-events: none; will-change: transform; }
#cursor .x { position: relative; width: 22px; height: 22px; transform: translate(-50%, -50%); }
#cursor .x::before, #cursor .x::after { content: ''; position: absolute; background: var(--accent); }
#cursor .x::before { left: 50%; top: 0; width: 1px; height: 100%; }
#cursor .x::after { top: 50%; left: 0; width: 100%; height: 1px; }
#cursor .cursor-label {
  position: absolute; left: 18px; top: -4px; white-space: nowrap;
  font-family: var(--f-micro); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--accent);
}
#cursor .cursor-coords {
  position: absolute; left: 18px; top: 10px; white-space: nowrap;
  font-family: var(--f-micro); font-size: 9px; letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--bone) 40%, transparent);
}
#cursor.has-label .x { outline: 1px solid var(--accent); outline-offset: 4px; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/scramble.test.ts` → PASS. `npm run check` → clean.

- [ ] **Step 5: Temporary visual wiring + browser verify**

Replace `src/pages/index.ts` with (temporary — Task 8 replaces it):

```ts
import '../styles/tokens.css';
import '../styles/base.css';
import { scrambleEl } from '../lib/scramble';
import { initTransitions } from '../lib/transitions';
import { initCursor } from '../shell/cursor';
import { mountAtmosphere } from '../shell/grain';

mountAtmosphere();
initCursor();
initTransitions();
const st = document.getElementById('statement');
if (st) void scrambleEl(st);
```

Browser check on `http://localhost:5173/`: grain flickers subtly, scanlines + vignette present, native cursor replaced by crosshair with live coordinates, statement scramble-decodes on load, clicking `ENTER THE FLOOR ▸` plays the slice wipe then lands on works.html. Emulate reduced motion (DevTools → Rendering) and reload: static grain, native cursor, instant statement, fade-only transition.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: env/rng/scramble/transitions/cursor/atmosphere primitives"
```

---

### Task 7: Boot sequence

**Files:**
- Create: `src/shell/boot.ts`
- Modify: `src/styles/base.css` (append boot styles)

**Interfaces:**
- Consumes: `ContentError` (Task 3), `reducedMotion` (Task 6).
- Produces: `interface BootTask { label: string; run: () => Promise<unknown> }`; `runBoot(tasks: BootTask[]): Promise<void>` — renders the overlay immediately, runs tasks sequentially with `> LABEL …… OK` lines, enforces min duration 1400 ms (250 ms if session-booted or reduced motion), skippable via click/key, sets `sessionStorage['rvl-booted']='1'`, and on error pins the overlay showing `CONTENT ERROR — <file>` + detail (never resolves).

- [ ] **Step 1: Implement**

`src/shell/boot.ts`:

```ts
import { ContentError } from '../lib/content';
import { reducedMotion } from '../lib/env';

export interface BootTask { label: string; run: () => Promise<unknown> }

const L = {
  R: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  V: ['██╗   ██╗', '██║   ██║', '██║   ██║', '╚██╗ ██╔╝', ' ╚████╔╝ ', '  ╚═══╝  '],
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  H: ['██╗  ██╗', '██║  ██║', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  O: [' ██████╗ ', '██╔═══██╗', '██║   ██║', '██║   ██║', '╚██████╔╝', ' ╚═════╝ '],
  L2: ['██╗     ', '██║     ', '██║     ', '██║     ', '███████╗', '╚══════╝'],
};
const ORDER = [L.R, L.E, L.V, L.A, L.C, L.H, L.O, L.L2];
const LOGO = Array.from({ length: 6 }, (_, row) => ORDER.map((l) => l[row]).join(' ')).join('\n');

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function runBoot(tasks: BootTask[]): Promise<void> {
  let booted = false;
  try { booted = sessionStorage.getItem('rvl-booted') === '1'; } catch { /* ok */ }

  const el = document.createElement('div');
  el.id = 'boot';
  el.innerHTML = `<pre class="boot-logo"></pre><div class="boot-log" aria-live="polite"></div><p class="boot-skip micro">CLICK TO SKIP</p>`;
  document.body.append(el);
  (el.querySelector('.boot-logo') as HTMLElement).textContent = LOGO;
  const logEl = el.querySelector('.boot-log') as HTMLElement;

  let skipped = false;
  const MIN = booted || reducedMotion() ? 250 : 1400;
  const t0 = performance.now();
  const skip = () => { skipped = true; };
  el.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', skip, { once: true });

  const line = (label: string) => {
    const l = document.createElement('span');
    l.className = 'boot-line';
    l.innerHTML = `&gt; ${escapeHtml(label)} <span class="dots">……</span>`;
    logEl.append(l);
    return {
      ok: () => { l.innerHTML = `&gt; ${escapeHtml(label)} <span class="ok">OK</span>`; },
      err: () => { l.innerHTML = `&gt; ${escapeHtml(label)} <span class="err">FAIL</span>`; },
    };
  };

  const runAll = (async () => {
    for (const t of tasks) {
      const l = booted ? null : line(t.label);
      try {
        await t.run();
        l?.ok();
      } catch (e) {
        l?.err();
        throw e;
      }
      if (!booted && !skipped) await new Promise((r) => setTimeout(r, 90));
    }
  })();

  return runAll
    .then(async () => {
      const remain = MIN - (performance.now() - t0);
      if (remain > 0 && !skipped) await new Promise((r) => setTimeout(r, remain));
      try { sessionStorage.setItem('rvl-booted', '1'); } catch { /* ok */ }
      el.classList.add('hidden');
      setTimeout(() => el.remove(), 450);
    })
    .catch((e: unknown) => {
      el.classList.remove('hidden');
      el.classList.add('error');
      const box = document.createElement('div');
      box.className = 'boot-error';
      box.innerHTML =
        e instanceof ContentError
          ? `<strong>CONTENT ERROR — ${escapeHtml(e.file)}</strong><br>${escapeHtml(e.detail)}<br><br>FIX THE FILE AND REFRESH.`
          : `<strong>SYSTEM ERROR</strong><br>${escapeHtml(String(e))}`;
      logEl.after(box);
      throw e;
    });
}
```

Append to `src/styles/base.css`:

```css
/* ---- boot ---- */
#boot {
  position: fixed; inset: 0; z-index: 9900; background: var(--void);
  display: grid; place-content: center; justify-items: start; gap: 22px;
  transition: opacity 0.4s;
}
#boot.hidden { opacity: 0; pointer-events: none; }
.boot-logo {
  font-family: var(--f-mono); font-size: clamp(5px, 1.05vw, 9px);
  line-height: 1.15; color: var(--accent); white-space: pre;
}
.boot-log {
  font-family: var(--f-micro); font-size: var(--t-2xs); letter-spacing: 0.14em;
  text-transform: uppercase; color: color-mix(in srgb, var(--bone) 70%, transparent);
  min-height: calc(6 * 1.8em); width: min(80vw, 540px);
}
.boot-line { display: block; line-height: 1.8; }
.boot-line .ok { color: var(--signal); }
.boot-line .err { color: var(--alert); }
.boot-skip { opacity: 0.5; }
#boot.error .boot-logo { color: var(--alert); }
.boot-error {
  color: var(--alert); border: 1px solid var(--alert); padding: 12px 16px;
  font-family: var(--f-mono); font-size: var(--t-sm); max-width: 60ch; margin-top: 8px;
}
```

- [ ] **Step 2: Verify standalone in the browser**

`npm run check` clean. Temporarily append to the temporary `src/pages/index.ts`:

```ts
import { runBoot } from '../shell/boot';
void runBoot([
  { label: 'LOAD SITE MANIFEST', run: () => new Promise((r) => setTimeout(r, 300)) },
  { label: 'MOUNT TYPEFACES', run: () => new Promise((r) => setTimeout(r, 300)) },
]);
```

Browser check on a fresh tab (or after `sessionStorage.clear()`): ASCII REVACHOL logo, two `> …… OK` lines, overlay retracts after ~1.4 s; reload — quick 250 ms flash only (session gate); `sessionStorage.clear()` + change a task to `run: () => Promise.reject(new ContentError('projects.json', 'test detail'))` → overlay pins with `CONTENT ERROR — projects.json / test detail`. Revert the reject. Remove this temporary block after verifying (Task 8 wires boot properly).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: boot sequence with session gate, skip and content-error surface"
```

---

### Task 8: Shell chrome — components.css, nav, HUD, page bootstrap; wire all five pages

**Files:**
- Create: `src/styles/components.css`, `src/shell/hud.ts`, `src/shell/shell.ts`, `src/shell/page.ts`
- Modify: `src/pages/index.ts`, `src/pages/about.ts`, `src/pages/contact.ts`, `src/pages/works.ts`, `src/pages/project.ts` (final shape for stubs; works/project get real content in Tasks 12/16)

**Interfaces:**
- Consumes: everything from Tasks 3–7.
- Produces (exact):
  - `hud.ts`: `interface Hud { setCoords(x: number, y: number): void; setCount(n: number): void }`, `mountHud(): Hud`.
  - `shell.ts`: `type PageKey = 'home' | 'work' | 'about' | 'contact' | 'project'`, `interface ShellRefs { hud: Hud }`, `mountShell(site: SiteContent, active: PageKey): ShellRefs`.
  - `page.ts`: `interface PageCtx { site: SiteContent; hud: Hud }`, `startPage(active: PageKey, main: (ctx: PageCtx) => void | Promise<void>, extraTasks?: BootTask[]): void`. **page.ts owns all three global CSS imports** — pages import nothing from `styles/` directly.

- [ ] **Step 1: Write components.css**

`src/styles/components.css`:

```css
/* ---- nav ---- */
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 950;
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 18px 28px; pointer-events: none;
}
.nav a { pointer-events: auto; text-decoration: none; }
.brand {
  font-family: var(--f-serif); font-weight: 700; font-size: var(--t-lg);
  letter-spacing: 0.04em; color: var(--bone);
}
.brand em { font-style: normal; color: var(--accent); }
.nav-links { display: flex; gap: 26px; }
.nav-links a {
  font-family: var(--f-mono); font-size: var(--t-xs); letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--bone) 75%, transparent); position: relative; padding: 4px 0;
}
.nav-links a:hover, .nav-links a.is-active { color: var(--accent); }
.nav-links a.is-active::before { content: '▸'; margin-right: 6px; color: var(--accent); }

/* rgb-split microglitch on interactives */
@keyframes rgb-flick {
  0%, 100% { text-shadow: none; }
  25% { text-shadow: 1px 0 var(--alert), -1px 0 var(--field); }
  50% { text-shadow: -1.5px 0 var(--alert), 1.5px 0 var(--field); }
  75% { text-shadow: 1px 0 var(--flourish), -1px 0 var(--accent); }
}
.nav-links a:hover, .btn:hover, .brand:hover { animation: rgb-flick 0.32s steps(2) 1; }

/* ---- buttons ---- */
.btn {
  display: inline-block; font-family: var(--f-mono); font-size: var(--t-sm);
  letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none;
  border: 1px solid color-mix(in srgb, var(--accent) 60%, transparent);
  padding: 10px 18px; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  transition: background 0.2s, color 0.2s;
}
.btn:hover { background: var(--accent); color: var(--void); }

/* ---- hud corners ---- */
.hud { position: fixed; z-index: 940; pointer-events: none; }
.hud button { pointer-events: auto; font: inherit; letter-spacing: inherit; color: var(--accent); text-transform: inherit; }
.hud-bl { left: 28px; bottom: 22px; }
.hud-br { right: 28px; bottom: 22px; }
.hud-tr { right: 28px; top: 64px; }

/* ---- page scaffolds ---- */
.stub-main {
  min-height: 100vh; display: grid; place-content: center; justify-items: start;
  gap: 18px; padding: 96px 28px;
}
.stub-cta { margin-top: 14px; }
.page-work .works-main { position: fixed; inset: 0; }
#floor { position: absolute; inset: 0; touch-action: none; }
.page-work {
  background: radial-gradient(120vmax 90vmax at 72% 18%, #0a0930 0%, var(--void) 55%);
}
#tile-label { position: fixed; z-index: 930; pointer-events: none; max-width: 340px; }
#tile-label .tl-title {
  font-family: var(--f-serif); font-weight: 700; font-size: var(--t-lg);
  line-height: 1.05; color: var(--bone);
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.8);
}
#tile-label .tl-meta { margin-top: 6px; color: var(--accent); }
```

- [ ] **Step 2: Implement hud.ts**

`src/shell/hud.ts`:

```ts
import { sound } from '../lib/sound';

export interface Hud {
  setCoords(x: number, y: number): void;
  setCount(n: number): void;
}

const pad = (n: number, w: number) => String(Math.max(0, Math.floor(n))).padStart(w, '0');

export function mountHud(): Hud {
  const bl = document.createElement('div');
  bl.className = 'hud hud-bl micro';
  bl.innerHTML = `<span id="hud-coords">X:0000 Y:0000</span>`;

  const br = document.createElement('div');
  br.className = 'hud hud-br micro';
  let sid = 'RVL-0000';
  try {
    const stored = sessionStorage.getItem('rvl-sid');
    sid = stored ?? `RVL-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
    sessionStorage.setItem('rvl-sid', sid);
  } catch { /* ok */ }
  br.innerHTML = `<span id="hud-tc">00:00:00:00</span> · <span>${sid}</span>`;

  const tr = document.createElement('div');
  tr.className = 'hud hud-tr micro';
  tr.innerHTML = `<span id="hud-count"></span> <button id="hud-snd" aria-pressed="${sound.enabled}">SND ${sound.enabled ? '●' : '○'}</button>`;

  document.body.append(bl, br, tr);

  const tc = br.querySelector('#hud-tc') as HTMLElement;
  const t0 = performance.now();
  setInterval(() => {
    const ms = performance.now() - t0;
    const f = Math.floor((ms % 1000) / (1000 / 24));
    const s = Math.floor(ms / 1000);
    tc.textContent = `${pad(s / 3600, 2)}:${pad((s / 60) % 60, 2)}:${pad(s % 60, 2)}:${pad(f, 2)}`;
  }, 42);

  const snd = tr.querySelector('#hud-snd') as HTMLButtonElement;
  snd.addEventListener('click', () => {
    const on = sound.toggle();
    snd.textContent = `SND ${on ? '●' : '○'}`;
    snd.setAttribute('aria-pressed', String(on));
    if (on && document.body.classList.contains('page-work')) sound.startHum();
  });

  const coords = bl.querySelector('#hud-coords') as HTMLElement;
  const count = tr.querySelector('#hud-count') as HTMLElement;
  return {
    setCoords: (x, y) => { coords.textContent = `X:${pad(Math.abs(x), 4)} Y:${pad(Math.abs(y), 4)}`; },
    setCount: (n) => { count.textContent = `${pad(n, 2)} PROJECTS LOADED ·`; },
  };
}
```

- [ ] **Step 3: Implement shell.ts and page.ts**

`src/shell/shell.ts`:

```ts
import type { SiteContent } from '../lib/content';
import { sound } from '../lib/sound';
import { initTransitions } from '../lib/transitions';
import { initCursor } from './cursor';
import { mountAtmosphere } from './grain';
import { Hud, mountHud } from './hud';

export type PageKey = 'home' | 'work' | 'about' | 'contact' | 'project';
export interface ShellRefs { hud: Hud }

const HREF_FOR: Record<PageKey, string> = {
  home: '/index.html',
  work: '/works.html',
  about: '/about.html',
  contact: '/contact.html',
  project: '/works.html', // project pages highlight WORK
};

export function mountShell(site: SiteContent, active: PageKey): ShellRefs {
  const header = document.createElement('header');
  header.className = 'nav';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = '/index.html';
  brand.dataset.internal = '';
  brand.innerHTML = `${site.name}<em>.</em>`;

  const links = document.createElement('nav');
  links.className = 'nav-links';
  links.setAttribute('aria-label', 'Main');
  for (const item of site.nav) {
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    a.dataset.internal = '';
    if (item.href === HREF_FOR[active]) a.classList.add('is-active');
    links.append(a);
  }
  header.append(brand, links);
  document.body.prepend(header);

  mountAtmosphere();
  initTransitions();
  initCursor();
  const hud = mountHud();

  // First-gesture unlock for WebAudio; hover blips on interactives.
  const unlock = () => {
    sound.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('pointerover', (e) => {
    if ((e.target as Element).closest?.('a, button')) sound.hover();
  });

  return { hud };
}
```

`src/shell/page.ts`:

```ts
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';
import { loadSite, SiteContent } from '../lib/content';
import { BootTask, runBoot } from './boot';
import { Hud } from './hud';
import { mountShell, PageKey } from './shell';

export interface PageCtx { site: SiteContent; hud: Hud }

export function startPage(
  active: PageKey,
  main: (ctx: PageCtx) => void | Promise<void>,
  extraTasks: BootTask[] = [],
): void {
  const tasks: BootTask[] = [
    { label: 'LOAD SITE MANIFEST', run: () => loadSite() },
    {
      label: 'MOUNT TYPEFACES',
      run: () =>
        Promise.allSettled([
          document.fonts.load('700 1rem "Clash Display"'),
          document.fonts.load('400 1rem "Bodoni Moda"'),
          document.fonts.load('400 1rem "Geist Mono"'),
          document.fonts.load('400 1rem "Martian Mono"'),
        ]),
    },
    ...extraTasks,
  ];
  runBoot(tasks)
    .then(async () => {
      const site = await loadSite();
      const { hud } = mountShell(site, active);
      await main({ site, hud });
    })
    .catch((e: unknown) => console.error('[revachol] boot failed', e));
}
```

- [ ] **Step 4: Rewrite the five page entries**

`src/pages/index.ts`:

```ts
import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

startPage('home', ({ site }) => {
  const tagline = document.getElementById('tagline');
  if (tagline) tagline.textContent = `${site.tagline} // SECTION UNDER CONSTRUCTION`.toUpperCase();
  const st = document.getElementById('statement');
  if (st) void scrambleEl(st);
});
```

`src/pages/about.ts`:

```ts
import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

startPage('about', () => {
  const st = document.getElementById('statement');
  if (st) void scrambleEl(st);
});
```

`src/pages/contact.ts`:

```ts
import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';

startPage('contact', ({ site }) => {
  const el = document.getElementById('contact-email');
  if (el && site.email) {
    el.innerHTML = `<a href="mailto:${site.email}" style="color: var(--accent)">${site.email}</a>`;
  }
  const st = document.getElementById('statement');
  if (st) void scrambleEl(st);
});
```

`src/pages/works.ts` (interim — the world arrives in Task 12):

```ts
import { loadProjects } from '../lib/content';
import { startPage } from '../shell/page';

startPage(
  'work',
  async ({ hud }) => {
    const projects = await loadProjects();
    hud.setCount(projects.length);
  },
  [{ label: 'LOAD PROJECT INDEX', run: () => loadProjects() }],
);
```

`src/pages/project.ts` (interim — real page in Task 16):

```ts
import { startPage } from '../shell/page';

startPage('project', () => {});
```

- [ ] **Step 5: Full browser verification**

`npm run check` + `npm test` clean, then in the browser:
1. Fresh session (`sessionStorage.clear()` first) on `/index.html`: boot plays with `LOAD SITE MANIFEST / MOUNT TYPEFACES … OK`, retracts; nav shows `REVACHOL.` (Bodoni, accent period) left and the four Geist Mono links right with `▸ HOMEPAGE` active; HUD corners: coords bottom-left, timecode + session id ticking bottom-right, `SND ●` top-right.
2. Navigate all four links: wipe transition, boot micro-flash (250 ms) on each subsequent page, active nav item follows, statements scramble in, contact shows the mailto, works shows `12 PROJECTS LOADED ·`.
3. Click SND toggle: flips to `○`, persists across reload.
4. Break `public/content/site.json` (delete a comma), reload: boot pins with `CONTENT ERROR — site.json` + detail. Restore the comma.
5. `npm run build` → clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shell chrome - nav, hud, boot wiring, all pages bootstrapped"
```

### Task 9: Dither module (TDD)

**Files:**
- Create: `src/lib/dither.ts`
- Test: `tests/dither.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact): `BAYER4: number[][]` (4×4 ordered matrix), `hexToRgb(hex: string): [number, number, number]`, `bayerDither(data: Uint8ClampedArray, w: number, h: number, dark: [number,number,number], light: [number,number,number]): void` (in-place, pure math — node-safe), `ditherImageToCanvas(source: CanvasImageSource, srcW: number, srcH: number, outW: number, dark: string, light: string): HTMLCanvasElement` (browser wrapper).

- [ ] **Step 1: Write the failing tests**

`tests/dither.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BAYER4, bayerDither, hexToRgb } from '../src/lib/dither';

function gray(v: number, w = 4, h = 4): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  return d;
}

const DARK: [number, number, number] = [6, 6, 6];
const LIGHT: [number, number, number] = [200, 255, 0];

describe('hexToRgb', () => {
  it('parses hex colors', () => {
    expect(hexToRgb('#C8FF00')).toEqual([200, 255, 0]);
    expect(hexToRgb('#060606')).toEqual([6, 6, 6]);
  });
});

describe('bayerDither', () => {
  it('maps black to all-dark and white to all-light', () => {
    const black = gray(0);
    bayerDither(black, 4, 4, DARK, LIGHT);
    expect([black[0], black[1], black[2]]).toEqual(DARK);

    const white = gray(255);
    bayerDither(white, 4, 4, DARK, LIGHT);
    expect([white[0], white[1], white[2]]).toEqual(LIGHT);
  });

  it('mid gray follows the Bayer matrix pattern exactly', () => {
    const mid = gray(128);
    bayerDither(mid, 4, 4, DARK, LIGHT);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * 4 + x) * 4;
        const threshold = ((BAYER4[y][x] + 0.5) / 16) * 255;
        const expected = 128 > threshold ? LIGHT : DARK;
        expect([mid[i], mid[i + 1], mid[i + 2]], `cell ${x},${y}`).toEqual(expected);
      }
    }
  });

  it('keeps alpha at 255', () => {
    const d = gray(90);
    bayerDither(d, 4, 4, DARK, LIGHT);
    expect(d[3]).toBe(255);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/dither.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

`src/lib/dither.ts`:

```ts
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** In-place ordered dither to a two-color image. Pure math — safe in node tests. */
export function bayerDither(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  dark: [number, number, number],
  light: [number, number, number],
): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const threshold = ((BAYER4[y % 4][x % 4] + 0.5) / 16) * 255;
      const c = lum > threshold ? light : dark;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
}

/** Draw source scaled to outW wide, dither it into a duotone canvas. Browser only. */
export function ditherImageToCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  outW: number,
  dark: string,
  light: string,
): HTMLCanvasElement {
  const outH = Math.max(1, Math.round((outW * srcH) / srcW));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, outW, outH);
  const img = ctx.getImageData(0, 0, outW, outH);
  bayerDither(img.data, outW, outH, hexToRgb(dark), hexToRgb(light));
  ctx.putImageData(img, 0, 0);
  return canvas;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dither.test.ts` → PASS. `npm run check` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: bayer dither core and duotone canvas wrapper"
```

---

### Task 10: Isometric layout algorithm (TDD)

**Files:**
- Create: `src/works/constants.ts`, `src/works/layout.ts`
- Test: `tests/layout.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact):
  - `constants.ts`: `CARD_W = 320`, `CARD_H = 180`, `GX = 250`, `GY = 132`, `ISO = { a: 0.8, b: 0.4, c: -0.8, d: 0.4 }`, `HOVER_M = { a: 1.18, b: 0, c: 0, d: 1.18 }`, `SIZE_MUL_LARGE = 1.6`, `WORLD_PAD = 420`, `cellToWorld(col: number, row: number): { x: number; y: number }` = `{ x: (col-row)*GX, y: (col+row)*GY }`. All marked TUNE — visual tuning allowed, contract shape is fixed.
  - `layout.ts`: `interface Placed { slug: string; col: number; row: number; span: 1 | 2 }`, `isStreet(col: number, row: number): boolean` (every 3rd col/row, negative-safe), `layoutProjects(items: { slug: string; tileSize: 'normal' | 'large'; position: { col: number; row: number } | null }[]): Placed[]` — deterministic spiral placement skipping streets; `position` overrides; throws on overflow past ring 12.

- [ ] **Step 1: Write the failing tests**

`tests/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isStreet, layoutProjects } from '../src/works/layout';

const item = (slug: string, tileSize: 'normal' | 'large' = 'normal', position: { col: number; row: number } | null = null) =>
  ({ slug, tileSize, position });

describe('isStreet', () => {
  it('marks every third column and row, including negatives', () => {
    expect(isStreet(2, 0)).toBe(true);
    expect(isStreet(0, 2)).toBe(true);
    expect(isStreet(-1, 0)).toBe(true); // -1 mod 3 === 2
    expect(isStreet(0, 0)).toBe(false);
    expect(isStreet(1, 1)).toBe(false);
    expect(isStreet(3, 4)).toBe(false);
  });
});

describe('layoutProjects', () => {
  it('is deterministic and starts at the origin', () => {
    const a = layoutProjects([item('a'), item('b'), item('c')]);
    const b = layoutProjects([item('a'), item('b'), item('c')]);
    expect(a).toEqual(b);
    expect(a[0]).toEqual({ slug: 'a', col: 0, row: 0, span: 1 });
  });

  it('skips street cells', () => {
    const placed = layoutProjects(Array.from({ length: 12 }, (_, i) => item(`p${i}`)));
    for (const p of placed) {
      expect(isStreet(p.col, p.row), `${p.slug} at ${p.col},${p.row}`).toBe(false);
    }
  });

  it('never overlaps tiles, including large spans', () => {
    const placed = layoutProjects([item('big', 'large'), ...Array.from({ length: 11 }, (_, i) => item(`p${i}`))]);
    const cells = new Set<string>();
    for (const p of placed) {
      for (let dc = 0; dc < p.span; dc++) {
        for (let dr = 0; dr < p.span; dr++) {
          const k = `${p.col + dc},${p.row + dr}`;
          expect(cells.has(k), `overlap at ${k}`).toBe(false);
          cells.add(k);
        }
      }
    }
  });

  it('large tiles occupy a full 2x2 non-street block', () => {
    const [big] = layoutProjects([item('big', 'large')]);
    expect(big.span).toBe(2);
    for (let dc = 0; dc < 2; dc++)
      for (let dr = 0; dr < 2; dr++)
        expect(isStreet(big.col + dc, big.row + dr)).toBe(false);
  });

  it('honors explicit position overrides and keeps others clear of them', () => {
    const placed = layoutProjects([item('pinned', 'normal', { col: 4, row: 4 }), item('auto')]);
    expect(placed[0]).toEqual({ slug: 'pinned', col: 4, row: 4, span: 1 });
    expect(placed[1].col === 4 && placed[1].row === 4).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/layout.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/works/constants.ts`:

```ts
/* World geometry. Values marked TUNE may be adjusted during visual passes —
   the exported names and shapes are the contract and must not change. */
export const CARD_W = 320;
export const CARD_H = 180;
export const GX = 250; // TUNE — world px per +1 col (screen-x)
export const GY = 132; // TUNE — world px per +1 (col+row) (screen-y)
export const ISO = { a: 0.8, b: 0.4, c: -0.8, d: 0.4 }; // TUNE — resting 2:1 shear
export const HOVER_M = { a: 1.18, b: 0, c: 0, d: 1.18 }; // upright, magnified
export const SIZE_MUL_LARGE = 1.6;
export const WORLD_PAD = 420;

export function cellToWorld(col: number, row: number): { x: number; y: number } {
  return { x: (col - row) * GX, y: (col + row) * GY };
}
```

`src/works/layout.ts`:

```ts
export interface Placed { slug: string; col: number; row: number; span: 1 | 2 }

interface LayoutInput {
  slug: string;
  tileSize: 'normal' | 'large';
  position: { col: number; row: number } | null;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Every third column/row is a street (gap) — the "city blocks" rhythm. */
export const isStreet = (col: number, row: number): boolean =>
  mod(col, 3) === 2 || mod(row, 3) === 2;

/** Chebyshev rings around the origin, clockwise, deterministic. */
function* ringCells(maxRing: number): Generator<[number, number]> {
  yield [0, 0];
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let c = -ring; c <= ring; c++) yield [c, -ring];
    for (let r = -ring + 1; r <= ring; r++) yield [ring, r];
    for (let c = ring - 1; c >= -ring; c--) yield [c, ring];
    for (let r = ring - 1; r >= -ring + 1; r--) yield [-ring, r];
  }
}

export function layoutProjects(items: LayoutInput[]): Placed[] {
  const occupied = new Set<string>();
  const key = (c: number, r: number) => `${c},${r}`;
  const claim = (c: number, r: number, span: 1 | 2) => {
    for (let dc = 0; dc < span; dc++)
      for (let dr = 0; dr < span; dr++) occupied.add(key(c + dc, r + dr));
  };
  const fits = (c: number, r: number, span: 1 | 2) => {
    for (let dc = 0; dc < span; dc++)
      for (let dr = 0; dr < span; dr++)
        if (isStreet(c + dc, r + dr) || occupied.has(key(c + dc, r + dr))) return false;
    return true;
  };

  const placed: Placed[] = [];
  for (const it of items) {
    const span: 1 | 2 = it.tileSize === 'large' ? 2 : 1;
    if (it.position) {
      claim(it.position.col, it.position.row, span);
      placed.push({ slug: it.slug, col: it.position.col, row: it.position.row, span });
      continue;
    }
    let done = false;
    for (const [c, r] of ringCells(12)) {
      if (fits(c, r, span)) {
        claim(c, r, span);
        placed.push({ slug: it.slug, col: c, row: r, span });
        done = true;
        break;
      }
    }
    if (!done) throw new Error(`layout overflow placing "${it.slug}" — raise maxRing`);
  }
  return placed;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/layout.test.ts` → PASS. `npm run check` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: deterministic city-block isometric layout"
```

---

### Task 11: Playback priority (TDD)

**Files:**
- Create: `src/works/priority.ts`
- Test: `tests/priority.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact): `interface TileRect { slug: string; cx: number; cy: number; hw: number; hh: number }` (world-space center + half extents), `interface ViewRect { x: number; y: number; w: number; h: number }` (world-space viewport), `computePlaySet(tiles: TileRect[], view: ViewRect, hovered: string | null, cap: number): Set<string>` — hovered always included (even off-screen), then nearest-to-viewport-center tiles intersecting the viewport + 160 px margin, deterministic tiebreak by slug, total size ≤ max(cap, 1).

- [ ] **Step 1: Write the failing tests**

`tests/priority.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computePlaySet, TileRect, ViewRect } from '../src/works/priority';

const tile = (slug: string, cx: number, cy: number): TileRect => ({ slug, cx, cy, hw: 100, hh: 60 });
const view: ViewRect = { x: -500, y: -400, w: 1000, h: 800 }; // center (0,0)

describe('computePlaySet', () => {
  it('prefers tiles nearest the viewport center', () => {
    const tiles = [tile('far', 400, 300), tile('near', 10, 10), tile('mid', 200, 100)];
    const set = computePlaySet(tiles, view, null, 2);
    expect(set.has('near')).toBe(true);
    expect(set.has('mid')).toBe(true);
    expect(set.has('far')).toBe(false);
  });

  it('respects the cap', () => {
    const tiles = Array.from({ length: 20 }, (_, i) => tile(`t${i}`, i * 30, 0));
    expect(computePlaySet(tiles, view, null, 4).size).toBe(4);
  });

  it('always includes the hovered tile, even off-screen, within the cap', () => {
    const tiles = [tile('a', 0, 0), tile('b', 20, 0), tile('offscreen', 5000, 5000)];
    const set = computePlaySet(tiles, view, 'offscreen', 2);
    expect(set.has('offscreen')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('excludes tiles outside the viewport margin', () => {
    const tiles = [tile('in', 0, 0), tile('out', 5000, 0)];
    const set = computePlaySet(tiles, view, null, 10);
    expect(set.has('in')).toBe(true);
    expect(set.has('out')).toBe(false);
  });

  it('breaks distance ties by slug for determinism', () => {
    const tiles = [tile('b', 100, 0), tile('a', -100, 0), tile('c', 0, 100)];
    const first = computePlaySet(tiles, view, null, 1);
    const second = computePlaySet(tiles, view, null, 1);
    expect([...first]).toEqual([...second]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/priority.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/works/priority.ts`:

```ts
export interface TileRect { slug: string; cx: number; cy: number; hw: number; hh: number }
export interface ViewRect { x: number; y: number; w: number; h: number }

const MARGIN = 160;

/** Which tiles get live video right now. Pure — unit tested. */
export function computePlaySet(
  tiles: TileRect[],
  view: ViewRect,
  hovered: string | null,
  cap: number,
): Set<string> {
  const vx = view.x - MARGIN;
  const vy = view.y - MARGIN;
  const vr = view.x + view.w + MARGIN;
  const vb = view.y + view.h + MARGIN;
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;

  const visible = tiles.filter(
    (t) => t.cx + t.hw > vx && t.cx - t.hw < vr && t.cy + t.hh > vy && t.cy - t.hh < vb,
  );
  const d2 = (t: TileRect) => (t.cx - cx) ** 2 + (t.cy - cy) ** 2;
  visible.sort((a, b) => d2(a) - d2(b) || a.slug.localeCompare(b.slug));

  const out = new Set<string>();
  if (hovered) out.add(hovered);
  const limit = Math.max(cap, 1);
  for (const t of visible) {
    if (out.size >= limit) break;
    out.add(t.slug);
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/priority.test.ts` → PASS. `npm run check` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure playback priority - hovered first, nearest-center, capped"
```

---

### Task 12: Works world foundation — Pixi app, dithered tiles, drag/inertia, debris

**Files:**
- Create: `src/works/tile.ts`, `src/works/input.ts`, `src/works/debris.ts`, `src/works/world.ts`
- Modify: `src/pages/works.ts` (mount the world)

**Interfaces:**
- Consumes: `constants.ts`, `layout.ts` (Task 10), `dither.ts` (Task 9), `content` types, `env`, `rng`, `Hud.setCoords`.
- Produces (exact — later tasks extend these classes):
  - `tile.ts`: `type TileMode = 'sleep' | 'live' | 'hover'`; `class ProjectTile extends Container` with `readonly project: Project`, `readonly placed: Placed`, `readonly card: Container`, `readonly m: { a; b; c; d }` (mutable numbers), `readonly sizeMul: number`, `mode: TileMode`, `posterSprite: Sprite`, `applyMatrix(): void`, `extentX(): number`, `extentY(): number`.
  - `input.ts`: `interface Bounds { minX; maxX; minY; maxY }`; `class PanController` with `pos: { x; y }`, `dragging: boolean`, `lastGestureDist: number`, `constructor(el: HTMLElement, bounds: Bounds, inertia?: boolean)`, `tick(): void`, `panBy(dx, dy): void`, `panTo(x, y): void`.
  - `debris.ts`: `buildDebris(placed: Placed[], seed?: number): Container`.
  - `world.ts`: `interface WorldHooks { onCoords(x: number, y: number): void }`; `class WorksWorld` with `static create(host: HTMLElement, projects: Project[], hooks: WorldHooks): Promise<WorksWorld>`, `tiles: Map<string, ProjectTile>`, `viewRect(): ViewRect`, `panBy(dx, dy): void`.

- [ ] **Step 1: Implement tile.ts**

```ts
import { Container, Matrix, Sprite, Text, Texture } from 'pixi.js';
import type { Project } from '../lib/content';
import { CARD_H, CARD_W, ISO, SIZE_MUL_LARGE, cellToWorld } from './constants';
import type { Placed } from './layout';

export type TileMode = 'sleep' | 'live' | 'hover';

export class ProjectTile extends Container {
  readonly project: Project;
  readonly placed: Placed;
  readonly card = new Container();
  readonly m = { ...ISO }; // live matrix state — tweened for hover/enter
  readonly sizeMul: number;
  mode: TileMode = 'sleep';
  posterSprite: Sprite;

  constructor(project: Project, placed: Placed, posterCanvas: HTMLCanvasElement) {
    super();
    this.project = project;
    this.placed = placed;
    this.sizeMul = placed.span === 2 ? SIZE_MUL_LARGE : 1;
    const { x, y } = cellToWorld(placed.col, placed.row);
    this.position.set(x, y);
    this.zIndex = placed.col + placed.row;

    this.posterSprite = new Sprite(Texture.from(posterCanvas));
    this.posterSprite.anchor.set(0.5);
    this.posterSprite.width = CARD_W;
    this.posterSprite.height = CARD_H;
    this.card.addChild(this.posterSprite);

    const id = new Text({
      text: `${project.year} · ${project.slug}`.toUpperCase(),
      style: { fontFamily: 'Martian Mono', fontSize: 9, fill: project.accent, letterSpacing: 2 },
    });
    id.alpha = 0.55;
    id.position.set(-CARD_W / 2, CARD_H / 2 + 10);
    this.card.addChild(id);

    this.addChild(this.card);
    this.applyMatrix();
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  applyMatrix(): void {
    const s = this.sizeMul;
    this.card.setFromMatrix(new Matrix(this.m.a * s, this.m.b * s, this.m.c * s, this.m.d * s, 0, 0));
  }

  extentX(): number {
    return ((Math.abs(this.m.a) * CARD_W + Math.abs(this.m.c) * CARD_H) / 2) * this.sizeMul;
  }

  extentY(): number {
    return ((Math.abs(this.m.b) * CARD_W + Math.abs(this.m.d) * CARD_H) / 2) * this.sizeMul;
  }
}
```

- [ ] **Step 2: Implement input.ts**

```ts
export interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Drag/inertia/rubber-band camera. pos is the camera offset applied to the world. */
export class PanController {
  pos = { x: 0, y: 0 };
  dragging = false;
  lastGestureDist = 0;
  private vel = { x: 0, y: 0 };
  private last = { x: 0, y: 0, t: 0 };

  constructor(
    private el: HTMLElement,
    private bounds: Bounds,
    private inertia = true,
  ) {
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastGestureDist = 0;
    this.vel = { x: 0, y: 0 };
    this.last = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.el.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const now = performance.now();
    const dx = e.clientX - this.last.x;
    const dy = e.clientY - this.last.y;
    const dt = Math.max(1, now - this.last.t);
    this.pos.x += dx;
    this.pos.y += dy;
    this.lastGestureDist += Math.hypot(dx, dy);
    if (this.inertia) this.vel = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
    this.last = { x: e.clientX, y: e.clientY, t: now };
  };

  private onUp = () => {
    this.dragging = false;
  };

  panBy(dx: number, dy: number): void {
    this.pos.x += dx;
    this.pos.y += dy;
  }

  panTo(x: number, y: number): void {
    this.pos.x = x;
    this.pos.y = y;
    this.vel = { x: 0, y: 0 };
  }

  tick(): void {
    if (!this.dragging) {
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;
      this.vel.x *= 0.92;
      this.vel.y *= 0.92;
      if (Math.abs(this.vel.x) < 0.01) this.vel.x = 0;
      if (Math.abs(this.vel.y) < 0.01) this.vel.y = 0;
    }
    const cx = clamp(this.pos.x, this.bounds.minX, this.bounds.maxX);
    const cy = clamp(this.pos.y, this.bounds.minY, this.bounds.maxY);
    if (this.dragging) {
      // resist while dragging past the edge
      this.pos.x = cx + (this.pos.x - cx) * 0.35;
      this.pos.y = cy + (this.pos.y - cy) * 0.35;
    } else {
      // spring home
      this.pos.x += (cx - this.pos.x) * 0.14;
      this.pos.y += (cy - this.pos.y) * 0.14;
    }
  }
}
```

- [ ] **Step 3: Implement debris.ts**

```ts
import { Container, Graphics, Text } from 'pixi.js';
import { mulberry32 } from '../lib/rng';
import { GX, GY, cellToWorld } from './constants';
import { isStreet, Placed } from './layout';

/** Static floor furniture: faint iso grid + scattered HUD micro-labels. */
export function buildDebris(placed: Placed[], seed = 796): Container {
  const c = new Container();
  const rand = mulberry32(seed);

  let minC = 0, maxC = 0, minR = 0, maxR = 0;
  for (const p of placed) {
    minC = Math.min(minC, p.col - 2);
    maxC = Math.max(maxC, p.col + 3);
    minR = Math.min(minR, p.row - 2);
    maxR = Math.max(maxR, p.row + 3);
  }

  const g = new Graphics();
  for (let col = minC; col <= maxC; col++) {
    for (let row = minR; row <= maxR; row++) {
      const { x, y } = cellToWorld(col, row);
      g.moveTo(x, y - GY * 0.5)
        .lineTo(x + GX * 0.5, y)
        .lineTo(x, y + GY * 0.5)
        .lineTo(x - GX * 0.5, y)
        .closePath();
    }
  }
  g.stroke({ color: 0xc8ff00, alpha: 0.045, width: 1 });
  c.addChild(g);

  for (let col = minC; col <= maxC; col++) {
    for (let row = minR; row <= maxR; row++) {
      if (!isStreet(col, row) || rand() < 0.82) continue;
      const { x, y } = cellToWorld(col, row);
      const t = new Text({
        text: `SDR${Math.floor(rand() * 90) + 10}·${Math.floor(rand() * 9000) + 1000}`,
        style: { fontFamily: 'Martian Mono', fontSize: 8, fill: 0xedede6, letterSpacing: 2 },
      });
      t.alpha = 0.22;
      t.anchor.set(0.5);
      t.position.set(x, y);
      t.skew.set(-0.3, 0.15);
      c.addChild(t);
    }
  }
  return c;
}
```

- [ ] **Step 4: Implement world.ts**

```ts
import { Application, Container } from 'pixi.js';
import type { Project } from '../lib/content';
import { projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { dprCap, reducedMotion } from '../lib/env';
import { mulberry32 } from '../lib/rng';
import { WORLD_PAD } from './constants';
import { buildDebris } from './debris';
import { PanController } from './input';
import { layoutProjects } from './layout';
import type { ViewRect } from './priority';
import { ProjectTile } from './tile';

export interface WorldHooks { onCoords(x: number, y: number): void }

export class WorksWorld {
  tiles = new Map<string, ProjectTile>();
  protected app!: Application;
  protected worldC = new Container();
  protected tilesLayer = new Container();
  protected fxLayer = new Container();
  protected pan!: PanController;
  protected hooks!: WorldHooks;
  hoveredSlug: string | null = null;

  static async create(host: HTMLElement, projects: Project[], hooks: WorldHooks): Promise<WorksWorld> {
    const w = new WorksWorld();
    w.hooks = hooks;

    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      resolution: dprCap(),
      autoDensity: true,
      resizeTo: host,
    });
    host.append(app.canvas);
    w.app = app;

    const posterCanvases = await Promise.all(projects.map((p) => loadPosterCanvas(p)));
    const placed = layoutProjects(
      projects.map((p) => ({ slug: p.slug, tileSize: p.tileSize, position: p.position })),
    );
    const placedBySlug = new Map(placed.map((pl) => [pl.slug, pl]));

    w.tilesLayer.sortableChildren = true;
    projects.forEach((p, i) => {
      const tile = new ProjectTile(p, placedBySlug.get(p.slug)!, posterCanvases[i]);
      w.tiles.set(p.slug, tile);
      w.tilesLayer.addChild(tile);
    });

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const t of w.tiles.values()) {
      minX = Math.min(minX, t.x - t.extentX());
      maxX = Math.max(maxX, t.x + t.extentX());
      minY = Math.min(minY, t.y - t.extentY());
      maxY = Math.max(maxY, t.y + t.extentY());
    }
    minX -= WORLD_PAD; maxX += WORLD_PAD; minY -= WORLD_PAD; maxY += WORLD_PAD;

    w.worldC.addChild(buildDebris(placed), w.tilesLayer, w.fxLayer);
    app.stage.addChild(w.worldC);

    w.pan = new PanController(
      host,
      { minX: -maxX, maxX: -minX, minY: -maxY, maxY: -minY },
      !reducedMotion(),
    );

    let coordsClock = 0;
    app.ticker.add((tk) => {
      w.pan.tick();
      w.worldC.position.set(app.screen.width / 2 + w.pan.pos.x, app.screen.height / 2 + w.pan.pos.y);
      coordsClock += tk.deltaMS;
      if (coordsClock > 100) {
        coordsClock = 0;
        w.hooks.onCoords(-w.pan.pos.x, -w.pan.pos.y);
      }
      w.afterTick(tk.deltaMS);
    });
    return w;
  }

  /** Extension point — playback (Task 13), rain (Task 15) hook in here. */
  protected afterTick(_dtMs: number): void {}

  viewRect(): ViewRect {
    return {
      x: -this.pan.pos.x - this.app.screen.width / 2,
      y: -this.pan.pos.y - this.app.screen.height / 2,
      w: this.app.screen.width,
      h: this.app.screen.height,
    };
  }

  panBy(dx: number, dy: number): void {
    this.pan.panBy(dx, dy);
  }
}

async function loadPosterCanvas(p: Project): Promise<HTMLCanvasElement> {
  const url = projectAssetUrl(p.slug, 'poster.jpg');
  try {
    const img = await loadImage(url);
    return ditherImageToCanvas(img, img.naturalWidth, img.naturalHeight, 240, '#060606', p.accent);
  } catch {
    console.warn(`[revachol] missing media: ${url} — using generated fallback poster`);
    return fallbackPoster(p);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

function fallbackPoster(p: Project): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 135;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0A0A12';
  ctx.fillRect(0, 0, 240, 135);
  const rand = mulberry32(p.slug.length * 7919);
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 260; i++) {
    ctx.fillRect(Math.floor(rand() * 240), Math.floor(rand() * 135), 2, 2);
  }
  return c;
}
```

Note the design: `afterTick` is a protected extension point so Tasks 13/15 plug playback and rain into the single ticker instead of adding competing tickers.

- [ ] **Step 5: Wire works.ts**

Replace `src/pages/works.ts` entirely:

```ts
import { loadProjects, projectAssetUrl } from '../lib/content';
import { sound } from '../lib/sound';
import { startPage } from '../shell/page';
import { WorksWorld } from '../works/world';

startPage(
  'work',
  async ({ hud }) => {
    const projects = await loadProjects();
    hud.setCount(projects.length);
    const host = document.getElementById('floor')!;
    const world = await WorksWorld.create(host, projects, {
      onCoords: (x, y) => hud.setCoords(x, y),
    });
    sound.onUnlock(() => sound.startHum());
    (window as unknown as { rvlWorld: WorksWorld }).rvlWorld = world; // debug handle for verification
  },
  [
    { label: 'LOAD PROJECT INDEX', run: () => loadProjects() },
    {
      label: 'CACHE FLOOR POSTERS',
      run: async () => {
        const ps = await loadProjects();
        await Promise.allSettled(
          ps.slice(0, 4).map(
            (p) =>
              new Promise((res) => {
                const im = new Image();
                im.onload = im.onerror = () => res(null);
                im.src = projectAssetUrl(p.slug, 'poster.jpg');
              }),
          ),
        );
      },
    },
  ],
);
```

- [ ] **Step 6: Browser verification**

`npm run check` + `npm test` clean, then on `/works.html`:
1. Boot lists 4 tasks; after retract, an isometric floor of 12 sheared duotone-dithered tiles in city blocks over the faint diamond grid + scattered `SDR…` labels; the ultramarine radial glow behind (page-work background).
2. Each tile is dithered in its own accent color; the two `large` projects are visibly bigger.
3. Drag: the floor follows with momentum on release; drag hard past the edge — rubber-band resistance, springs back.
4. HUD coords update while panning; ambient hum starts after the first click (with SND on).
5. `rvlWorld.tiles.size` in console → `12`. No console errors. Resize the window — canvas follows.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: isometric works world - dithered tiles, drag inertia, debris"
```

---

### Task 13: Tiered video playback — wake/sleep by priority, hard caps

**Files:**
- Create: `src/works/playback.ts`
- Modify: `src/works/tile.ts` (add video lifecycle), `src/works/world.ts` (integrate manager)

**Interfaces:**
- Consumes: `computePlaySet` (Task 11), `liveVideoCap` (Task 6), `projectAssetUrl` (Task 3).
- Produces (exact):
  - `tile.ts` additions: `video?: HTMLVideoElement`, `videoSprite?: Sprite`, `wake(): void`, `sleep(): void`, `hasVideo(): boolean`, `releaseVideo(): void`, `swapToMontage(): void`, `restorePreview(): void`, `shimmer(): void` (brief glitch tick for sleeping posters — spec §4.4 "animated dithered poster").
  - `playback.ts`: `class PlaybackManager { constructor(tiles: Map<string, ProjectTile>); readonly cap: number; update(view: ViewRect, hovered: string | null): void }` — enforces play-set transitions plus a `cap * 2` hard limit on existing video elements (LRU release).

- [ ] **Step 1: Extend tile.ts**

Add to the imports of `src/works/tile.ts`: `projectAssetUrl` from `../lib/content`. Then add these members to `ProjectTile` (below `posterSprite`):

```ts
  video?: HTMLVideoElement;
  videoSprite?: Sprite;

  private previewUrl(): string { return projectAssetUrl(this.project.slug, 'preview.mp4'); }
  private hoverUrl(): string { return projectAssetUrl(this.project.slug, 'hover.mp4'); }

  wake(): void {
    if (this.mode !== 'sleep') return;
    if (!this.video) this.createVideo();
    if (!this.video) return; // creation failed
    this.mode = 'live';
    if (this.videoSprite) this.videoSprite.visible = true;
    void this.video.play().catch(() => { /* poster remains visible underneath */ });
  }

  sleep(): void {
    if (this.mode === 'sleep') return;
    this.mode = 'sleep';
    this.video?.pause();
    if (this.videoSprite) this.videoSprite.visible = false;
  }

  hasVideo(): boolean {
    return !!this.video;
  }

  releaseVideo(): void {
    this.sleep();
    if (this.videoSprite) {
      this.videoSprite.destroy({ texture: true });
      this.videoSprite = undefined;
    }
    if (this.video) {
      this.video.src = '';
      this.video.load();
      this.video = undefined;
    }
  }

  swapToMontage(): void {
    if (!this.video) this.createVideo();
    const v = this.video;
    if (!v) return;
    if (!v.src.endsWith('hover.mp4')) {
      v.src = this.hoverUrl(); // the error handler falls back to preview.mp4
      void v.play().catch(() => {});
    }
  }

  restorePreview(): void {
    const v = this.video;
    if (!v || v.src.endsWith('preview.mp4')) return;
    v.src = this.previewUrl();
    if (this.mode !== 'sleep') void v.play().catch(() => {});
  }

  /** One brief glitch tick on the dithered poster — sleeping tiles stay alive. */
  shimmer(): void {
    const s = this.posterSprite;
    const ox = (Math.random() - 0.5) * 10;
    s.position.x += ox;
    s.alpha = 0.72;
    setTimeout(() => {
      s.position.x -= ox;
      s.alpha = 1;
    }, 70);
  }

  private createVideo(): void {
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = this.previewUrl();
    v.addEventListener('error', () => {
      if (v.src.endsWith('hover.mp4')) {
        v.src = this.previewUrl();
        if (this.mode !== 'sleep') void v.play().catch(() => {});
      } else {
        console.warn(`[revachol] missing media for "${this.project.slug}" (${v.src}) — tile stays on its poster`);
        this.releaseVideo();
      }
    });
    this.video = v;
    v.addEventListener('loadedmetadata', () => this.attachVideoSprite());
  }

  private attachVideoSprite(): void {
    if (!this.video) return;
    if (this.videoSprite) this.videoSprite.destroy({ texture: true });
    const s = new Sprite(Texture.from(this.video));
    s.anchor.set(0.5);
    s.width = CARD_W;
    s.height = CARD_H;
    this.videoSprite = s;
    this.card.addChildAt(s, 1); // above poster, below the id label
    s.visible = this.mode !== 'sleep';
  }
```

(`loadedmetadata` re-fires after every `src` swap, so the sprite/texture is rebuilt at the montage's resolution automatically.)

- [ ] **Step 2: Implement playback.ts**

```ts
import { liveVideoCap } from '../lib/env';
import { computePlaySet, TileRect, ViewRect } from './priority';
import type { ProjectTile } from './tile';

/** Applies the pure play-set to the stateful tiles + caps total video elements. */
export class PlaybackManager {
  readonly cap = liveVideoCap();
  readonly maxElements = this.cap * 2;
  private lastSet = new Set<string>();
  private lru: string[] = []; // slugs with a created video element, oldest first

  constructor(private tiles: Map<string, ProjectTile>) {}

  update(view: ViewRect, hovered: string | null): void {
    const rects: TileRect[] = [];
    for (const t of this.tiles.values()) {
      rects.push({ slug: t.project.slug, cx: t.x, cy: t.y, hw: t.extentX(), hh: t.extentY() });
    }
    const set = computePlaySet(rects, view, hovered, this.cap);

    for (const slug of this.lastSet) {
      if (!set.has(slug)) this.tiles.get(slug)?.sleep();
    }
    for (const slug of set) {
      const tile = this.tiles.get(slug);
      if (!tile || tile.mode !== 'sleep') { this.touch(slug); continue; }
      const hadVideo = tile.hasVideo();
      tile.wake();
      if (!hadVideo && tile.hasVideo()) this.lru.push(slug);
      else this.touch(slug);
    }
    while (this.lru.length > this.maxElements) {
      const victim = this.lru.find((s) => !set.has(s));
      if (!victim) break;
      this.lru = this.lru.filter((s) => s !== victim);
      this.tiles.get(victim)?.releaseVideo();
    }
    this.lastSet = set;
  }

  private touch(slug: string): void {
    const i = this.lru.indexOf(slug);
    if (i >= 0) {
      this.lru.splice(i, 1);
      this.lru.push(slug);
    }
  }
}
```

- [ ] **Step 3: Integrate into world.ts**

In `src/works/world.ts`: add import `import { PlaybackManager } from './playback';`, add field `playback!: PlaybackManager;` (public), and in `create` after the tiles loop add:

```ts
    w.playback = new PlaybackManager(w.tiles);
```

Replace the empty `afterTick` with:

```ts
  private playClock = 0;
  private shimmerClock = 0;
  private lastPlayPos = { x: NaN, y: NaN };

  protected afterTick(dtMs: number): void {
    this.playClock += dtMs;
    const moved = Math.hypot(this.pan.pos.x - this.lastPlayPos.x, this.pan.pos.y - this.lastPlayPos.y);
    if (this.playClock > 300 || moved > 60 || Number.isNaN(moved)) {
      this.playClock = 0;
      this.lastPlayPos = { x: this.pan.pos.x, y: this.pan.pos.y };
      this.playback.update(this.viewRect(), this.hoveredSlug);
    }
    // sleeping posters get occasional glitch ticks — the floor never looks frozen
    this.shimmerClock += dtMs;
    if (this.shimmerClock > 380 && !reducedMotion()) {
      this.shimmerClock = 0;
      const sleeping = [...this.tiles.values()].filter((t) => t.mode === 'sleep');
      if (sleeping.length) {
        sleeping[Math.floor(Math.random() * sleeping.length)].shimmer();
      }
    }
  }
```

- [ ] **Step 4: Browser verification**

`npm run check` + `npm test` clean, then on `/works.html`:
1. Tiles near the viewport center come alive with moving video moments after load; distant tiles stay dithered posters.
2. Pan to a far corner: tiles there wake, the old ones freeze back to posters. Count playing videos in console:
   `document.querySelectorAll('video').length` ≤ 20 and
   `[...document.querySelectorAll('video')].filter(v => !v.paused).length` ≤ 10.
3. DevTools device emulation (mobile viewport, touch): reload — at most 4 playing.
4. Delete one project's `preview.mp4` from `public/content/projects/<slug>/`, reload: its tile stays a poster, console warns `missing media for "<slug>"`. Re-run `scripts/gen-placeholders.ps1` (or restore the file from git) afterward.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: tiered video playback with wake/sleep and lru caps"
```

### Task 14: The magnific hover — un-skew, dim world, montage, side label

**Files:**
- Modify: `src/works/tile.ts` (add `enterHover`/`exitHover`), `src/works/world.ts` (hover state machine, desaturation, DOM label, event wiring, simple `enter`)

**Interfaces:**
- Consumes: `HOVER_M`/`ISO` (Task 10), `swapToMontage`/`restorePreview` (Task 13), `setCursorLabel` (Task 6), `scrambleEl`, `sound`, `leaveTo`, `#tile-label` DOM (Task 1).
- Produces: `ProjectTile.enterHover(): void`, `ProjectTile.exitHover(): void`; `WorksWorld.hover(slug: string): void`, `WorksWorld.unhover(): void`, `WorksWorld.enter(slug: string): void` (plain navigation now; Task 15 upgrades it to the burst). Tap semantics: fine pointer = hover on over, enter on tap; coarse pointer = first tap hovers, second tap enters; drags over 8 px never count as taps.

- [ ] **Step 1: Extend tile.ts**

Add imports to `src/works/tile.ts`: `gsap` from `'gsap'`, `reducedMotion` from `'../lib/env'`, `HOVER_M` alongside the existing constants import, and `BlurFilter` added to the `'pixi.js'` import. Add members:

```ts
  private glow?: Sprite;

  private ensureGlow(): Sprite {
    if (!this.glow) {
      const g = new Sprite(Texture.WHITE);
      g.anchor.set(0.5);
      g.width = CARD_W * 1.18;
      g.height = CARD_H * 1.3;
      g.tint = parseInt(this.project.accent.slice(1), 16);
      g.alpha = 0;
      g.filters = [new BlurFilter({ strength: 18 })];
      this.card.addChildAt(g, 0); // behind the poster
      this.glow = g;
    }
    return this.glow;
  }

  enterHover(): void {
    gsap.killTweensOf(this.m);
    gsap.killTweensOf(this.card);
    const d = reducedMotion() ? 0.05 : 0.5;
    gsap.to(this.m, { ...HOVER_M, duration: d, ease: 'expo.out', onUpdate: () => this.applyMatrix() });
    gsap.to(this.card, { y: -26, duration: d, ease: 'expo.out' });
    gsap.to(this.ensureGlow(), { alpha: 0.4, duration: d });
    this.zIndex = 10000;
  }

  exitHover(): void {
    gsap.killTweensOf(this.m);
    gsap.killTweensOf(this.card);
    const d = reducedMotion() ? 0.05 : 0.4;
    gsap.to(this.m, { ...ISO, duration: d, ease: 'expo.out', onUpdate: () => this.applyMatrix() });
    gsap.to(this.card, { y: 0, duration: d, ease: 'expo.out' });
    if (this.glow) gsap.to(this.glow, { alpha: 0, duration: d });
    this.zIndex = this.placed.col + this.placed.row;
  }
```

(The glow sprite index shift means the video sprite lands at index 2 once a glow exists — `attachVideoSprite` must insert above the poster, so change its `addChildAt(s, 1)` call to `this.card.addChildAt(s, this.card.getChildIndex(this.posterSprite) + 1);` while here.)

- [ ] **Step 2: Extend world.ts**

Add imports: `ColorMatrixFilter` (from `'pixi.js'`, extend the existing import), `gsap` from `'gsap'`, `finePointer` from `'../lib/env'` (extend), `sound` from `'../lib/sound'`, `scrambleEl` from `'../lib/scramble'`, `setCursorLabel` from `'../shell/cursor'`, `leaveTo` from `'../lib/transitions'`. Add fields:

```ts
  private desat = new ColorMatrixFilter();
  private labelEl = document.getElementById('tile-label');
```

In `create`, after `w.playback = new PlaybackManager(w.tiles);` add:

```ts
    w.desat.saturate(-0.55, false);
    for (const tile of w.tiles.values()) {
      const slug = tile.project.slug;
      tile.on('pointerover', () => {
        if (finePointer() && !w.pan.dragging) w.hover(slug);
      });
      tile.on('pointerout', () => {
        if (finePointer() && w.hoveredSlug === slug) w.unhover();
      });
      tile.on('pointertap', () => {
        if (w.pan.lastGestureDist > 8) return; // that was a drag, not a tap
        if (finePointer()) { w.enter(slug); return; }
        if (w.hoveredSlug === slug) w.enter(slug);
        else w.hover(slug);
      });
    }
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.renderer.on('resize', () => { app.stage.hitArea = app.screen; });
    app.stage.on('pointertap', (e) => {
      if (e.target === app.stage && w.pan.lastGestureDist <= 8) w.unhover();
    });
```

Add methods:

```ts
  hover(slug: string): void {
    if (this.hoveredSlug === slug) return;
    this.unhover();
    const tile = this.tiles.get(slug);
    if (!tile) return;
    this.hoveredSlug = slug;
    sound.hover();
    this.fxLayer.addChild(tile); // lift out of the dimmed/desaturated layer
    this.tilesLayer.filters = [this.desat];
    gsap.to(this.tilesLayer, { alpha: 0.55, duration: 0.35 });
    tile.wake();
    tile.swapToMontage();
    tile.enterHover();
    setCursorLabel('ENTER ▸');
    this.showLabel(tile);
    this.playback.update(this.viewRect(), this.hoveredSlug);
  }

  unhover(): void {
    const slug = this.hoveredSlug;
    if (!slug) return;
    this.hoveredSlug = null;
    const tile = this.tiles.get(slug);
    setCursorLabel(null);
    this.hideLabel();
    this.tilesLayer.filters = [];
    gsap.to(this.tilesLayer, { alpha: 1, duration: 0.3 });
    if (tile) {
      tile.restorePreview();
      tile.exitHover();
      this.tilesLayer.addChild(tile);
    }
    this.playback.update(this.viewRect(), null);
  }

  enter(slug: string): void {
    // Task 15 replaces this with the datamosh burst.
    leaveTo(`/project.html?p=${slug}`);
  }

  private showLabel(tile: ProjectTile): void {
    if (!this.labelEl) return;
    const p = tile.project;
    const global = this.worldC.toGlobal({ x: tile.x, y: tile.y });
    this.labelEl.hidden = false;
    this.labelEl.style.left = `${Math.min(window.innerWidth - 360, Math.max(16, global.x + tile.extentX() * 0.7))}px`;
    this.labelEl.style.top = `${Math.max(70, global.y - 40)}px`;
    const title = this.labelEl.querySelector('.tl-title') as HTMLElement;
    const meta = this.labelEl.querySelector('.tl-meta') as HTMLElement;
    meta.textContent = [p.year, p.role, p.runtime].filter(Boolean).join(' · ').toUpperCase();
    meta.style.color = p.accent;
    void scrambleEl(title, p.title.toUpperCase(), 420);
  }

  private hideLabel(): void {
    if (this.labelEl) this.labelEl.hidden = true;
  }
```

- [ ] **Step 3: Browser verification**

`npm run check` + `npm test` clean, then on `/works.html` (desktop):
1. Hover a tile: it un-skews upright toward you, lifts, grows; the rest of the floor dims and desaturates; the video switches to the longer montage; the Bodoni title scrambles in beside it with accented Martian meta; cursor reads `ENTER ▸`; a blip fires.
2. Move off: everything reverses cleanly. Rapidly sweep across many tiles — no stuck states, no tween fighting.
3. Click a tile: lands on `project.html?p=<slug>` (blank interim page — real page in Task 16, burst in Task 15).
4. Drag starting on a tile: pans without triggering hover-jitter or enter on release.
5. Mobile emulation: first tap magnifies + montage + label; tapping empty floor releases it; second tap on the same tile navigates.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: hover magnify with unskew, desaturated dim, montage and label"
```

---

### Task 15: Enter burst, ASCII rain, semantic list, keyboard navigation

**Files:**
- Create: `src/works/rain.ts`
- Modify: `src/works/world.ts` (burst `enter`, rain integration, `focusProject`, `enterHovered`), `src/pages/works.ts` (semantic list + keyboard)

**Interfaces:**
- Consumes: `GlitchFilter`, `RGBSplitFilter` (pixi-filters), `GLYPHS` (Task 6), everything prior.
- Produces: `class AsciiRain extends Container { constructor(bounds: { minX; maxX; minY; maxY }, seed?: number); tick(dtMs: number): void }`; `WorksWorld.enter(slug)` (burst + navigate), `WorksWorld.focusProject(slug: string): void`, `WorksWorld.enterHovered(): void`.

- [ ] **Step 1: Implement rain.ts**

```ts
import { Container, Text } from 'pixi.js';
import { mulberry32 } from '../lib/rng';
import { GLYPHS } from '../lib/scramble';

/** Drifting ASCII columns ringing the void edges of the floor. */
export class AsciiRain extends Container {
  private cols: Text[] = [];
  private clock = 0;
  private rand: () => number;

  constructor(bounds: { minX: number; maxX: number; minY: number; maxY: number }, seed = 42) {
    super();
    this.rand = mulberry32(seed);
    const n = 26;
    const rx = (bounds.maxX - bounds.minX) / 2;
    const ry = (bounds.maxY - bounds.minY) / 2;
    const cx = (bounds.maxX + bounds.minX) / 2;
    const cy = (bounds.maxY + bounds.minY) / 2;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const t = new Text({
        text: this.column(),
        style: { fontFamily: 'Geist Mono', fontSize: 13, fill: 0xc8ff00, lineHeight: 15 },
      });
      t.alpha = 0.1 + this.rand() * 0.12;
      t.anchor.set(0.5, 0);
      t.position.set(
        cx + Math.cos(angle) * rx * (0.92 + this.rand() * 0.2),
        cy + Math.sin(angle) * ry * (0.92 + this.rand() * 0.2),
      );
      this.cols.push(t);
      this.addChild(t);
    }
  }

  private column(): string {
    const len = 4 + Math.floor(this.rand() * 9);
    let s = '';
    for (let i = 0; i < len; i++) s += GLYPHS[Math.floor(this.rand() * GLYPHS.length)] + '\n';
    return s;
  }

  tick(dtMs: number): void {
    this.clock += dtMs;
    if (this.clock < 90) return;
    this.clock = 0;
    const t = this.cols[Math.floor(this.rand() * this.cols.length)];
    t.text = this.column();
  }
}
```

- [ ] **Step 2: Extend world.ts**

Add imports: `GlitchFilter, RGBSplitFilter` from `'pixi-filters'`; `CARD_H, CARD_W` added to the constants import; `reducedMotion` already imported; `AsciiRain` from `'./rain'`. Add fields:

```ts
  private rain?: AsciiRain;
  private entering = false;
```

In `create`, right before `w.worldC.addChild(buildDebris(placed), w.tilesLayer, w.fxLayer);` (bbox values are in scope) add:

```ts
    if (!reducedMotion()) {
      w.rain = new AsciiRain({ minX, maxX, minY, maxY });
    }
```

and change the addChild line to:

```ts
    w.worldC.addChild(buildDebris(placed), w.tilesLayer, w.fxLayer);
    if (w.rain) w.worldC.addChildAt(w.rain, 0);
```

Append to `afterTick` (keep the existing playback block):

```ts
    this.rain?.tick(dtMs);
```

Replace the Task-14 `enter` method entirely:

```ts
  enter(slug: string): void {
    if (this.entering) return;
    const tile = this.tiles.get(slug);
    if (!tile) return;
    this.entering = true;
    sound.click();
    const dest = `/project.html?p=${slug}`;
    if (reducedMotion()) {
      leaveTo(dest);
      return;
    }
    setCursorLabel(null);
    this.hideLabel();
    const glitch = new GlitchFilter({ slices: 12, offset: 60 });
    const rgb = new RGBSplitFilter({ red: { x: 4, y: 0 }, green: { x: 0, y: 0 }, blue: { x: -4, y: 0 } });
    this.worldC.filters = [glitch, rgb];
    this.fxLayer.addChild(tile);
    const cover =
      (Math.max(this.app.screen.width / CARD_W, this.app.screen.height / CARD_H) * 1.12) / tile.sizeMul;
    gsap.killTweensOf(tile.m);
    gsap.to(this.pan.pos, { x: -tile.x, y: -tile.y, duration: 0.42, ease: 'power2.in' });
    gsap.to(tile.m, {
      a: cover, b: 0, c: 0, d: cover,
      duration: 0.46, ease: 'power3.in',
      onUpdate: () => tile.applyMatrix(),
    });
    gsap.to(this.tilesLayer, { alpha: 0, duration: 0.3 });
    this.app.ticker.add(() => {
      glitch.seed = Math.random();
      glitch.offset = 30 + Math.random() * 90;
    });
    window.setTimeout(() => leaveTo(dest), 500);
  }

  focusProject(slug: string): void {
    const tile = this.tiles.get(slug);
    if (!tile) return;
    gsap.to(this.pan.pos, {
      x: -tile.x, y: -tile.y,
      duration: reducedMotion() ? 0 : 0.5, ease: 'power2.out',
      onComplete: () => this.hover(slug),
    });
  }

  enterHovered(): void {
    if (this.hoveredSlug) this.enter(this.hoveredSlug);
  }
```

(If the installed pixi-filters version rejects the option-object constructors, construct with no arguments and assign `glitch.slices`, `glitch.offset`, `rgb.red = { x: 4, y: 0 }` etc. after — the assigned property names are identical.)

- [ ] **Step 3: Semantic list + keyboard in works.ts**

In `src/pages/works.ts`, add `Project` type import (`import { loadProjects, projectAssetUrl, type Project } from '../lib/content';`) and, inside the `main` callback after the world is created, add:

```ts
    buildSemanticList(projects, world);
    window.addEventListener('keydown', (e) => {
      const step = 140;
      if (e.key === 'ArrowLeft') world.panBy(step, 0);
      else if (e.key === 'ArrowRight') world.panBy(-step, 0);
      else if (e.key === 'ArrowUp') world.panBy(0, step);
      else if (e.key === 'ArrowDown') world.panBy(0, -step);
      else if (e.key === 'Enter') world.enterHovered();
    });
```

And at file bottom:

```ts
function buildSemanticList(projects: Project[], world: WorksWorld): void {
  const ul = document.getElementById('sr-projects');
  if (!ul) return;
  for (const p of projects) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/project.html?p=${p.slug}`;
    a.textContent = `${p.title} (${p.year})`;
    a.addEventListener('focus', () => world.focusProject(p.slug));
    li.append(a);
    ul.append(li);
  }
}
```

- [ ] **Step 4: Browser verification**

`npm run check` + `npm test` clean, then on `/works.html`:
1. Click a tile: the world glitch-bursts (slices tearing, RGB fringing) while the tile erupts upright to fill the screen, then the wipe carries you to its project URL. Feels like one move.
2. ASCII glyph columns shimmer at the floor's edges; they never overlap the tile blocks.
3. Tab from the address bar: focus walks the hidden project list — each focus glides the camera to that tile and magnifies it; Enter opens it. Arrow keys pan; Enter with a hovered tile enters it.
4. Reduced motion: no rain, click navigates via simple fade, focus jumps without gliding.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: datamosh enter burst, ascii rain, semantic list, keyboard nav"
```

---

### Task 16: Project detail page — embeds (TDD), render, skin, gallery, pager

**Files:**
- Create: `src/lib/embeds.ts`, `src/styles/project.css`
- Modify: `src/pages/project.ts` (full implementation)
- Test: `tests/embeds.test.ts`

**Interfaces:**
- Consumes: content loaders/types, `ditherImageToCanvas`, `scrambleEl`, `startPage`, `projectAssetUrl`, `getSlugFromSearch`, project.html skeleton IDs (Task 1).
- Produces: `youtubeId(url: string): string | null`, `vimeoId(url: string): string | null`, `embedSrc(film: FilmRef): string | null` (youtube-nocookie / player.vimeo, `null` for `local` or unparseable).

- [ ] **Step 1: Write the failing embed tests**

`tests/embeds.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { embedSrc, vimeoId, youtubeId } from '../src/lib/embeds';

describe('youtubeId', () => {
  it('parses common url shapes', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(youtubeId('https://youtu.be/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(youtubeId('https://www.youtube.com/shorts/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
    expect(youtubeId('https://www.youtube.com/embed/aqz-KE-bpKQ')).toBe('aqz-KE-bpKQ');
  });
  it('rejects junk', () => {
    expect(youtubeId('https://example.com/watch?v=nope')).toBeNull();
  });
});

describe('vimeoId', () => {
  it('parses plain and /video/ urls', () => {
    expect(vimeoId('https://vimeo.com/76979871')).toBe('76979871');
    expect(vimeoId('https://vimeo.com/video/76979871')).toBe('76979871');
  });
  it('rejects junk', () => {
    expect(vimeoId('https://vimeo.com/about')).toBeNull();
  });
});

describe('embedSrc', () => {
  it('builds privacy-friendly embed urls', () => {
    expect(embedSrc({ type: 'youtube', src: 'https://youtu.be/aqz-KE-bpKQ' })).toBe(
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0',
    );
    expect(embedSrc({ type: 'vimeo', src: 'https://vimeo.com/76979871' })).toBe(
      'https://player.vimeo.com/video/76979871?autoplay=1',
    );
  });
  it('returns null for local films and unparseable urls', () => {
    expect(embedSrc({ type: 'local', src: 'film.mp4' })).toBeNull();
    expect(embedSrc({ type: 'youtube', src: 'https://example.com/x' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement embeds.ts**

Run: `npx vitest run tests/embeds.test.ts` → FAIL. Then `src/lib/embeds.ts`:

```ts
import type { FilmRef } from './content';

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/);
  return m ? m[1] : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  return m ? m[1] : null;
}

export function embedSrc(film: FilmRef): string | null {
  if (film.type === 'youtube') {
    const id = youtubeId(film.src);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
  }
  if (film.type === 'vimeo') {
    const id = vimeoId(film.src);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  return null;
}
```

Run: `npx vitest run tests/embeds.test.ts` → PASS.

- [ ] **Step 3: Write project.css**

`src/styles/project.css`:

```css
.project-main { padding-bottom: 96px; }

.p-hero { position: relative; height: 78vh; overflow: hidden; background: #000; }
.p-hero video, .p-hero #p-hero-veil {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
}
#p-hero-veil { image-rendering: pixelated; z-index: 1; }
.p-hero::after {
  content: ''; position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(transparent 55%, rgba(6, 6, 6, 0.92));
}
.p-title {
  position: absolute; left: 28px; bottom: 18px; z-index: 2;
  font-family: var(--f-serif); font-weight: 800; font-size: var(--t-3xl);
  line-height: 0.9; text-transform: uppercase; color: var(--bone);
  text-shadow: 0 4px 40px rgba(0, 0, 0, 0.85);
}

.p-meta {
  display: flex; gap: 18px; flex-wrap: wrap; padding: 18px 28px;
  color: var(--accent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
.p-synopsis { padding: 42px 28px; max-width: 62ch; }
.p-watch { padding: 0 28px 28px; }
.p-player { margin-top: 18px; }
.p-player iframe, .p-player video {
  width: min(100%, 1080px); aspect-ratio: 16 / 9; border: 0; background: #000;
  outline: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}

.p-stills {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px; padding: 28px;
}
.p-still { position: relative; margin: 0; border: 1px solid transparent; }
.p-still:hover { border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.p-still img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.p-still canvas {
  position: absolute; inset: 0; width: 100%; height: 100%;
  image-rendering: pixelated; transition: opacity 0.7s;
}
.p-still.revealed canvas { opacity: 0; }

.p-credits { padding: 28px; max-width: 640px; }
.p-credits table { width: 100%; border-collapse: collapse; }
.p-credits td { padding: 8px 0; border-bottom: 1px solid rgba(237, 237, 230, 0.1); }
.p-credits td:first-child {
  width: 40%; font-family: var(--f-micro); font-size: var(--t-2xs);
  text-transform: uppercase; letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--bone) 55%, transparent);
}

.p-pager { display: flex; justify-content: space-between; gap: 14px; padding: 42px 28px; flex-wrap: wrap; }

.lightbox { border: 1px solid var(--accent); background: var(--void); padding: 12px; }
.lightbox::backdrop { background: rgba(6, 6, 6, 0.92); }
.lightbox img { max-width: 86vw; max-height: 80vh; }
.lightbox button { margin-top: 10px; }

.p-notfound { min-height: 70vh; display: grid; place-content: center; justify-items: start; gap: 16px; padding: 28px; }
```

- [ ] **Step 4: Implement project.ts**

Replace `src/pages/project.ts` entirely:

```ts
import { getSlugFromSearch, loadProjects, Project, projectAssetUrl } from '../lib/content';
import { ditherImageToCanvas } from '../lib/dither';
import { embedSrc } from '../lib/embeds';
import { scrambleEl } from '../lib/scramble';
import { startPage } from '../shell/page';
import '../styles/project.css';

startPage(
  'project',
  async () => {
    const projects = await loadProjects();
    const slug = getSlugFromSearch(location.search);
    const idx = projects.findIndex((p) => p.slug === slug);
    if (idx < 0) {
      renderNotFound();
      return;
    }
    render(projects[idx], projects, idx);
  },
  [{ label: 'LOAD PROJECT INDEX', run: () => loadProjects() }],
);

function renderNotFound(): void {
  document.title = 'SIGNAL LOST — REVACHOL';
  document.getElementById('app')!.innerHTML = `
    <div class="p-notfound">
      <h1 class="statement">SIGNAL LOST</h1>
      <p class="micro">PROJECT NOT FOUND IN THE INDEX</p>
      <p><a class="btn" href="/works.html" data-internal>BACK TO THE FLOOR ▸</a></p>
    </div>`;
}

function render(p: Project, all: Project[], idx: number): void {
  document.title = `${p.title.toUpperCase()} — REVACHOL`;
  document.documentElement.style.setProperty('--accent', p.accent);

  const hero = document.getElementById('p-hero-video') as HTMLVideoElement;
  hero.src = projectAssetUrl(p.slug, 'preview.mp4');
  hero.addEventListener('error', () => hero.remove());
  void hero.play().catch(() => {});

  const veil = document.getElementById('p-hero-veil') as HTMLCanvasElement;
  const posterImg = new Image();
  posterImg.onload = () => {
    const d = ditherImageToCanvas(posterImg, posterImg.naturalWidth, posterImg.naturalHeight, 320, '#060606', p.accent);
    veil.width = d.width;
    veil.height = d.height;
    veil.getContext('2d')?.drawImage(d, 0, 0);
    setTimeout(() => {
      veil.style.transition = 'opacity 1.1s';
      veil.style.opacity = '0';
    }, 350);
  };
  posterImg.onerror = () => veil.remove();
  posterImg.src = projectAssetUrl(p.slug, 'poster.jpg');

  void scrambleEl(document.getElementById('p-title')!, p.title.toUpperCase(), 650);

  document.getElementById('p-meta')!.innerHTML = [String(p.year), p.role, p.runtime, ...p.tags]
    .filter(Boolean)
    .map((t) => `<span>${t.toUpperCase()}</span>`)
    .join('');

  document.getElementById('p-synopsis')!.textContent = p.synopsis;

  const watch = document.getElementById('p-watch-btn') as HTMLButtonElement;
  const player = document.getElementById('p-player') as HTMLDivElement;
  if (p.film) {
    watch.hidden = false;
    watch.dataset.cursor = 'PLAY ▸';
    watch.addEventListener('click', () => {
      watch.hidden = true;
      player.hidden = false;
      if (p.film!.type === 'local') {
        const v = document.createElement('video');
        v.controls = true;
        v.src = projectAssetUrl(p.slug, p.film!.src);
        player.append(v);
        void v.play().catch(() => {});
      } else {
        const src = embedSrc(p.film!);
        if (src) {
          const f = document.createElement('iframe');
          f.src = src;
          f.allow = 'autoplay; fullscreen; picture-in-picture';
          f.allowFullscreen = true;
          player.append(f);
        }
      }
    });
  }

  const stills = document.getElementById('p-stills')!;
  const lightbox = document.getElementById('lightbox') as HTMLDialogElement;
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  document.getElementById('lightbox-close')!.addEventListener('click', () => lightbox.close());
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.25 },
  );
  for (const s of p.stills) {
    const wrap = document.createElement('figure');
    wrap.className = 'p-still';
    wrap.dataset.cursor = 'VIEW +';
    const im = new Image();
    im.loading = 'lazy';
    im.alt = `${p.title} — still`;
    im.src = projectAssetUrl(p.slug, `stills/${s}`);
    const veilC = document.createElement('canvas');
    im.addEventListener('load', () => {
      const d = ditherImageToCanvas(im, im.naturalWidth, im.naturalHeight, 200, '#060606', p.accent);
      veilC.width = d.width;
      veilC.height = d.height;
      veilC.getContext('2d')?.drawImage(d, 0, 0);
    });
    im.addEventListener('error', () => wrap.remove());
    wrap.append(im, veilC);
    wrap.addEventListener('click', () => {
      lightboxImg.src = im.src;
      lightbox.showModal();
    });
    stills.append(wrap);
    io.observe(wrap);
  }

  if (p.credits.length) {
    document.getElementById('p-credits')!.innerHTML =
      `<table>${p.credits.map((c) => `<tr><td>${c.role}</td><td>${c.name}</td></tr>`).join('')}</table>`;
  }

  const prev = all[(idx - 1 + all.length) % all.length];
  const next = all[(idx + 1) % all.length];
  document.getElementById('p-pager')!.innerHTML = `
    <a class="btn" href="/project.html?p=${prev.slug}" data-internal>◂ ${prev.title.toUpperCase()}</a>
    <a class="btn" href="/project.html?p=${next.slug}" data-internal>${next.title.toUpperCase()} ▸</a>`;
}
```

- [ ] **Step 5: Browser verification**

`npm run check` + `npm test` clean, then:
1. `/project.html?p=neon-dream`: hero loop resolves out of an acid-green dither veil; `NEON DREAM` in huge Bodoni scrambles in; every accent on the page is the project's green; meta strip, synopsis, credits, pager all populated; `WATCH FILM ▸` reveals a Vimeo iframe only after click.
2. `/project.html?p=red-telemetry` (youtube embed) and `/project.html?p=saline-throne` (local `<video controls>`): both players work; `static-hymn` (film: null): no WATCH button at all.
3. Accent flood check: `tender-machines` page reads bone-white, `static-hymn` reads pink — template identical.
4. Stills resolve from dither as you scroll; click opens the lightbox; Esc and CLOSE both dismiss.
5. Prev/next cycle with the wipe; `/project.html?p=does-not-exist` shows `SIGNAL LOST` + working return link.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: project detail page with accent skin, players, dither gallery"
```

---

### Task 17: Calm mode, mobile, keyboard, performance — full audit pass

**Files:**
- Modify: whichever files the audit flags (each fix is small; keep to the contracts above)

This task is the acceptance sweep of spec §§3.3, 4.5, 8, 9. Work through the checklist; fix failures on the spot; re-run the failing check.

- [ ] **Step 1: Reduced-motion audit** (DevTools → Rendering → `prefers-reduced-motion: reduce`, hard reload each page)

Expected on every page: no scramble (instant text), no glitch-wipe (fade), static grain, native cursor restored, no rain, no inertia (drag still works, direct), boot ≤ 250 ms + skippable, hover/enter states switch near-instantly. Fix any effect that still animates.

- [ ] **Step 2: Mobile audit** (device emulation, e.g. iPhone-class viewport, touch)

Expected: touch-drag pans; first tap magnifies with montage + label; empty-floor tap releases; second tap enters; ≤ 4 playing videos (`[...document.querySelectorAll('video')].filter(v => !v.paused).length`); no custom cursor; nav/HUD don't overlap the label (adjust `#tile-label` max-width/position if they do); project page fully usable; `app.renderer.resolution` ≤ 1.5.

- [ ] **Step 3: Keyboard + a11y audit** (desktop, no mouse)

Expected: Tab reaches nav → sound toggle → hidden project list (camera glides per focus) → Enter opens project; arrows pan the floor; on the project page Tab reaches WATCH/stills/pager, lightbox closes with Esc; every focused element shows the accent outline; `#sr-projects` links are real hrefs (view-source check).

- [ ] **Step 4: Performance audit** (desktop)

In the works console, sample FPS for 10 s while panning continuously:

```js
let n = 0; const t0 = performance.now();
const id = setInterval(() => { n++; }, 0); // noop keepalive
const raf = () => { n++; requestAnimationFrame(raf); }; raf();
setTimeout(() => { clearInterval(id); console.log('fps ≈', Math.round((n * 1000) / (performance.now() - t0))); }, 10000);
```

Expected ≥ 50 on a mid-range desktop. Also: `app.renderer.resolution` ≤ 2; network tab shows no `hover.mp4` fetched before first hover; total font transfer < 300 KB. If FPS is short, first suspects in order: grain interval (raise to 160 ms), rain tick (raise to 140 ms), debris grid extent (shrink by 1 ring).

- [ ] **Step 5: Content-contract drill (the customization promise)**

With the dev server running: change a title in `public/content/projects.json` → refresh only → new title on floor label + detail page. Replace one `preview.mp4` with any other mp4 → refresh → new loop plays. Then `npm run build`, edit `dist/content/projects.json` directly, `npm run preview` → change visible — proving deployed-content swaps need no rebuild.

- [ ] **Step 6: Commit the audit fixes**

```bash
git add -A
git commit -m "fix: calm-mode, mobile, keyboard and performance audit pass"
```

---

### Task 18: Docs, helper script, deploy walkthrough, final verification

**Files:**
- Create: `HOW-TO-EDIT.md`, `scripts/make-preview.ps1`
- Modify: `README.md`

- [ ] **Step 1: Write make-preview.ps1**

```powershell
# Turns one master video into the site's per-project media set.
# Usage: powershell -File scripts/make-preview.ps1 -In "D:\path\master.mov" -Slug my-film
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Slug,
  [string]$ContentDir = (Join-Path $PSScriptRoot "..\public\content\projects")
)
$ErrorActionPreference = "Stop"
try { ffmpeg -version | Out-Null } catch {
  Write-Error "ffmpeg not found on PATH. Install it (winget install Gyan.FFmpeg) and retry."
  exit 1
}
$dir = Join-Path $ContentDir $Slug
New-Item -ItemType Directory -Force (Join-Path $dir "stills") | Out-Null
ffmpeg -y -loglevel error -ss 1 -i $In -frames:v 1 -vf "scale=1280:-2" -update 1 (Join-Path $dir "poster.jpg")
ffmpeg -y -loglevel error -ss 1 -i $In -t 4 -vf "scale=640:-2" -an -r 24 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p (Join-Path $dir "preview.mp4")
ffmpeg -y -loglevel error -ss 1 -i $In -t 10 -vf "scale=960:-2" -an -r 24 -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p (Join-Path $dir "hover.mp4")
Write-Host "done -> $dir"
Write-Host "Now add the project entry to public\content\projects.json (see HOW-TO-EDIT.md)."
```

- [ ] **Step 2: Write HOW-TO-EDIT.md**

```markdown
# HOW TO EDIT YOUR SITE (no coding needed)

Everything you will ever touch lives in ONE folder: `public/content/`.
You never need to rebuild the site for content changes — edit, save, refresh.

## The map

    public/content/
      site.json         your name, menu labels, socials, email
      projects.json     the list of your films (order = order on the floor)
      projects/
        <slug>/         one folder per film
          poster.jpg    a still frame, 1280px wide (required)
          preview.mp4   3–5 s loop, 640px wide, silent (required)
          hover.mp4     8–15 s montage, 960px wide, silent (optional)
          film.mp4      the full film, only if you self-host it (optional)
          stills/       gallery images (each one listed in projects.json)

## Add a new film (5 steps)

1. Pick a slug: lowercase letters, digits, hyphens. Example: `midnight-run`.
2. Make the media. Easiest way — one command from any master file:
   `powershell -File scripts/make-preview.ps1 -In "D:\path\master.mov" -Slug midnight-run`
   (Or export by hand using the recipes below.) Drop gallery stills into
   `projects/midnight-run/stills/` as `01.jpg`, `02.jpg`, …
3. Open `projects.json` and copy an existing entry. Change every field.
   List your stills by file name: `"stills": ["01.jpg", "02.jpg"]`.
4. Save. Refresh the site. The new tile is on the floor.
5. If the site boots into **CONTENT ERROR**, read the message — it names the
   file, the project and the field that's wrong. Fix, save, refresh.

## Every field in projects.json

| Field | What it is | Example |
|---|---|---|
| slug | folder name, lowercase-with-hyphens | `"neon-dream"` |
| title | film title as shown | `"Neon Dream"` |
| year | number, no quotes | `2026` |
| role | your role line | `"Director / DoP"` |
| runtime | free text | `"12:40"` |
| tags | list of words | `["short film","sci-fi"]` |
| accent | this film's color, hex | `"#C8FF00"` |
| tileSize | `"normal"` or `"large"` (large = double tile) | `"large"` |
| synopsis | one short paragraph | |
| credits | list of `{ "role": …, "name": … }` | |
| film | where the full film lives — see below | |
| stills | gallery file names, in order | `["01.jpg","02.jpg"]` |
| position | leave out (auto layout) or pin: `{ "col": 4, "row": 0 }` | |

**film** is one of:
- `{ "type": "vimeo", "src": "https://vimeo.com/123456789" }`
- `{ "type": "youtube", "src": "https://youtu.be/XXXXXXXXXXX" }`
- `{ "type": "local", "src": "film.mp4" }` — put `film.mp4` in the folder
- `null` — no WATCH button (trailer-only project)

## Export recipes (if you don't use the script)

- **poster.jpg** — 1280×720 JPEG, quality ~80.
- **preview.mp4** — 3–5 s, 640px wide, H.264, no audio, ~24fps, target ≤ 2 MB.
  Premiere/Resolve: H.264, width 640, "match source" height, no audio track.
- **hover.mp4** — 8–15 s montage of your best moments, 960px wide, ≤ 6 MB.
- **film.mp4** — only for self-hosting; 1080p H.264 is fine. Big files =
  slow page for visitors; Vimeo/YouTube links are lighter.

## Change / reorder / remove

- **Swap media:** overwrite the file with the same name. Refresh. Done.
- **Reorder the floor:** reorder the entries in `projects.json`.
- **Feature a film:** set its `tileSize` to `"large"`.
- **Remove a film:** delete its entry from `projects.json` (the folder can stay).

## Site text and menu

`site.json`: `name` (the wordmark), `tagline`, `email` (contact page),
`nav` labels, `socials`. Same rule — edit, save, refresh.

## Publishing

Build once per CODE change (not content): `npm run build` → upload the `dist/`
folder to any static host (Netlify Drop: drag the folder into the browser).
To update content on an already-published site, replace files inside the
host's `content/` folder (or re-upload `dist/`) — no rebuild needed.
```

- [ ] **Step 3: Finalize README.md**

```markdown
# REVACHOL — portfolio site

Cyberpunk / glitch / dither portfolio for a cinematic filmmaker. WebGL isometric
"floor" of films (PixiJS), DOM detail pages, runtime-JSON content.

## Commands

- `npm run dev` — dev server
- `npm run build` — static site into `dist/`
- `npm run preview` — serve the built site
- `npm test` / `npm run check` — vitest + typescript

## Editing content (no rebuild)

All media and text live in `public/content/` — see **HOW-TO-EDIT.md**.
`scripts/make-preview.ps1` turns a master file into poster/preview/hover.

## Structure

- `src/lib` — pure logic + services (content, dither, scramble, sound, embeds)
- `src/shell` — chrome shared by all pages (boot, nav, HUD, cursor, grain)
- `src/works` — the isometric world (layout, tiles, playback, input, world)
- `src/pages` — one entry per HTML page
- `docs/superpowers/` — design spec and implementation plan

## Deploy

`npm run build`, then drop `dist/` on Netlify/Vercel/any static host.
Post-deploy content swaps: replace files under the host's `content/` directory.
```

- [ ] **Step 4: Final verification sweep**

Run: `npm test` (all suites), `npm run check`, `npm run build` — all clean.
Full journey in the browser (fresh session): boot → home → works → drag → hover → enter burst → project page → watch film → stills lightbox → pager → back to floor → about → contact. Then the make-preview drill: run `make-preview.ps1` against any local video into slug `smoke-test`, add a minimal JSON entry, refresh, see the new tile, then remove the entry + folder.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: how-to-edit guide, media helper script, final readme"
```

---

## Post-plan notes for the executor

- **Version drift:** pixi.js/pixi-filters/GSAP APIs are used per their v8/v6/v3 documented shapes. If an installed minor version renames an option, prefer property assignment after construction (noted inline in Task 15) and keep the exported contracts unchanged.
- **Tuning:** constants marked TUNE (`GX`, `GY`, `ISO`, grain/rain cadence) may be adjusted during browser verification for visual quality; contracts and tests must stay green.
- **Never modify** the font originals in `D:\WORK\PROJECT\JOB\AI\WEBSITE_AI\FONT` or bake content into the JS bundle — runtime fetch is the product promise.



