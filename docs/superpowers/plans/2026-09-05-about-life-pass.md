# About Life Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the owner's twenty-item list: honest furniture, people who respect vehicles and walls, stations with access, a living plaza and boulevard, varied canal infrastructure, a less uniform city, no shimmer, a zen auto camera.

**Architecture:** Plan-side generation in `city-plan.ts` (doors, perches, party zones, towers, entrances, market streets, conduits, bridge kinds, the plaza), behaviour in `city-people.ts` and `city-traffic.ts` (grid collision, crossing hooks), rendering in `city3d.ts`, page glue in `about.ts`/`about.css`/`index.html`.

**Tech Stack:** Vite 7, TypeScript strict, three.js 0.185, vitest 3.

## Global Constraints

- No real text on any sign; calm mode stills idle motion; about-old.html untouched; no plates behind chrome.
- Gates before every commit: `npx tsc --noEmit`, `npx vitest run`, `npx vite build`.

---

### Task A: Quick fixes — commit `fix(site): the homepage phrase, motorcycles, night by default, the mobile pad`
- [x] index.html CTA row removed; weave 0; default 'night'; pad right / lift left / x negated.

### Task B: Furniture audit and six-way boxes — commit `fix(about): nothing stands in a carriageway; six-way crossings drawn as one box`
- [x] Plan post-pass over posts/kiosks/stalls/trees vs every carriageway; deck lamps to the parapets; test.
- [x] Renderer: box polygons with zebras and stop lines at the boulevard's crossings.

### Task C: People and vehicles — commit `feat(about): walkers who wait, vehicles who yield, doors, no one under the bridges`
- [x] Grid collision for walkers; street kit in the grid; crossing waits with `roadClear`; `walkersIn` hook in traffic; quay water side closed; bridges 14 wide; doors from shopfronts. Tests.
- [x] Deploy.

### Task D: Stations — commit `feat(about): stair and lift towers at the stations, eight underground entrances`
- [x] Plan towers/entrances (+ doors); renderer (lift cabs ride); tests.

### Task E: Life and variety — commits per subject (plaza and stallion; parties and perches; canal kinds; chaos)
- [x] Plaza + stallion + festival; party zones with y; perches; bridge kinds + quay stairs + moored boats; market streets + conduits + merges + spikes.

### Task F: Shimmer — commit `fix(about): shadow texel snapping, mipmapped pixel textures`
### Task G: Zen camera — commit `feat(about): a zen auto camera`
### Task H: Docs, memory, deploy.
