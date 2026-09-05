# About Hanoi Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break the uniform grid into cyberpunk Hanoi: lanes through the lots, superblocks, tube houses, wire spaghetti, motorbikes on the kerbs — with the ground laid street by street so a street may lie anywhere.

**Architecture:** The renderer stops painting streets into the ground tile and lays every road as a strip with junctions drawn from the traffic graph (`city3d.ts`). The plan cuts lots with lanes, chooses superblocks, partitions tube houses, places poles, wires and motorbikes (`city-plan.ts`). The traffic drives lanes as unlit priority streets (`city-traffic.ts`); the walkers walk their slivers (`city-people.ts`).

**Tech Stack:** Vite 7, TypeScript strict, three.js 0.185, vitest 3.

## Global Constraints

- No real text on any sign; calm mode stills idle motion; about-old.html untouched; no plates behind chrome.
- Gates before every commit: `npx tsc --noEmit; echo "tsc exit=$?"`, `npx vitest run`, `npx vite build`.
- The flow test's health metric (worst stopped fraction over 40 000 frames) stays under 0.5; no meeting in a box; the flight forces no leg.

---

### Task 1: The ground is laid — commit `feat(about): the ground is laid, not tiled`
- [x] `groundTextures` paints the lots' stone alone; `roadStrip` gains kerb stones, slab joints, a manhole and drains.
- [x] `layStrips`: every road and lane merged by axis into one mesh, trimmed where it ends in another's carriageway, cut at the canal and (lanes) at the roads they cross; polygon offsets by kind so nothing fights.
- [x] Junctions from the traffic graph: boxes per street with arm-aware extents, zebras and stop lines where every street is a road, give-way lines at lane mouths; zebras and lines glow as the paint does.
- [x] `StreetKind` gains `'lane'`; `carriagewayAt` knows its carriageway (`LANE_CAR`).
- [x] Gates green; pane: crossings, T's, the canal bridge, the aerial.

### Task 2: Cyberpunk Hanoi — commit `feat(about): cyberpunk Hanoi — lanes, superblocks, tube houses, wires, motorbikes`
- [x] Plan: six superblocks (`merged` value `'4'`, `plan.superblocks`), lanes (`lane`, `branch`, `laneCut`, gates), tube rows (`tubeCells`, `tubeHouse`), furniture hung after every lane of the lot stands (`dressLane`), utility poles and wire bundles along the roads, motorbike rows at the kerb line in a second pass over the roads, `poles` in the Plan.
- [x] Traffic: lanes in the graph, `OFFSETS.lane`, `SPEED.lane`, never lit (a real crossing sharing a mouth's node stays lit), motorbike-heavy mix, buses and trucks keep out (choose and detour), no turn across the oncoming into a lane, lane exits weighted with the flow, the T rule off lane mouths, no box to keep clear at a mouth, the turner hold only for the carriageway it cuts, lane crossings yield (`acrossRoad`, `minorLane`), near-side turns land on the kerb lane.
- [x] People: lanes walkable, band on the sliver, doors on lanes; a walker put down inside a solid moves elsewhere along the run.
- [x] Renderer: poles instanced.
- [x] Flight: looks a street either side for a longer open run before a dive when the nearest is short; climbs straight ahead when hemmed in instead of forcing a leg.
- [x] Tests: lanes, superblocks, tube houses, poles, wires, motorbikes; lane traffic; lane walkers; the road-clear test covers lanes; kiosks, footbridge stairs, gantry posts and portal legs keep out of lane mouths.
- [x] Pane: the aerial retaken, a superblock from above, a lane at street level and from its mouth, a road with its poles.

### Task 3: Docs, memory, deploy
- [x] Spec as-built notes; memory entry.
- [ ] Push; `gh run watch`.
