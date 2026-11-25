import * as THREE from 'three';
import { LEVEL, ROOMS, SLAB_RF, SLAB_T, SLAB_UR, STAIR, WALLS_GF, WALLS_FF } from '../data/building.js';
import { box, cyl, rectBox, slabMesh, rng, toScene, tube } from './helpers.js';
import { stagger } from '../core/timeline.js';

const FFL = [LEVEL.gf, LEVEL.ff];
const CEIL = [3.3, 3.2];

/** MEP rough-in, roof build-up, finishes, sanitary ware and furniture. */
export function buildInterior(ctx) {
  const { TL, M, root } = ctx;
  const add = (obj, opts) => { root.add(obj); return TL.add(obj, opts); };
  const r = rng(42);

  /* ---------------- MEP rough-in ------------------------------------- */
  [WALLS_GF, WALLS_FF].forEach((walls, f) => {
    const ffl = FFL[f];
    const runs = [];
    walls.forEach((w, i) => {
      if (w.rc) return;
      const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      if (L < 1800 || i % 2) return;
      const horizontal = Math.abs(w.a[1] - w.b[1]) < 1;
      // pick a spot along the wall that is not inside an opening
      let px, py, ok = false;
      for (let tries = 0; tries < 8 && !ok; tries++) {
        const k = 0.15 + r() * 0.7;
        px = w.a[0] + (w.b[0] - w.a[0]) * k; py = w.a[1] + (w.b[1] - w.a[1]) * k;
        const along = horizontal ? px : py;
        ok = !(w.o || []).some((o) => along > Math.min(o[0], o[1]) - 150 && along < Math.max(o[0], o[1]) + 150);
      }
      if (!ok) return;
      const nx = -(w.b[1] - w.a[1]) / L, ny = (w.b[0] - w.a[0]) / L;
      const off = w.t / 2 + 3;
      const [sx, sz] = toScene(px + nx * off, py + ny * off);
      runs.push([sx, sz]);
    });
    runs.forEach(([sx, sz], i) => {
      const g = new THREE.Group();
      g.position.y = ffl;
      g.add(tube([sx, 0.3, sz], [sx, CEIL[f] + 0.5, sz], 0.01, M.conduit, 6));
      g.add(box(0.08, 0.08, 0.02, M.conduit, sx, 1.15, sz));
      g.add(box(0.08, 0.08, 0.02, M.conduit, sx, 0.3, sz));
      // chased into the wall: hidden once the plaster goes on
      add(g, { in: stagger(i, runs.length, 9.0 + f * 0.1, 9.45 + f * 0.05), anim: 'rise', out: [10.3 + f * 0.2, 10.31 + f * 0.2], outAnim: 'show' });
    });
  });
  // Water supply + drainage in the wet rooms
  const wet = ROOMS.filter((rm) => rm.floor === 'wet' && rm.key !== 'store');
  wet.forEach((rm, i) => {
    const [x0, y0, x1, y1] = rm.rect;
    const ffl = FFL[rm.f];
    const g = new THREE.Group();
    g.position.y = ffl;
    const [ax, az] = toScene(x0 + 60, y0 + 60), [bx] = toScene(x1 - 60, y0 + 60);
    g.add(tube([ax, 0.55, az], [bx, 0.55, az], 0.013, M.pipeWater, 6));
    g.add(tube([ax, 0.62, az], [bx, 0.62, az], 0.013, M.pipeWater, 6));
    g.add(tube([ax, 0.55, az], [ax, CEIL[rm.f], az], 0.013, M.pipeWater, 6));
    add(g, { in: stagger(i, wet.length, 9.2, 9.7), anim: 'rise', out: [10.3 + rm.f * 0.2, 10.31 + rm.f * 0.2], outAnim: 'show' });
    // drainage stack boxed in during plastering
    const [cx, cz] = toScene(x1 - 150, y1 - 150);
    const stack = cyl(0.055, (rm.f === 0 ? LEVEL.rfSSL : LEVEL.rfSSL) - ffl + 0.4, M.pipeDrain, cx, ffl - 0.4, cz, 10);
    add(stack, { in: stagger(i, wet.length, 9.4, 9.8), anim: 'rise', out: [10.3, 10.31], outAnim: 'show' });
    const boxing = box(0.26, LEVEL.rfSSL - SLAB_T - ffl + 0.01, 0.26, M.paint, cx, ffl, cz);
    add(boxing, { in: [10.3, 10.4], anim: 'rise' });
  });
  // AC ducts under the slabs (hidden later by gypsum ceilings)
  const ducted = ROOMS.filter((rm) => ['majlis', 'living', 'dining', 'familyLiving', 'bed'].includes(rm.furn));
  ducted.forEach((rm, i) => {
    const [x0, y0, x1, y1] = rm.rect;
    const ffl = FFL[rm.f];
    const yy = (y0 + y1) / 2;
    const d = rectBox(x0 + 300, yy - 200, x1 - 300, yy + 200, ffl + CEIL[rm.f] + 0.1, 0.3, M.ductSleeve);
    add(d, { in: stagger(i, ducted.length, 9.6, 9.95), anim: 'show' });
  });
  // Septic tank in the front yard (sheet 29)
  {
    const tank = new THREE.Group();
    tank.add(rectBox(3200, 19000, 6800, 20900, -1.6, 1.75, M.concrete));
    add(tank, { in: [9.5, 9.8], anim: 'rise' });
    const covers = new THREE.Group();
    for (const x of [3800, 5000, 6200]) {
      const [sx, sz] = toScene(x, 19950);
      covers.add(box(0.6, 0.03, 0.6, M.darkSteel, sx, 0.2, sz));
    }
    add(covers, { in: [13.5, 13.55], anim: 'show' });
  }
  // Roof AC condensing units
  {
    const units = new THREE.Group();
    const spots = [[12400, 1200], [13600, 1200], [14800, 1200], [12400, 16500], [13600, 16500], [3300, 2000], [4500, 2000]];
    for (const [x, y] of spots) {
      const [sx, sz] = toScene(x, y);
      const u = new THREE.Group();
      u.add(box(0.95, 0.75, 0.38, M.white, 0, 0.1, 0));
      u.add(cyl(0.25, 0.02, M.darkSteel, 0.12, 0.85, 0, 16));
      u.add(box(0.9, 0.1, 0.4, M.darkSteel, 0, 0, 0));
      u.position.set(sx, LEVEL.rf, sz);
      units.add(u);
    }
    add(units, { in: [11.85, 11.95], anim: 'drop' });
  }

  /* ---------------- wet-area wall tiling (to 2.4 m) ------------------- */
  {
    const TILE_H = 2.4;
    const wetRooms = ROOMS.filter((r) => ['bath', 'wash', 'laundry'].includes(r.key));
    wetRooms.forEach((rm, ri) => {
      const walls = rm.f === 0 ? WALLS_GF : WALLS_FF;
      const ffl = FFL[rm.f];
      const [x0, y0, x1, y1] = rm.rect;
      const g = new THREE.Group();
      g.position.y = ffl;
      // each edge: [fixed coord, from, to, horizontal?, inward normal sign]
      const edges = [[y0, x0, x1, true, 1], [y1, x0, x1, true, -1], [x0, y0, y1, false, 1], [x1, y0, y1, false, -1]];
      for (const [c, a, b, hor, inward] of edges) {
        // openings on walls lying along this edge
        const cuts = [];
        for (const w of walls) {
          const wHor = Math.abs(w.a[1] - w.b[1]) < 1, wVer = Math.abs(w.a[0] - w.b[0]) < 1;
          if (hor ? !wHor : !wVer) continue;
          const line = hor ? w.a[1] : w.a[0];
          if (Math.abs(line - c) > w.t / 2 + 40) continue;
          for (const [from, to, sill, , kind] of w.o || []) {
            const lo = Math.min(from, to), hi = Math.max(from, to);
            cuts.push({ lo, hi, top: kind === 'window' && sill > 0 ? sill : 0 });
          }
        }
        // split the edge into tiled pieces
        const pts = [a, b, ...cuts.flatMap((k) => [k.lo, k.hi])].filter((v) => v >= a && v <= b).sort((p, q) => p - q);
        for (let i = 0; i < pts.length - 1; i++) {
          const s0 = pts[i], s1 = pts[i + 1];
          if (s1 - s0 < 20) continue;
          const mid = (s0 + s1) / 2;
          const cut = cuts.find((k) => mid > k.lo && mid < k.hi);
          const h = cut ? cut.top : TILE_H;
          if (h < 0.05) continue;
          const off = 20 * inward;
          const [px, pz] = hor ? toScene(mid, c + off) : toScene(c + off, mid);
          const len = (s1 - s0) / 1000;
          const tile = hor ? box(len, Math.min(h, TILE_H), 0.008, M.wallTile, px, 0, pz, { cast: false })
            : box(0.008, Math.min(h, TILE_H), len, M.wallTile, px, 0, pz, { cast: false });
          g.add(tile);
        }
      }
      add(g, { in: stagger(ri, wetRooms.length, 12.05, 12.3), anim: 'rise' });
    });
  }

  /* ---------------- façade wall lights (front elevation, sheet 12) ------ */
  {
    const lights = new THREE.Group();
    const strip = (x, y, lvl) => {
      const [sx, sz] = toScene(x, y);
      lights.add(box(0.05, 1.0, 0.03, M.darkSteel, sx, lvl, sz, { cast: false }));
      lights.add(box(0.025, 0.9, 0.01, M.led, sx, lvl + 0.05, sz + 0.018, { cast: false }));
    };
    // ground floor piers either side of W1, first floor piers between W2 / W3
    for (const x of [2620, 6700]) strip(x, 18292 + 190, LEVEL.gf + 1.3);
    for (const x of [2620, 6700, 9450]) strip(x, 19400 + 190, LEVEL.ff + 1.3);
    for (const x of [10350, 14700]) strip(x, 21291 + 190, LEVEL.ff + 1.3);
    add(lights, { in: [11.9, 11.97], anim: 'show' });
  }

  /* ---------------- roof build-up (plaster stage) --------------------- */
  {
    const holes = [
      [[2100, 7450], [8294, 7450], [8294, 10350], [2100, 10350]],
      [[7160, 160], [9560, 160], [9560, 3824], [7160, 3824]],
    ];
    const screed = slabMesh(SLAB_RF.outline, holes, LEVEL.rfSSL, 0.12, M.concrete, { cast: false });
    add(screed, { in: [10.5, 10.65], anim: 'rise' });
    ctx.walkables.push(screed);
    const memb = slabMesh(SLAB_RF.outline, holes, LEVEL.rfSSL + 0.12, 0.012, M.membrane, { cast: false });
    add(memb, { in: [10.62, 10.8], anim: 'show' });
    const cool = slabMesh(SLAB_RF.outline, holes, LEVEL.rfSSL + 0.132, 0.008, M.coolRoof, { cast: false });
    add(cool, { in: [10.8, 10.98], anim: 'show' });
    ctx.walkables.push(cool);
    for (const s of SLAB_UR) {
      const c = slabMesh(s.outline, [], LEVEL.urSSL, 0.14, M.coolRoof, { cast: false });
      add(c, { in: [10.7, 10.95], anim: 'rise' });
    }
    // Water tanks on the stair-room roof (sheet 42)
    const tanks = new THREE.Group();
    for (const x of [3600, 5200]) {
      const [sx, sz] = toScene(x, 8900);
      tanks.add(box(1.5, 0.2, 1.5, M.concrete, sx, LEVEL.urSSL, sz));
      const tk = cyl(0.72, 1.6, M.tankWhite, sx, LEVEL.urSSL + 0.2, sz, 24);
      tanks.add(tk);
      tanks.add(cyl(0.25, 0.12, M.waterTank, sx, LEVEL.urSSL + 1.8, sz, 16));
    }
    add(tanks, { in: [7.9, 7.99], anim: 'drop' });
  }

  /* ---------------- floor finishes & ceilings ------------------------ */
  const floorMat = { marble: M.marble, wood: M.wood, wet: M.porcelain };
  const finRooms = ROOMS.filter((rm) => floorMat[rm.floor]);
  finRooms.forEach((rm, i) => {
    const [x0, y0, x1, y1] = rm.rect;
    const ffl = FFL[rm.f];
    const fin = rectBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40, ffl - 0.075, 0.075, floorMat[rm.floor], { cast: false });
    add(fin, { in: stagger(i, finRooms.length, 12.0, 12.35), anim: 'rise' });
    ctx.walkables.push(fin);
  });
  const ceilRooms = ROOMS.filter((rm) => !['stair', 'lift', 'garden'].includes(rm.key));
  ceilRooms.forEach((rm, i) => {
    const [x0, y0, x1, y1] = rm.rect;
    const ffl = FFL[rm.f];
    const c = rectBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40, ffl + CEIL[rm.f], 0.03, M.gypsum, { cast: false });
    add(c, { in: stagger(i, ceilRooms.length, 12.3, 12.5), anim: 'show' });
    // recessed spot lights
    const lights = new THREE.Group();
    for (let x = x0 + 900; x < x1 - 500; x += 1500) {
      for (let y = y0 + 900; y < y1 - 500; y += 1500) {
        const [sx, sz] = toScene(x, y);
        lights.add(cyl(0.05, 0.01, M.led, sx, ffl + CEIL[rm.f] - 0.005, sz, 10, { cast: false }));
      }
    }
    if (lights.children.length) add(lights, { in: [12.48, 12.5], anim: 'show' });
  });
  // Stair finish: concrete → marble
  TL.hook((t) => {
    const m = ctx.stairMaterial;
    if (!m) return;
    const want = t > 12.2 ? M.marble : M.concrete;
    if (m.userData.src !== want) {
      m.map = want.map; m.normalMap = want.normalMap; m.roughness = want.roughness; m.color.copy(want.color);
      m.userData.src = want;
      m.needsUpdate = true;
    }
  });

  /* ---------------- railings ------------------------------------------ */
  {
    const rail = new THREE.Group();
    rail.position.y = LEVEL.ff;
    const glassRun = (x0, y0, x1, y1, base) => {
      const [ax, az] = toScene(x0, y0), [bx, bz] = toScene(x1, y1);
      const L = Math.hypot(bx - ax, bz - az);
      const g = new THREE.Group();
      g.position.set(ax, base, az);
      g.rotation.y = -Math.atan2(bz - az, bx - ax);
      const panel = box(L, 0.95, 0.015, M.glass, L / 2, 0.05, 0, { cast: false, receive: false });
      panel.userData.solid = true;
      ctx.solids.push(panel);
      g.add(panel, box(L, 0.04, 0.05, M.galvanised, L / 2, 1.0, 0));
      rail.add(g);
    };
    glassRun(STAIR.landingX, 8950, STAIR.x1, 8950, 0);
    add(rail, { in: [12.4, 12.5], anim: 'rise' });

    // Stainless handrails with posts along the inner edge of every flight.
    STAIR.storeys.forEach(([y0, y1]) => {
      const g = new THREE.Group();
      g.position.y = y0;
      const mid = (y1 - y0) / 2;
      const run = (xa, xb, py, za, zb) => {
        const [ax, az] = toScene(xa, py), [bx] = toScene(xb, py);
        g.add(tube([ax, za + 0.92, az], [bx, zb + 0.92, az], 0.022, M.galvanised, 10));
        const n = Math.max(2, Math.round(Math.abs(bx - ax) / 0.95));
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const x = ax + (bx - ax) * k, z = za + (zb - za) * k;
          g.add(tube([x, z, az], [x, z + 0.92, az], 0.014, M.galvanised, 8));
        }
      };
      run(STAIR.x1 - 150, STAIR.landingX, STAIR.flight1.y1 - 40, 0.02, mid);
      run(STAIR.landingX, STAIR.x1 - 150, STAIR.flight2.y0 + 40, mid, y1 - y0 - 0.15);
      add(g, { in: [12.42, 12.5], anim: 'rise' });
    });
  }

}


