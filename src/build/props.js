import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/*
 * Procedural interior props. Every factory returns a THREE.Group whose
 * origin sits on the floor, with the "front" of the piece facing +Z.
 * Used for things the CC0 model library doesn't cover well (beds,
 * wardrobes, kitchen, bathroom fixtures, curtains, rugs…).
 */

let P = null; // shared prop materials

export function initProps(M) {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
  P = {
    M,
    linen: std({ color: 0xf3efe8, roughness: 0.95 }),
    duvet: std({ color: 0xd9cdbb, roughness: 0.95 }),
    duvetBlue: std({ color: 0x5d7088, roughness: 0.95 }),
    duvetSage: std({ color: 0x8f9c84, roughness: 0.95 }),
    upholstery: std({ color: 0xb7a58f, roughness: 0.95 }),
    upholsteryGrey: std({ color: 0x8c8a86, roughness: 0.95 }),
    walnut: std({ color: 0x5b3a26, roughness: 0.55 }),
    oak: std({ color: 0xa57a4f, roughness: 0.55 }),
    lacquer: std({ color: 0xf2efe9, roughness: 0.35 }),
    lacquerGrey: std({ color: 0xc9c5bf, roughness: 0.4 }),
    handle: std({ color: 0xb8b1a3, roughness: 0.3, metalness: 0.9 }),
    chrome: std({ color: 0xe8eaec, roughness: 0.12, metalness: 1 }),
    steel: std({ color: 0xc7cbd0, roughness: 0.3, metalness: 0.9 }),
    blackGlass: std({ color: 0x0b0c0e, roughness: 0.08, metalness: 0.3 }),
    quartz: std({ color: 0xeeebe6, roughness: 0.2 }),
    darkQuartz: std({ color: 0x2b2b2e, roughness: 0.25 }),
    ceramic: std({ color: 0xfbfbfa, roughness: 0.08 }),
    mirror: std({ color: 0xdfe6ea, roughness: 0.02, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xd8ecf2, roughness: 0.03, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    lampShade: new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffd9a0, emissiveIntensity: 0.9, roughness: 0.9, side: THREE.DoubleSide }),
    screen: std({ color: 0x050607, roughness: 0.12, metalness: 0.5 }),
    rubber: std({ color: 0x222222, roughness: 0.9 }),
    curtain: std({ color: 0xe8dfcf, roughness: 1, side: THREE.DoubleSide }),
    curtainDark: std({ color: 0x8a7a66, roughness: 1, side: THREE.DoubleSide }),
    rugs: [rugMaterial(0x7d2a22, 0xd9b97a, 0x1f2f4a), rugMaterial(0x2f3d52, 0xc9b48c, 0x8a2f25), rugMaterial(0xd8cfc0, 0x8a7a66, 0x5a6b5a)],
  };
  return P;
}

export const roundedBox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999);

const rbox = (w, h, d, r, mat) => {
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
};
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const blk = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.receiveShadow = true;
  return m;
};
const cylY = (r, h, mat, x = 0, y = 0, z = 0, seg = 20, rt = r) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.receiveShadow = true;
  return m;
};

/* ---------------- bedroom ------------------------------------------- */
export function bed({ w = 1.8, l = 2.0, duvet = 'duvet' } = {}) {
  const g = new THREE.Group();
  const W = w + 0.12, L = l + 0.15;
  g.add(at(rbox(W, 0.32, L, 0.04, P.upholstery), 0, 0.2, 0.04));
  g.add(at(rbox(w, 0.26, l, 0.08, P.linen), 0, 0.49, 0.06));
  // duvet over the lower two-thirds, folded back
  g.add(at(rbox(w + 0.06, 0.08, l * 0.68, 0.04, P[duvet]), 0, 0.6, 0.06 + l * 0.16));
  g.add(at(rbox(w + 0.08, 0.04, 0.32, 0.02, P.linen), 0, 0.65, 0.06 + l * 0.16 - l * 0.34 + 0.16));
  // throw blanket at the foot
  g.add(at(rbox(w + 0.1, 0.03, 0.45, 0.015, P.curtainDark), 0, 0.655, L / 2 - 0.3));
  // pillows
  for (const x of [-w / 4, w / 4]) {
    const p = at(rbox(w / 2 - 0.08, 0.16, 0.42, 0.07, P.linen), x, 0.68, -l / 2 + 0.32);
    p.rotation.x = -0.35;
    g.add(p);
    g.add(at(rbox(w / 2 - 0.2, 0.12, 0.3, 0.06, P[duvet]), x, 0.66, -l / 2 + 0.6));
  }
  // tufted headboard: framed panel with vertical channels
  g.add(at(rbox(W + 0.1, 1.25, 0.12, 0.05, P.upholstery), 0, 0.625, -L / 2 + 0.06 + 0.04));
  const n = Math.round(W / 0.22);
  for (let i = 0; i < n; i++) {
    g.add(at(rbox(W / n - 0.02, 0.9, 0.06, 0.03, P.upholstery), -W / 2 + (i + 0.5) * (W / n), 0.85, -L / 2 + 0.17));
  }
  return g;
}

export function nightstand({ lamp = true } = {}) {
  const g = new THREE.Group();
  g.add(at(rbox(0.5, 0.48, 0.42, 0.02, P.walnut), 0, 0.3, 0));
  g.add(blk(0.46, 0.006, 0.01, P.handle, 0, 0.32, 0.211));
  g.add(blk(0.12, 0.012, 0.012, P.handle, 0, 0.44, 0.216));
  for (const x of [-0.2, 0.2]) g.add(blk(0.03, 0.06, 0.03, P.handle, x, 0, 0));
  if (lamp) { const l = tableLamp(); l.position.set(0, 0.54, -0.04); g.add(l); }
  return g;
}

export function tableLamp() {
  const g = new THREE.Group();
  g.add(cylY(0.07, 0.03, P.handle, 0, 0, 0));
  g.add(cylY(0.012, 0.32, P.handle, 0, 0.03, 0));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.22, 24, 1, true), P.lampShade);
  shade.position.y = 0.42;
  g.add(shade);
  return g;
}

export function wardrobe(w = 2.4, h = 2.5, d = 0.62) {
  const g = new THREE.Group();
  g.add(blk(w, h, d, P.lacquer, 0, 0, 0));
  const doors = Math.max(2, Math.round(w / 0.6));
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + (i + 0.5) * dw;
    g.add(blk(dw - 0.008, h - 0.12, 0.02, P.lacquer, x, 0.08, d / 2 + 0.01));
    g.add(blk(0.015, 0.5, 0.025, P.handle, x + (i % 2 ? -1 : 1) * (dw / 2 - 0.06), 1.0, d / 2 + 0.03));
  }
  g.add(blk(w, 0.08, d - 0.04, P.lacquerGrey, 0, 0, -0.01));
  return g;
}

export function dressingTable() {
  const g = new THREE.Group();
  g.add(blk(1.3, 0.05, 0.48, P.lacquer, 0, 0.72, 0));
  g.add(blk(1.26, 0.18, 0.44, P.lacquer, 0, 0.54, 0));
  for (const x of [-0.62, 0.62]) g.add(blk(0.04, 0.54, 0.44, P.lacquer, x, 0, 0));
  g.add(blk(0.9, 1.0, 0.03, P.mirror, 0, 0.9, -0.22));
  g.add(blk(0.96, 1.06, 0.02, P.handle, 0, 0.87, -0.235));
  const stool = new THREE.Group();
  stool.add(at(rbox(0.45, 0.12, 0.35, 0.04, P.upholstery), 0, 0.42, 0));
  for (const [x, z] of [[-0.18, -0.13], [0.18, -0.13], [-0.18, 0.13], [0.18, 0.13]]) stool.add(cylY(0.015, 0.36, P.handle, x, 0, z));
  stool.position.z = 0.45;
  g.add(stool);
  return g;
}

export function sideTable() {
  const g = new THREE.Group();
  g.add(cylY(0.28, 0.025, P.quartz, 0, 0.53, 0, 32));
  g.add(cylY(0.02, 0.53, P.handle, 0, 0, 0));
  g.add(cylY(0.18, 0.02, P.handle, 0, 0, 0, 24));
  return g;
}

/* ---------------- living / dining ----------------------------------- */
export function tvWall(w = 1.9) {
  const g = new THREE.Group();
  const h = w * 0.5625;
  g.add(blk(w, h, 0.03, P.screen, 0, 0, 0));
  g.add(blk(w - 0.02, h - 0.02, 0.002, P.blackGlass, 0, 0.01, 0.016));
  return g; // place y at the bottom edge of the screen
}

export function diningTable(l = 2.6, w = 1.1) {
  const g = new THREE.Group();
  g.add(at(rbox(l, 0.05, w, 0.02, P.darkQuartz), 0, 0.745, 0));
  for (const x of [-l / 2 + 0.45, l / 2 - 0.45]) {
    g.add(blk(0.1, 0.72, w * 0.6, P.walnut, x, 0, 0));
    g.add(blk(0.5, 0.04, w * 0.7, P.walnut, x, 0, 0));
  }
  g.add(blk(l - 1.0, 0.06, 0.08, P.walnut, 0, 0.6, 0));
  return g;
}

export function rug(w, d, style = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), P.rugs[style % P.rugs.length]);
  m.position.y = 0.006;
  m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

/** Pleated curtain hanging from y=0 (rod) downwards over height h. */
export function curtain(w, h, dark = false) {
  const segs = Math.max(8, Math.round(w * 14));
  const geo = new THREE.PlaneGeometry(w, h, segs, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin((x / w) * segs * Math.PI) * 0.035);
  }
  geo.computeVertexNormals();
  geo.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(geo, dark ? P.curtainDark : P.curtain);
  m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m);
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 0.2, 8), P.handle), 0, 0.02, -0.02));
  g.children[1].rotation.z = Math.PI / 2;
  return g;
}

/* ---------------- kitchen ------------------------------------------- */
/** Base cabinet run of length L along X (front +Z), optional sink/cooktop positions (x). */
export function counterRun(L, { sink = null, hob = null, d = 0.62, uppers = true } = {}) {
  const g = new THREE.Group();
  g.add(blk(L, 0.1, d - 0.06, P.rubber, 0, 0, -0.03));
  g.add(blk(L, 0.78, d - 0.02, P.lacquer, 0, 0.1, 0));
  const n = Math.max(1, Math.round(L / 0.6));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * (L / n);
    g.add(blk(L / n - 0.006, 0.74, 0.02, P.lacquer, x, 0.12, d / 2));
    g.add(blk(L / n - 0.15, 0.012, 0.02, P.handle, x, 0.8, d / 2 + 0.02));
  }
  g.add(blk(L + 0.02, 0.03, d + 0.02, P.quartz, 0, 0.88, 0.01));
  if (sink !== null) {
    g.add(blk(0.75, 0.005, 0.42, P.steel, sink, 0.905, 0.02));
    g.add(blk(0.7, 0.004, 0.38, P.rubber, sink, 0.909, 0.02));
    const tap = new THREE.Group();
    tap.add(cylY(0.022, 0.3, P.chrome, 0, 0, 0));
    const spout = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 8, 16, Math.PI), P.chrome);
    spout.position.set(0, 0.3, 0.1);
    spout.rotation.y = Math.PI / 2;
    tap.add(spout);
    tap.position.set(sink, 0.91, -d / 2 + 0.1);
    g.add(tap);
  }
  if (hob !== null) {
    g.add(blk(0.78, 0.008, 0.5, P.blackGlass, hob, 0.91, 0));
    for (const [x, z] of [[-0.2, -0.1], [0.2, -0.1], [-0.2, 0.12], [0.2, 0.12]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 6, 24), P.steel);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(hob + x, 0.92, z);
      g.add(ring);
    }
  }
  if (uppers) {
    const segs = [];
    let start = -L / 2;
    const gapW = hob !== null ? 0.9 : 0;
    if (hob !== null) {
      segs.push([start, hob - gapW / 2], [hob + gapW / 2, L / 2]);
      const hood = new THREE.Group();
      hood.add(blk(0.9, 0.12, 0.5, P.steel, 0, 1.6, -d / 2 + 0.25));
      hood.add(blk(0.3, 0.8, 0.25, P.steel, 0, 1.72, -d / 2 + 0.13));
      hood.position.x = hob;
      g.add(hood);
    } else segs.push([start, L / 2]);
    for (const [a, b] of segs) {
      if (b - a < 0.3) continue;
      g.add(blk(b - a, 0.72, 0.35, P.lacquerGrey, (a + b) / 2, 1.5, -d / 2 + 0.175));
      g.add(blk(b - a, 0.02, 0.36, P.lampShade, (a + b) / 2, 1.49, -d / 2 + 0.18));
    }
    // splashback
    g.add(blk(L, 0.6, 0.012, P.quartz, 0, 0.9, -d / 2 + 0.006));
  }
  return g;
}

export function fridge() {
  const g = new THREE.Group();
  g.add(blk(0.9, 2.0, 0.7, P.steel, 0, 0, 0));
  g.add(blk(0.004, 1.96, 0.01, P.rubber, 0, 0.02, 0.352));
  for (const x of [-0.04, 0.04]) g.add(blk(0.02, 0.9, 0.04, P.chrome, x, 0.75, 0.37));
  g.add(blk(0.25, 0.35, 0.005, P.blackGlass, -0.22, 1.1, 0.353));
  return g;
}

export function island(L = 2.4, D = 1.0) {
  const g = new THREE.Group();
  g.add(blk(L - 0.1, 0.86, D - 0.25, P.lacquerGrey, 0, 0.02, -0.12));
  g.add(at(rbox(L, 0.05, D, 0.015, P.quartz), 0, 0.905, 0));
  for (let i = 0; i < 3; i++) {
    const s = barStool();
    s.position.set(-L / 3 + (i * L) / 3, 0, D / 2 + 0.3);
    s.rotation.y = Math.PI;
    g.add(s);
  }
  return g;
}

export function barStool() {
  const g = new THREE.Group();
  g.add(at(rbox(0.42, 0.07, 0.4, 0.03, P.upholstery), 0, 0.68, 0));
  g.add(at(rbox(0.4, 0.28, 0.05, 0.02, P.upholstery), 0, 0.85, -0.18));
  g.add(cylY(0.025, 0.64, P.chrome, 0, 0.02, 0));
  g.add(cylY(0.2, 0.02, P.chrome, 0, 0, 0, 24));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.01, 6, 24), P.chrome);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.28;
  g.add(ring);
  return g;
}

/* ---------------- bathroom ------------------------------------------ */
export function wc() {
  const g = new THREE.Group();
  // wall-hung pan with concealed cistern panel and flush plate
  g.add(blk(0.42, 1.1, 0.12, P.quartz, 0, 0, -0.06));
  g.add(blk(0.22, 0.15, 0.01, P.chrome, 0, 0.95, 0.005));
  const pan = at(rbox(0.36, 0.34, 0.54, 0.12, P.ceramic), 0, 0.33, 0.27);
  g.add(pan);
  g.add(at(rbox(0.37, 0.03, 0.5, 0.02, P.ceramic), 0, 0.515, 0.28));
  return g;
}

export function vanity(w = 1.2, double = false) {
  const g = new THREE.Group();
  g.add(blk(w, 0.45, 0.48, P.walnut, 0, 0.4, 0));
  g.add(blk(w + 0.02, 0.04, 0.5, P.quartz, 0, 0.85, 0.01));
  const basins = double ? [-w / 4, w / 4] : [0];
  for (const x of basins) {
    g.add(at(rbox(0.42, 0.13, 0.34, 0.05, P.ceramic), x, 0.955, 0.03));
    g.add(blk(0.34, 0.005, 0.26, P.quartz, x, 1.015, 0.03));
    g.add(cylY(0.018, 0.25, P.chrome, x, 0.89, -0.18));
    g.add(blk(0.03, 0.02, 0.14, P.chrome, x, 1.12, -0.12));
  }
  // mirror + light line
  g.add(blk(Math.max(0.8, w - 0.1), 0.9, 0.02, P.mirror, 0, 1.15, -0.23));
  g.add(blk(Math.max(0.8, w - 0.1), 0.025, 0.04, P.lampShade, 0, 2.07, -0.21));
  return g;
}

export function shower(w = 1.0, d = 0.9) {
  const g = new THREE.Group();
  g.add(blk(w, 0.04, d, P.quartz, 0, 0, 0));
  g.add(blk(0.008, 2.0, d, P.glass, w / 2, 0.04, 0));
  g.add(blk(w * 0.6, 2.0, 0.008, P.glass, w * 0.2, 0.04, d / 2));
  g.add(cylY(0.012, 2.1, P.chrome, -w / 2 + 0.1, 0.04, -d / 2 + 0.05));
  g.add(cylY(0.13, 0.015, P.chrome, -w / 2 + 0.3, 2.1, -d / 2 + 0.25, 24));
  g.add(blk(0.25, 0.015, 0.03, P.chrome, -w / 2 + 0.2, 2.13, -d / 2 + 0.12));
  return g;
}

export function towelRail() {
  const g = new THREE.Group();
  for (const y of [0.9, 1.1, 1.3]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8), P.chrome);
    r.rotation.z = Math.PI / 2; r.position.set(0, y, 0.06);
    g.add(r);
  }
  g.add(blk(0.5, 0.3, 0.03, P.linen, 0, 0.92, 0.075));
  return g;
}

/* ---------------- laundry ------------------------------------------- */
export function washer(dryer = false) {
  const g = new THREE.Group();
  g.add(blk(0.6, 0.85, 0.6, P.lacquer, 0, 0, 0));
  const door = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 10, 28), P.chrome);
  door.position.set(0, 0.45, 0.31);
  g.add(door);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), dryer ? P.blackGlass : P.glass);
  glass.position.set(0, 0.45, 0.305);
  g.add(glass);
  g.add(blk(0.55, 0.1, 0.01, P.lacquerGrey, 0, 0.72, 0.302));
  return g;
}

/* ---------------- majlis seating (traditional, built-in) ------------- */
/** Long low majlis seat with back cushions, length L along X. */
export function majlisSeat(L, mat) {
  const g = new THREE.Group();
  const base = mat || P.upholstery;
  g.add(at(rbox(L, 0.38, 0.78, 0.05, base), 0, 0.19, 0));
  const n = Math.max(1, Math.round(L / 0.85));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * (L / n);
    g.add(at(rbox(L / n - 0.03, 0.12, 0.7, 0.05, base), x, 0.43, 0.03));
    const back = at(rbox(L / n - 0.04, 0.45, 0.16, 0.07, base), x, 0.66, -0.3);
    back.rotation.x = -0.18;
    g.add(back);
  }
  return g;
}

/* ---------------- textures ------------------------------------------ */
function rugMaterial(field, border, accent) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');
  x.fillStyle = hex(border); x.fillRect(0, 0, 512, 512);
  x.fillStyle = hex(field); x.fillRect(40, 40, 432, 432);
  x.strokeStyle = hex(accent); x.lineWidth = 10; x.strokeRect(58, 58, 396, 396);
  x.strokeStyle = hex(border); x.lineWidth = 4; x.strokeRect(78, 78, 356, 356);
  // central medallion + corner motifs
  x.save(); x.translate(256, 256);
  for (let r = 120; r > 20; r -= 25) {
    x.beginPath();
    for (let a = 0; a <= 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const rr = a % 2 ? r * 0.65 : r;
      x.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    x.closePath();
    x.fillStyle = hex(r % 50 < 25 ? accent : border);
    x.globalAlpha = 0.85;
    x.fill();
  }
  x.restore();
  x.globalAlpha = 0.5;
  for (const [cx, cy] of [[110, 110], [402, 110], [110, 402], [402, 402]]) {
    x.beginPath(); x.arc(cx, cy, 22, 0, Math.PI * 2); x.fillStyle = hex(accent); x.fill();
  }
  // woven noise
  const img = x.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 1 });
}
