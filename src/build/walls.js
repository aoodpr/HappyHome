import * as THREE from 'three';
import { FLOORS, LEVEL, SLAB_T, SLAB_RF, SLAB_UR, WALLS_RF, SLAB_FF, GF_ENCLOSED } from '../data/building.js';
import { pourMaterial } from '../core/materials.js';
import { box, inPoly, toScene } from './helpers.js';
import { stagger } from '../core/timeline.js';

/**
 * Walls for every storey + parapets: blockwork (course by course), plaster,
 * façade cladding, mouldings and all openings (windows, doors, shutter).
 */
export function buildWalls(ctx) {
  const { TL, M, root } = ctx;

  // Interior plaster that turns into painted finish during the interior stage.
  const plasterMat = ctx.plasterMat;
  const plasterCol = new THREE.Color(0xd9d4ca), paintCol = new THREE.Color(0xf6f1e8);
  TL.hook((t) => {
    const k = Math.min(1, Math.max(0, (t - 12.45) / 0.2));
    plasterMat.color.copy(plasterCol).lerp(paintCol, k);
  });

  const W = {
    gf: { ext: [8.0, 8.3], int: [8.25, 8.5], rc: [5.15, 5.4], plaster: [10.0, 10.3], facade: [11.0, 11.3] },
    ff: { ext: [8.45, 8.72], int: [8.65, 8.85], rc: [6.15, 6.36], plaster: [10.2, 10.5], facade: [11.2, 11.5] },
    rf: { ext: [8.8, 8.97], int: [8.8, 8.97], rc: [7.1, 7.3], plaster: [10.4, 10.55], facade: [11.4, 11.55] },
  };
  const outlines = { gf: GF_ENCLOSED, ff: SLAB_FF.outline, rf: null };

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
        base: floor.base, ffl: floor.ffl, H, slabAbove: true, floorKey: floor.key,
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
      if (op.sill > 0.001) pieces.push([op.u0, op.u1, 0, op.sill]);
      if (op.head < o.H - 0.001) pieces.push([op.u0, op.u1, op.head, o.H]);
      cur = op.u1;
    }
    if (cur < L - 0.001) pieces.push([cur, L, 0, o.H]);

    const [b0, b1] = o.blockWin;
    const coreMat = o.rc ? o.rcMat : M.blocks;
    for (const [u0, u1, y0, y1] of pieces) {
      const len = u1 - u0, h = y1 - y0;
      const core = box(len, h, t, coreMat, (u0 + u1) / 2, y0, 0);
      g.add(core);
      const inWin = [b0 + (y0 / o.H) * (b1 - b0), b0 + (y1 / o.H) * (b1 - b0) + 0.002];
      TL.add(core, o.rc ? { in: o.blockWin, anim: 'pour', cure: [o.blockWin[1], o.blockWin[1] + 0.2] } : { in: inWin, anim: 'course', h });
      core.userData.solid = true;
      ctx.solids.push(core);

      const pl = box(len, h, t + 0.03, plasterMat, (u0 + u1) / 2, y0, 0, { cast: false });
      g.add(pl);
      TL.add(pl, { in: o.plasterWin, anim: 'rise' });
    }

    // Façade cladding + mouldings on the exterior face
    if (outward) {
      const off = side * (Math.max(t / 2, 0.135) + 0.03);
      const mat = o.parapet || o.floorKey === 'rf' ? M.texturePaint : facingRoad ? M.stone : M.texturePaint;
      const top = o.slabAbove ? o.H + SLAB_T : o.H;
      const bottom = o.floorKey === 'gf' ? -(o.base - 0.15) : 0;
      for (const [u0, u1, y0, y1] of pieces) {
        const yy0 = y0 < 0.001 ? bottom : y0;
        const yy1 = y1 > o.H - 0.001 ? top : y1;
        const ext = (u0 < 0.001 ? 0.17 : 0) + (u1 > L - 0.001 ? 0.17 : 0);
        const cx = (u0 + u1) / 2 + (u0 < 0.001 ? -0.085 : 0) + (u1 > L - 0.001 ? 0.085 : 0);
        const sk = box(u1 - u0 + ext, yy1 - yy0, 0.04, mat, cx, yy0, off, { cast: false });
        g.add(sk);
        TL.add(sk, { in: o.facadeWin, anim: 'rise' });
      }
      // horizontal band at slab level + coping on parapets
      const mould = new THREE.Group();
      const ext = 0.34;
      if (o.slabAbove) mould.add(box(L + ext, 0.45, 0.12, M.texturePaint, L / 2, o.H - 0.05, off + side * 0.06));
      if (o.parapet) mould.add(box(L + ext, 0.12, 0.42, M.white, L / 2, o.H, side * 0.06));
      for (const op of openings) {
        if (op.kind === 'gap') continue;
        const fw = 0.12, pj = off + side * 0.05;
        mould.add(box(op.u1 - op.u0 + 2 * fw, fw, 0.1, M.white, (op.u0 + op.u1) / 2, op.head, pj));
        mould.add(box(fw, op.head - op.sill, 0.1, M.white, op.u0 - fw / 2, op.sill, pj));
        mould.add(box(fw, op.head - op.sill, 0.1, M.white, op.u1 + fw / 2, op.sill, pj));
        if (op.sill > 0.05) mould.add(box(op.u1 - op.u0 + 2 * fw + 0.06, 0.06, 0.16, M.white, (op.u0 + op.u1) / 2, op.sill - 0.06, pj + side * 0.03));
      }
      if (mould.children.length) {
        mould.traverse((m) => { if (m.isMesh && m.geometry.parameters.height < 0.4) m.castShadow = false; });
        g.add(mould);
        TL.add(mould, { in: [o.facadeWin[1] - 0.05, o.facadeWin[1] + 0.12], anim: 'show' });
      }
    }

    // Openings: windows, doors, shutter
    for (const op of openings) fillOpening(g, op, t, side, w.ext, o);
  }

  function roomSide(w, nx, nz) {
    // centre of the stair / lift room the wall belongs to
    const rooms = [[5130, 8900], [8360, 1900]];
    const mx = (w.a[0] + w.b[0]) / 2, my = (w.a[1] + w.b[1]) / 2;
    const c = rooms.reduce((best, r) => (Math.hypot(r[0] - mx, r[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? r : best));
    const dot = (c[0] - mx) * nx + (c[1] - my) * nz;
    return dot > 0 ? -1 : 1;
  }

  function fillOpening(g, op, t, side, ext, o) {
    const w = op.u1 - op.u0, h = op.head - op.sill, cx = (op.u0 + op.u1) / 2;
    if (op.kind === 'gap') return;
    const grp = new THREE.Group();
    grp.position.set(cx, op.sill, 0);
    g.add(grp);
    const fr = 0.06;
    if (op.kind === 'window' || op.kind === 'slide') {
      grp.add(box(w, fr, t * 0.6, M.alu, 0, 0, 0));
      grp.add(box(w, fr, t * 0.6, M.alu, 0, h - fr, 0));
      grp.add(box(fr, h, t * 0.6, M.alu, -w / 2 + fr / 2, 0, 0));
      grp.add(box(fr, h, t * 0.6, M.alu, w / 2 - fr / 2, 0, 0));
      const panels = Math.max(1, Math.round(w / 1.4));
      for (let i = 1; i < panels; i++) grp.add(box(0.05, h, t * 0.5, M.alu, -w / 2 + (w * i) / panels, 0, 0));
      if (h > 2.2) grp.add(box(w, 0.05, t * 0.5, M.alu, 0, h * 0.22, 0));
      const glass = box(w - 0.08, h - 0.08, 0.016, M.glass, 0, 0.04, 0, { cast: false, receive: false });
      grp.add(glass);
      glass.userData.solid = true;
      ctx.solids.push(glass);
      TL.add(grp, { in: ext ? stagger(Math.random() * 10 | 0, 10, 11.5, 11.85) : [12.55, 12.7], anim: 'rise' });
    } else if (op.kind === 'door') {
      const main = op.mark === 'D1';
      const isLift = op.mark === 'LIFT';
      // frame
      grp.add(box(0.05, h, t + 0.04, M.doorWood, -w / 2 + 0.025, 0, 0));
      grp.add(box(0.05, h, t + 0.04, M.doorWood, w / 2 - 0.025, 0, 0));
      grp.add(box(w, 0.05, t + 0.04, M.doorWood, 0, h - 0.05, 0));
      if (isLift) {
        grp.add(box(w / 2 - 0.05, h - 0.05, 0.04, M.galvanised, -w / 4, 0, t / 2 * (side || 1)));
        grp.add(box(w / 2 - 0.05, h - 0.05, 0.04, M.galvanised, w / 4, 0, t / 2 * (side || 1)));
      } else {
        const leafW = main ? w - 0.1 : w - 0.1;
        const leafGeo = new THREE.BoxGeometry(leafW, h - 0.06, main ? 0.07 : 0.045);
        leafGeo.translate(leafW / 2, (h - 0.06) / 2, 0);
        const leaf = new THREE.Mesh(leafGeo, main ? M.doorWood : ext ? M.doorWood : M.doorWhite);
        leaf.castShadow = leaf.receiveShadow = true;
        leaf.position.set(-w / 2 + 0.05, 0, 0);
        leaf.rotation.y = main ? -1.1 : -1.35 * (side || 1);
        if (main) leaf.add(box(0.03, 1.4, 0.06, M.galvanised, leafW - 0.15, (h - 1.4) / 2, 0.05));
        else leaf.add(box(0.12, 0.02, 0.02, M.galvanised, leafW - 0.1, 1.0, 0.04));
        grp.add(leaf);
      }
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
