/** THE CUB'S RIG: where his body bends (owner, 2026-10-20: "Be sure to give the bear idle animations").
 *
 *  His body is one mesh, carved from the owner's four photographs (scripts/bear/build.py), in the photographs' own
 *  units: about 1 tall, x his left, y up, z forward, the turntable's axis at the origin. Nine bones bend it, each
 *  vertex bound to the four that pull it hardest, blended softly so a joint stretches like stuffing, never creases:
 *  - the root keeps his seat on the floor; the body sways and breathes above it;
 *  - the head turns at the neck (the mesh's narrowest girth, 0.62 up); the ears flick at their roots;
 *  - the arms swing at the shoulders; the feet wiggle at the ankles, planted with the root.
 *  The pivots and regions were read off the carved mesh. Pure: no three.js, so the tests can hold each region to his
 *  shape. */

export type Vec3 = [number, number, number];

export interface Bone { name: BoneName; parent: number; at: Vec3 }
export type BoneName = 'root' | 'body' | 'head' | 'earL' | 'earR' | 'armL' | 'armR' | 'footL' | 'footR';

export const BONES: Bone[] = [
  { name: 'root', parent: -1, at: [0, 0, 0] },
  { name: 'body', parent: 0, at: [0.01, 0.07, -0.04] },
  { name: 'head', parent: 1, at: [0.01, 0.615, -0.03] },
  { name: 'earL', parent: 2, at: [0.145, 0.865, -0.06] },
  { name: 'earR', parent: 2, at: [-0.14, 0.865, -0.05] },
  { name: 'armL', parent: 1, at: [0.135, 0.545, -0.045] },
  { name: 'armR', parent: 1, at: [-0.13, 0.545, -0.05] },
  { name: 'footL', parent: 0, at: [0.12, 0.1, 0.06] },
  { name: 'footR', parent: 0, at: [-0.11, 0.1, 0.06] },
];
export const BONE = Object.fromEntries(BONES.map((b, i) => [b.name, i])) as Record<BoneName, number>;

/** Each arm's reach: from the shoulder to just inside the paw's tip (the mesh's farthest points at arm height). */
const ARM: [Vec3, Vec3][] = [[[0.135, 0.545, -0.045], [0.31, 0.47, 0.0]], [[-0.13, 0.545, -0.05], [-0.28, 0.5, -0.04]]];
const ARM_R = 0.095;

export const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** How near a point lies to an arm's axis: 1 well inside it, 0 well outside, and only out past the shoulder. */
function armReach(p: Vec3, [a, b]: [Vec3, Vec3]): number {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L2));
  const d = Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
  const along = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L2;
  return (1 - smooth(ARM_R, ARM_R + 0.035, d)) * smooth(0.05, 0.3, along);
}

/** The pull of every bone on a point of his rest pose (they sum to 1). */
export function pulls(p: Vec3): number[] {
  const [x, y, z] = p;
  const w = new Array<number>(BONES.length).fill(0);
  // the feet: forward and low, one either side; planted with the root
  const fwd = smooth(0.06, 0.13, z) * (1 - smooth(0.27, 0.34, y));
  w[BONE.footL] = fwd * smooth(-0.01, 0.05, x);
  w[BONE.footR] = fwd * smooth(-0.01, 0.05, -x);
  const rest = Math.max(0, 1 - w[BONE.footL] - w[BONE.footR]);
  // the seat stays on the floor; above it the body sways
  const planted = 1 - smooth(0.06, 0.2, y);
  w[BONE.root] = rest * planted;
  const upper = rest * (1 - planted);
  // the head, over the neck; the ears at its top corners
  const head = smooth(0.595, 0.645, y);
  const ears = smooth(0.835, 0.885, y);
  const earL = head * ears * smooth(0.105, 0.16, x), earR = head * ears * smooth(0.105, 0.16, -x);
  // the arms, out from the shoulders (never the head)
  const armL = (1 - head) * armReach(p, ARM[0]) * smooth(0.12, 0.18, x);
  const armR = (1 - head) * armReach(p, ARM[1]) * smooth(0.12, 0.18, -x);
  w[BONE.head] = upper * (head - earL - earR);
  w[BONE.earL] = upper * earL;
  w[BONE.earR] = upper * earR;
  w[BONE.armL] = upper * armL;
  w[BONE.armR] = upper * armR;
  w[BONE.body] = upper * Math.max(0, 1 - head - armL - armR);
  return w;
}

/** The four strongest pulls on each vertex, normalised: three.js's skinIndex and skinWeight. */
export function skin(positions: ArrayLike<number>): { index: Uint16Array; weight: Float32Array } {
  const n = positions.length / 3;
  const index = new Uint16Array(n * 4), weight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const w = pulls([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]);
    const top = w.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]).slice(0, 4);
    const sum = top.reduce((s, [v]) => s + v, 0) || 1;
    top.forEach(([v, k], j) => { index[i * 4 + j] = k; weight[i * 4 + j] = v / sum; });
  }
  return { index, weight };
}

/** Balls that cover him, for telling when the pointer is on him: each bone's own vertices (those it pulls hardest),
 *  cut into slices along their longest extent, each slice a ball round its middle. Bone-local positions. */
export function proxies(positions: ArrayLike<number>, idx: Uint16Array, wt: Float32Array): { bone: number; c: Vec3; r: number }[] {
  const n = positions.length / 3;
  const SLICES: Record<BoneName, number> = { root: 3, body: 4, head: 3, earL: 1, earR: 1, armL: 2, armR: 2, footL: 2, footR: 2 };
  const out: { bone: number; c: Vec3; r: number }[] = [];
  BONES.forEach((bone, b) => {
    const pts: Vec3[] = [];
    for (let i = 0; i < n; i++) if (idx[i * 4] === b && wt[i * 4] > 0.5) pts.push([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]);
    if (pts.length < 8) return;
    const lo = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k]))), hi = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])));
    const axis = [0, 1, 2].reduce((a, k) => (hi[k] - lo[k] > hi[a] - lo[a] ? k : a), 0);
    const k = SLICES[bone.name];
    for (let s = 0; s < k; s++) {
      const a0 = lo[axis] + ((hi[axis] - lo[axis]) * s) / k, a1 = lo[axis] + ((hi[axis] - lo[axis]) * (s + 1)) / k;
      const slice = pts.filter((p) => p[axis] >= a0 && p[axis] <= a1);
      if (slice.length < 4) continue;
      const c: Vec3 = [0, 1, 2].map((j) => slice.reduce((t, p) => t + p[j], 0) / slice.length) as Vec3;
      const d = slice.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])).sort((u, v) => u - v);
      const r = d[Math.floor(d.length * 0.9)];
      out.push({ bone: b, c: [c[0] - bone.at[0], c[1] - bone.at[1], c[2] - bone.at[2]], r });
    }
  });
  return out;
}
