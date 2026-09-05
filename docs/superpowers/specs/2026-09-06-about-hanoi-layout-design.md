# About page — the Hanoi layout (design)

Owner (2026-09-06, with an aerial of the grid): "The street layout right now are too uniformed. I want it to feel
chaotic, with random infrastructure. We are talking cyberpunk Hanoi, Vietnam here, fusion with cyberpunk Tokyo."

## What the aerial shows

A Manhattan grid at a 38-unit pitch: every block the same square, every street the same width running straight
across the whole city, every crossing the same painted cross. The districts, kit, signs and closures dress it, but
from above the skeleton is a lattice. Two things hold it there: the ground is one painted TILE that repeats the
grid streets every 38 units (so a street can only ever lie on a grid line), and every lot is a 24-square filled
edge to edge.

## The design

Hanoi's old quarter is a tangle: main streets that bend and stop, and between them the ngõ — lanes a few metres
wide that fork, jog and end blind, lined by tube houses three to five metres wide and five storeys tall in
clashing colours, under a spaghetti of power lines, with motorbikes parked in rows along every kerb. Tokyo adds
the elevated lines, the stacked signs and the yokocho alleys. The fusion here:

1. **The ground is laid, not tiled.** The tile paints only the lots' stone. Every street of every kind is laid as
   its own strip (roads 14 wide with pavements, lanes 7, the boulevard 16, the arterial 37), and every junction
   on the ground is drawn from the traffic graph: an asphalt box per street over its reach through the node, a
   zebra at the mouth of every arm of a lit node, a stop line before each lit approach. Streets may now lie
   anywhere.
2. **The grid becomes the main streets, interrupted.** Random merges rise again, and six 2×2 superblocks
   (62 × 62) swallow four blocks and their inner crossing where the four are ordinary.
3. **Lanes (`kind: 'lane'`, width 7, one lane each way at ±1.4, no lights, priority junctions).** Every
   superblock and merged lot, and a third of the ordinary lots in the old and mid districts, is cut by a lane
   through its middle from bounding street to bounding street (a T at each, where the street is open; a blind end
   where it is closed), with a branch into one side that ends blind, and — in superblocks — a second lane across,
   so the inside is a small tangle. Vehicles on lanes are mostly motorbikes. Walkers use them (band 2.6–3.2).
4. **Tube houses.** Lots along lanes, and half the old-quarter and mid lots, are partitioned into strips 3.5–5.5
   wide and 8–13 deep, back to back, each its own facade and height (10–30), balconies on every floor, a tank on
   the roof, a shopfront and its sign below.
5. **Wire chaos.** Poles at the kerb every 12 along every road and lane carry bundles of three to five sagging
   lines pole to pole, a transformer box on every fourth pole, and spans across the street every other pole.
6. **Motorbike rows** parked along the kerbs of roads and lanes in the old, mid and strip districts (solid to the
   walkers, off the carriageway).

## What stays

The avenues, the canal, the arterial and its ramps, the diagonal, the rail loop and stations, the districts, the
features (stadium, wheel, megastructure, temples, industry, markets, favelas), the flight (it dives along grid
streets only; lanes are inside lots and their buildings are solid to it).

## Testing

Plan: lanes > 40 with widths 7, ends on a street axis or blind inside a lot, none inside the diagonal's or the
arterial's right of way; superblocks 6; tube cells > 400 (narrow facades); poles > 500 and wire count up;
parked motorbikes > 150; every lane's carriageway clear of solids; posts off every carriageway including lanes.
Traffic: lane links exist, unlit, motorbikes dominate them, the flow tests hold. People: lane walkers in band.
Pane: the same aerial retaken.
