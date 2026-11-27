import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LEVEL, ROOMS, WALLS_GF, WALLS_FF, toScene } from '../data/building.js';
import * as PR from './props.js';
import { stagger } from '../core/timeline.js';

/*
 * Interior furnishing. Layouts follow the furniture drawn on the floor
 * plans (sheets 3–4). Realistic pieces are CC0 models from Poly Haven
 * (public/models, optimised with gltf-transform); built-in items such as
 * beds, wardrobes, kitchens and bathrooms are procedural (props.js).
 *
 * Placement: [x, y] in plan millimetres, rot in degrees where 0 means the
 * front of the piece faces +Y on the plan (towards the road), 90 faces +X.
 */

const FFL = [LEVEL.gf, LEVEL.ff];
const CEIL = [3.3, 3.2];
const MODELS = [
  'armchair_01', 'chandelier_01', 'coffeetable_01', 'ottoman_01', 'sofa_01', 'sofa_02', 'sofa_03',
  'coffee_table_round_01', 'dining_chair_02', 'modern_arm_chair_01', 'modern_ceiling_lamp_01',
  'modern_coffee_table_01', 'modern_wooden_cabinet', 'outdoor_table_chair_set_01', 'potted_plant_01',
  'potted_plant_02', 'potted_plant_04', 'ceramic_vase_01',
];

// item helpers -----------------------------------------------------------
const G = (m, x, y, rot = 0, o = {}) => ({ m, x, y, rot, ...o }); // GLB model
const F = (fn, x, y, rot = 0, o = {}) => ({ fn, x, y, rot, ...o }); // procedural factory
const CH = (x, y) => ({ m: 'chandelier_01', x, y, rot: 0, ceiling: true });

const LAYOUTS = {
  /* ---------------- ground floor ---------------- */
  // OFFICE (interior design pkg, pages 8–9): marble desk, velvet tub chairs, black shelving wall
  'gf-femaleMajlis': [
    F(() => PR.rugStyled(3.0, 2.4, 'cream'), 4660, 2700),
    F(() => PR.shelving(3.0, 2.7), 4660, 420, 0),
    F(() => PR.officeDesk(), 4660, 1950, 0),
    F(PR.tubChair, 4050, 3250, 180),
    F(PR.tubChair, 5300, 3250, 180),
    F(() => PR.marbleTable(0.6, 0.6, 0.5), 4660, 3650),
    // TV + media unit on the south wall under the split AC (owner's mark-up)
    G('modern_wooden_cabinet', 4300, 5250, 180, { sx: 0.8 }),
    F(() => PR.tvWall(1.4), 4300, 5460, 180, { h: 1.25 }),
    F(() => PR.artwork(1.2, 1.5, 3), 2197, 2900, 90, { h: 1.5 }),
    G('potted_plant_01', 6750, 5000, 0),
  ],
  // MAJLIS (pages 5–7): cream curved sofas + long taupe sofa, caramel cushions,
  // white-marble / brass coffee tables, brass ring chandelier, cream floral rug
  'gf-maleMajlis': [
    F(() => PR.rugStyled(3.6, 4.6, 'cream'), 4560, 15200),
    F(() => PR.modernSofa(3.0, { color: 'taupe', pillows: 5 }), 2650, 15200, 90),
    F(() => PR.modernSofa(2.4, { curved: true }), 3800, 12700, 0),
    F(() => PR.modernSofa(2.4, { curved: true }), 3800, 17650, 180),
    F(() => PR.modernSofa(2.4, { curved: true }), 6650, 15200, -90),
    F(() => PR.marbleTable(1.3, 0.8), 4500, 14650),
    F(() => PR.marbleTable(0.9, 0.7, 0.45), 4600, 15800),
    G('ceramic_vase_01', 4400, 14650, 0, { h: 0.38 }),
    F(() => PR.ringChandelier(0.65), 4600, 15200, 0, { ceiling: true }),
    G('potted_plant_01', 2500, 17800, 0),
    G('potted_plant_02', 6800, 12650, 0),
  ],
  // DINING (page 4): white marble table, brown leather chairs, globe pendant cluster, grey rug
  'gf-dining': [
    F(() => PR.rugStyled(3.6, 2.6, 'grey'), 9400, 3800),
    F(() => PR.diningTable(2.6, 1.1), 9400, 3800),
    ...[-850, 0, 850].flatMap((dx) => [G('dining_chair_02', 9400 + dx, 3030, 0, { tint: 0x7a4a30 }), G('dining_chair_02', 9400 + dx, 4570, 180, { tint: 0x7a4a30 })]),
    G('dining_chair_02', 7880, 3800, 90, { tint: 0x7a4a30 }),
    G('dining_chair_02', 10920, 3800, -90, { tint: 0x7a4a30 }),
    F(() => PR.globePendants(6, 1.4), 9400, 3800, 0, { ceiling: true }),
    G('potted_plant_04', 9700, 3800, 0, { h: 0.77 }),
  ],
  'gf-hall': [
    G('potted_plant_01', 9750, 5700, 0), // corner, clear of the garden slider (SD1)
  ],
  // LIVING (pages 2–3): walnut TV wall with linear fireplace, cream sofa,
  // brown velvet tub chairs, marble coffee table, cream rug
  'gf-living': [
    F(() => PR.rugStyled(4.2, 3.2, 'cream'), 11300, 11950),
    F(() => PR.modernSofa(3.2, { pillows: 4 }), 11300, 10150, 0),
    F(PR.tubChair, 9650, 12200, 90),
    F(PR.tubChair, 12950, 12200, -90),
    F(() => PR.marbleTable(1.4, 0.85), 11300, 11950),
    G('potted_plant_04', 11200, 11950, 0, { h: 0.38 }),
    F(() => PR.linearFireplace(1.8), 11300, 14800, 180),
    F(() => PR.tvWall(1.9), 11300, 14940, 180, { h: 1.3 }),
    G('potted_plant_01', 13450, 9700, 0),
    F(() => PR.artwork(1.6, 1.0, 0), 7390, 12500, 90, { h: 1.6 }),
  ],
  'gf-kitchen': [
    // owner's mark-up: dishwasher where the fridge was, sink beside it, fridge at the far (south)
    // end of the east run, hob + hood moved along, wall cabinets up to the ceiling, no island
    F(() => PR.counterRun(3.9, { sink: -0.85, dw: -1.6, top: 3.28 }), 13805, 540, 0),
    F(() => PR.counterRun(3.34, { hob: 0.25, top: 3.28 }), 15440, 2520, -90),
    F(() => PR.fridge(3.28), 15390, 4700, -90),
    F(() => PR.ceilingFan(), 13600, 3000, 0, { ceiling: true }),
  ],
  'gf-store': [F(() => PR.wardrobe(1.6, 2.2, 0.45), 10430, 455, 0)],
  'gf-outdoorSeating': [
    G('outdoor_table_chair_set_01', 11100, 7000, 0),
    G('potted_plant_02', 10600, 5800, 0), // corner — keeps the garden slider (SD1) clear
  ],
  'gf-garden': [
    G('potted_plant_01', 15400, 5750, 0),
    G('potted_plant_02', 12050, 8850, 0),
  ],
  'gf-wash': [F(() => PR.vanity(1.9, true), 5900, 7210, 180)],
  'gf-wash2': [F(() => PR.vanity(1.3, true), 6920, 11100, -90)],
  'gf-garage': [F(() => car('carWhite'), 11300, 18200, 0), F(() => car('carRed'), 14200, 18300, 180)],

  /* ---------------- first floor ----------------- */
  'ff-masterBedroom': [
    F(() => PR.rugStyled(3.0, 2.2, 'cream'), 4400, 2600),
    F(() => PR.bed({ duvet: 'duvetSage' }), 4400, 1270, 0),
    F(() => PR.nightstand(), 3060, 460, 0),
    F(() => PR.nightstand(), 5740, 460, 0),
    G('modern_wooden_cabinet', 3800, 5190, 180),
    F(() => PR.tvWall(1.4), 3800, 5465, 180, { h: 1.1 }),
    F(() => PR.tubChair('beige'), 2750, 4700, 45),
    G('potted_plant_02', 6800, 650, 0),
  ],
  'ff-masterBedroom2': [
    F(() => PR.rugStyled(3.0, 2.4, 'cream'), 4400, 16700),
    F(() => PR.bed({ duvet: 'duvetGrey' }), 3207, 16700, 90),
    F(() => PR.nightstand(), 2397, 15360, 90),
    F(() => PR.nightstand(), 2397, 18040, 90),
    F(() => PR.dressingTable(), 6945, 15300, -90),
    F(() => PR.tubChair('beige'), 5350, 18450, 90),
    F(() => PR.tubChair('beige'), 6650, 18450, -90),
    F(() => PR.sideTable(), 6000, 18500),
    G('potted_plant_01', 2550, 19000, 0),
  ],
  'ff-masterBedroom3': [
    F(() => PR.rugStyled(3.0, 2.2, 'cream'), 11300, 2650),
    F(() => PR.bed({ duvet: 'duvetBlue' }), 11300, 1270, 0),
    F(() => PR.nightstand(), 9960, 460, 0),
    F(() => PR.nightstand(), 12640, 460, 0),
    G('modern_wooden_cabinet', 10750, 4940, 180),
    F(() => PR.tvWall(1.4), 10750, 5195, 180, { h: 1.1 }),
    F(() => PR.tubChair('beige'), 13050, 4300, -135),
    G('potted_plant_02', 13250, 2600, 0),
  ],
  'ff-masterBedroom4': [
    F(() => PR.rugStyled(3.2, 2.4, 'cream'), 12900, 18100),
    F(() => PR.bed({ duvet: 'duvetSage' }), 14710, 18100, -90),
    F(() => PR.nightstand(), 15520, 16760, -90),
    F(() => PR.nightstand(), 15520, 19440, -90),
    G('modern_wooden_cabinet', 9995, 18100, 90),
    F(() => PR.tvWall(1.6), 9745, 18100, 90, { h: 1.1 }),
    F(() => PR.tubChair('beige'), 11000, 20350, 135),
    F(() => PR.tubChair('beige'), 12500, 20350, -135),
    F(() => PR.sideTable(), 11750, 20600),
    G('ottoman_01', 13250, 18100, 90, { tint: 0xbba78d }),
    G('potted_plant_01', 15400, 20850, 0),
  ],
  // FF LIVING (pages 14–15): taupe L-sofa + ottoman, persian rug, walnut shelving by the TV
  'ff-familyLiving': [
    // Layout from sheet 4 + owner's mark-up: L-sofa along the big window W2 (east) and the
    // north wall, TV unit centred on the south wall, coffee corner on the east wall past the window.
    F(() => PR.rugStyled(3.4, 3.0, 'persian'), 10000, 7900),
    F(() => PR.modernSofa(3.6, { color: 'taupe', pillows: 4 }), 11180, 7950, -90),   // along the window
    F(() => PR.modernSofa(2.2, { color: 'taupe', pillows: 2 }), 9550, 5900, 0),      // north wall
    F(() => withLamp(PR.sideTable()), 11200, 5800),
    G('ottoman_01', 9900, 7900, 90, { tint: 0x8c7a68 }),
    // TV wall (south)
    G('modern_wooden_cabinet', 10000, 12150, 180, { sx: 0.9 }),
    F(() => PR.tvWall(1.9), 10000, 12330, 180, { h: 1.15 }),
    G('potted_plant_01', 11300, 10050, 0),
    // coffee corner on the east wall beyond the window
    F(() => PR.coffeeCorner(1.8), 11345, 11300, -90),
    G('potted_plant_02', 7650, 12100, 0),
  ],
  'ff-lobby': [G('potted_plant_01', 9100, 2450, 0), G('potted_plant_02', 7600, 2450, 0)],
  'ff-lobby2': [
    G('modern_wooden_cabinet', 9323, 14000, -90, { sx: 0.6 }),
    G('ceramic_vase_01', 9323, 13700, 0, { h: 0.68 }),
    G('potted_plant_02', 7650, 15950, 0),
  ],
  'ff-laundry': [
    F(() => PR.washer(), 7640, 17100, 90),
    F(() => PR.washer(true), 7640, 17750, 90),
    F(() => PR.counterRun(1.8, { sink: 0.2, uppers: true }), 9273, 17900, -90),
  ],
  'ff-dress': [F(() => PR.wardrobe(1.7), 6260, 7180, 180), F(() => PR.wardrobe(1.2), 6850, 6250, -90)],
  'ff-dress2': [F(() => PR.wardrobe(2.3), 5960, 10700, 0), F(() => PR.wardrobe(1.3), 6850, 11800, -90)],
  'ff-dress3': [F(() => PR.wardrobe(1.7), 14850, 540, 0), F(() => PR.wardrobe(1.0), 15440, 1550, -90)],
  'ff-dress4': [
    F(() => PR.wardrobe(2.4), 10045, 13771, 90),
    F(() => PR.wardrobe(2.1), 11150, 14707, 180),
    F(() => PR.wardrobe(1.7), 10950, 12835, 0),
    G('ottoman_01', 12300, 13800, 0, { tint: 0xbba78d }),
  ],
};

const CURTAIN_ROOMS = ['office', 'maleMajlis', 'living', 'masterBedroom', 'girlBedroom', 'boyBedroom', 'doubleBedroom', 'familyLiving', 'dining'];

export function buildFurniture(ctx) {
  const { TL, M, root } = ctx;
  PR.initProps(M);
  ctx.furnitureItems = [];
  ctx.furnitureVersion = 0;
  const groups = [];
  const pending = []; // GLB placements waiting for their model
  // One parent for all loose furniture + curtains so the UI can hide it all (empty rooms).
  const furnRoot = new THREE.Group();
  furnRoot.name = 'furniture:all';
  root.add(furnRoot);
  ctx.furnitureRoot = furnRoot;

  const roomById = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
  for (const [id, items] of Object.entries(LAYOUTS)) {
    const room = roomById[id];
    if (!room) { console.warn('unknown room', id); continue; }
    const ffl = FFL[room.f];
    const grp = new THREE.Group();
    grp.name = 'furniture:' + id;
    furnRoot.add(grp);
    groups.push(grp);
    for (const it of items) {
      if (it.skip) continue;
      const holder = new THREE.Group();
      const [sx, sz] = toScene(it.x, it.y);
      const y = it.ceiling ? ffl + CEIL[room.f] : it.hang ? ffl + CEIL[room.f] - it.hang : ffl + (it.h || 0);
      holder.position.set(sx, y, sz);
      holder.rotation.y = THREE.MathUtils.degToRad(it.rot);
      if (it.sx) holder.scale.x = it.sx;
      if (it.mirror) holder.scale.x = -1;
      grp.add(holder);
      // walk-mode collision: skip ceiling pieces and anything hung high
      holder.userData.collide = !(it.ceiling || it.hang);
      ctx.furnitureItems.push(holder);
      if (it.fn) holder.add(it.fn());
      else pending.push({ holder, name: it.m, tint: it.tint });
    }
  }

  addCurtains(furnRoot, groups);

  // Distance culling: rooms far from the camera can't be seen through the
  // windows anyway, so their furniture is skipped (big win on iPad).
  const roomGroups = groups.filter((g) => g.name.startsWith('furniture:')).map((g) => {
    const r = roomById[g.name.slice(10)];
    const [cx, cz] = toScene((r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2);
    return { g, c: new THREE.Vector3(cx, FFL[r.f] + 1.5, cz) };
  });
  ctx.updateFurnitureLOD = (camera, cutActive) => {
    for (const { g, c } of roomGroups) g.visible = cutActive || camera.position.distanceTo(c) < 24;
  };

  // Furniture appears room by room during the interior-finishes stage.
  groups.forEach((g, i) => {
    g.children.forEach((h) => {
      TL.add(h, { in: stagger(i, groups.length, 12.6, 12.98), anim: 'pop' });
    });
  });

  // Load the CC0 models in the background; pieces pop in once loaded.
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cache = {};
  const load = (name) => (cache[name] ||= loader.loadAsync(`./models/${name}.glb`).then((g) => {
    g.scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = true;
        if (o.material) o.material.envMapIntensity = 0.9;
      }
    });
    return g.scene;
  }));
  ctx.furnitureReady = Promise.all(MODELS.map((n) => load(n).catch((e) => { console.warn('model failed', n, e); return null; })))
    .then(() => Promise.all(pending.map(async (p) => {
      const src = await load(p.name).catch(() => null);
      if (!src) return;
      const c = src.clone(true);
      // recolour (texture dropped so dark source leather can become light): leather / velvet finish
      if (p.tint) c.traverse((o) => { if (o.isMesh && !/metal|leg|steel/i.test(o.material.name)) { o.material = o.material.clone(); o.material.map = null; o.material.color.set(p.tint); o.material.roughness = 0.6; } });
      p.holder.add(c);
    })))
    .then(() => { ctx.furnitureVersion++; TL.update(TL.t, true); });
}

function withLamp(table) {
  const lamp = PR.tableLamp();
  lamp.position.y = 0.555;
  table.add(lamp);
  return table;
}

function car(matKey) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: matKey === 'carRed' ? 0x7a1616 : 0xe9e9e9, roughness: 0.18, metalness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b232b, roughness: 0.05, metalness: 0.6 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.25, metalness: 0.9 });
  const rb = (w, h, d, r, m, x, y, z) => { const o = new THREE.Mesh(PR.roundedBox(w, h, d, r), m); o.position.set(x, y, z); g.add(o); return o; };
  // body: low sill, bonnet and boot; tapered glasshouse with body-coloured roof
  rb(1.86, 0.5, 4.75, 0.16, body, 0, 0.6, 0);
  rb(1.8, 0.16, 1.3, 0.07, body, 0, 0.88, 1.6);
  rb(1.8, 0.16, 1.0, 0.07, body, 0, 0.88, -1.85);
  const gh = rb(1.6, 0.46, 2.3, 0.14, glass, 0, 1.12, -0.3);
  gh.scale.set(1, 1, 1);
  rb(1.5, 0.06, 1.7, 0.03, body, 0, 1.36, -0.35);
  for (const x of [-0.79, 0.79]) rb(0.04, 0.06, 2.0, 0.02, body, x, 0.9, -0.3); // belt line
  rb(1.4, 0.18, 0.06, 0.03, glass, 0, 0.7, 2.39); // grille
  for (const [x, z] of [[-0.86, 1.45], [0.86, 1.45], [-0.86, -1.5], [0.86, -1.5]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 24), tyre);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); g.add(w);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 16), rim);
    r.rotation.z = Math.PI / 2; r.position.copy(w.position); g.add(r);
  }
  const head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 1.2 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x8a0d0d, emissive: 0x550000 });
  for (const x of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.04), head); l.position.set(x, 0.75, 2.37); g.add(l);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.04), tail); t.position.set(x, 0.8, -2.37); g.add(t);
  }
  g.position.y = -0.3; // garage floor (+0.20) is lower than the house FFL (+0.50)
  return g;
}

/** Two gathered curtain panels at every window of a living space. */
function addCurtains(root, groups) {
  [WALLS_GF, WALLS_FF].forEach((walls, f) => {
    const ffl = FFL[f];
    for (const w of walls) {
      if (!w.ext) continue;
      const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      const dir = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
      const n = [-dir[1], dir[0]];
      const horizontal = Math.abs(w.a[1] - w.b[1]) < 1;
      for (const [from, to, sill, head, kind] of w.o || []) {
        if (kind !== 'window' && kind !== 'slide') continue;
        if (sill > 1.2) continue; // small high bathroom windows
        const c = (from + to) / 2;
        const mid = horizontal ? [c, w.a[1]] : [w.a[0], c];
        // inside = the side whose sample point is in a room of the right kind
        let room = null, s = 0;
        for (const sg of [1, -1]) {
          const px = mid[0] + n[0] * 500 * sg, py = mid[1] + n[1] * 500 * sg;
          const r = ROOMS.find((rm) => rm.f === f && px >= rm.rect[0] && px <= rm.rect[2] && py >= rm.rect[1] && py <= rm.rect[3]);
          if (r) { room = r; s = sg; break; }
        }
        if (!room || !CURTAIN_ROOMS.includes(room.key)) continue;
        const width = Math.abs(to - from) / 1000;
        const h = Math.min(head + 0.15, CEIL[f] - 0.05);
        const grp = new THREE.Group();
        const off = (w.t / 2 + 140) * s;
        const [sx, sz] = toScene(mid[0] + n[0] * off, mid[1] + n[1] * off);
        grp.position.set(sx, ffl + h, sz);
        // face into the room
        grp.rotation.y = Math.atan2(n[0] * s, n[1] * s);
        for (const k of [-1, 1]) {
          const panel = PR.curtain(0.55, h - 0.03, false);
          panel.position.x = k * (width / 2 + 0.05);
          panel.children[1].scale.y = 0; // hide per-panel rod; one long rod below
          grp.add(panel);
        }
        const sh = PR.sheer(width + 0.3, h - 0.03);
        sh.position.z = -0.06;
        grp.add(sh);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, width + 1.3, 8), new THREE.MeshStandardMaterial({ color: 0xb8b1a3, roughness: 0.3, metalness: 0.9 }));
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, 0.02, -0.02);
        grp.add(rod);
        const cg = new THREE.Group();
        cg.add(grp);
        root.add(cg);
        groups.push(cg);
      }
    }
  });
}
