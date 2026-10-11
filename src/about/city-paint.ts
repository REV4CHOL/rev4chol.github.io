/** THE FLOOR, PAINTED IN TURN (owner: "traffic lanes and road around the entire city are still flickering"; 2026-10-11:
 *  "streets are glitching when I fly my camera"). The floor's paints lie millimetres apart — the strips, the lanes, the
 *  boulevard and the arterial, the junctions' boxes, the stop lines — and past a few hundred metres no depth buffer
 *  tells millimetres apart. A ladder of polygon-offset rungs did not part them either: measured in a 24-bit depth
 *  buffer, two long strips with the same slope factor traded places pixel by pixel as the eye moved, the wrong one
 *  showing through a tenth to a half of their overlap even eight units apart (a strip's triangle is hundreds of units
 *  long, and its depth slope rounds differently from its neighbour's). And the rungs pulled the paint in front of
 *  what stands on it: a junction's box swallowed most of a distant car.
 *
 *  So the floor is painted as a sign-writer paints a road. The floor itself — the ground, the quay walls' coping, the
 *  canal bridges' decks, the arterial's bridge — is drawn first and writes the depth, the ground pushed behind it a
 *  slope and six units. Every paint is drawn after it, in the order below: it tests against the floor's depth, a slope
 *  and two units in front, but writes none, so the later paint covers the earlier wherever both lie. No two paints
 *  can fight, and whatever stands on the floor — a car in a junction — is drawn after the paint and covers it. The
 *  zebras and the lights lying on the ground are see-through, drawn after everything solid, with the same pull. */
export const PAINT = {
  ground: 6, // the ground's units (factor +1): the floor's depth, pushed behind every paint
  pull: -2, //  every paint's units (factor −1): in front of the floor's depth at every distance
  /** The draw order (Object3D.renderOrder): the floor first, then each paint over those before it, then everything
   *  else (order 0). */
  order: {
    floor: -30, //     the ground, the quay walls, the canal bridges' decks, the arterial's bridge: they write the depth
    patch: -29, //     the lots' stone over closed street bands
    roadX: -28, //     the grid roads' strips, east–west
    roadZ: -27, //     …north–south, over them where the axes cross
    laneX: -26, //     the lanes' strips, over the roads' pavements at their mouths
    laneZ: -25, //     …and over each other where two lanes cross
    boulevard: -24, // the diagonal's carriageway, and the arterial's strip (they never meet)
    slip: -23, //      a slip road at grade, over the arterial's apron
    junction: -22, //  the crossings' asphalt boxes, a turn a street (−22, −21, −20)
    stop: -19, //      the stop lines
  },
} as const;
