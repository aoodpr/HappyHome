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
  'gf-femaleMajlis': [
    F(() => PR.rug(3.8, 2.8, 0), 4660, 2650),
    G('sofa_03', 4660, 720, 0),
    G('sofa_01', 2540, 2550, 90),
    G('sofa_01', 6780, 2550, -90),
    G('armchair_01', 3500, 4350, 165),
    G('armchair_01', 5850, 4350, -165),
    G('coffeetable_01', 4660, 2600, 0),
    F(() => withLamp(PR.sideTable()), 2650, 700),
    F(() => withLamp(PR.sideTable()), 6650, 700),
    G('potted_plant_01', 6750, 4100, 0),
    G('ceramic_vase_01', 4400, 2600, 0, { h: 0.52 }),
    CH(4660, 2650),
  ],
  'gf-maleMajlis': [
    F(() => PR.rug(3.4, 4.4, 1), 4660, 15100),
    F(() => PR.majlisSeat(4.95), 4663, 12520, 0),
    F(() => PR.majlisSeat(4.2), 2580, 15050, 90),
    F(() => PR.majlisSeat(3.6), 6745, 14750, -90),
    G('coffeetable_01', 4660, 14400, 0),
    G('coffeetable_01', 4660, 15900, 0),
    G('ceramic_vase_01', 4400, 14400, 0, { h: 0.52 }),
    G('potted_plant_01', 2500, 17800, 0),
    CH(4660, 14000), CH(4660, 16300),
  ],
  'gf-dining': [
    F(() => PR.rug(3.6, 2.6, 2), 9300, 3750),
    F(() => PR.diningTable(2.6, 1.1), 9300, 3750),
    ...[-850, 0, 850].flatMap((dx) => [G('dining_chair_02', 9300 + dx, 2980, 0), G('dining_chair_02', 9300 + dx, 4520, 180)]),
    G('dining_chair_02', 7780, 3750, 90),
    G('dining_chair_02', 10820, 3750, -90),
    G('modern_wooden_cabinet', 7640, 3725, 90),
    G('ceramic_vase_01', 7640, 3000, 0, { h: 0.68 }),
    G('potted_plant_04', 7640, 4400, 0, { h: 0.68 }),
    CH(9300, 3750),
  ],
  'gf-hall': [
    G('potted_plant_01', 9800, 9050, 0),
  ],
  'gf-living': [
    F(() => PR.rug(4.2, 3.2, 1), 11300, 11950),
    G('sofa_03', 11300, 10150, 0),
    G('modern_arm_chair_01', 9550, 12150, 90),
    G('modern_arm_chair_01', 13050, 12150, -90),
    G('coffee_table_round_01', 11300, 11950, 0),
    G('potted_plant_04', 11300, 11950, 0, { h: 0.49 }),
    G('modern_wooden_cabinet', 11300, 14710, 180),
    F(() => PR.tvWall(1.9), 11300, 14975, 180, { h: 1.15 }),
    G('potted_plant_01', 13450, 9700, 0),
    G('potted_plant_02', 9900, 14600, 0),
    CH(11300, 11950),
  ],
  'gf-kitchen': [
    F(() => PR.counterRun(2.95, { sink: 0.3 }), 14275, 540, 0),
    F(() => PR.counterRun(3.8, { hob: -0.95 }), 15440, 2750, -90),
    F(() => PR.fridge(), 12330, 590, 0),
    F(() => PR.island(2.4, 1.0), 13300, 2850, 0),
    G('modern_ceiling_lamp_01', 12800, 2850, 0, { hang: 1.17 }),
    G('modern_ceiling_lamp_01', 13800, 2850, 0, { hang: 1.17 }),
    G('potted_plant_04', 13700, 2700, 0, { h: 0.93 }),
  ],
  'gf-store': [F(() => PR.wardrobe(1.6, 2.2, 0.45), 10430, 455, 0)],
  'gf-outdoorSeating': [
    G('outdoor_table_chair_set_01', 10975, 7300, 0),
    G('potted_plant_02', 10550, 8800, 0),
  ],
  'gf-garden': [
    G('potted_plant_01', 15400, 5750, 0),
    G('potted_plant_02', 12050, 8850, 0),
  ],
  'gf-bath': [F(PR.wc, 2560, 7450, 180), F(() => PR.vanity(1.0), 3550, 7210, 180), F(PR.towelRail, 3700, 5650, 0)],
  'gf-wash': [F(() => PR.vanity(1.9, true), 5900, 7210, 180)],
  'gf-bath2': [F(PR.wc, 2560, 10350, 0), F(() => PR.vanity(1.0), 3550, 10590, 0), F(PR.towelRail, 2167, 11300, 90)],
  'gf-wash2': [F(() => PR.vanity(1.3, true), 6920, 11100, -90)],
  'gf-garage': [F(() => car('carWhite'), 11300, 18200, 0), F(() => car('carRed'), 14200, 18300, 180)],

  /* ---------------- first floor ----------------- */
  'ff-masterBedroom': [
    F(() => PR.rug(3.0, 2.2, 2), 4400, 2600),
    F(() => PR.bed({ duvet: 'duvetSage' }), 4400, 1270, 0),
    F(() => PR.nightstand(), 3060, 460, 0),
    F(() => PR.nightstand(), 5740, 460, 0),
    G('modern_wooden_cabinet', 3800, 5190, 180),
    F(() => PR.tvWall(1.4), 3800, 5465, 180, { h: 1.1 }),
    G('armchair_01', 2750, 4700, 45),
    G('potted_plant_02', 6800, 650, 0),
  ],
  'ff-masterBedroom2': [
    F(() => PR.rug(3.0, 2.4, 0), 4400, 16700),
    F(() => PR.bed({ duvet: 'duvet' }), 3207, 16700, 90),
    F(() => PR.nightstand(), 2397, 15360, 90),
    F(() => PR.nightstand(), 2397, 18040, 90),
    F(() => PR.dressingTable(), 6945, 15300, -90),
    G('modern_arm_chair_01', 5350, 18450, 90),
    G('modern_arm_chair_01', 6650, 18450, -90),
    F(() => PR.sideTable(), 6000, 18500),
    G('potted_plant_01', 2550, 19000, 0),
  ],
  'ff-masterBedroom3': [
    F(() => PR.rug(3.0, 2.2, 1), 11300, 2650),
    F(() => PR.bed({ duvet: 'duvetBlue' }), 11300, 1270, 0),
    F(() => PR.nightstand(), 9960, 460, 0),
    F(() => PR.nightstand(), 12640, 460, 0),
    G('modern_wooden_cabinet', 10750, 4940, 180),
    F(() => PR.tvWall(1.4), 10750, 5195, 180, { h: 1.1 }),
    G('armchair_01', 13050, 4300, -135),
    G('potted_plant_02', 13250, 2600, 0),
  ],
  'ff-masterBedroom4': [
    F(() => PR.rug(3.2, 2.4, 2), 12900, 18100),
    F(() => PR.bed({ duvet: 'duvetSage' }), 14710, 18100, -90),
    F(() => PR.nightstand(), 15520, 16760, -90),
    F(() => PR.nightstand(), 15520, 19440, -90),
    G('modern_wooden_cabinet', 9995, 18100, 90),
    F(() => PR.tvWall(1.6), 9745, 18100, 90, { h: 1.1 }),
    G('modern_arm_chair_01', 11000, 20350, 135),
    G('modern_arm_chair_01', 12500, 20350, -135),
    F(() => PR.sideTable(), 11750, 20600),
    G('ottoman_01', 13250, 18100, 90),
    G('potted_plant_01', 15400, 20850, 0),
  ],
  'ff-familyLiving': [
    F(() => PR.rug(3.4, 2.6, 0), 9100, 11350),
    G('modern_wooden_cabinet', 7600, 11400, 90, { sx: 0.8 }),
    F(() => PR.tvWall(1.9), 7350, 11400, 90, { h: 1.05 }),
    G('sofa_03', 10500, 11350, -90),
    G('modern_arm_chair_01', 9000, 10100, 0),
    G('modern_coffee_table_01', 9150, 11350, 0),
    G('armchair_01', 10950, 6400, -120),
    G('armchair_01', 10950, 8200, -60),
    F(() => withLamp(PR.sideTable()), 11150, 7300),
    G('potted_plant_01', 11300, 9300, 0),
    CH(9100, 11350),
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
  'ff-dress': [F(() => PR.wardrobe(2.4), 5900, 7165, 180), F(() => PR.wardrobe(1.4), 6875, 6400, -90)],
  'ff-dress2': [F(() => PR.wardrobe(2.4), 5900, 10635, 0), F(() => PR.wardrobe(1.3), 6875, 11650, -90)],
  'ff-dress3': [F(() => PR.wardrobe(2.0), 14740, 540, 0), F(() => PR.wardrobe(1.0), 15440, 1500, -90)],
  'ff-dress4': [
    F(() => PR.wardrobe(2.4), 10045, 13771, 90),
    F(() => PR.wardrobe(2.1), 11150, 14707, 180),
    F(() => PR.wardrobe(1.7), 10950, 12835, 0),
    G('ottoman_01', 12300, 13800, 0),
  ],
  'ff-bath': [F(PR.wc, 2560, 7475, 180), F(() => PR.vanity(1.0), 3600, 7235, 180), F(() => PR.shower(1.0, 0.9), 2667, 6075, 0), F(PR.towelRail, 3900, 5625, 0)],
  'ff-bath2': [F(PR.wc, 2560, 10325, 0), F(() => PR.vanity(1.0), 2407, 11650, 90), F(() => PR.shower(1.0, 0.9), 3975, 10775, 0, { mirror: true })],
  'ff-bath3': [F(PR.wc, 15750, 4550, -90), F(() => PR.vanity(1.0), 15510, 3300, -90), F(() => PR.shower(1.0, 0.9), 14225, 4750, 180, { mirror: true })],
  'ff-bath4': [F(PR.wc, 13750, 10250, -90), F(() => PR.vanity(1.0), 13510, 11450, -90), F(() => PR.shower(1.0, 0.9), 12275, 9800, 0)],
};

const CURTAIN_ROOMS = ['femaleMajlis', 'maleMajlis', 'living', 'masterBedroom', 'familyLiving', 'dining'];

export function buildFurniture(ctx) {
  const { TL, M, root } = ctx;
  PR.initProps(M);
  const groups = [];
  const pending = []; // GLB placements waiting for their model

  const roomById = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
  for (const [id, items] of Object.entries(LAYOUTS)) {
    const room = roomById[id];
    if (!room) { console.warn('unknown room', id); continue; }
    const ffl = FFL[room.f];
    const grp = new THREE.Group();
    grp.name = 'furniture:' + id;
    root.add(grp);
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
      if (it.fn) holder.add(it.fn());
      else pending.push({ holder, name: it.m });
    }
  }

  addCurtains(root, groups);

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
      if (src) p.holder.add(src.clone(true));
    })))
    .then(() => TL.update(TL.t, true));
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
          const panel = PR.curtain(0.55, h - 0.03, room.f === 0 && room.key !== 'living');
          panel.position.x = k * (width / 2 + 0.05);
          panel.children[1].scale.y = 0; // hide per-panel rod; one long rod below
          grp.add(panel);
        }
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
