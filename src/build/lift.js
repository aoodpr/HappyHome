import * as THREE from 'three';
import { LEVEL, toScene } from '../data/building.js';
import { rectBox } from './helpers.js';

/*
 * Working passenger lift in the RC shaft (plan 7360–9360 × 230–1950),
 * serving the ground (+0.50) and first (+4.70) floors.
 *   - cabin: brushed-steel + walnut panels, mirror, handrail, LED ceiling,
 *     car operating panel (G / 1 / ◄►), floor indicator
 *   - landing doors on each floor + cabin doors: centre-opening stainless
 *     panels that slide into the shaft
 *   - landing call buttons outside on the hall / lobby side
 * Interaction (same as doors / switches): walk mode aim + E or click, orbit
 * click. Riding: a walker standing in the cabin moves with it.
 */

const FLOORS = [LEVEL.gf, LEVEL.ff];
const SHAFT = { x0: 7360, x1: 9360, y0: 230, y1: 1950 };
const DOOR = { x0: 7900, x1: 8800, h: 2.1 };   // landing door opening (plan x), wall y 1950–2150
const CAB = { x0: 7420, x1: 9300, y0: 300, y1: 1880, h: 2.3 };
const SPEED = 1.0;     // m/s
const DOOR_TIME = 1.4; // s to open / close
const DWELL = 7;       // s doors stay open

export function buildLift(ctx) {
  const { TL, M, root } = ctx;
  const mat = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc3c7cc, roughness: 0.28, metalness: 0.95 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.4, metalness: 0.8 }),
    walnut: new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.5, map: M.wood.map }),
    floor: new THREE.MeshStandardMaterial({ color: 0x2b2b2d, roughness: 0.35 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: 0.03, metalness: 1 }),
    light: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1dc, emissiveIntensity: 1.6 }),
    btn: new THREE.MeshStandardMaterial({ color: 0xdcdfe3, roughness: 0.3, metalness: 0.6 }),
    btnLit: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6fc3ff, emissiveIntensity: 2.2 }),
    display: new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xff5a1f, emissiveIntensity: 0.0, roughness: 0.2 }),
  };
  const group = new THREE.Group();
  group.name = 'lift';
  root.add(group);
  const R = (g, x0, y0, x1, y1, z, h, m) => { const b = rectBox(x0, y0, x1, y1, z, h, m, { cast: false }); g.add(b); return b; };

  /* ---------------- cabin ---------------- */
  const cabin = new THREE.Group();
  cabin.position.y = FLOORS[0];
  const cabFloor = R(cabin, CAB.x0, CAB.y0, CAB.x1, CAB.y1, -0.12, 0.12, mat.floor);
  cabFloor.userData.walkable = true;
  ctx.walkables.push(cabFloor);
  R(cabin, CAB.x0, CAB.y0, CAB.x1, CAB.y1, CAB.h, 0.08, mat.darkSteel);             // roof
  R(cabin, CAB.x0 + 150, CAB.y0 + 150, CAB.x1 - 150, CAB.y1 - 150, CAB.h - 0.01, 0.01, mat.light); // LED ceiling
  const walls = [
    R(cabin, CAB.x0, CAB.y0, CAB.x1, CAB.y0 + 30, 0, CAB.h, mat.walnut),            // back wall
    R(cabin, CAB.x0, CAB.y0, CAB.x0 + 30, CAB.y1, 0, CAB.h, mat.steel),             // left wall
    R(cabin, CAB.x1 - 30, CAB.y0, CAB.x1, CAB.y1, 0, CAB.h, mat.steel),             // right wall
    // front returns either side of the cabin door
    R(cabin, CAB.x0, CAB.y1 - 30, DOOR.x0, CAB.y1, 0, CAB.h, mat.steel),
    R(cabin, DOOR.x1, CAB.y1 - 30, CAB.x1, CAB.y1, 0, CAB.h, mat.steel),
    R(cabin, DOOR.x0, CAB.y1 - 30, DOOR.x1, CAB.y1, DOOR.h, CAB.h - DOOR.h, mat.steel),
  ];
  for (const w of walls) { w.userData.solid = true; ctx.solids.push(w); }
  R(cabin, CAB.x0 + 250, CAB.y0 + 30, CAB.x1 - 250, CAB.y0 + 36, 0.9, 1.3, mat.mirror);  // mirror on back wall
  R(cabin, CAB.x0 + 200, CAB.y0 + 60, CAB.x1 - 200, CAB.y0 + 90, 0.9, 0.04, mat.steel);   // handrail
  for (const x of [CAB.x0 + 60, CAB.x1 - 90]) R(cabin, x, CAB.y0 + 250, x + 30, CAB.y1 - 250, 0.9, 0.04, mat.steel);

  // car operating panel on the right return, facing into the cabin
  const cop = new THREE.Group();
  R(cop, DOOR.x1 + 120, CAB.y1 - 45, DOOR.x1 + 330, CAB.y1 - 32, 0.85, 0.8, mat.darkSteel);
  const display = R(cop, DOOR.x1 + 160, CAB.y1 - 48, DOOR.x1 + 290, CAB.y1 - 44, 1.45, 0.12, mat.display);
  cabin.add(cop);

  /* ---------------- doors ---------------- */
  // landing doors (fixed per floor) and cabin doors (ride with the cabin); each
  // is a pair of panels that slide apart into the shaft
  const panelPair = (parent, yFace, zBase, solid) => {
    const half = (DOOR.x1 - DOOR.x0) / 2;
    const ps = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      const [cx] = toScene(DOOR.x0 + half, 0);
      g.position.set(cx, 0, 0);
      const panel = rectBox(s < 0 ? DOOR.x0 : DOOR.x0 + half, yFace - 25, s < 0 ? DOOR.x0 + half : DOOR.x1, yFace, zBase, DOOR.h - 0.02, mat.steel, { cast: false });
      panel.position.x -= cx;
      g.add(panel);
      if (solid) { panel.userData.solid = true; ctx.solids.push(panel); }
      parent.add(g);
      ps.push({ g, s });
    }
    return ps;
  };
  const landing = FLOORS.map((ffl) => panelPair(group, 1945, ffl, true));
  const cabDoors = panelPair(cabin, CAB.y1 + 27, 0, true);
  // steel architraves on the hall side of each landing door
  for (const ffl of FLOORS) {
    R(group, DOOR.x0 - 80, 2150, DOOR.x0, 2190, ffl, DOOR.h + 0.08, mat.steel);
    R(group, DOOR.x1, 2150, DOOR.x1 + 80, 2190, ffl, DOOR.h + 0.08, mat.steel);
    R(group, DOOR.x0 - 80, 2150, DOOR.x1 + 80, 2190, ffl + DOOR.h, 0.08, mat.steel);
  }

  /* ---------------- buttons ---------------- */
  ctx.interact = ctx.interact || [];
  const S = { at: 0, target: 0, y: FLOORS[0], door: 1, phase: 'open', timer: DWELL, queue: [] };
  const lit = [];
  const button = (parent, x, y, z, label, onPress, ffl = null) => {
    const b = rectBox(x - 22, y, x + 22, y + 10, z, 0.044, mat.btn, { cast: false });
    parent.add(b);
    const t = { kind: 'lift', label, meshes: [b], get on() { return false; }, toggle() { onPress(); b.material = mat.btnLit; lit.push({ b, until: performance.now() + 1500, ffl }); } };
    ctx.interact.push(t);
    return b;
  };
  // inside the cabin: G, 1, open-door
  button(cop, DOOR.x1 + 225, CAB.y1 - 50, 1.2, { en: 'Lift: go to ground floor', ar: 'المصعد: إلى الدور الأرضي' }, () => request(0));
  button(cop, DOOR.x1 + 225, CAB.y1 - 50, 1.3, { en: 'Lift: go to first floor', ar: 'المصعد: إلى الدور الأول' }, () => request(1));
  button(cop, DOOR.x1 + 225, CAB.y1 - 50, 1.05, { en: 'Lift: open doors', ar: 'المصعد: فتح الأبواب' }, () => request(S.at));
  // landing call buttons, hall / lobby side, right of the door
  FLOORS.forEach((ffl, i) => {
    R(group, DOOR.x1 + 170, 2170, DOOR.x1 + 270, 2182, ffl + 0.95, 0.24, mat.darkSteel);
    button(group, DOOR.x1 + 220, 2182, ffl + 1.05, { en: 'Call the lift', ar: 'استدعاء المصعد' }, () => request(i));
  });

  function request(floor) {
    if (S.phase === 'moving' || S.phase === 'closing') { if (!S.queue.includes(floor) && floor !== S.target) S.queue.push(floor); return; }
    if (floor === S.at) { S.phase = 'opening'; S.timer = DWELL; return; }
    S.target = floor;
    S.phase = 'closing';
  }

  /* ---------------- update ---------------- */
  const halfW = (DOOR.x1 - DOOR.x0) / 2000;
  const setDoors = (pairs, k) => { for (const { g, s } of pairs) g.children[0].position.x = g.children[0].userData.baseX + s * k * (halfW - 0.04); };
  for (const pairs of [...landing, cabDoors]) for (const { g } of pairs) g.children[0].userData.baseX = g.children[0].position.x;

  ctx.lift = {
    state: S,
    request,
    update(dt, walk) {
      const prevY = S.y;
      // door safety edge: someone in the doorway re-opens closing doors
      if (walk && (S.phase === 'closing' || S.phase === 'closingIdle')) {
        const [dx0, dz0] = toScene(DOOR.x0 - 100, 1700), [dx1, dz1] = toScene(DOOR.x1 + 100, 2400);
        const p = walk.pos;
        if (p.x > dx0 && p.x < dx1 && p.z > dz0 && p.z < dz1 && Math.abs(p.y - S.y) < 0.6) {
          if (S.phase === 'closing' && S.target !== S.at) S.queue.unshift(S.target);
          S.target = S.at; S.phase = 'opening';
        }
      }
      switch (S.phase) {
        case 'opening': S.door = Math.min(1, S.door + dt / DOOR_TIME); if (S.door >= 1) { S.phase = 'open'; S.timer = DWELL; } break;
        case 'open': S.timer -= dt; if (S.timer <= 0) { if (S.queue.length) { S.target = S.queue.shift(); S.phase = 'closing'; } else S.phase = 'closingIdle'; } break;
        case 'closingIdle': S.door = Math.max(0, S.door - dt / DOOR_TIME); if (S.door <= 0) S.phase = 'idle'; break;
        case 'idle': if (S.queue.length) { S.target = S.queue.shift(); S.phase = S.target === S.at ? 'opening' : 'closing'; } break;
        case 'closing': S.door = Math.max(0, S.door - dt / DOOR_TIME); if (S.door <= 0) S.phase = S.target === S.at ? 'opening' : 'moving'; break;
        case 'moving': {
          const ty = FLOORS[S.target];
          const d = ty - S.y;
          const v = Math.sign(d) * Math.min(Math.abs(d), SPEED * dt, Math.max(0.15 * dt, Math.abs(d) * 1.5 * dt + 0.02 * dt));
          S.y += Math.abs(d) < 0.003 ? d : v;
          if (Math.abs(ty - S.y) < 0.003) { S.y = ty; S.at = S.target; S.phase = 'opening'; }
          break;
        }
        default: break;
      }
      cabin.position.y = S.y;
      setDoors(cabDoors, S.door);
      landing.forEach((pairs, i) => setDoors(pairs, Math.abs(S.y - FLOORS[i]) < 0.01 ? S.door : 0));
      display.material.emissiveIntensity = 1.5;
      display.material.emissive.setHex(S.phase === 'moving' ? 0x4fd17a : 0xff5a1f);
      const now = performance.now();
      for (let i = lit.length - 1; i >= 0; i--) if (now > lit[i].until && !(S.phase === 'moving')) { lit[i].b.material = mat.btn; lit.splice(i, 1); }
      // carry a walker standing in the cabin
      if (walk) {
        const [ax, az] = toScene(CAB.x0, CAB.y0), [bx, bz] = toScene(CAB.x1, CAB.y1);
        const p = walk.pos;
        if (p.x > ax && p.x < bx && p.z > az && p.z < bz && Math.abs(p.y - prevY) < 0.6) {
          p.y = S.y;
          if (walk.eyeY !== undefined) walk.eyeY += S.y - prevY;
          walk.vy = 0;
        }
      }
    },
  };
  group.add(cabin);
  group.traverse((o) => { if (o.isMesh) { o.userData.dynamic = true; o.castShadow = false; } });
  TL.add(group, { in: [12.55, 12.65], anim: 'show' });
  void SHAFT;
}
