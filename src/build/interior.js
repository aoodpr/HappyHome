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
  }

  /* ---------------- sanitary ware, kitchen, furniture ---------------- */
  const items = [];
  for (const rm of ROOMS) {
    const g = furnish(rm);
    if (g && g.children.length) items.push(g);
  }
  items.forEach((g, i) => {
    g.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    add(g, { in: stagger(i, items.length, 12.6, 12.98), anim: 'pop' });
  });

  function furnish(rm) {
    const [x0, y0, x1, y1] = rm.rect;
    const ffl = FFL[rm.f];
    const g = new THREE.Group();
    const [cx, cz] = toScene((x0 + x1) / 2, (y0 + y1) / 2);
    const [ax, az] = toScene(x0, y0), [bx, bz] = toScene(x1, y1);
    const W = bx - ax, D = bz - az;
    g.position.set(cx, ffl, cz);
    const P = (x, y) => [x - cx, y - cz]; // scene → group-local

    if (rm.floor === 'wet' && ['bath', 'wash'].includes(rm.key)) {
      // vanity + basin on the long wall, WC in the corner
      g.add(box(Math.min(1.6, W - 0.3), 0.85, 0.55, M.counter, 0, 0, -D / 2 + 0.3));
      g.add(box(0.5, 0.04, 0.38, M.sanitary, 0, 0.85, -D / 2 + 0.3));
      g.add(box(Math.min(1.6, W - 0.3), 0.9, 0.02, M.glass, 0, 1.1, -D / 2 + 0.02, { cast: false }));
      if (rm.key === 'bath') {
        const wc = new THREE.Group();
        wc.add(box(0.38, 0.4, 0.55, M.sanitary, 0, 0, 0));
        wc.add(box(0.4, 0.38, 0.18, M.sanitary, 0, 0.4, -0.2));
        wc.position.set(W / 2 - 0.4, 0, D / 2 - 0.45);
        g.add(wc);
        if (rm.f === 1) g.add(box(0.02, 2.0, Math.min(1.2, D - 0.4), M.glass, -W / 2 + 1.0, 0, D / 2 - 0.65, { cast: false }));
      }
      return g;
    }
    switch (rm.furn) {
      case 'majlis': {
        const depth = 0.8;
        g.add(box(W - 0.4, 0.42, depth, M.fabric, 0, 0, -D / 2 + depth / 2 + 0.15));
        g.add(box(W - 0.4, 0.45, 0.18, M.fabric, 0, 0.42, -D / 2 + 0.22));
        for (const s of [-1, 1]) {
          g.add(box(depth, 0.42, D - 2.2, M.fabric, s * (W / 2 - depth / 2 - 0.15), 0, 0.3));
          g.add(box(0.18, 0.45, D - 2.2, M.fabric, s * (W / 2 - 0.22), 0.42, 0.3));
          for (let k = -1; k <= 1; k++) g.add(box(0.12, 0.35, 0.5, M.cushion, s * (W / 2 - 0.35), 0.42, k * 1.2 + 0.3));
        }
        g.add(box(W - 2.4, 0.012, D - 2.6, M.rug, 0, 0, 0.2, { cast: false }));
        g.add(box(1.2, 0.4, 0.7, M.doorWood, 0, 0, 0.2));
        break;
      }
      case 'dining': {
        g.add(box(2.6, 0.05, 1.1, M.doorWood, 0, 0.73, 0));
        g.add(box(0.12, 0.73, 0.8, M.darkSteel, -1.0, 0, 0));
        g.add(box(0.12, 0.73, 0.8, M.darkSteel, 1.0, 0, 0));
        for (let k = -1.5; k <= 1.5; k += 1) for (const s of [-1, 1]) {
          const ch = new THREE.Group();
          ch.add(box(0.45, 0.46, 0.45, M.fabricDark, 0, 0, 0));
          ch.add(box(0.45, 0.5, 0.06, M.fabricDark, 0, 0.46, -0.2));
          ch.position.set(k * 0.65, 0, s * 0.8);
          ch.rotation.y = s > 0 ? Math.PI : 0;
          g.add(ch);
        }
        break;
      }
      case 'living':
      case 'familyLiving': {
        const sx = Math.min(3.2, W - 1.5);
        const s = rm.furn === 'living' ? -1 : 1; // living: TV on the garage wall (+Z), sofa facing it
        g.add(box(sx, 0.42, 0.95, M.fabricBlue, 0, 0, -s * (D / 2 - 1.6)));
        g.add(box(sx, 0.45, 0.22, M.fabricBlue, 0, 0.42, -s * (D / 2 - 1.2)));
        g.add(box(0.95, 0.42, 2.0, M.fabricBlue, -sx / 2 - 0.3, 0, -s * (D / 2 - 2.4)));
        g.add(box(2.8, 0.012, 2.2, M.rug, 0, 0, -s * (D / 2 - 3.2), { cast: false }));
        g.add(box(1.3, 0.38, 0.75, M.doorWood, 0, 0, -s * (D / 2 - 3.2)));
        g.add(box(2.4, 0.45, 0.45, M.counter, 0, 0, s * (D / 2 - 0.35)));
        g.add(box(2.2, 1.25, 0.06, M.darkSteel, 0, 1.0, s * (D / 2 - 0.2)));
        break;
      }
      case 'bed': {
        const bed = new THREE.Group();
        bed.add(box(2.0, 0.45, 2.15, M.fabric, 0, 0, 0));
        bed.add(box(2.0, 0.12, 2.0, M.white, 0, 0.45, 0.05));
        bed.add(box(2.3, 1.2, 0.12, M.doorWood, 0, 0, -1.1));
        bed.add(box(0.6, 0.15, 0.4, M.white, -0.5, 0.57, -0.8));
        bed.add(box(0.6, 0.15, 0.4, M.white, 0.5, 0.57, -0.8));
        bed.add(box(2.0, 0.04, 0.9, M.fabricBlue, 0, 0.57, 0.5));
        for (const s of [-1, 1]) bed.add(box(0.5, 0.5, 0.45, M.doorWood, s * 1.45, 0, -0.85));
        bed.position.set(0, 0, -D / 2 + 1.25);
        g.add(bed);
        g.add(box(Math.min(2.6, W - 1), 0.012, 1.8, M.rug, 0, 0, -D / 2 + 2.8, { cast: false }));
        g.add(box(0.6, 2.4, Math.min(2.4, D - 2.5), M.cabinet, W / 2 - 0.35, 0, 0.6));
        break;
      }
      case 'kitchen': {
        g.add(box(W - 0.3, 0.9, 0.62, M.cabinet, 0, 0, -D / 2 + 0.36));
        g.add(box(W - 0.3, 0.04, 0.64, M.counter, 0, 0.9, -D / 2 + 0.36));
        g.add(box(W - 0.3, 0.75, 0.35, M.cabinet, 0, 1.55, -D / 2 + 0.2));
        g.add(box(0.62, 0.9, D - 1.4, M.cabinet, W / 2 - 0.36, 0, 0.3));
        g.add(box(0.64, 0.04, D - 1.4, M.counter, W / 2 - 0.36, 0.9, 0.3));
        g.add(box(0.7, 2.1, 0.7, M.galvanised, -W / 2 + 0.5, 0, -D / 2 + 0.4)); // fridge
        g.add(box(2.4, 0.9, 1.0, M.cabinet, -0.3, 0, 0.3));
        g.add(box(2.5, 0.05, 1.1, M.counter, -0.3, 0.9, 0.3));
        break;
      }
      case 'outdoor': {
        for (const z of [-1, 0.5]) {
          g.add(box(0.7, 0.4, 0.7, M.fabricDark, 0, -0.15, z));
          g.add(box(0.7, 0.35, 0.12, M.fabricDark, 0, 0.25, z - 0.3));
        }
        g.add(cyl(0.35, 0.45, M.darkSteel, 0, -0.15, -0.25, 16));
        break;
      }
      case 'garage': {
        g.add(car(M.carWhite, 1.5, 0, 0.1));
        g.add(car(M.carRed, -1.5, 0.3, -0.05));
        g.position.y = 0.425;
        break;
      }
      default:
        return null;
    }
    return g;
  }

  function car(mat, x, z, rot) {
    const c = new THREE.Group();
    c.add(box(1.85, 0.7, 4.7, mat, 0, 0.3, 0));
    c.add(box(1.6, 0.55, 2.4, M.glass, 0, 1.0, -0.2, { cast: false }));
    c.add(box(1.62, 0.06, 2.3, mat, 0, 1.53, -0.2));
    for (const [wx, wz] of [[-0.85, 1.5], [0.85, 1.5], [-0.85, -1.5], [0.85, -1.5]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), M.rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      w.castShadow = true;
      c.add(w);
    }
    c.add(box(1.6, 0.12, 0.05, M.led, 0, 0.62, 2.36, { cast: false }));
    c.position.set(x, 0, z);
    c.rotation.y = rot;
    return c;
  }
  ctx.makeCar = car;
}

