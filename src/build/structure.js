import * as THREE from 'three';
import {
  COLUMNS_MAIN, COLUMNS_ROOF, LEVEL, SLAB_T, GRADE_SLAB_T, SLAB_GF, SLAB_FF, SLAB_RF, SLAB_UR,
  WALLS_GF, WALLS_FF, STAIR, FOOTING_TYPES, PLOT,
} from '../data/building.js';
import { pourMaterial } from '../core/materials.js';
import { box, rectBox, slabMesh, inPoly, toScene } from './helpers.js';
import { stagger } from '../core/timeline.js';

/**
 * Structural frame: excavation → footings → necks & ground beams →
 * backfill → grade slab → columns & PT slabs per storey → stairs.
 */
export function buildStructure(ctx) {
  const { TL, M, root } = ctx;
  const add = (obj, opts) => { root.add(obj); return TL.add(obj, opts); };

  /* ---------------- excavation ---------------------------------------- */
  const PIT = { x0: 1200, y0: 30, x1: 16000, y1: 21391 };
  const pitDepth = -LEVEL.foundationBottom;
  {
    // Undisturbed soil that gets dug out (pivot at the pit bottom).
    const lid = rectBox(PIT.x0, PIT.y0, PIT.x1, PIT.y1, LEVEL.foundationBottom, pitDepth, M.soil, { cast: false });
    add(lid, { in: [-1, -0.9], out: [1.1, 1.75], outAnim: 'rise' });
    lid.userData.walkable = true;
    ctx.walkables.push(lid);
    ctx.lid = lid;

    // Pit side walls, visible once digging starts.
    const sides = new THREE.Group();
    const [ax, az] = toScene(PIT.x0, PIT.y0), [bx, bz] = toScene(PIT.x1, PIT.y1);
    const w = bx - ax, d = bz - az, y = LEVEL.foundationBottom;
    const wallMat = M.soilDark;
    const mk = (sx, sz, px, pz) => sides.add(box(sx, pitDepth, sz, wallMat, px, y, pz, { cast: false }));
    mk(w + 0.6, 0.3, (ax + bx) / 2, az - 0.16);
    mk(w + 0.6, 0.3, (ax + bx) / 2, bz + 0.16);
    mk(0.3, d, ax - 0.16, (az + bz) / 2);
    mk(0.3, d, bx + 0.16, (az + bz) / 2);
    add(sides, { in: [1.1, 1.12], out: [3.9, 3.98], anim: 'show', outAnim: 'show' });

    // Compacted sand base at the end of soil improvement.
    const sand = rectBox(PIT.x0, PIT.y0, PIT.x1, PIT.y1, LEVEL.foundationBottom, 0.02, M.sand, { cast: false });
    add(sand, { in: [1.75, 1.95], anim: 'rise', out: [3.9, 3.95], outAnim: 'show' });
    ctx.walkables.push(sand);

    // Backfill in compacted layers up to the underside of the grade slab.
    const fillTop = 0.0;
    const fill = rectBox(PIT.x0, PIT.y0, PIT.x1, PIT.y1, LEVEL.foundationBottom, fillTop - LEVEL.foundationBottom, M.soilDark, { cast: false });
    add(fill, { in: [3.68, 3.98], anim: 'course', h: 2.0 });
    ctx.walkables.push(fill);
  }

  /* ---------------- footings ------------------------------------------ */
  const blindTop = LEVEL.foundationBottom + 0.075;
  const footingMat = pourMaterial(M.concrete);
  const centres = COLUMNS_MAIN.map((c) => [c.x + c.w / 2, c.y + c.d / 2]);
  centres.forEach(([cx, cy], i) => {
    const perimeter = cx < 2700 || cx > 15200 || cy < 700 || cy > 20600;
    const type = perimeter ? FOOTING_TYPES.F2 : FOOTING_TYPES.F4;
    let half = (type.s * 1000) / 2;
    // keep eccentric footings inside the plot
    const fx = Math.min(Math.max(cx, PLOT.x0 + half + 1100), PLOT.x1 - half);
    const fy = Math.min(Math.max(cy, PIT.y0 + half), PIT.y1 - half);
    const [b0, b1] = stagger(i, centres.length, 2.0, 2.25);
    add(rectBox(fx - half - 100, fy - half - 100, fx + half + 100, fy + half + 100, LEVEL.foundationBottom, 0.075, M.blinding), { in: [b0, b1], anim: 'rise' });

    const [r0, r1] = stagger(i, centres.length, 2.2, 2.5);
    add(rectBox(fx - half + 60, fy - half + 60, fx + half - 60, fy + half - 60, blindTop + 0.05, type.t - 0.1, M.rebar), { in: [r0, r1], anim: 'pop', out: [2.9, 2.91], outAnim: 'show' });

    const [f0, f1] = stagger(i, centres.length, 2.35, 2.6);
    const form = formBox(fx - half, fy - half, fx + half, fy + half, blindTop, type.t, M.plywood);
    add(form, { in: [f0, f1], anim: 'rise', out: [2.86, 2.98], outAnim: 'rise' });

    const [p0, p1] = stagger(i, centres.length, 2.55, 2.88);
    add(rectBox(fx - half, fy - half, fx + half, fy + half, blindTop, type.t, footingMat), { in: [p0, p1], anim: 'pour', cure: [2.9, 3.05] });
  });
  // Lift pit raft (F7)
  add(rectBox(6960, 0, 9760, 2350, blindTop, 0.6, footingMat), { in: [2.6, 2.85], anim: 'pour', cure: [2.9, 3.05] });

  /* ---------------- neck columns -------------------------------------- */
  const neckBase = blindTop + 0.4;
  const neckTop = LEVEL.gfSSL;
  const neckMat = pourMaterial(M.concrete);
  COLUMNS_MAIN.forEach((c, i) => {
    column(c, neckBase, neckTop, {
      rebar: stagger(i, COLUMNS_MAIN.length, 3.0, 3.15),
      form: stagger(i, COLUMNS_MAIN.length, 3.08, 3.25),
      pour: stagger(i, COLUMNS_MAIN.length, 3.18, 3.36),
      formOut: [3.36, 3.42],
      cure: [3.4, 3.6],
      mat: neckMat,
    });
  });

  /* ---------------- ground beams (GB1–GB3) ----------------------------- */
  const gbMat = pourMaterial(M.concrete);
  const gbWalls = WALLS_GF.filter((w) => w.ext || w.rc || len(w) > 2500);
  gbWalls.forEach((w, i) => {
    const t = w.ext && w.a[1] === w.b[1] && w.a[1] > 18000 ? 300 : Math.max(200, w.t);
    const form = beamAlong(w, LEVEL.groundBeamBottom, 0.45, t + 60, M.plywood);
    add(form, { in: stagger(i, gbWalls.length, 3.32, 3.5), anim: 'rise', out: [3.62, 3.7], outAnim: 'rise' });
    const gb = beamAlong(w, LEVEL.groundBeamBottom, 0.45, t, gbMat);
    add(gb, { in: stagger(i, gbWalls.length, 3.45, 3.64), anim: 'pour', cure: [3.65, 3.85] });
  });

  /* ---------------- grade slab ---------------------------------------- */
  {
    const base = LEVEL.gfSSL - GRADE_SLAB_T;
    const poly = slabMesh(SLAB_GF.outline, SLAB_GF.holes, base - 0.005, 0.004, M.polythene, { cast: false });
    add(poly, { in: [4.0, 4.3], anim: 'show', out: [4.55, 4.56], outAnim: 'show' });
    const mesh = slabMesh(SLAB_GF.outline, SLAB_GF.holes, base + 0.06, 0.004, M.rebar, { cast: false });
    add(mesh, { in: [4.25, 4.5], anim: 'show', out: [4.95, 4.96], outAnim: 'show' });
    const slabMat = pourMaterial(M.concrete);
    const slab = slabMesh(SLAB_GF.outline, SLAB_GF.holes, base, GRADE_SLAB_T, slabMat);
    add(slab, { in: [4.5, 4.95], anim: 'pour', cure: [4.95, 5.2] });
    slab.userData.walkable = true;
    ctx.walkables.push(slab);
    // lift pit floor
    const pit = rectBox(7360, 230, 9360, 1950, blindTop + 0.6, 0.01, M.concrete);
    add(pit, { in: [4.5, 4.6], anim: 'show' });
  }

  /* ---------------- ground-floor columns + first-floor slab ------------ */
  const gfColMat = pourMaterial(M.concrete);
  COLUMNS_MAIN.forEach((c, i) => column(c, LEVEL.gfSSL, LEVEL.ffSSL - SLAB_T, {
    rebar: stagger(i, COLUMNS_MAIN.length, 5.0, 5.15),
    form: stagger(i, COLUMNS_MAIN.length, 5.08, 5.25),
    pour: stagger(i, COLUMNS_MAIN.length, 5.18, 5.36),
    formOut: [5.36, 5.42],
    cure: [5.4, 5.6],
    mat: gfColMat,
    plaster: [10.0, 10.3],
  }));
  slab(SLAB_FF, LEVEL.ffSSL, LEVEL.gfSSL, WALLS_GF.filter((w) => w.ext), {
    props: [5.4, 5.55], deck: [5.5, 5.65], rebar: [5.62, 5.78], pour: [5.78, 5.98], strip: [6.0, 6.12], cure: [6.0, 6.25],
  });

  /* ---------------- first-floor columns + roof slab -------------------- */
  const ffColMat = pourMaterial(M.concrete);
  COLUMNS_MAIN.forEach((c, i) => column(c, LEVEL.ffSSL, LEVEL.rfSSL - SLAB_T, {
    rebar: stagger(i, COLUMNS_MAIN.length, 6.05, 6.18),
    form: stagger(i, COLUMNS_MAIN.length, 6.12, 6.26),
    pour: stagger(i, COLUMNS_MAIN.length, 6.2, 6.34),
    formOut: [6.34, 6.38],
    cure: [6.38, 6.55],
    mat: ffColMat,
    plaster: [10.2, 10.5],
  }));
  slab(SLAB_RF, LEVEL.rfSSL, LEVEL.ffSSL, WALLS_FF.filter((w) => w.ext), {
    props: [6.36, 6.5], deck: [6.45, 6.6], rebar: [6.58, 6.75], pour: [6.75, 6.98], strip: [7.0, 7.1], cure: [7.0, 7.25],
  });

  /* ---------------- roof rooms + upper roof --------------------------- */
  const rfColMat = pourMaterial(M.concrete);
  COLUMNS_ROOF.forEach((c, i) => column(c, LEVEL.rfSSL, LEVEL.urSSL - SLAB_T, {
    rebar: stagger(i, COLUMNS_ROOF.length, 7.05, 7.15),
    form: stagger(i, COLUMNS_ROOF.length, 7.1, 7.2),
    pour: stagger(i, COLUMNS_ROOF.length, 7.15, 7.28),
    formOut: [7.28, 7.3],
    cure: [7.3, 7.45],
    mat: rfColMat,
    plaster: [10.4, 10.55],
  }));
  for (const s of SLAB_UR) {
    slab(s, LEVEL.urSSL, LEVEL.rfSSL, [], {
      props: [7.3, 7.42], deck: [7.38, 7.5], rebar: [7.48, 7.58], pour: [7.58, 7.75], strip: [7.85, 7.95], cure: [7.8, 8.0],
    });
  }

  /* ---------------- stairs --------------------------------------------- */
  const stairMat = M.concrete.clone();
  stairMat.userData = { ...M.concrete.userData };
  ctx.stairMaterial = stairMat;
  STAIR.storeys.forEach(([y0, y1], k) => {
    const win = k === 0 ? [6.12, 6.32] : [7.12, 7.32];
    const mid = (y0 + y1) / 2;
    const g = new THREE.Group();
    g.position.y = y0;
    g.add(flight(STAIR.x1, STAIR.landingX, STAIR.flight1.y0, STAIR.flight1.y1, 0, mid - y0, STAIR.risersPerFlight, stairMat));
    g.add(flight(STAIR.landingX, STAIR.x1, STAIR.flight2.y0, STAIR.flight2.y1, mid - y0, y1 - y0, STAIR.risersPerFlight, stairMat));
    const landing = rectBox(STAIR.x0, STAIR.flight1.y0, STAIR.landingX, STAIR.flight2.y1, mid - y0 - 0.2, 0.2, stairMat);
    g.add(landing);
    g.traverse((o) => { if (o.isMesh) { o.userData.walkable = true; ctx.walkables.push(o); } });
    add(g, { in: win, anim: 'rise' });
  });

  /* ================= helpers ============================================ */
  function len(w) { return Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); }

  function formBox(x0, y0, x1, y1, base, h, mat) {
    const g = new THREE.Group();
    const t = 18;
    g.add(rectBox(x0 - t, y0 - t, x1 + t, y0, 0, h, mat));
    g.add(rectBox(x0 - t, y1, x1 + t, y1 + t, 0, h, mat));
    g.add(rectBox(x0 - t, y0, x0, y1, 0, h, mat));
    g.add(rectBox(x1, y0, x1 + t, y1, 0, h, mat));
    g.position.y = base;
    return g;
  }

  function column(c, y0, y1, w) {
    const h = y1 - y0;
    add(rectBox(c.x + 25, c.y + 25, c.x + c.w - 25, c.y + c.d - 25, y0, h + 0.5, M.rebar, { cast: false }),
      { in: w.rebar, anim: 'rise', out: [w.pour[1], w.pour[1] + 0.005], outAnim: 'show' });
    add(rectBox(c.x - 20, c.y - 20, c.x + c.w + 20, c.y + c.d + 20, y0, h, M.plywood),
      { in: w.form, anim: 'rise', out: w.formOut, outAnim: 'rise' });
    const col = rectBox(c.x, c.y, c.x + c.w, c.y + c.d, y0, h, w.mat);
    add(col, { in: w.pour, anim: 'pour', cure: w.cure });
    col.userData.solid = true;
    ctx.solids.push(col);
    if (w.plaster) {
      // 20 mm render (walls get 15 mm) so column and wall faces never coincide (no z-fighting)
      const skin = rectBox(c.x - 20, c.y - 20, c.x + c.w + 20, c.y + c.d + 20, y0, h, ctx.plasterMat, { cast: false });
      add(skin, { in: w.plaster, anim: 'rise' });
    }
  }

  function beamAlong(w, y0, h, t, mat) {
    const [ax, az] = toScene(...w.a), [bx, bz] = toScene(...w.b);
    const L = Math.hypot(bx - ax, bz - az) + t / 1000;
    const m = box(L, h, t / 1000, mat, (ax + bx) / 2, y0, (az + bz) / 2);
    m.rotation.y = -Math.atan2(bz - az, bx - ax);
    return m;
  }

  function slab(def, top, floorBelow, edgeWalls, win) {
    const mat = pourMaterial(M.concrete);
    const base = top - SLAB_T;

    // Shoring props (instanced) + primary timber joists
    const pts = [];
    const xs = def.outline.map((p) => p[0]), ys = def.outline.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    for (let x = minX + 600; x < maxX; x += 1200) {
      for (let y = minY + 600; y < maxY; y += 1200) {
        if (!inPoly(x, y, def.outline)) continue;
        if ((def.holes || []).some((h) => inPoly(x, y, h))) continue;
        pts.push([x, y]);
      }
    }
    const propH = base - 0.12 - floorBelow;
    const props = new THREE.Group();
    const propGeo = new THREE.CylinderGeometry(0.03, 0.03, propH, 6);
    propGeo.translate(0, propH / 2, 0);
    const inst = new THREE.InstancedMesh(propGeo, M.galvanised, pts.length);
    const mtx = new THREE.Matrix4();
    pts.forEach(([x, y], i) => {
      const [sx, sz] = toScene(x, y);
      inst.setMatrixAt(i, mtx.makeTranslation(sx, 0, sz));
    });
    inst.castShadow = true;
    props.add(inst);
    // timber bearers along X every 1.2 m
    const bearers = new Set(pts.map((p) => p[1]));
    for (const y of bearers) {
      const row = pts.filter((p) => p[1] === y).map((p) => p[0]);
      const b = rectBox(Math.min(...row) - 600, y - 50, Math.max(...row) + 600, y + 50, propH, 0.12, M.plywood);
      props.add(b);
    }
    props.position.y = floorBelow;
    root.add(props);
    TL.add(props, { in: win.props, anim: 'rise', out: win.strip, outAnim: 'rise' });

    const deck = slabMesh(def.outline, def.holes, base - 0.02, 0.02, M.plywood, { cast: false });
    add(deck, { in: win.deck, anim: 'show', out: win.strip, outAnim: 'show' });
    const rebar = slabMesh(def.outline, def.holes, base + 0.12, 0.004, M.rebar, { cast: false });
    add(rebar, { in: win.rebar, anim: 'show', out: [win.pour[1], win.pour[1] + 0.005], outAnim: 'show' });

    const s = slabMesh(def.outline, def.holes, base, SLAB_T, mat);
    add(s, { in: win.pour, anim: 'pour', cure: win.cure });
    s.userData.walkable = true;
    ctx.walkables.push(s);

    // Perimeter PT beams (270 × 600) under external walls
    for (const w of edgeWalls) {
      // 190 mm wide so the plastered wall (230 mm) hides it — it used to show as a
      // dark concrete band in the stairwell, which has no ceiling
      const b = beamAlong(w, top - 0.6, 0.6 - SLAB_T + 0.01, 190, mat);
      add(b, { in: win.pour, anim: 'pour', cure: win.cure });
    }
  }

  function flight(xFrom, xTo, yA, yB, z0, z1, n, mat) {
    const run = Math.abs(xTo - xFrom) / 1000;
    const H = z1 - z0;
    const r = H / n, tr = run / n, waist = 0.18;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    for (let i = 0; i < n; i++) {
      s.lineTo(i * tr, (i + 1) * r);
      s.lineTo((i + 1) * tr, (i + 1) * r);
    }
    s.lineTo(run, H - waist);
    s.lineTo((waist * run) / H, 0);
    s.lineTo(0, 0);
    const width = Math.abs(yB - yA) / 1000;
    const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = true;
    const [sxFrom] = toScene(xFrom, 0);
    const [, zA] = toScene(0, Math.min(yA, yB));
    const [, zB] = toScene(0, Math.max(yA, yB));
    if (xTo < xFrom) {
      m.rotation.y = Math.PI;
      m.position.set(sxFrom, z0, zB);
    } else {
      m.position.set(sxFrom, z0, zA);
    }
    return m;
  }
}
