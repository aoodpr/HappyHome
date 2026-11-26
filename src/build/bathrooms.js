import * as THREE from 'three';
import { LEVEL, ROOMS } from '../data/building.js';
import { rectBox, toScene } from './helpers.js';
import { roundedBox } from './props.js';
import { stagger } from '../core/timeline.js';

/*
 * Bathrooms built from the Alshehab Ceramica (SHC) travertine bathroom
 * drawings supplied by the client:
 *   3 × 1.8   → GF + FF north baths        2.4 × 1.6 → GF south bath
 *   2.5 × 2.4 → FF bath 2                  1.8 × 2.8 → FF bath 3
 *   1.9 × 2.9 → FF bath 4
 * Every drawing is drawn north-up, so a layout is written in centimetres
 * from the room's north-west interior corner: u → east, v → south.
 *
 * Common specification: 600 × 1200 travertine on floor and walls to a 2.85 m
 * false ceiling (done in interior.js), wall-hung WC on a 20 cm deep, 1.2 m
 * high tiled ledge with black flush plate and bidet spray, floating vanity
 * (oak, or dark fluted walnut in the GF south bath) with stone top and
 * vessel basin, black wall mixers, capsule mirror, frameless glass shower
 * screen with black profile, rain head, shower column and linear drain.
 */

const FFL = [LEVEL.gf, LEVEL.ff];

const LAYOUTS = {
  // ---------------------------------------------------- 3 × 1.8 (north baths)
  '3x1.8': {
    ledges: [{ u: [80, 100], v: [80, 180], h: 1.2 }],                 // stub wall behind the WC
    wc: { face: 100, dir: 1, v: 136 },
    shower: { mixer: ['W', 135], head: ['S', 40], drain: [[6, 74], [172, 177]] },
    vanity: { wall: 'S', a: [221, 300], depth: 50, wood: 'oak', basin: 'rect' },
  },
  // ---------------------------------------------------- 2.4 × 1.6 (GF south bath)
  '2.4x1.6': {
    ledges: [{ u: [0, 20], v: [0, 160], h: 1.2 }],
    wc: { face: 20, dir: 1, v: 83 },
    vanity: { wall: 'N', a: [120.6, 240], depth: 60, wood: 'fluted', basin: 'round' },
    niche: { wall: 'N', a: [90.6, 120.6], h: [0.3, 1.95] },
  },
  // ---------------------------------------------------- 2.5 × 2.4 (FF bath 2)
  '2.5x2.4': {
    ledges: [{ u: [0, 20], v: [0, 115], h: 1.2 }],
    wc: { face: 20, dir: 1, v: 68 },
    vanity: { wall: 'W', a: [118, 238], depth: 40, wood: 'oak', basin: 'rect' },
    shower: { mixer: ['E', 50], head: ['N', 194], drain: [[152, 232], [3, 8]], glass: { along: 'v', at: 147, from: 0, to: 90 }, shelf: ['N', 150, 226] },
  },
  // ---------------------------------------------------- 1.8 × 2.8 (FF bath 3)
  '1.8x2.8': {
    vanity: { wall: 'E', a: [0, 89], depth: 45, wood: 'oak', basin: 'rect' },
    ledges: [{ u: [160, 180], v: [89, 191], h: 1.2 }],
    wc: { face: 160, dir: -1, v: 135 },
    shower: { mixer: ['E', 235], head: ['E', 235], drain: [[10, 170], [272, 277]], glass: { along: 'u', at: 191, from: 90, to: 180 } },
  },
  // ---------------------------------------------------- 1.9 × 2.9 (FF bath 4)
  '1.9x2.9': {
    shower: { mixer: ['E', 45], head: ['E', 45], drain: [[10, 180], [4, 9]], glass: { along: 'u', at: 94, from: 80, to: 190 } },
    ledges: [{ u: [170, 190], v: [94, 195], h: 1.2 }],
    wc: { face: 170, dir: -1, v: 139 },
    vanity: { wall: 'E', a: [196, 290], depth: 50, wood: 'oak', basin: 'rect' },
  },
};

const ROOM_LAYOUT = {
  'gf-bath': '3x1.8', 'ff-bath': '3x1.8', 'gf-bath2': '2.4x1.6', 'ff-bath2': '2.5x2.4',
  'ff-bath3': '1.8x2.8', 'ff-bath4': '1.9x2.9',
};

export function buildBathrooms(ctx) {
  const { TL, M, root } = ctx;
  const mat = makeMaterials(M);
  const rooms = ROOMS.filter((r) => ROOM_LAYOUT[r.id]);
  rooms.forEach((rm, i) => {
    const g = buildRoom(rm, LAYOUTS[ROOM_LAYOUT[rm.id]], mat, M);
    g.name = 'bathroom:' + rm.id;
    root.add(g);
    // fixtures go in during the interior-finishes stage, after the tiling
    TL.add(g, { in: stagger(i, rooms.length, 12.35, 12.6), anim: 'rise' });
    g.traverse((o) => {
      if (o.isMesh && o.userData.solid) ctx.solids.push(o);
    });
  });
}

function makeMaterials(M) {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, ...o });
  return {
    black: std({ color: 0x141414, roughness: 0.35, metalness: 0.6 }),
    blackGlass: std({ color: 0x0c0c0d, roughness: 0.08, metalness: 0.2 }),
    ceramic: std({ color: 0xfbfbf9, roughness: 0.08 }),
    blackCeramic: std({ color: 0x1b1b1c, roughness: 0.12, metalness: 0.1 }),
    oak: std({ map: M.wood.map, normalMap: M.wood.normalMap, color: 0xe2c7a3, roughness: 0.5 }),
    walnut: std({ map: M.wood.map, normalMap: M.wood.normalMap, color: 0x5a3d2a, roughness: 0.5 }),
    stoneTop: std({ color: 0xeee6d8, roughness: 0.3 }),
    mirror: std({ color: 0xdfe6ea, roughness: 0.02, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xe6f2f4, roughness: 0.03, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    nicheLight: new THREE.MeshStandardMaterial({ color: 0xf4e7cf, emissive: 0xffd9a0, emissiveIntensity: 0.5, roughness: 0.8 }),
    travertine: M.travertine,
  };
}

function buildRoom(rm, L, mat, M) {
  const [x0, y0, x1, y1] = rm.rect;
  const W = (x1 - x0) / 10, D = (y1 - y0) / 10;
  const ffl = FFL[rm.f];
  const g = new THREE.Group();
  g.position.y = ffl; // pivot on the floor for the rise animation

  // ---- helpers (u, v in cm from the NW corner; heights in m above FFL) ----
  const B = (u0, v0, u1, v1, h0, h1, m, opts) =>
    rectBox(x0 + Math.min(u0, u1) * 10, y0 + Math.min(v0, v1) * 10, x0 + Math.max(u0, u1) * 10, y0 + Math.max(v0, v1) * 10, h0, h1 - h0, m, opts);
  const add = (o) => { g.add(o); return o; };
  const P = (u, v) => toScene(x0 + u * 10, y0 + v * 10);
  /** Footprint on a wall: along-wall range a0..a1, depth d out of the wall. */
  const onWall = (wall, a0, a1, d0, d1) => {
    switch (wall) {
      case 'N': return [a0, d0, a1, d1];
      case 'S': return [a0, D - d1, a1, D - d0];
      case 'W': return [d0, a0, d1, a1];
      default: return [W - d1, a0, W - d0, a1]; // 'E'
    }
  };
  const wallBox = (wall, a0, a1, d0, d1, h0, h1, m, opts) => {
    const [u0, v0, u1, v1] = onWall(wall, a0, a1, d0, d1);
    return add(B(u0, v0, u1, v1, h0, h1, m, opts));
  };
  const rb = (w, h, d, r, m, u, y, v) => {
    const o = new THREE.Mesh(roundedBox(w, h, d, r), m);
    const [sx, sz] = P(u, v);
    o.position.set(sx, y, sz);
    return add(o);
  };
  const axisOf = (wall) => (wall === 'N' || wall === 'S' ? 'u' : 'v');

  // ---- WC ledges (tiled box-outs, 1.2 m) with black glass top ----
  for (const l of L.ledges || []) {
    const box = add(B(l.u[0], l.v[0], l.u[1], l.v[1], 0, l.h, mat.travertine));
    box.userData.solid = true;
    add(B(l.u[0] - 0.5, l.v[0] - 0.5, l.u[1] + 0.5, l.v[1] + 0.5, l.h, l.h + 0.015, mat.blackGlass));
  }

  // ---- wall-hung WC + flush plate + bidet spray + paper holder ----
  if (L.wc) {
    const { face, dir, v } = L.wc;
    const cu = face + dir * 27;
    rb(0.54, 0.3, 0.36, 0.13, mat.ceramic, cu, 0.25, v);           // bowl (seat at ~0.42)
    rb(0.53, 0.03, 0.37, 0.015, mat.ceramic, cu, 0.415, v);         // seat
    const [px, pz] = P(face + dir * 0.6, v);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.24), mat.black);
    plate.position.set(px, 1.0, pz);
    if (dir < 0) plate.position.x -= 0.005;
    add(plate);
    for (const dv of [-4.5, 4.5]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 20), mat.black);
      b.rotation.z = Math.PI / 2;
      const [bx, bz] = P(face + dir * 1.2, v + dv);
      b.position.set(bx, 1.0, bz);
      add(b);
    }
    // bidet spray (left of WC) and paper holder (right), on the ledge face
    add(B(face, v - 31, face + dir * 4, v - 27, 0.55, 0.75, mat.black));
    add(B(face, v + 26, face + dir * 12, v + 28, 0.68, 0.7, mat.black));
  }

  // ---- floating vanity, stone top, vessel basin, wall mixer, mirror ----
  if (L.vanity) {
    const V = L.vanity;
    const [a0, a1] = V.a;
    const cab = V.wood === 'fluted' ? mat.walnut : mat.oak;
    const c = wallBox(V.wall, a0, a1, 0, V.depth, 0.3, 0.7, cab);
    c.userData.solid = true;
    if (V.wood === 'fluted') {
      // vertical flutes on the cabinet front
      for (let a = a0 + 2; a < a1 - 1; a += 3) wallBox(V.wall, a, a + 1.6, V.depth, V.depth + 0.8, 0.31, 0.69, mat.walnut);
    }
    wallBox(V.wall, a0, a1, 0, V.depth + 0.5, 0.7, 0.8, mat.stoneTop);
    const mid = (a0 + a1) / 2;
    const [bu, , bv] = (() => { const r = onWall(V.wall, mid, mid, V.depth / 2 + 2, V.depth / 2 + 2); return [r[0], 0, r[1]]; })();
    if (V.basin === 'round') {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.15, 0.15, 32), mat.blackCeramic);
      const [sx, sz] = P(bu, bv);
      bowl.position.set(sx, 0.875, sz);
      add(bowl);
    } else {
      const ax = axisOf(V.wall);
      const w = 0.55, d = Math.min(0.38, V.depth / 100 - 0.06);
      rb(ax === 'u' ? w : d, 0.13, ax === 'u' ? d : w, 0.03, mat.ceramic, bu, 0.865, bv);
    }
    // wall mixer: plate + spout reaching over the basin
    wallBox(V.wall, mid - 2, mid + 2, 0, 1.5, 1.0, 1.06, mat.black);
    wallBox(V.wall, mid - 1, mid + 1, 0, 17, 1.02, 1.04, mat.black);
    // capsule mirror with black frame
    add(capsuleMirror(V.wall, mid, 0.55, 0.95, 1.2, mat, onWall, P));
  }

  // ---- niche (backlit, with glass shelves) ----
  if (L.niche) {
    const N = L.niche;
    wallBox(N.wall, N.a[0], N.a[1], 0, 1.2, N.h[0], N.h[1], mat.nicheLight);
    for (let h = N.h[0]; h <= N.h[1] + 0.001; h += (N.h[1] - N.h[0]) / 4) wallBox(N.wall, N.a[0], N.a[1], 0, 12, h - 0.01, h + 0.01, mat.stoneTop);
    for (const a of [N.a[0], N.a[1] - 1.5]) wallBox(N.wall, a, a + 1.5, 0, 12, N.h[0], N.h[1], mat.travertine);
  }

  // ---- shower: glass screen, rain head, column/mixer, drain, shelf ----
  if (L.shower) {
    const S = L.shower;
    if (S.glass && S.glass.to - S.glass.from > 1) {
      const gl = S.glass;
      const [u0, v0, u1, v1] = gl.along === 'u' ? [gl.from, gl.at - 0.4, gl.to, gl.at + 0.4] : [gl.at - 0.4, gl.from, gl.at + 0.4, gl.to];
      const pane = add(B(u0, v0, u1, v1, 0, 2.0, mat.glass, { cast: false, receive: false }));
      pane.userData.solid = true;
      // black profile at the wall, top edge and free edge
      const [e0, e1] = gl.along === 'u' ? [[gl.to - 1.5, gl.at - 1, gl.to, gl.at + 1], [gl.from, gl.at - 1, gl.from + 1.5, gl.at + 1]]
        : [[gl.at - 1, gl.from, gl.at + 1, gl.from + 1.5], [gl.at - 1, gl.to - 1.5, gl.at + 1, gl.to]];
      add(B(...e0, 0, 2.0, mat.black));
      add(B(...e1, 0, 2.0, mat.black));
      add(B(u0, v0 - 0.4, u1, v1 + 0.4, 1.98, 2.0, mat.black));
    }
    if (S.mixer) {
      const [wall, a] = S.mixer;
      wallBox(wall, a - 6, a + 6, 0, 1.2, 1.0, 1.2, mat.black);               // valve plate
      wallBox(wall, a - 1, a + 1, 0, 2, 1.05, 1.9, mat.black);                // riser rail
      wallBox(wall, a - 3, a + 3, 2, 8, 1.35, 1.55, mat.black);               // hand shower
    }
    if (S.head) {
      const [wall, a] = S.head;
      wallBox(wall, a - 1, a + 1, 0, 30, 2.24, 2.26, mat.black);              // arm
      wallBox(wall, a - 15, a + 15, 18, 48, 2.2, 2.22, mat.black);            // 30 cm rain head
    }
    if (S.drain) add(B(S.drain[0][0], S.drain[1][0], S.drain[0][1], S.drain[1][1], 0.001, 0.006, mat.black, { cast: false }));
    if (S.shelf) {
      const [wall, a0, a1] = S.shelf;
      wallBox(wall, a0, a1, 0, 12, 1.1, 1.12, mat.blackGlass);
    }
  }

  return g;
}

/** Pill-shaped mirror with a thin black frame on a wall, centred at along-wall position mid (cm). */
function capsuleMirror(wall, mid, w, h, bottom, mat, onWall, P) {
  const shape = (ww, hh) => {
    const r = ww / 2;
    const s = new THREE.Shape();
    s.moveTo(-r, -hh / 2 + r);
    s.lineTo(-r, hh / 2 - r);
    s.absarc(0, hh / 2 - r, r, Math.PI, 0, true);
    s.lineTo(r, -hh / 2 + r);
    s.absarc(0, -hh / 2 + r, r, 0, Math.PI, true);
    return s;
  };
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shape(w + 0.03, h + 0.03), { depth: 0.02, bevelEnabled: false }), mat.black);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape(w, h)), mat.mirror);
  glass.position.z = 0.021;
  grp.add(frame, glass);
  const [u0, v0] = onWall(wall, mid, mid, 0.5, 0.5);
  const [sx, sz] = P(u0, v0);
  grp.position.set(sx, bottom + h / 2, sz);
  grp.rotation.y = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[wall];
  return grp;
}
