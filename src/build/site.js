import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRID, LEVEL, PAVING, PLOT, SLAB_FF } from '../data/building.js';
import { worldUV } from '../core/textures.js';
import { box, cyl, rectBox, slabMesh, rng, toScene, tube } from './helpers.js';
import { stagger } from '../core/timeline.js';

/** Ground, street, neighbours, temporary works and final landscaping. */
export function buildSite(ctx) {
  const { TL, M, root } = ctx;
  const add = (obj, opts) => { root.add(obj); return TL.add(obj, opts); };
  const always = (obj) => { root.add(obj); return obj; };

  /* ---------- ground with a hole for the foundation pit --------------- */
  {
    // Four tessellated strips around the pit (not one 400 m polygon): very long
    // triangles lose depth precision and their edges bleed through walls as dotted lines.
    const [ax, az] = toScene(1200, 30), [bx, bz] = toScene(16000, 21391);
    const E = 200;
    const strip = (x0, z0, x1, z1) => {
      const w = x1 - x0, d = z1 - z0;
      const g = new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / 8)), Math.max(1, Math.ceil(d / 8)));
      g.rotateX(-Math.PI / 2);
      g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      worldUV(g, 3);
      const m = new THREE.Mesh(g, M.sand);
      m.receiveShadow = true;
      m.userData.walkable = true;
      ctx.walkables.push(always(m));
    };
    strip(-E, -E, E, az);
    strip(-E, bz, E, E);
    strip(-E, az, ax, bz);
    strip(bx, az, E, bz);
  }

  /* ---------- street (Road 5554) ------------------------------------- */
  const front = toScene(0, PLOT.y1)[1];
  // street pieces are split every ~8 m for the same depth-precision reason as the ground
  const longBox = (w, h, d, mat, x, y, z, opts) => {
    const m = box(w, h, d, mat, x, y, z, opts);
    const g = new THREE.BoxGeometry(w, h, d, Math.ceil(w / 8), 1, Math.max(1, Math.ceil(d / 8)));
    g.translate(0, h / 2, 0);
    worldUV(g, mat.userData.tile || 1, [x, y, z]);
    m.geometry.dispose();
    m.geometry = g;
    return m;
  };
  {
    const walk = longBox(400, 0.15, 2.2, M.pavers, 0, 0, front + 1.1);
    walk.receiveShadow = true;
    ctx.walkables.push(always(walk));
    always(longBox(400, 0.18, 0.18, M.kerb, 0, 0, front + 2.2));
    const road = longBox(400, 0.02, 11, M.asphalt, 0, -0.01, front + 7.8, { cast: false });
    ctx.walkables.push(always(road));
    for (let x = -190; x < 200; x += 6) always(box(3, 0.025, 0.15, M.lineWhite, x, 0, front + 7.8, { cast: false }));
    always(longBox(400, 0.18, 0.18, M.kerb, 0, 0, front + 13.4));
    const walk2 = longBox(400, 0.15, 2.2, M.pavers, 0, 0, front + 14.6);
    ctx.walkables.push(always(walk2));
    // street lights
    for (let x = -36; x <= 36; x += 24) {
      const pole = new THREE.Group();
      pole.add(cyl(0.08, 7, M.darkSteel, 0, 0, 0, 8));
      pole.add(box(0.15, 0.1, 1.6, M.darkSteel, 0, 6.9, 0.7));
      pole.add(box(0.3, 0.08, 0.5, M.led, 0, 6.82, 1.4));
      pole.position.set(x, 0, front + 1.9);
      always(pole);
    }
  }

  /* ---------- neighbouring villas (context massing) ------------------ */
  // Context buildings live in their own group so the UI can hide them (hidden by default).
  const neighbours = new THREE.Group();
  neighbours.name = 'neighbours';
  root.add(neighbours);
  ctx.neighbours = neighbours;
  const neighbour = (x0, z0, w, d, floors, mat, seed) => {
    const g = new THREE.Group();
    const r = rng(seed);
    const h = floors * 4.1;
    g.add(box(w, h, d, mat, 0, 0, 0));
    g.add(box(w + 0.1, 1.1, d + 0.1, mat, 0, h, 0));
    g.add(box(w + 0.3, 0.12, d + 0.3, M.white, 0, h + 1.1, 0));
    g.add(box(w + 0.3, 0.35, d + 0.3, M.white, 0, 4.0, 0));
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < Math.floor(w / 4); k++) {
        const wx = -w / 2 + 2 + k * 4 + r() * 0.5;
        g.add(box(1.8, 2.0, 0.08, M.glass, wx, f * 4.1 + 1.1, d / 2 + 0.02, { cast: false }));
        g.add(box(1.8, 2.0, 0.08, M.alu, wx, f * 4.1 + 1.1, d / 2 - 0.02, { cast: false }));
      }
    }
    g.position.set(x0, 0, z0);
    neighbours.add(mergeByMaterial(g));
  };
  neighbour(-17, 0, 13, 17, 2, M.neighbour, 3);
  neighbour(17.5, -1.5, 13, 16, 2, M.neighbour2, 5);
  neighbour(1, -24, 15, 14, 2, M.neighbour2, 7);
  neighbour(-16, -24, 13, 14, 2, M.neighbour, 9);
  neighbour(18, -23, 13, 14, 3, M.neighbour, 11);
  neighbour(-1, 34, 16, 12, 2, M.neighbour, 13);
  neighbour(19, 34, 14, 12, 2, M.neighbour2, 15);
  neighbour(-20, 34, 14, 12, 2, M.neighbour2, 17);
  // When the neighbours are hidden a soft tree backdrop takes their place.
  ctx.backTrees = backgroundTrees(root, M);

  // Existing boundary walls shared with neighbours (sides + back)
  const [lx] = toScene(-25, 0), [rx] = toScene(PLOT.x1, 0);
  const [, bz] = toScene(0, -150), [, fz] = toScene(0, 21290);
  const bWallMat = M.render;
  const bwall = (x0, z0, x1, z1) => {
    const m = box(Math.abs(x1 - x0) || 0.2, 2.4, Math.abs(z1 - z0) || 0.2, bWallMat, (x0 + x1) / 2, 0, (z0 + z1) / 2);
    m.userData.solid = true;
    ctx.solids.push(always(m));
  };
  bwall(lx - 0.1, bz, lx - 0.1, fz);
  bwall(lx, bz - 0.1, rx, bz - 0.1);
  bwall(rx + 0.1, bz, rx + 0.1, toScene(0, 15000)[1]);

  /* ---------- temporary works ----------------------------------------- */
  // Hoarding along the street with a site gate.
  {
    const hoard = new THREE.Group();
    const z = fz + 0.35;
    for (let x = lx; x < rx - 0.1; x += 2.4) {
      if (x > 0.5 && x < 6.5) continue; // gate opening for trucks
      const w = Math.min(2.4, rx - x);
      hoard.add(box(w - 0.02, 2.4, 0.04, M.hoarding, x + w / 2, 0, z));
      hoard.add(box(w - 0.02, 0.35, 0.05, M.hoardingWhite, x + w / 2, 1.6, z));
      hoard.add(box(0.06, 2.5, 0.06, M.galvanised, x, 0, z - 0.04));
    }
    // sign board
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.6 }));
    sign.position.set(-4.5, 3.3, z + 0.05);
    hoard.add(sign);
    hoard.add(box(0.08, 2.4, 0.08, M.galvanised, -5.9, 0, z));
    hoard.add(box(0.08, 2.4, 0.08, M.galvanised, -3.1, 0, z));
    add(hoard, { in: [0.05, 0.3], anim: 'rise', out: [13.0, 13.12], outAnim: 'rise' });
    hoard.traverse((o) => { if (o.isMesh && o.geometry.parameters?.height === 2.4) { o.userData.solid = true; ctx.solids.push(o); } });
  }
  // Site office container + toilet on the verge
  {
    const office = new THREE.Group();
    office.add(box(6, 2.6, 2.4, M.container, 0, 0, 0));
    for (let i = -2; i <= 2; i += 2) office.add(box(1.0, 0.8, 0.04, M.glass, i, 1.2, 1.22, { cast: false }));
    office.add(box(0.9, 2.1, 0.05, M.alu, 2.6, 0, 1.22));
    office.add(box(6.2, 0.1, 2.6, M.galvanised, 0, 2.6, 0));
    office.add(box(1.0, 0.6, 0.6, M.white, -2, 2.7, 0)); // AC unit
    office.position.set(-12, 0, front + 1.15);
    add(office, { in: [0.15, 0.35], anim: 'drop', out: [13.02, 13.14], outAnim: 'drop' });
    const wc = box(1.1, 2.3, 1.1, M.toilet, -8.2, 0, front + 1.2);
    add(wc, { in: [0.2, 0.36], anim: 'drop', out: [13.02, 13.14], outAnim: 'drop' });
  }
  // Survey: stakes on the grid + string lines
  {
    const sv = new THREE.Group();
    const gx = Object.values(GRID.x).slice(1), gy = Object.values(GRID.y);
    for (const x of [gx[0], gx[gx.length - 1]]) for (const y of gy) {
      const [sx, sz] = toScene(x, y);
      sv.add(box(0.05, 0.6, 0.05, M.stake, sx, 0, sz));
    }
    for (const y of [gy[0], gy[gy.length - 1]]) for (const x of gx) {
      const [sx, sz] = toScene(x, y);
      sv.add(box(0.05, 0.6, 0.05, M.stake, sx, 0, sz));
    }
    for (const y of gy) {
      const [x0, z] = toScene(gx[0], y), [x1] = toScene(gx[gx.length - 1], y);
      sv.add(box(x1 - x0, 0.006, 0.006, M.tape, (x0 + x1) / 2, 0.45, z, { cast: false }));
    }
    for (const x of gx) {
      const [sx, z0] = toScene(x, gy[0]), [, z1] = toScene(x, gy[gy.length - 1]);
      sv.add(box(0.006, 0.006, z1 - z0, M.tape, sx, 0.45, (z0 + z1) / 2, { cast: false }));
    }
    add(sv, { in: [0.4, 0.9], anim: 'rise', out: [1.0, 1.08], outAnim: 'rise' });
  }
  // Material stockpiles in the front yard
  {
    const pile = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.6, 18), M.sand);
    pile.geometry.translate(0, 0.8, 0);
    pile.position.set(-12, 0, front - 2.0);
    pile.castShadow = pile.receiveShadow = true;
    add(pile, { in: [0.9, 1.0], anim: 'pop', out: [4.95, 5.05], outAnim: 'pop' });

    const rebar = new THREE.Group();
    for (let i = 0; i < 40; i++) rebar.add(tube([-1.5 + (i % 10) * 0.035, 0.08 + Math.floor(i / 10) * 0.035, 0], [-1.5 + (i % 10) * 0.035, 0.08 + Math.floor(i / 10) * 0.035, -6], 0.012, M.rebarSolid, 5));
    rebar.add(box(0.4, 0.08, 0.1, M.plywood, -1.33, 0, -1));
    rebar.add(box(0.4, 0.08, 0.1, M.plywood, -1.33, 0, -5));
    rebar.rotation.y = Math.PI / 2;
    rebar.position.set(1, 0, front - 0.6);
    add(rebar, { in: [1.9, 2.0], anim: 'drop', out: [7.4, 7.5], outAnim: 'drop' });

    const ply = new THREE.Group();
    for (let i = 0; i < 12; i++) ply.add(box(2.44, 0.018, 1.22, M.plywood, 0, 0.1 + i * 0.02, 0));
    ply.add(box(2.3, 0.1, 0.1, M.plywood, 0, 0, -0.4));
    ply.add(box(2.3, 0.1, 0.1, M.plywood, 0, 0, 0.4));
    ply.position.set(-3.2, 0, front - 1.0);
    add(ply, { in: [2.25, 2.35], anim: 'drop', out: [7.9, 8.0], outAnim: 'drop' });

    // Block pallets for the blockwork stage
    const pallets = new THREE.Group();
    for (let p = 0; p < 4; p++) {
      const pg = new THREE.Group();
      pg.add(box(1.2, 0.14, 1.0, M.plywood, 0, 0, 0));
      pg.add(box(1.2, 0.8, 1.0, M.blocks, 0, 0.14, 0));
      pg.position.set(-5 + p * 1.5, 0, front - 1.4);
      pallets.add(pg);
    }
    add(pallets, { in: [7.85, 7.98], anim: 'drop', out: [8.85, 8.98], outAnim: 'drop' });
  }

  /* ---------- scaffolding around the façades -------------------------- */
  {
    const runs = [];
    const off = 1000;
    const o = SLAB_FF.outline;
    const n = o.length;
    for (let i = 0; i < n; i++) {
      const a = o[i], b = o[(i + 1) % n];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 2500) continue;
      const nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L; // outward for CCW-in-screen outline
      runs.push([[a[0] + nx * off, a[1] + ny * off], [b[0] + nx * off, b[1] + ny * off]]);
    }
    const height = LEVEL.parapet + 0.4;
    runs.forEach((r, i) => {
      const g = scaffoldRun(r[0], r[1], height);
      add(g, { in: stagger(i, runs.length, 8.25, 8.5), anim: 'rise', out: [13.0, 13.14], outAnim: 'rise' });
    });
  }

  function scaffoldRun(a, b, height) {
    const [ax, az] = toScene(...a), [bx, bz] = toScene(...b);
    const L = Math.hypot(bx - ax, bz - az);
    const g = new THREE.Group();
    g.position.set(ax, 0, az);
    g.rotation.y = -Math.atan2(bz - az, bx - ax);
    const bays = Math.max(1, Math.round(L / 1.8));
    const bay = L / bays;
    const lifts = Math.floor(height / 2);
    const tubeGeo = new THREE.CylinderGeometry(0.024, 0.024, 1, 6);
    const count = (bays + 1) * 2 + (lifts + 1) * bays * 2 + (bays + 1) * (lifts + 1) + bays;
    const inst = new THREE.InstancedMesh(tubeGeo, M.galvanised, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let k = 0;
    const put = (x0, y0, z0, x1, y1, z1) => {
      const d = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0);
      const len = d.length();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      s.set(1, len, 1);
      inst.setMatrixAt(k++, m.compose(p, q, s));
    };
    for (let i = 0; i <= bays; i++) for (const z of [-0.35, 0.35]) put(i * bay, 0, z, i * bay, height, z);
    for (let l = 0; l <= lifts; l++) for (let i = 0; i < bays; i++) for (const z of [-0.35, 0.35]) put(i * bay, l * 2 + 0.1, z, (i + 1) * bay, l * 2 + 0.1, z);
    for (let l = 0; l <= lifts; l++) for (let i = 0; i <= bays; i++) put(i * bay, l * 2 + 0.1, -0.4, i * bay, l * 2 + 0.1, 0.4);
    for (let i = 0; i < bays; i++) put(i * bay, 0.1, 0.38, (i + 1) * bay, Math.min(height, 2 * 2 + 0.1), 0.38); // bracing
    inst.count = k;
    inst.castShadow = true;
    g.add(inst);
    for (let l = 1; l <= lifts; l++) g.add(box(L, 0.04, 0.6, M.plywood, L / 2, l * 2 + 0.12, 0, { cast: true }));
    // safety netting strip at the top lift
    return g;
  }

  /* ---------- landscaping & boundary (handover) ----------------------- */
  {
    PAVING.forEach((p, i) => {
      const mat = p.kind === 'gravel' ? M.gravel : M.pavers;
      const m = slabMesh(p.outline, [], 0, p.level, mat);
      add(m, { in: stagger(i, PAVING.length, 13.25, 13.5), anim: 'rise' });
      ctx.walkables.push(m);
    });
    // Garden lawn + outdoor seating deck
    const lawn = rectBox(12300, 5900, 15300, 8700, 0.35, 0.03, M.grass);
    add(lawn, { in: [13.4, 13.55], anim: 'rise' });
    // Planter box in front of the male majlis (sheet 12)
    const planter = new THREE.Group();
    planter.add(rectBox(2167, 18392, 7160, 18900, 0.2, 0.25, M.stone));
    planter.add(rectBox(2250, 18450, 7080, 18840, 0.42, 0.04, M.soilDark));
    const r = rng(77);
    for (let x = 2400; x < 7000; x += 380) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + r() * 0.08, 1), r() > 0.5 ? M.leaf : M.leafDark);
      const [sx, sz] = toScene(x, 18650);
      b.position.set(sx, 0.62, sz);
      b.scale.y = 0.8;
      b.castShadow = true;
      planter.add(b);
    }
    add(planter, { in: [13.45, 13.6], anim: 'rise' });

    // Front boundary wall + pedestrian gate (site photo / owner's reference render):
    // 2.3 m rendered wall (Jotun 1964), coping, pilaster pairs framing grey stone strips with
    // ground uplights, 2.6 m gate piers with stepped caps, dark aluminium gate with slatted side panel.
    const fw = new THREE.Group();
    const WH = 2.3, PH = 2.6;
    const seg = (x0, x1) => {
      const [a] = toScene(x0, 0), [b] = toScene(x1, 0);
      fw.add(box(b - a, WH, 0.22, M.texturePaint, (a + b) / 2, 0, fz));
      fw.add(box(b - a + 0.06, 0.08, 0.3, M.trimStone, (a + b) / 2, WH, fz));
      // pilaster pairs with a stone strip between, every ~2.4 m
      const n = Math.max(1, Math.round((b - a) / 2.4));
      for (let i = 0; i < n; i++) {
        const c = a + ((b - a) * (i + 0.5)) / n;
        for (const dx of [-0.2, 0.2]) fw.add(box(0.12, WH - 0.05, 0.3, M.trimStone, c + dx, 0, fz + 0.02));
        fw.add(box(0.26, WH - 0.12, 0.26, M.stone, c, 0.06, fz + 0.01));
        fw.add(box(0.06, 0.02, 0.04, M.led, c, 0.03, fz + 0.15, { cast: false })); // uplight
      }
    };
    seg(-25, 7260);
    for (const x of [-25, 7160, 9458]) {
      const [sx] = toScene(x, 0);
      fw.add(box(0.45, PH, 0.45, M.trimStone, sx + 0.1, 0, fz));
      fw.add(box(0.55, 0.08, 0.55, M.trimStone, sx + 0.1, PH, fz));
      fw.add(box(0.45, 0.1, 0.45, M.trimStone, sx + 0.1, PH + 0.08, fz));
      fw.add(box(0.03, 0.55, 0.03, M.darkSteel, sx + 0.1, 1.2, fz + 0.24)); // slim wall light
    }
    add(fw, { in: [13.1, 13.4], anim: 'course', h: PH });
    fw.traverse((o) => { if (o.isMesh) { o.userData.solid = true; ctx.solids.push(o); } });
    const gate = new THREE.Group();
    const [g0] = toScene(7360, 0), [g1] = toScene(9258, 0);
    const gw = g1 - g0, leafW = gw * 0.66, gh = 2.25;
    // fixed slatted side panel
    const slats = new THREE.Group();
    gate.add(box(gw - leafW, 0.05, 0.06, M.darkSteel, g0 + leafW + (gw - leafW) / 2, 0.02, fz));
    gate.add(box(gw - leafW, 0.05, 0.06, M.darkSteel, g0 + leafW + (gw - leafW) / 2, gh - 0.05, fz));
    for (let x = g0 + leafW + 0.05; x < g1 - 0.02; x += 0.07) slats.add(box(0.035, gh - 0.06, 0.05, M.darkSteel, x, 0.03, fz));
    gate.add(slats);
    // solid aluminium leaf (hinged at the pier), long black pull — opens in walk mode
    const leaf = new THREE.Group();
    const lg = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.02, gh, 0.06).translate((leafW - 0.02) / 2, gh / 2, 0), M.darkSteel);
    lg.castShadow = true;
    leaf.add(lg);
    leaf.add(box(0.025, 1.1, 0.03, M.alu, leafW - 0.18, 0.6, 0.05));
    leaf.add(box(0.025, 1.1, 0.03, M.alu, leafW - 0.18, 0.6, -0.05));
    leaf.position.set(g0 + 0.01, 0, fz);
    leaf.traverse((o) => { if (o.isMesh) { o.userData.solid = true; ctx.solids.push(o); } });
    leaf.userData.dynamic = true;
    gate.add(leaf);
    ctx.doors = ctx.doors || [];
    ctx.doors.push({ type: 'hinge', obj: leaf, prop: 'rotY', closed: 0, open: 1.35, k: 0, isOpen: false, anchor: gate });
    add(gate, { in: [13.8, 13.9], anim: 'rise' });

    // Palms
    const palmProto = makePalm(M);
    // Palms along the street verge and one in the courtyard garden (the side
    // yards are only 2 m wide, so they get shrubs instead).
    const palms = [[13700, 7400, 0.62], [-3500, 22300, 1.05], [-9500, 22300, 0.95], [-15500, 22300, 1.1],
      [19500, 22300, 1.0], [25500, 22300, 0.9], [31500, 22300, 1.05]];
    palms.forEach(([x, y, s], i) => {
      const p = palmProto.clone();
      const [sx, sz] = toScene(x, y);
      p.position.set(sx, y > 21425 ? 0.15 : 0.35, sz);
      p.scale.setScalar(s);
      p.rotation.y = i * 1.7;
      add(p, { in: stagger(i, palms.length, 13.5, 13.85), anim: 'pop' });
    });
    const shrubs = new THREE.Group();
    const rs = rng(31);
    const shrub = (x, y, lvl, size) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), rs() > 0.5 ? M.leaf : M.leafDark);
      const [sx, sz] = toScene(x, y);
      b.position.set(sx, lvl + size * 0.7, sz);
      b.scale.set(1, 0.85, 1);
      b.castShadow = true;
      shrubs.add(b);
    };
    for (let y = 1200; y < 18000; y += 1700) shrub(900 + rs() * 300, y, 0.2, 0.45 + rs() * 0.2);
    for (let y = 9800; y < 14800; y += 1600) shrub(14900, y, 0.25, 0.4 + rs() * 0.2);
    for (const [x, y] of [[12200, 5900], [15300, 5900], [12200, 8800], [15300, 8800]]) shrub(x, y, 0.35, 0.5);
    add(shrubs, { in: [13.55, 13.8], anim: 'rise' });
  }
}

/** Collapse a static group into one mesh per material (fewer draw calls). */
function mergeByMaterial(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g.index ? g.toNonIndexed() : g);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of byMat) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = m.receiveShadow = true;
    out.add(m);
  }
  return out;
}

let barkMat = null;
function palmBark(M) {
  if (barkMat) return barkMat;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#8a6a48'; x.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) {
    x.fillStyle = 'rgba(60,40,25,0.55)'; x.fillRect(0, y, 64, 4);
    x.fillStyle = 'rgba(170,140,105,0.35)'; x.fillRect(0, y + 5, 64, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 3);
  barkMat = new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: 0xffffff });
  void M;
  return barkMat;
}

/** Clumps of broadleaf trees around the plot, like the backdrop in the final renders. */
export function backgroundTrees(root, M) {
  const g = new THREE.Group();
  g.name = 'backgroundTrees';
  const r = rng(321);
  const leafA = new THREE.MeshStandardMaterial({ color: 0x55703c, roughness: 0.95 });
  const leafB = new THREE.MeshStandardMaterial({ color: 0x435f31, roughness: 0.95 });
  // lumpy foliage blob: a subdivided sphere pushed in/out by a cheap noise so it reads as leaf clusters
  const blob = (rad) => {
    const geo = new THREE.IcosahedronGeometry(rad, 3);
    const p = geo.attributes.position, v = new THREE.Vector3();
    const k = r() * 10;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = Math.sin(v.x * 3.1 + k) * Math.sin(v.y * 2.7 + k * 0.7) * Math.sin(v.z * 3.3 - k);
      v.multiplyScalar(1 + 0.16 * n + (r() - 0.5) * 0.05);
      p.setXYZ(i, v.x, v.y * 0.85, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const spots = [[-14, -16], [-8, -18], [-1, -19], [6, -18], [13, -17], [-17, -6], [-18, 4], [17, -8], [18, 2], [-19, 8], [19, 7.5]];
  for (const [x, z] of spots) {
    const t = new THREE.Group();
    const s = 0.8 + r() * 0.6;
    t.add(cyl(0.18 * s, 3.2 * s, M.palmTrunk, 0, 0, 0, 8));
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(blob((1.3 + r() * 0.9) * s), r() > 0.5 ? leafA : leafB);
      c.position.set((r() - 0.5) * 2.4 * s, (3.6 + r() * 2.2) * s, (r() - 0.5) * 2.4 * s);
      c.castShadow = true;
      t.add(c);
    }
    t.position.set(x + (r() - 0.5) * 2, 0, z + (r() - 0.5) * 2);
    g.add(t);
  }
  root.add(g);
  return g;
}

function makePalm(M) {
  const g = new THREE.Group();
  const trunkH = 5.2;
  // single smooth, tapered, gently curved trunk with ring bands (bark texture)
  const tg = new THREE.CylinderGeometry(0.16, 0.21, trunkH, 12, 24);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i) + trunkH / 2;
    tp.setX(i, tp.getX(i) + Math.sin((y / trunkH) * 1.2) * 0.35);
    tp.setY(i, y);
  }
  tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, palmBark(M));
  trunk.castShadow = true;
  g.add(trunk);
  const topX = Math.sin(1.2) * 0.35;
  // fronds: tapered ribbon bent downwards
  const frondGeo = (() => {
    const L = 3.2, n = 14;
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = u * L;
      const y = Math.sin(u * Math.PI * 0.55) * 0.9 - u * u * 1.6;
      const w = Math.sin(u * Math.PI) * 0.45 + 0.03;
      pos.push(x, y, -w, x, y + 0.12, 0, x, y, w);
      if (i < n) {
        const a = i * 3;
        idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  })();
  for (let i = 0; i < 14; i++) {
    const f = new THREE.Mesh(frondGeo, i % 2 ? M.leaf : M.leafDark);
    f.position.set(topX, trunkH, 0);
    f.rotation.y = (i / 14) * Math.PI * 2 + (i % 2) * 0.2;
    f.rotation.z = (i % 3) * 0.15 - 0.05;
    f.castShadow = true;
    g.add(f);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), M.palmTrunk);
  crown.position.set(topX, trunkH, 0);
  g.add(crown);
  return g;
}

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1024, 512);
  x.fillStyle = '#1f6f8b'; x.fillRect(0, 0, 1024, 120);
  x.fillStyle = '#fff'; x.font = 'bold 72px sans-serif'; x.fillText('HappyHome', 40, 85);
  x.fillStyle = '#1f2a36'; x.font = 'bold 44px sans-serif';
  x.fillText('Two-Storey Villa  ·  PE-233-25', 40, 190);
  x.font = '34px sans-serif';
  x.fillText('Reinforced-concrete frame · G + 1 + roof', 40, 250);
  x.fillText('Duration: 70 weeks', 40, 310);
  x.fillStyle = '#e2703a'; x.fillRect(40, 360, 940, 6);
  x.fillStyle = '#c0392b'; x.font = 'bold 40px sans-serif';
  x.fillText('⚠ SAFETY FIRST · PPE REQUIRED', 40, 440);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
