import * as THREE from 'three';
import { JOTUN, paintTint, ROOMS_PAINT } from '../data/colours.js';
import { FLOORS, LEVEL, SLAB_T, SLAB_RF, SLAB_UR, WALLS_RF, SLAB_FF, GF_ENCLOSED, ROOMS, STAIR_WINDOWS } from '../data/building.js';
import { pourMaterial, warmBounce } from '../core/materials.js';
import { box, inPoly, rectBox, toScene } from './helpers.js';
import { stagger } from '../core/timeline.js';

/**
 * Walls for every storey + parapets: blockwork (course by course), plaster,
 * façade cladding, mouldings and all openings (windows, doors, shutter).
 */
export function buildWalls(ctx) {
  const { TL, M, root } = ctx;
  ctx.doors = ctx.doors || [];

  // Interior plaster that turns into painted finish during the interior stage.
  const plasterMat = ctx.plasterMat;
  const skirtingMat = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.4 });
  // Jotun schedule: 1931 Cashew (−30 %) for the house, 8181 Pastel Mint (−30 %) for the first-floor bedrooms
  const PLASTER_BASE = 0xe6e1d7; // base tint baked into T.plaster
  const PAINT_BASE = 0xf4efe6; // finer, more even texture once painted (T.paint)
  const plasterCol = new THREE.Color(0xd9d4ca), paintCol = paintTint(JOTUN.interior, PLASTER_BASE);
  const paintColFinal = paintTint(JOTUN.interior, PAINT_BASE);
  const rawMap = plasterMat.map, paintMap = M.paint.map;
  const roomsMat = plasterMat.clone();
  roomsMat.map = paintMap;
  roomsMat.color.copy(paintTint(JOTUN.rooms, PAINT_BASE));
  // Finished emulsion: smooth (weaker plaster relief), and lit more by warm room bounce than by
  // the blue sky probe, so light warm whites don't read as cool grey indoors.
  const PAINT_LOOK = { normal: 0.12, env: 0.8, emissive: plasterMat.emissive.clone() };
  const rawLook = { normal: plasterMat.normalScale.x, env: plasterMat.envMapIntensity, emissive: plasterMat.emissive.clone() };
  roomsMat.normalScale.setScalar(PAINT_LOOK.normal);
  roomsMat.envMapIntensity = PAINT_LOOK.env;
  roomsMat.emissive.copy(PAINT_LOOK.emissive);
  // Indoors most light on a wall has bounced off warm floors / walls rather than coming
  // straight from the blue sky: warm the indirect (hemisphere + sky probe) term only.
  for (const m of [plasterMat, roomsMat]) warmBounce(m, [1.16, 1.02, 0.86]);
  const isPaintedRoom = (px, py, f) => ROOMS.some((r) => r.f === f && ROOMS_PAINT(r) &&
    px > r.rect[0] && px < r.rect[2] && py > r.rect[1] && py < r.rect[3]);
  TL.hook((t) => {
    const k = Math.min(1, Math.max(0, (t - 12.45) / 0.2));
    plasterMat.color.copy(plasterCol).lerp(paintCol, k);
    plasterMat.map = k >= 1 ? paintMap : rawMap;
    if (k >= 1) plasterMat.color.copy(paintColFinal);
    plasterMat.normalScale.setScalar(rawLook.normal + (PAINT_LOOK.normal - rawLook.normal) * k);
    plasterMat.envMapIntensity = rawLook.env + (PAINT_LOOK.env - rawLook.env) * k;
    plasterMat.emissive.copy(rawLook.emissive).lerp(PAINT_LOOK.emissive, k);
  });

  const W = {
    gf: { ext: [8.0, 8.3], int: [8.25, 8.5], rc: [5.15, 5.4], plaster: [10.0, 10.3], facade: [11.0, 11.3] },
    ff: { ext: [8.45, 8.72], int: [8.65, 8.85], rc: [6.15, 6.36], plaster: [10.2, 10.5], facade: [11.2, 11.5] },
    rf: { ext: [8.8, 8.97], int: [8.8, 8.97], rc: [7.1, 7.3], plaster: [10.4, 10.55], facade: [11.4, 11.55] },
  };
  const outlines = { gf: GF_ENCLOSED, ff: SLAB_FF.outline, rf: null };
  const STAIR_VOID = SLAB_FF.holes[1];

  FLOORS.forEach((floor) => {
    const win = W[floor.key];
    const H = floor.top - floor.base;
    const exts = floor.walls.filter((w) => w.ext && !w.rc);
    const ints = floor.walls.filter((w) => !w.ext && !w.rc);
    const rcs = floor.walls.filter((w) => w.rc);
    const rcMat = pourMaterial(M.concrete);

    const build = (w, i, n, kind) => {
      const blockWin = kind === 'rc' ? win.rc : stagger(i, n, ...(kind === 'ext' ? win.ext : win.int));
      wall(w, {
        base: floor.base, ffl: floor.ffl, H: w.h ? Math.min(H, w.h + floor.ffl - floor.base) : H, slabAbove: !w.h, floorKey: floor.key,
        outline: outlines[floor.key],
        blockWin, rc: kind === 'rc', rcMat,
        plasterWin: stagger(i, n, ...win.plaster),
        facadeWin: stagger(i, n, ...win.facade),
      });
    };
    exts.forEach((w, i) => build(w, i, exts.length, 'ext'));
    ints.forEach((w, i) => build(w, i, ints.length, 'int'));
    rcs.forEach((w, i) => build(w, i, rcs.length, 'rc'));
  });

  /* ---------- stair windows W6, spanning the slab band ------------------ */
  for (const sw of STAIR_WINDOWS) {
    const g = new THREE.Group();
    g.position.y = sw.z0;
    const h = sw.z1 - sw.z0;
    const R = (x0, y0, x1, y1, z, hh, m, op) => g.add(rectBox(x0, y0, x1, y1, z, hh, m, op || { cast: false }));
    const X0 = 2007, X1 = 2127; // within the 200 mm external wall
    R(X0, sw.y0, X1, sw.y0 + 60, 0, h, M.alu);
    R(X0, sw.y1 - 60, X1, sw.y1, 0, h, M.alu);
    R(X0, sw.y0, X1, sw.y1, 0, 0.06, M.alu);
    R(X0, sw.y0, X1, sw.y1, h - 0.06, 0.06, M.alu);
    // fixed single pane — no transom (W6 is a fixed window)
    // reveal linings on both jambs (hide the edge-beam ends): render-white outside, plaster inside
    for (const [ya, yb] of [[sw.y0, sw.y0 + 12], [sw.y1 - 12, sw.y1]]) {
      R(1880, ya, X0, yb, 0, h, M.trimStone);
      R(X1, ya, 2185, yb, 0, h, ctx.plasterMat);
    }
    const gl = rectBox(2059, sw.y0 + 40, 2075, sw.y1 - 40, 0.04, h - 0.08, M.glass, { cast: false, receive: false });
    gl.userData.solid = true;
    ctx.solids.push(gl);
    g.add(gl);
    // marble sill + white moulding outside (elevation)
    R(1900, sw.y0 - 60, 2167, sw.y1 + 60, -0.04, 0.04, M.marble);
    // moulding frame on the façade (four strips, not a plate) — trim colour
    R(1850, sw.y0 - 120, 1890, sw.y0, -0.04, h + 0.16, M.trimStone);
    R(1850, sw.y1, 1890, sw.y1 + 120, -0.04, h + 0.16, M.trimStone);
    R(1850, sw.y0 - 120, 1890, sw.y1 + 120, h, 0.12, M.trimStone);
    root.add(g);
    TL.add(g, { in: [11.6, 11.8], anim: 'rise' });
  }

  /* ---------- parapets on the roof and upper roofs ------------------- */
  const roofRoomLines = WALLS_RF.filter((w) => w.ext);
  parapets(SLAB_RF.outline, LEVEL.rfSSL, LEVEL.parapet, roofRoomLines, [7.76, 7.96]);
  for (const s of SLAB_UR) parapets(s.outline, LEVEL.urSSL, LEVEL.urParapet, [], [7.82, 7.97]);

  function parapets(outline, base, top, skipLines, blockWin) {
    const n = outline.length;
    const segs = [];
    for (let i = 0; i < n; i++) {
      const a = outline[i], b = outline[(i + 1) % n];
      // inset by 100 mm towards the inside of the polygon
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      let nx = -dy / L, ny = dx / L;
      const mx = (a[0] + b[0]) / 2 + nx * 200, my = (a[1] + b[1]) / 2 + ny * 200;
      if (!inPoly(mx, my, outline)) { nx = -nx; ny = -ny; }
      const A = [a[0] + nx * 100, a[1] + ny * 100], B = [b[0] + nx * 100, b[1] + ny * 100];
      // split around roof-room walls that sit on the same line
      let pieces = [[0, 1]];
      for (const r of skipLines) {
        const ra = proj(r.a, A, B), rb = proj(r.b, A, B);
        if (ra.d > 160 || rb.d > 160) continue;
        const lo = Math.min(ra.u, rb.u), hi = Math.max(ra.u, rb.u);
        pieces = pieces.flatMap(([p0, p1]) => {
          if (hi <= p0 || lo >= p1) return [[p0, p1]];
          const out = [];
          if (lo > p0) out.push([p0, lo]);
          if (hi < p1) out.push([hi, p1]);
          return out;
        });
      }
      for (const [p0, p1] of pieces) {
        if ((p1 - p0) * L < 150) continue;
        segs.push({ a: lerp2(A, B, p0), b: lerp2(A, B, p1), t: 200, ext: true, o: [] });
      }
    }
    segs.forEach((w, i) => wall(w, {
      base, ffl: base, H: top - base, slabAbove: false, floorKey: 'roof', outline,
      blockWin: stagger(i, segs.length, ...blockWin), plasterWin: [10.42, 10.56], facadeWin: [11.4, 11.56], parapet: true,
    }));
  }

  function proj(p, A, B) {
    const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy;
    const u = ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / L2;
    const qx = A[0] + u * dx, qy = A[1] + u * dy;
    return { u: Math.min(1, Math.max(0, u)), d: Math.hypot(p[0] - qx, p[1] - qy) };
  }
  function lerp2(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }

  /* ---------- one wall ------------------------------------------------ */
  function wall(w, o) {
    const [ax, az] = toScene(...w.a), [bx, bz] = toScene(...w.b);
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const t = w.t / 1000;
    const g = new THREE.Group();
    g.position.set(ax, o.base, az);
    g.rotation.y = -Math.atan2(dz, dx);
    root.add(g);

    // local axis helpers (plan mm → local metres along wall)
    const dir = [(w.b[0] - w.a[0]) / (L * 1000), (w.b[1] - w.a[1]) / (L * 1000)];
    const along = (pmm) => ((pmm[0] - w.a[0]) * dir[0] + (pmm[1] - w.a[1]) * dir[1]) / 1000;
    const horizontal = Math.abs(w.a[1] - w.b[1]) < 1;
    const fflOff = o.ffl - o.base;

    const openings = (w.o || []).map(([from, to, sill, head, kind, mark]) => {
      const p0 = horizontal ? [from, w.a[1]] : [w.a[0], from];
      const p1 = horizontal ? [to, w.a[1]] : [w.a[0], to];
      const u0 = Math.min(along(p0), along(p1)), u1 = Math.max(along(p0), along(p1));
      return { u0, u1, sill: sill > 0 ? sill + fflOff : 0, head: Math.min(o.H, head + fflOff), kind, mark };
    }).sort((a, b) => a.u0 - b.u0);

    // Exterior side: +1 if local +Z points outside the floor outline.
    let side = 0;
    if (w.ext) {
      const nx = -dz / L, nz = dx / L; // local +Z in plan orientation
      const mx = (w.a[0] + w.b[0]) / 2, my = (w.a[1] + w.b[1]) / 2;
      if (o.outline) {
        const test = (s) => inPoly(mx + nx * s * 600, my + nz * s * 600, o.outline);
        const pos = test(1), neg = test(-1);
        side = pos && !neg ? -1 : !pos && neg ? 1 : 0;
        if (o.parapet) side = pos ? -1 : 1;
      } else {
        side = roomSide(w, nx, nz);
      }
    }
    const outward = side !== 0 ? [(-dz / L) * side, (dx / L) * side] : null;
    const facingRoad = outward && outward[1] > 0.7;

    // Solid pieces of the wall: [u0, u1, y0, y1]
    const pieces = [];
    let cur = 0;
    for (const op of openings) {
      if (op.u0 > cur + 0.001) pieces.push([cur, op.u0, 0, o.H]);
      if (op.kind === 'band') { pieces.push([op.u0, op.u1, op.sill, Math.min(op.head, o.H)]); cur = op.u1; continue; }
      if (op.sill > 0.001) pieces.push([op.u0, op.u1, 0, op.sill]);
      if (op.head < o.H - 0.001) pieces.push([op.u0, op.u1, op.head, o.H]);
      cur = op.u1;
    }
    if (cur < L - 0.001) pieces.push([cur, L, 0, o.H]);

    const [b0, b1] = o.blockWin;
    const coreMat = o.rc ? o.rcMat : M.blocks;

    // Where the first-floor slab is cut away for the stairwell, nothing fills the slab-thickness
    // band between the GF wall head and the FF wall foot: find those stretches along this wall.
    const nrm = [-dz / L, dx / L]; // local +Z in plan
    const inStairVoid = (u, s) => {
      const px = w.a[0] + dir[0] * u * 1000 + nrm[0] * s * (w.t / 2 + 150);
      const py = w.a[1] + dir[1] * u * 1000 + nrm[1] * s * (w.t / 2 + 150);
      return inPoly(px, py, STAIR_VOID);
    };
    const voidSpans = (u0, u1, test) => {
      const spans = [];
      const n = Math.max(1, Math.ceil((u1 - u0) / 0.05));
      let start = null;
      for (let i = 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * Math.min(i + 0.5, n)) / n;
        const hit = i < n && test(u);
        if (hit && start === null) start = u0 + ((u1 - u0) * i) / n;
        if (!hit && start !== null) { spans.push([start, u0 + ((u1 - u0) * i) / n]); start = null; }
      }
      return spans;
    };
    for (const [u0, u1, y0, y1] of pieces) {
      const len = u1 - u0, h = y1 - y0;
      const core = box(len, h, t, coreMat, (u0 + u1) / 2, y0, 0);
      g.add(core);
      const inWin = [b0 + (y0 / o.H) * (b1 - b0), b0 + (y1 / o.H) * (b1 - b0) + 0.002];
      TL.add(core, o.rc ? { in: o.blockWin, anim: 'pour', cure: [o.blockWin[1], o.blockWin[1] + 0.2] } : { in: inWin, anim: 'course', h });
      core.userData.solid = true;
      ctx.solids.push(core);

      const pl = box(len, h, t + 0.03, o.parapet ? M.texturePaint : plasterMat, (u0 + u1) / 2, y0, 0, { cast: false });
      g.add(pl);
      TL.add(pl, { in: o.plasterWin, anim: 'rise' });

      // First-floor bedroom faces get their own paint (thin coat over the plaster)
      if (o.floorKey === 'ff') {
        for (const sd of [-1, 1]) {
          const inRoom = (u) => isPaintedRoom(
            w.a[0] + dir[0] * u * 1000 + nrm[0] * sd * (w.t / 2 + 250),
            w.a[1] + dir[1] * u * 1000 + nrm[1] * sd * (w.t / 2 + 250), 1);
          for (const [v0, v1] of voidSpans(u0, u1, inRoom)) {
            const coat = box(v1 - v0, h, 0.003, roomsMat, (v0 + v1) / 2, y0, sd * (t / 2 + 0.0165), { cast: false });
            g.add(coat);
            TL.add(coat, { in: [12.45, 12.6], anim: 'show' });
          }
        }
      }

      // Skirting board at the foot of the wall inside the house (per face; none over the open stairwell)
      if (y0 < 0.001 && (o.floorKey === 'gf' || o.floorKey === 'ff')) {
        for (const sd of [-1, 1]) {
          const overVoid = (u) => o.floorKey === 'ff' && inStairVoid(u, sd);
          const runs = [];
          let a0 = u0;
          for (const [v0, v1] of voidSpans(u0, u1, overVoid)) { if (v0 - a0 > 0.02) runs.push([a0, v0]); a0 = v1; }
          if (u1 - a0 > 0.02) runs.push([a0, u1]);
          for (const [r0, r1] of runs) {
            const sk = box(r1 - r0, 0.09, 0.025, skirtingMat, (r0 + r1) / 2, fflOff, sd * (t / 2 + 0.0125), { cast: false });
            g.add(sk);
            TL.add(sk, { in: [12.3, 12.4], anim: 'show' });
          }
        }
      }

      // Stairwell: fill the slab band above the GF / FF wall head (blockwork + plaster both faces)
      if ((o.floorKey === 'gf' || o.floorKey === 'ff') && o.slabAbove && y1 > o.H - 0.001) {
        for (const [v0, v1] of voidSpans(u0, u1, (u) => inStairVoid(u, 1) || inStairVoid(u, -1))) {
          const c = box(v1 - v0, SLAB_T, t, coreMat, (v0 + v1) / 2, o.H, 0);
          g.add(c);
          TL.add(c, { in: [b1 - 0.02, b1], anim: 'course', h: SLAB_T });
          c.userData.solid = true;
          ctx.solids.push(c);
          const pp = box(v1 - v0, SLAB_T, t + 0.03, plasterMat, (v0 + v1) / 2, o.H, 0, { cast: false });
          g.add(pp);
          TL.add(pp, { in: o.plasterWin, anim: 'rise' });
        }
      }
    }

    // Façade cladding + mouldings on the exterior face
    if (outward) {
      const off = side * (Math.max(t / 2, 0.135) + 0.03);
      const mat = o.parapet || o.floorKey === 'rf' ? M.texturePaint : facingRoad ? M.stone : M.texturePaint;
      const top = o.slabAbove ? o.H + SLAB_T : o.H;
      // Wrap the cladding round an outside corner, but never into a room at an inside corner.
      const endExt = (end) => {
        if (!o.outline) return 0.17;
        const sgn = end ? 1 : -1;
        const ex = (end ? w.b[0] : w.a[0]) + dir[0] * sgn * 120 + outward[0] * 165;
        const ey = (end ? w.b[1] : w.a[1]) + dir[1] * sgn * 120 + outward[1] * 165;
        return inPoly(ex, ey, o.outline) ? 0 : 0.17;
      };
      const bottom = o.floorKey === 'gf' ? -(o.base - 0.15) : 0;
      for (const [u0, u1, y0, y1] of pieces) {
        const yy0 = y0 < 0.001 ? bottom : y0;
        const yy1 = y1 > o.H - 0.001 ? top : y1;
        const e0 = u0 < 0.001 ? endExt(0) : 0, e1 = u1 > L - 0.001 ? endExt(1) : 0;
        const ext = e0 + e1;
        const cx = (u0 + u1) / 2 - e0 / 2 + e1 / 2;
        const sk = box(u1 - u0 + ext, yy1 - yy0, 0.04, mat, cx, yy0, off, { cast: false });
        g.add(sk);
        TL.add(sk, { in: o.facadeWin, anim: 'rise' });
      }
      // horizontal band at slab level + coping on parapets
      const mould = new THREE.Group();
      const ext = 0.34;
      // band at the slab edge — its top stays just below the slab top so it never pokes into the room above
      if (o.slabAbove) {
        // split around storey-spanning windows (stair W6)
        const cuts = openings.filter((op) => (op.kind === 'void' && op.head >= o.H - 0.001) || op.kind === 'band');
        let a = -ext / 2;
        for (const c of [...cuts, { u0: L + ext / 2, u1: L + ext / 2 }]) {
          if (c.u0 - a > 0.01) {
            // deep stepped floor cornice (final renders): body + projecting top lip + bottom lip
            const wd = c.u0 - a, cx = (a + c.u0) / 2;
            mould.add(box(wd, 0.5, 0.22, M.trimStone, cx, o.H - 0.3, off + side * 0.11));
            mould.add(box(wd, 0.1, 0.34, M.trimStone, cx, o.H + 0.1, off + side * 0.17));
            mould.add(box(wd, 0.07, 0.3, M.trimStone, cx, o.H - 0.37, off + side * 0.15));
          }
          a = c.u1;
        }
      }
      if (o.parapet) {
        // stepped parapet cornice
        mould.add(box(L + ext, 0.28, 0.2 + t, M.trimStone, L / 2, o.H - 0.28, side * 0.1));
        mould.add(box(L + ext + 0.1, 0.12, 0.42 + t, M.trimStone, L / 2, o.H, side * 0.16));
      }
      for (const op of openings) {
        if (op.kind === 'gap' || op.kind === 'void' || op.kind === 'band') continue;
        // wide stepped surround (final renders): outer frame 220 mm + inner step 70 mm
        const fw = 0.22, fi = 0.07, pj = off + side * 0.05, pi = off + side * 0.08;
        const ww = op.u1 - op.u0, cxo = (op.u0 + op.u1) / 2, hh = op.head - op.sill;
        const top = Math.min(op.head + fw, o.slabAbove ? o.H - 0.3 : o.H) - op.head;
        if (top > 0.04) mould.add(box(ww + 2 * fw, top, 0.1, M.trimStone, cxo, op.head, pj));
        mould.add(box(fw, hh, 0.1, M.trimStone, op.u0 - fw / 2, op.sill, pj));
        mould.add(box(fw, hh, 0.1, M.trimStone, op.u1 + fw / 2, op.sill, pj));
        mould.add(box(ww + 2 * fi, fi, 0.16, M.trimStone, cxo, op.head - 0.001, pi));
        mould.add(box(fi, hh, 0.16, M.trimStone, op.u0 - fi / 2, op.sill, pi));
        mould.add(box(fi, hh, 0.16, M.trimStone, op.u1 + fi / 2, op.sill, pi));
        if (op.sill > 0.05) mould.add(box(ww + 2 * fw + 0.1, 0.08, 0.24, M.trimStone, cxo, op.sill - 0.08, pj + side * 0.06));
      }
      if (mould.children.length) {
        mould.traverse((m) => { if (m.isMesh && m.geometry.parameters.height < 0.4) m.castShadow = false; });
        g.add(mould);
        TL.add(mould, { in: [o.facadeWin[1] - 0.05, o.facadeWin[1] + 0.12], anim: 'show' });
      }
    }

    // Openings: windows, doors, shutter
    const fIdx = o.floorKey === 'gf' ? 0 : o.floorKey === 'ff' ? 1 : -1;
    for (const op of openings) {
      if (op.kind === 'door') {
        op.swing = doorSwing(w, dir, op, fIdx, L, side);
        // bathroom doors get frosted glass leaves (only real bathrooms — the 'wash' basin lobbies lead
        // to the office / majlis, whose doors stay wood)
        const um = (op.u0 + op.u1) / 2, nn = [-(w.b[1] - w.a[1]) / (L * 1000), (w.b[0] - w.a[0]) / (L * 1000)];
        op.bath = fIdx >= 0 && [1, -1].some((s) => {
          const px = w.a[0] + dir[0] * um * 1000 + nn[0] * s * (w.t / 2 + 300), py = w.a[1] + dir[1] * um * 1000 + nn[1] * s * (w.t / 2 + 300);
          return ROOMS.some((r) => r.f === fIdx && r.key === 'bath' && px > r.rect[0] && px < r.rect[2] && py > r.rect[1] && py < r.rect[3]);
        });
      }
      fillOpening(g, op, t, side, w.ext, o);
    }
  }


  /** Which side a door leaf swings to (+1 = local +Z) and which jamb it hinges on. */
  function doorSwing(w, dir, op, fIdx, L, side) {
    const mid = (op.u0 + op.u1) / 2 * 1000;
    const px = w.a[0] + dir[0] * mid, py = w.a[1] + dir[1] * mid;
    const n = [-dir[1], dir[0]];
    const rank = (s) => {
      const x = px + n[0] * 600 * s, y = py + n[1] * 600 * s;
      const r = ROOMS.find((rm) => rm.f === fIdx && x >= rm.rect[0] - 50 && x <= rm.rect[2] + 50 && y >= rm.rect[1] - 50 && y <= rm.rect[3] + 50);
      if (!r) return 0;
      if (['bath', 'wash', 'dress', 'store', 'laundry'].includes(r.key)) return 3;
      if (['masterBedroom', 'girlBedroom', 'boyBedroom', 'doubleBedroom', 'maleMajlis', 'office'].includes(r.key)) return 2;
      return 1;
    };
    const rp = rank(1), rn = rank(-1);
    const s = rp === rn ? (side ? -side : 1) : rp > rn ? 1 : -1;
    // hinge on the jamb nearest a wall end so the open leaf rests against the wall
    const hingeStart = op.u0 <= L - op.u1;
    return { s, hingeStart };
  }

  function roomSide(w, nx, nz) {
    // centre of the stair / lift room the wall belongs to
    const rooms = [[5130, 8900], [8360, 1900]];
    const mx = (w.a[0] + w.b[0]) / 2, my = (w.a[1] + w.b[1]) / 2;
    const c = rooms.reduce((best, r) => (Math.hypot(r[0] - mx, r[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? r : best));
    const dot = (c[0] - mx) * nx + (c[1] - my) * nz;
    return dot > 0 ? -1 : 1;
  }

  /** Two-panel sliding door: one fixed panel, one that slides behind it. */
  function buildSlider(grp, op, w, h, t, ext) {
    const wood = op.mark === 'SD4'; // wooden sliding door between dining and kitchen
    const fr = 0.05;
    const frameMat = wood ? M.doorWood : M.alu;
    grp.add(box(w, 0.06, t * 0.75, frameMat, 0, h - 0.06, 0));            // head / track
    grp.add(box(fr, h, t * 0.75, frameMat, -w / 2 + fr / 2, 0, 0));
    grp.add(box(fr, h, t * 0.75, frameMat, w / 2 - fr / 2, 0, 0));
    grp.add(box(w, 0.015, t * 0.75, wood ? M.darkSteel : M.alu, 0, 0, 0));   // threshold track
    const pw = (w - 2 * fr) / 2 + 0.03;
    const ph = h - 0.08;
    const panel = (x, z) => {
      const p = new THREE.Group();
      p.position.set(x, 0.015, z);
      if (wood) {
        p.add(box(pw, ph, 0.045, M.doorWood, 0, 0, 0));
        for (let gx = -pw / 2 + 0.12; gx < pw / 2 - 0.08; gx += 0.12) p.add(box(0.008, ph - 0.24, 0.05, M.darkSteel, gx, 0.12, 0));
        p.add(box(0.025, 0.9, 0.07, M.darkSteel, -pw / 2 + 0.07, 0.6, 0));   // recessed pull
      } else {
        p.add(box(pw, 0.07, 0.05, M.alu, 0, 0, 0));
        p.add(box(pw, 0.07, 0.05, M.alu, 0, ph - 0.07, 0));
        p.add(box(0.07, ph, 0.05, M.alu, -pw / 2 + 0.035, 0, 0));
        p.add(box(0.07, ph, 0.05, M.alu, pw / 2 - 0.035, 0, 0));
        const gl = box(pw - 0.12, ph - 0.14, 0.012, M.glass, 0, 0.07, 0, { cast: false, receive: false });
        gl.userData.solid = true;
        ctx.solids.push(gl);
        p.add(gl);
        p.add(box(0.03, 0.5, 0.08, M.darkSteel, -pw / 2 + 0.09, 0.95, 0));    // handle
      }
      p.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.userData.dynamic = true; } });
      p.userData.dynamic = true;
      grp.add(p);
      return p;
    };
    // the panel at the far end slides back over the fixed one at the start of the wall
    const fixedX = -w / 2 + fr + pw / 2 - 0.015, slideX = w / 2 - fr - pw / 2 + 0.015;
    panel(fixedX, -0.03);
    const moving = panel(slideX, 0.03);
    if (wood) { const blocker = moving.children[0]; blocker.userData.solid = true; ctx.solids.push(blocker); }
    ctx.doors.push({ type: 'slide', obj: moving, prop: 'x', closed: slideX, open: fixedX + 0.04, k: 0, isOpen: false, anchor: grp });
  }

  function fillOpening(g, op, t, side, ext, o) {
    const w = op.u1 - op.u0, h = op.head - op.sill, cx = (op.u0 + op.u1) / 2;
    if (op.kind === 'gap' || op.kind === 'void' || op.kind === 'band') return;
    const grp = new THREE.Group();
    grp.position.set(cx, op.sill, 0);
    g.add(grp);
    const fr = 0.06;
    if (op.kind === 'slide') {
      buildSlider(grp, op, w, h, t, ext);
      TL.add(grp, { in: ext ? [11.8, 11.95] : [12.55, 12.7], anim: 'rise' });
    } else if (op.kind === 'window') {
      grp.add(box(w, fr, t * 0.6, M.alu, 0, 0, 0));
      grp.add(box(w, fr, t * 0.6, M.alu, 0, h - fr, 0));
      grp.add(box(fr, h, t * 0.6, M.alu, -w / 2 + fr / 2, 0, 0));
      grp.add(box(fr, h, t * 0.6, M.alu, w / 2 - fr / 2, 0, 0));
      const panels = Math.max(1, Math.round(w / 1.4));
      for (let i = 1; i < panels; i++) grp.add(box(0.05, h, t * 0.5, M.alu, -w / 2 + (w * i) / panels, 0, 0));
      if (h > 2.2) grp.add(box(w, 0.05, t * 0.5, M.alu, 0, h * 0.22, 0));
      const glass = box(w - 0.08, h - 0.08, 0.016, M.glass, 0, 0.04, 0, { cast: false, receive: false });
      if (ext && h > 2.3) grp.add(box(w - 0.1, 0.5, 0.03, M.blindBox, 0, h - 0.56, (side || 1) * 0.03, { cast: false }));
      // marble inner sill on the room side of the window
      if (op.sill > 0.05 && o.floorKey !== 'roof') {
        const inner = -(side || 1);
        grp.add(box(w + 0.1, 0.03, t / 2 + 0.05, M.marble, 0, -0.03, inner * (t / 4 + 0.025)));
      }
      grp.add(glass);
      glass.userData.solid = true;
      ctx.solids.push(glass);
      grp.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      TL.add(grp, { in: ext ? stagger(Math.random() * 10 | 0, 10, 11.5, 11.85) : [12.55, 12.7], anim: 'rise' });
    } else if (op.kind === 'door') {
      const main = op.mark === 'D1';
      const isLift = op.mark === 'LIFT';
      if (isLift) return; // landing doors, architraves and call buttons are built by lift.js
      // frame (main entrance: dark wood-grain aluminium; others: walnut)
      const fm = main ? M.woodAlu : M.doorVeneer;
      grp.add(box(0.05, h, t + 0.04, fm, -w / 2 + 0.025, 0, 0));
      grp.add(box(0.05, h, t + 0.04, fm, w / 2 - 0.025, 0, 0));
      grp.add(box(w, 0.05, t + 0.04, fm, 0, h - 0.05, 0));
      if (isLift) {
        grp.add(box(w / 2 - 0.05, h - 0.05, 0.04, M.galvanised, -w / 4, 0, t / 2 * (side || 1)));
        grp.add(box(w / 2 - 0.05, h - 0.05, 0.04, M.galvanised, w / 4, 0, t / 2 * (side || 1)));
      } else {
        // Leaves swing ~85° into the more private room and rest against the wall.
        const sw = op.swing || { s: side || 1, hingeStart: true };
        const leaves = main ? [true, false] : [sw.hingeStart];
        const leafW = (w - 0.1) / leaves.length;
        for (const hingeStart of leaves) {
          const leafGeo = new THREE.BoxGeometry(leafW, h - 0.06, main ? 0.07 : 0.045);
          leafGeo.translate(hingeStart ? leafW / 2 : -leafW / 2, (h - 0.06) / 2, 0);
          const leaf = new THREE.Mesh(leafGeo, main ? M.woodAlu : op.bath ? M.frosted : [M.doorVeneer, M.doorVeneer, M.doorVeneer, M.doorVeneer, M.fluted, M.fluted]);
          if (op.bath) {
            // slim black aluminium frame round the frosted pane
            const lh = h - 0.06, lx = hingeStart ? leafW / 2 : -leafW / 2, f = 0.045;
            leaf.add(box(leafW, f, 0.05, M.darkSteel, lx, 0, 0));
            leaf.add(box(leafW, f, 0.05, M.darkSteel, lx, lh - f, 0));
            leaf.add(box(f, lh, 0.05, M.darkSteel, lx - leafW / 2 + f / 2, 0, 0));
            leaf.add(box(f, lh, 0.05, M.darkSteel, lx + leafW / 2 - f / 2, 0, 0));
          }
          leaf.castShadow = leaf.receiveShadow = true;
          leaf.position.set(hingeStart ? -w / 2 + 0.05 : w / 2 - 0.05, 0, sw.s * (t / 2 - 0.03));
          const ang = main ? 1.25 : 1.48;
          leaf.rotation.y = hingeStart ? -sw.s * ang : sw.s * ang;
          const hx = hingeStart ? leafW - 0.1 : -leafW + 0.1;
          if (main) {
            // long matt-black vertical pull bars near the meeting edge, both faces (owner's reference)
            for (const zz of [0.06, -0.06]) leaf.add(box(0.035, 1.9, 0.03, M.darkSteel, hingeStart ? leafW - 0.16 : -leafW + 0.16, (h - 1.9) / 2, zz));
          }
          else for (const zz of [0.035, -0.035]) {
            // matt black lever + rose
            leaf.add(box(0.13, 0.018, 0.018, M.darkSteel, hx + (hingeStart ? -0.05 : 0.05), 1.02, zz));
            leaf.add(box(0.05, 0.05, 0.008, M.darkSteel, hx, 1.02, zz * 0.86));
          }
          leaf.userData.solid = true;
          leaf.userData.dynamic = true;
          ctx.solids.push(leaf);
          grp.add(leaf);
          ctx.doors.push({ type: 'hinge', obj: leaf, prop: 'rotY', closed: 0, open: leaf.rotation.y, k: 1, isOpen: true, anchor: grp });
        }
      }
      if (!ext && !main) {
        // floor-to-ceiling walnut: wide casing on both faces and a flush panel over the door (owner's reference)
        // never taller than the wall itself (e.g. the low under-stair store wall)
        const top = Math.min((o.ffl - o.base) + (o.floorKey === 'gf' ? 3.12 : 3.02), o.H) - op.sill;
        const cw = 0.07;
        for (const s of [1, -1]) {
          const z = s * (t / 2 + 0.028);
          grp.add(box(cw, top, 0.025, M.doorVeneer, -w / 2 - cw / 2 + 0.02, 0, z));
          grp.add(box(cw, top, 0.025, M.doorVeneer, w / 2 + cw / 2 - 0.02, 0, z));
          if (top - h > 0.05) {
            grp.add(box(w - 0.06, top - h, 0.02, M.doorVeneer, 0, h, s * (t / 2 + 0.024)));
            grp.add(box(w - 0.06, 0.012, 0.03, M.darkSteel, 0, h - 0.006, s * (t / 2 + 0.02))); // shadow gap at the head
          }
        }
      }
      if (main) {
        // slatted wood-grain fins either side of the entrance, on the outside face
        const zf = (side || 1) * (t / 2 + 0.2);
        for (const sx of [-1, 1]) {
          const x0 = sx * (w / 2 + 0.05);
          grp.add(box(0.36, 0.06, 0.08, M.woodAlu, x0 + sx * 0.18, h - 0.06, zf));
          for (let k = 0; k < 6; k++) grp.add(box(0.035, h - 0.08, 0.07, M.woodAlu, x0 + sx * (0.03 + k * 0.06), 0.02, zf));
        }
      }
      grp.traverse((m) => { if (m.isMesh) m.castShadow = false; });
      TL.add(grp, { in: ext || main || isLift ? [11.8, 11.95] : stagger(Math.random() * 10 | 0, 10, 12.55, 12.7), anim: 'rise' });
    } else if (op.kind === 'shutter') {
      const panel = box(w, h - 0.35, 0.06, M.shutter, 0, 0, (side || 1) * (t / 2 - 0.03));
      grp.add(panel);
      grp.add(box(w + 0.1, 0.35, 0.4, M.alu, 0, h - 0.35, (side || 1) * 0.12));
      grp.add(box(w, 0.04, 0.02, M.led, 0, h - 0.4, (side || 1) * 0.33));
      panel.userData.solid = true;
      ctx.solids.push(panel);
      TL.add(grp, { in: [11.8, 11.95], anim: 'rise' });
    }
  }
}
