"""THE CUB, BUILT FROM HIS PHOTOGRAPHS (owner, 2026-10-20: "here's my teddy bear cub design sheet. Make me a giant 3D
teddy bear model exactly on this"; then, of a first cub modelled in code: "my bear look horrible and not like the
[bear] in my photos at all").

So the cub is made from the sheet itself:
  1. the bear cut out of each of its four photographs (front, three-quarter, side, back);
  2. the photographs' cameras fitted so the four agree: a turntable seen by one orthographic camera looking down a
     little, each shot turned by its own yaw;
  3. his body carved from the four outlines (his left-right symmetry rounds off the corners no photograph saw),
     smoothed and simplified into a mesh;
  4. his skin: the four cut-outs packed into one image, the side view's worn patch mended for use mirrored on his
     right side, every backdrop filled with the bear's own edge colours;
  5. which photograph paints each vertex: whether it saw it (a ray to its camera), how squarely, and whether it falls
     inside that photograph's bear. The three-quarter photograph is his primary skin: on the site he sits at its
     angle, so it reproduces exactly; the others fill only what it could not see.

Writes public/content/bear/cub-skin.webp, cub-body.bin and cub-views.json. Run from the repository's root:
    python3 scripts/bear/build.py            (needs numpy, scipy, scikit-image, trimesh, fast-simplification, embreex)
The camera fit takes a minute or two; --cams reuses the last fit (scripts/bear/cams.json).
"""
import json, os, struct, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'content', 'bear')
SHEET = os.path.join(HERE, 'sheet.webp')
# where each photograph sits on the sheet (generous crops; the masks find the bear inside)
CROPS = {'front': (0, 190, 545, 1010), 'threeq': (540, 190, 1065, 1010), 'side': (1040, 180, 1530, 1010), 'back': (1495, 190, 2000, 1010)}
NAMES = ['front', 'threeq', 'side', 'back']
# the views that paint him: (camera, tile, mirrored, primary)
VIEWS = [('front', 'front', False, False), ('threeq', 'threeq', False, True), ('side', 'side', False, False),
         ('back', 'back', False, False), ('side', 'sideclean', True, False), ('threeq', 'threeq', True, False)]
# the worn patch on his left cheek, in the side photograph's crop (mended where the view is used mirrored)
WORN = (199, 253, 30, 40)
SHEET_IMG = None


def sheet():
    global SHEET_IMG
    if SHEET_IMG is None:
        SHEET_IMG = np.asarray(Image.open(SHEET).convert('RGB')).astype(np.float32)
    return SHEET_IMG


# ---------------------------------------------------------------------------------------------- 1. the masks --
def masks():
    out = {}
    for name, (x0, y0, x1, y1) in CROPS.items():
        rgb = sheet()[y0:y1, x0:x1]
        r, b = rgb[..., 0], rgb[..., 2]
        lum = rgb.mean(-1)
        # the bear is warm (cream, tan) and the backdrop a cool grey; the beads and stitches are dark: keep them too
        m = ((r - b) > 13) | (lum < 72)
        m = ndi.binary_opening(m, iterations=1)
        lab, n = ndi.label(m)
        m = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))))
        m = ndi.binary_fill_holes(ndi.binary_closing(ndi.binary_fill_holes(m), iterations=3))
        out[name] = m
    return out


# ------------------------------------------------------------------------------------------ 2. the cameras --
def project(P, psi, phi, s, ox, oy):
    """Model coordinates (x his left, y up, z forward) to a crop's pixels: turned by psi (three.js rotation.y), the
    camera looking down by phi, s px a unit, the turntable's axis at the floor at (ox, oy)."""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    xp = x * np.cos(psi) + z * np.sin(psi)
    zp = -x * np.sin(psi) + z * np.cos(psi)
    return ox + s * xp, oy - s * (y * np.cos(phi) - zp * np.sin(phi))


def grid(N, lo=(-0.46, -0.02, -0.4), hi=(0.46, 1.06, 0.6)):
    xs = np.linspace(lo[0], hi[0], N)
    ys = np.linspace(lo[1], hi[1], int(N * (hi[1] - lo[1]) / (hi[0] - lo[0])))
    zs = np.linspace(lo[2], hi[2], int(N * (hi[2] - lo[2]) / (hi[0] - lo[0])))
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing='ij')
    return np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1), (len(xs), len(ys), len(zs)), (xs, ys, zs)


def carve(P, cams, M, dil, views=NAMES):
    keep = P[:, 1] >= 0
    for n in views:
        m = ndi.binary_dilation(M[n], iterations=dil) if dil else M[n]
        px, py = project(P, *cams[n])
        ix, iy = np.round(px).astype(int), np.round(py).astype(int)
        ok = (ix >= 0) & (iy >= 0) & (ix < m.shape[1]) & (iy < m.shape[0])
        inside = np.zeros(len(P), bool)
        inside[ok] = m[iy[ok], ix[ok]]
        keep &= inside
    return keep


def iou(P, keep, cams, M, n, ds=3):
    m = M[n][::ds, ::ds]
    px, py = project(P[keep], *cams[n])
    img = np.zeros(m.shape, bool)
    ix, iy = np.round(px / ds).astype(int), np.round(py / ds).astype(int)
    ok = (ix >= 0) & (iy >= 0) & (ix < m.shape[1]) & (iy < m.shape[0])
    img[iy[ok], ix[ok]] = True
    img = ndi.binary_fill_holes(ndi.binary_closing(img, iterations=2))
    return (img & m).sum() / max(1, (img | m).sum())


def fit_cameras(M):
    """Coordinate descent on the mean agreement of the carved volume with each outline."""
    P, _, _ = grid(96)

    def head_mid(n):
        ys, xs = np.nonzero(M[n])
        row = ys.min() + int((ys.max() - ys.min()) * 0.2)
        cols = np.nonzero(M[n][row])[0]
        return (cols.min() + cols.max()) / 2

    floor = {n: np.nonzero(M[n])[0].max() for n in NAMES}
    s0, phi0 = 690.0, 0.08
    cams = {'front': [0.0, phi0, s0, head_mid('front'), floor['front'] - 20],
            'back': [np.pi, phi0, s0, head_mid('back'), floor['back'] - 20],
            'side': [-np.pi / 2, phi0, s0, 200.0, floor['side'] - 20],
            'threeq': [0.55, phi0, s0, head_mid('threeq'), floor['threeq'] - 20]}
    idx = {'psi': 0, 'ox': 3, 'oy': 4}

    def total(c):
        keep = carve(P, c, M, 3)
        return float(np.mean([iou(P, keep, c, M, n) for n in NAMES]))

    def get(c, k):
        if k in ('phi', 's'):
            return c['front'][{'phi': 1, 's': 2}[k]]
        n, f = k.split('.')
        return c[n][idx[f]]

    def put(c, k, v):
        c = {n: list(x) for n, x in c.items()}
        if k in ('phi', 's'):
            for n in c:
                c[n][{'phi': 1, 's': 2}[k]] = v
        else:
            n, f = k.split('.')
            c[n][idx[f]] = v
        return c

    steps = [('phi', 0.04), ('s', 30.0), ('side.ox', 24.0), ('threeq.psi', 0.12), ('threeq.ox', 20.0), ('front.ox', 8.0),
             ('back.ox', 8.0), ('front.oy', 10.0), ('side.oy', 10.0), ('threeq.oy', 10.0), ('back.oy', 10.0), ('side.psi', 0.06)]
    best = total(cams)
    for rnd in range(5):
        for k, st in steps:
            st = st / (2 ** rnd)
            for d in (-2, -1, 1, 2):
                c2 = put(cams, k, get(cams, k) + d * st)
                v = total(c2)
                if v > best + 1e-5:
                    best, cams = v, c2
        print(f'  fit round {rnd}: mean agreement {best:.4f}')
    return {n: [float(x) for x in v] for n, v in cams.items()}


# --------------------------------------------------------------------------------------------- 3. the body --
def body(cams, M, N=230, faces=32000):
    from skimage import measure
    import trimesh
    import fast_simplification
    P, shape, (xs, ys, zs) = grid(N)
    keep = carve(P, cams, M, 2)
    Pm = P * np.array([-1, 1, 1])  # his symmetry, with room to spare, for the corners no photograph saw
    for n in ('threeq', 'side'):
        keep &= carve(Pm, cams, M, 7, views=[n])
    print('  agreement', {n: round(float(iou(P, keep, cams, M, n)), 3) for n in NAMES})
    vol = ndi.gaussian_filter(keep.reshape(shape).astype(np.float32), 1.1)
    verts, tris, _, _ = measure.marching_cubes(vol, 0.5, spacing=(xs[1] - xs[0], ys[1] - ys[0], zs[1] - zs[0]))
    verts += np.array([xs[0], ys[0], zs[0]])
    m = trimesh.Trimesh(verts, tris, process=True)
    trimesh.smoothing.filter_taubin(m, lamb=0.5, nu=-0.53, iterations=12)
    v2, f2 = fast_simplification.simplify(np.asarray(m.vertices, np.float32), np.asarray(m.faces, np.int64),
                                          target_reduction=1 - faces / len(m.faces))
    m2 = trimesh.Trimesh(v2, f2, process=True)
    m2.fix_normals()
    print(f'  mesh: {len(m2.vertices)} vertices, {len(m2.faces)} faces, watertight {m2.is_watertight}')
    return m2


# --------------------------------------------------------------------------------------------- 4. the skin --
def pad_colours(rgb, m):
    """Pull-push: the bear's colours averaged down a pyramid and pushed back up over the backdrop, filling it."""
    w0 = ndi.binary_erosion(m, iterations=1).astype(np.float32)
    levels = [(rgb * w0[..., None], w0)]
    while min(levels[-1][1].shape) > 2:
        c, w = levels[-1]
        h2, w2 = (c.shape[0] + 1) // 2, (c.shape[1] + 1) // 2
        cp = np.zeros((h2 * 2, w2 * 2, 3), np.float32)
        wp = np.zeros((h2 * 2, w2 * 2), np.float32)
        cp[:c.shape[0], :c.shape[1]] = c
        wp[:w.shape[0], :w.shape[1]] = w
        levels.append((cp.reshape(h2, 2, w2, 2, 3).sum((1, 3)), wp.reshape(h2, 2, w2, 2).sum((1, 3))))
    c, w = levels[-1]
    filled = c / np.maximum(w, 1e-6)[..., None]
    for c, w in reversed(levels[:-1]):
        up = np.repeat(np.repeat(filled, 2, 0), 2, 1)[:c.shape[0], :c.shape[1]]
        k = np.clip(w, 0, 1)[..., None]
        filled = (c / np.maximum(w, 1e-6)[..., None]) * k + up * (1 - k)
    filled = ndi.gaussian_filter(filled, (0.6, 0.6, 0))
    return np.where(w0[..., None] > 0.5, rgb, filled)


def skin(M, pad=6):
    parts = {}
    for n in NAMES:
        x0, y0, x1, y1 = CROPS[n]
        rgb = sheet()[y0:y1, x0:x1].copy()
        ys, xs = np.nonzero(M[n])
        bx0, by0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
        bx1, by1 = min(rgb.shape[1] - 1, xs.max() + pad), min(rgb.shape[0] - 1, ys.max() + pad)
        r, m = rgb[by0:by1 + 1, bx0:bx1 + 1], M[n][by0:by1 + 1, bx0:bx1 + 1]
        a = np.clip(ndi.gaussian_filter(ndi.binary_erosion(m, iterations=2).astype(np.float32), 1.0), 0, 1)
        parts[n] = (pad_colours(r, m), a, (int(bx0), int(by0)))
    # the side view, mended: the frayed patch replaced with the lit knit beside it, brightness matched, feathered
    r, a, off = parts['side']
    r = r.copy()
    cx, cy, rx, ry = WORN[0] - off[0], WORN[1] - off[1], WORN[2], WORN[3]
    yy, xx = np.mgrid[0:r.shape[0], 0:r.shape[1]]
    e = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    w = np.clip((1.35 - e) / 0.35, 0, 1)[..., None]
    src = np.roll(r, 50, axis=1)
    ring, inside = (e > 1.4) & (e < 2.4), e < 1.0
    gain = r[ring].mean(axis=0) / np.maximum(1, src[inside].mean(axis=0))
    parts['sideclean'] = (r * (1 - w) + src * gain * w, a, off)
    rows = [['front', 'threeq', 'side'], ['back', 'sideclean']]
    W = (max(sum(parts[n][0].shape[1] for n in row) for row in rows) + 3) // 4 * 4
    Hs = [max(parts[n][0].shape[0] for n in row) for row in rows]
    H = (sum(Hs) + 3) // 4 * 4
    atlas = np.zeros((H, W, 4), np.float32)
    tiles, y = {}, 0
    for row, h in zip(rows, Hs):
        x = 0
        for n in row:
            rgb, a, off = parts[n]
            th, tw = a.shape
            atlas[y:y + th, x:x + tw, :3] = rgb
            atlas[y:y + th, x:x + tw, 3] = a * 255
            tiles[n] = {'x': x, 'y': y, 'w': tw, 'h': th, 'cropX': off[0], 'cropY': off[1]}
            x += tw
        y += h
    return Image.fromarray(np.clip(atlas, 0, 255).astype(np.uint8), 'RGBA'), {'w': W, 'h': H, 'tiles': tiles}


# ------------------------------------------------------------------------------------------- 5. the paint --
def paint(mesh, cams, atlas_img, atlas):
    import trimesh
    v = np.asarray(mesh.vertices, np.float64)
    n = mesh.vertex_normals
    alpha = np.asarray(atlas_img)[..., 3].astype(np.float32) / 255
    ray = trimesh.ray.ray_pyembree.RayMeshIntersector(mesh)
    bias = {('front', False): 1.0, ('side', False): 0.8, ('back', False): 0.8, ('side', True): 0.6, ('threeq', True): 0.5}

    def bilinear(img, x, y):
        x = np.clip(x, 0, img.shape[1] - 1.001)
        y = np.clip(y, 0, img.shape[0] - 1.001)
        x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
        fx, fy = x - x0, y - y0
        return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy)
                + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)

    W = np.zeros((len(v), len(VIEWS)))
    for k, (cname, tname, mir, primary) in enumerate(VIEWS):
        psi, phi, s, ox, oy = cams[cname]
        d = np.array([-np.cos(phi) * np.sin(psi), np.sin(phi), np.cos(phi) * np.cos(psi)])
        if mir:
            d = d * np.array([-1, 1, 1])
        facing = n @ d
        hit = ray.intersects_any(v + n * 0.0015 + d * 0.0005, np.repeat(d[None], len(v), 0))
        vis = (~hit) & (facing > 0)
        px, py = project(v * np.array([-1, 1, 1]) if mir else v, psi, phi, s, ox, oy)
        t = atlas['tiles'][tname]
        inside = (px >= t['cropX']) & (py >= t['cropY']) & (px < t['cropX'] + t['w']) & (py < t['cropY'] + t['h'])
        a = bilinear(alpha, t['x'] + px - t['cropX'], t['y'] + py - t['cropY']) * inside
        fc = np.clip(facing, 0, 1)
        if primary:
            r = np.clip((fc - 0.05) / 0.3, 0, 1)
            W[:, k] = vis * inside * r * r * (3 - 2 * r)
        else:
            W[:, k] = vis * a * fc ** 6 * bias[(cname, mir)] * 0.05
    mx = W.max(1, keepdims=True)
    print(f'  {int((mx[:, 0] < 1e-6).sum())} vertices no photograph saw (they take the plush colour)')
    return np.where(mx > 1e-6, np.round(W / np.maximum(mx, 1e-9) * 255), 0).astype(np.uint8)


def landmarks(mesh, cams, M):
    """His eyes, found as the two dark beads of the three-quarter photograph's face, cast back onto the body; the
    cheeks below and outside them. Rest coordinates, for the happy face he makes while he is petted."""
    import trimesh
    x0, y0, x1, y1 = CROPS['threeq']
    rgb = sheet()[y0:y1, x0:x1]
    m = M['threeq']
    ys, xs = np.nonzero(m)
    top, h = ys.min(), ys.max() - ys.min()
    face = np.zeros(m.shape, bool)
    face[top + int(h * 0.1):top + int(h * 0.3)] = True
    # the beads are dark and neutral (the nose and the stitches are warm brown)
    dark = face & m & (rgb.mean(-1) < 75) & ((rgb[..., 0] - rgb[..., 2]) < 16)
    lab, n = ndi.label(ndi.binary_opening(dark, iterations=1))
    sizes = ndi.sum(dark, lab, range(1, n + 1))
    found = sorted([(sizes[i], ndi.center_of_mass(dark, lab, i + 1)) for i in range(n)], reverse=True)
    # the near eye is the biggest bead; its partner sits at about its height, well across (the stitches are lower)
    near = found[0]
    far = max((f for f in found[1:] if abs(f[1][0] - near[1][0]) < 30 and abs(f[1][1] - near[1][1]) > 40), key=lambda f: f[0])
    blobs = [near, far]
    psi, phi, s, ox, oy = cams['threeq']
    d = np.array([-np.cos(phi) * np.sin(psi), np.sin(phi), np.cos(phi) * np.cos(psi)])
    # the camera's own axes in model space: right (screen x) and up (screen y)
    right = np.array([np.cos(psi), 0, np.sin(psi)])
    up = np.cross(d, right)
    ray = trimesh.ray.ray_pyembree.RayMeshIntersector(mesh)
    eyes = []
    for size, (cy, cx) in sorted(blobs, key=lambda b: b[1][1]):
        # the point on the plane through the axis that projects to the pixel, then back along the view
        p = right * ((cx - ox) / s) + up * ((oy - cy) / s - 0.0) + 0 * d
        # solve exactly: project() is linear; find the model point on the line p + t d hitting the pixel
        loc, _, _ = ray.intersects_location([p + d * 2.0], [-d], multiple_hits=False)
        if len(loc):
            eyes.append({'at': [round(float(v), 4) for v in loc[0]], 'r': round(float(np.sqrt(size / np.pi) / s), 4)})
    return {'eyes': eyes, 'camUp': [round(float(v), 4) for v in up], 'camRight': [round(float(v), 4) for v in right]}


def export(mesh, wq, cams, atlas_img, atlas, marks):
    os.makedirs(OUT, exist_ok=True)
    v = np.asarray(mesh.vertices, np.float32)
    f = np.asarray(mesh.faces, np.uint32).ravel()
    assert len(v) < 65536
    lo, hi = v.min(0), v.max(0)
    q = np.round((v - lo) / (hi - lo) * 65535).astype(np.uint16)
    w8 = np.zeros((len(v), 8), np.uint8)
    w8[:, :wq.shape[1]] = wq
    with open(os.path.join(OUT, 'cub-body.bin'), 'wb') as fh:
        fh.write(b'RVLB')
        fh.write(struct.pack('<IIII', 1, len(v), len(f), 8))
        fh.write(struct.pack('<6f', *lo, *hi))
        fh.write(q.tobytes())
        fh.write(f.astype(np.uint16).tobytes())
        fh.write(w8.tobytes())
    atlas_img.save(os.path.join(OUT, 'cub-skin.webp'), quality=90, method=6)
    views = [{'cam': c, 'tile': t, 'mirror': m, 'primary': p} for c, t, m, p in VIEWS]
    json.dump({'cams': cams, 'atlas': atlas, 'views': views, 'marks': marks}, open(os.path.join(OUT, 'cub-views.json'), 'w'), indent=1)
    for name in ('cub-body.bin', 'cub-skin.webp', 'cub-views.json'):
        print(f'  {name}: {os.path.getsize(os.path.join(OUT, name)) // 1024} KB')


if __name__ == '__main__':
    print('1. the masks')
    M = masks()
    print('2. the cameras')
    cams_path = os.path.join(HERE, 'cams.json')
    if '--cams' in sys.argv and os.path.exists(cams_path):
        cams = json.load(open(cams_path))
    else:
        cams = fit_cameras(M)
        json.dump(cams, open(cams_path, 'w'), indent=1)
    print('3. the body')
    mesh = body(cams, M)
    print('4. the skin')
    atlas_img, atlas = skin(M)
    print('5. the paint')
    wq = paint(mesh, cams, atlas_img, atlas)
    print('6. his eyes')
    marks = landmarks(mesh, cams, M)
    print('  ', marks)
    export(mesh, wq, cams, atlas_img, atlas, marks)
