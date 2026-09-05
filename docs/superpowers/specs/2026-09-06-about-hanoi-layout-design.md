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

## As built (2026-09-06)

- **The ground** (commit `feat(about): the ground is laid, not tiled`): the tile is the lots' stone alone. Roads and
  lanes are laid as strips merged by axis (one mesh each), trimmed where a street ends in another's carriageway, cut at
  the canal (the bridges' decks carry their own paint) and, for lanes, at the roads they cross. Kinds sit a hair apart
  in height and in front of one another by polygon offset (roads 0/1, lanes 2/3, the boulevard 4, the arterial 5,
  junction boxes 6, zebras 8, stop lines 9): the depth buffer cannot tell 0.004 apart at three hundred units. Junction
  boxes reach `rowOf(other) + 1.5` along an arm and only the crossing square where the street ends; zebras and stop
  lines at every node where every street is a road (parity with the old tile), a give-way line at a lane's mouth, no
  box on a road at a lane's mouth (the road runs through unbroken). The zebras and lines glow as the strips' paint does
  (Lambert with the emissive twin, tended with the ground), not as bare white — four of them at every crossing bloomed
  to a white square from the air.
- **Lanes**: 60 in the plan (a lot's odds by district: old and mid 0.65, strip 0.5, else 0.25; a merged pair 0.85; a
  superblock always), never within `ARTERIAL_ROW + reach + 24` of the arterial's axis nor `6 + reach + 12` of the
  boulevard's (so the street a lane reaches is really open), never where the avenues' footbridge stairs or gantry posts
  stand at a block centre beside the avenue roads (`avenueKit` for lots and pairs; superblocks are not chosen there). A
  lane runs from bounding street axis to axis; an end is BLIND (three inside the lot, a gate wall two past the end, where
  the turn-about loop swings) when the bounding segment is closed, when something stands in the mouth, or — half the
  ordinary lots — by choice. A lane parallel to a swallowed street's axis (a superblock's, a pair's when it runs across
  the pair) keeps 12–18 off that axis: at half a unit its mouth merged into the crossing where the swallowed street ends
  (and a lane's presence must never unlight a real crossing — the light rule counts the streets that are not lanes). A
  blind BRANCH leaves a lane into a part at least 12 deep (merged pairs, superblocks): 8 of them. Six superblocks
  (`plan.superblocks`, chosen ≥ 80 past the arterial's row and 50 off the boulevard so their lanes are allowed), each
  with a lane along each axis crossing inside. 24 gates.
- **Tube houses**: 488 cells 3.5–5.5 wide along the lanes' faces (a row 8–12 deep where the part is deeper than 13, the
  back partitioned as the district likes and facing the street), ten to thirty high (a quarter of them ×1.9: slender towers), a tank on legs, a lean-to, a shop
  facing the lane two times in three with a board over it, a neon edge on some, balconies by `finish()`.
- **Wires**: 647 poles (roads: at the building line between the lamps, both sides, `k % 4 === 1` a transformer; lanes:
  one wall, every ten, hung once every lane of the lot stands so none stands in a crossing lane), bundles of three
  pole to pole, a span across the street at every other pair — 3 860 lines in `plan.wires`. Poles are furniture, not
  solids (as the lamp posts are not): a road's pole at the band's edge held sitters inside it and a lane's sliver is
  too narrow to walk round one.
- **Motorbikes**: 497 parked nose to tail on the kerb line (`ROAD/2 + 0.3`, a wheel over the kerb — the walkers' band
  begins at 6), between the lamps, in rows of two to five, where the block beside is old (0.6), strip (0.5), mid
  (0.35); each a solid; none within a lane's mouth (checked along its length) nor the arterial's aprons; placed in a
  second pass once every road stands (a row near a crossing must see the cross street), the crossings measured from the
  street axes themselves (a record a ramp cut does not start on one).
- **Traffic**: lanes in the graph with `OFFSETS.lane [1.4]`, speed 0.6, never lit; motorbikes 62 % of what starts on
  them, cars seldom turn in (exit weight × 0.4, motorbikes × 5), buses and trucks never; no turn ACROSS the oncoming
  into a lane (a car waiting for that gap held its whole lane); out of a lane mostly with the flow (straight across a
  road 0.8, across the oncoming 0.3); the T rule (straight and turning weigh alike) is off at lane mouths; a mouth is no
  box to keep clear for the road; a turner holds only the carriageway it cuts (`turnerCrossing` skips one joining my
  direction); a lane's straight run across a road yields, and where two lanes cross unlit the north–south one yields; a
  near-side turn lands on the KERB lane (landing inboard from a one-lane street swept the kerb lane — the one meeting
  in a box); a bus or a truck never detours into a lane either. Measured over 40 000 frames at 1 500 vehicles: worst
  stopped 0.43 (0.42 before the pass, 0.56 at the first attempt), 116 k hops (104 k before), no meeting.
- **People**: lanes walkable at ×1.2 weight on the sliver (band `w/2 − 0.75 … w/2 − 0.25`), doors on lanes, the
  walkers stop seven before a lane's T (the street's building line) and half a unit before a gate. A walker put down
  inside a solid (the stadium's base sits on the arterial's pavement) moves anywhere else along the run.
- **The flight**: a Hanoi grid is broken up, so before a dive the flight looks a street either side of the nearest for
  a clearly longer open run — only when the nearest is short (a lateral leg is a leg through the towers); hemmed in low,
  every other try past twenty is a climb straight ahead (16 up over 24, the tangent leaving upward) instead of a forced
  leg. Dives 14, orbits 8, no forced leg over three seeds × 24 000 steps (dives had fallen to 2).
- Also: `carriagewayAt` knows lanes (`LANE_CAR`); corner kiosks, portal legs, station cores and the avenue kit keep out
  of lane mouths; rooftop plant odds up (0.45 towers, 0.32 greenhouses) and overbuild odds up (mid and strip 0.6; the tube
  houses took many of the roofs and faces they stood on — 15 spans now, the test asks for 8).
- Not done: walkers on a road do not turn into a lane mid-run (they reach lanes at T's and by placement); the
  superblocks' inner tangle is a cross and one branch, not a maze.
