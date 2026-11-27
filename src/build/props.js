import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/*
 * Procedural interior props. Every factory returns a THREE.Group whose
 * origin sits on the floor, with the "front" of the piece facing +Z.
 * Used for things the CC0 model library doesn't cover well (beds,
 * wardrobes, kitchen, bathroom fixtures, curtains, rugs…).
 */

let P = null; // shared prop materials

/** Brightness of lamp shades / light lines (1 = daytime). */
export function setLampLevel(k) {
  if (P) P.lampShade.emissiveIntensity = 0.9 * k;
}

export function initProps(M) {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
  P = {
    M,
    linen: std({ color: 0xf3efe8, roughness: 0.95 }),
    duvet: std({ color: 0xd9cdbb, roughness: 0.95 }),
    duvetBlue: std({ color: 0x8b95a1, roughness: 0.95 }),   // grey-blue (boy bedroom)
    duvetSage: std({ color: 0x9f8f7c, roughness: 0.95 }),   // taupe (master)
    duvetGrey: std({ color: 0xa6a4a0, roughness: 0.95 }),
    upholstery: std({ color: 0xc7b49b, roughness: 0.95 }),
    upholsteryGrey: std({ color: 0x8c8a86, roughness: 0.95 }),
    walnut: std({ color: 0x5b3a26, roughness: 0.55 }),
    oak: std({ color: 0xa57a4f, roughness: 0.55 }),
    lacquer: std({ color: 0xdcccb4, roughness: 0.4 }),   // warm beige joinery (interior design)
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
    curtain: std({ color: 0x9c8a74, roughness: 1, side: THREE.DoubleSide }),
    curtainDark: std({ color: 0x8f7d68, roughness: 1, side: THREE.DoubleSide }),
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
  g.add(at(rbox(l, 0.05, w, 0.02, WHITE_MARBLE()), 0, 0.745, 0));
  for (const x of [-l / 2 + 0.45, l / 2 - 0.45]) {
    g.add(blk(0.1, 0.72, w * 0.6, P.handle, x, 0, 0));
    g.add(blk(0.5, 0.04, w * 0.7, P.handle, x, 0, 0));
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

/* ---------------- wall art ------------------------------------------ */
const artCache = new Map();
/** Framed abstract canvas, hung with its back on the wall (origin = centre). */
export function artwork(w = 1.2, h = 0.8, seed = 1) {
  const g = new THREE.Group();
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), P.walnut), 0, 0, 0.02));
  const key = seed % 6;
  if (!artCache.has(key)) artCache.set(key, artMaterial(key));
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artCache.get(key));
  canvas.position.z = 0.042;
  g.add(canvas);
  return g;
}

function artMaterial(seed) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 340;
  const x = c.getContext('2d');
  const palettes = [
    ['#e9dcc7', '#c08a5b', '#6b4b3a', '#2f3e4e', '#d9b77a'],
    ['#f1ece4', '#8fa6a0', '#3d5a5c', '#c9a36a', '#20272e'],
    ['#efe7da', '#d07a4f', '#8c3b2e', '#e8c68a', '#3a3a3a'],
    ['#e7e9ec', '#9bb3c9', '#2d4a6b', '#c7a77a', '#111821'],
    ['#f3ead9', '#b9a06b', '#7a6a4d', '#3b5244', '#e0d2b4'],
    ['#ece6de', '#a35c4a', '#5b6f7c', '#d8c3a5', '#2b2b2b'],
  ][seed];
  x.fillStyle = palettes[0]; x.fillRect(0, 0, 512, 340);
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 9; i++) {
    x.globalAlpha = 0.55 + rnd() * 0.4;
    x.fillStyle = palettes[1 + Math.floor(rnd() * 4)];
    x.beginPath();
    if (rnd() > 0.5) x.arc(rnd() * 512, rnd() * 340, 30 + rnd() * 110, 0, Math.PI * 2);
    else x.rect(rnd() * 400, rnd() * 260, 60 + rnd() * 200, 20 + rnd() * 120);
    x.fill();
  }
  x.globalAlpha = 0.9; x.strokeStyle = palettes[4]; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, 240 + rnd() * 60); x.bezierCurveTo(170, 120, 340, 330, 512, 180 + rnd() * 80); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
}

/* ================= interior-design package pieces ===================== */
const mats = {};
function m(key, o) { return (mats[key] ||= new THREE.MeshStandardMaterial({ roughness: 0.9, ...o })); }
const BOUCLE = () => m('boucle', { color: 0xece6dc, roughness: 1 });
const TAUPE = () => m('taupe', { color: 0x9a8670, roughness: 1 });
const CARAMEL = () => m('caramel', { color: 0xa45a32, roughness: 1 });
const VELVET = () => m('velvetBrown', { color: 0x6e5443, roughness: 0.85 });
const BRASS = () => m('brass', { color: 0xc9a56a, roughness: 0.28, metalness: 0.95 });
const WHITE_MARBLE = () => m('whiteMarble', { color: 0xf3f1ec, roughness: 0.12 });

/** Modern sofa with rounded edges, back cushions and accent pillows (front +Z). */
export function modernSofa(len = 2.6, { color = 'boucle', depth = 0.95, pillows = 4, curved = false } = {}) {
  const g = new THREE.Group();
  const mat = color === 'taupe' ? TAUPE() : color === 'velvet' ? VELVET() : BOUCLE();
  const r = curved ? 0.3 : 0.08;
  g.add(at(rbox(len, 0.42, depth, r, mat), 0, 0.21, 0));
  g.add(at(rbox(len, 0.4, 0.24, Math.min(0.12, r), mat), 0, 0.6, -depth / 2 + 0.12));
  for (const s of [-1, 1]) g.add(at(rbox(0.22, 0.6, depth, Math.min(0.1, r), mat), s * (len / 2 - 0.11), 0.3, 0));
  const n = Math.max(2, Math.round((len - 0.5) / 0.75));
  for (let i = 0; i < n; i++) g.add(at(rbox((len - 0.5) / n - 0.04, 0.12, depth - 0.3, 0.05, mat), -len / 2 + 0.25 + (i + 0.5) * ((len - 0.5) / n), 0.48, 0.08));
  for (let i = 0; i < pillows; i++) {
    const x = -len / 2 + 0.4 + (i * (len - 0.8)) / Math.max(1, pillows - 1);
    const p = at(rbox(0.42, 0.4, 0.13, 0.06, i % 2 ? CARAMEL() : TAUPE()), x, 0.72, -depth / 2 + 0.3);
    p.rotation.x = -0.25;
    g.add(p);
  }
  return g;
}

/** Brown velvet tub chair (front +Z). */
export function tubChair(color = 'velvet') {
  const g = new THREE.Group();
  const VELVET = () => (color === 'beige' ? m('beigeVelvet', { color: 0xc8b49a, roughness: 0.9 }) : m('velvetBrown', { color: 0x6e5443, roughness: 0.85 }));
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.38, 0.42, 32), VELVET());
  seat.position.y = 0.21; g.add(seat);
  const back = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 12, 32, Math.PI * 1.25), VELVET());
  back.rotation.x = Math.PI / 2; back.rotation.z = Math.PI * 0.875; back.position.y = 0.55;
  g.add(back);
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 28), VELVET()), 0, 0.47, 0.03));
  return g;
}

/** Organic white-marble coffee table on a brushed-brass base. */
export function marbleTable(w = 1.3, d = 0.8, h = 0.38) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 40), WHITE_MARBLE());
  top.scale.set(w, 1, d); top.position.y = h - 0.02; g.add(top);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, h - 0.04, 32), BRASS());
  base.scale.set(w * 0.9, 1, d * 0.9); base.position.y = (h - 0.04) / 2; g.add(base);
  return g;
}

/** Brass ring chandelier (two interlaced LED rings) hanging from the ceiling (origin at ceiling). */
export function ringChandelier(r = 0.6) {
  const g = new THREE.Group();
  const led = m('ringLed', { color: 0xfff4e0, emissive: 0xffd9a0, emissiveIntensity: 1.2 });
  for (const [tilt, y] of [[0.25, -0.75], [-0.35, -0.85]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 10, 64), BRASS());
    ring.rotation.x = Math.PI / 2 + tilt; ring.position.y = y; g.add(ring);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 64), led);
    glow.rotation.copy(ring.rotation); glow.position.set(0, y - 0.02, 0); g.add(glow);
  }
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.7, 4), BRASS()), 0, -0.35, 0));
  return g;
}

/** Cluster of white glass globe pendants (origin at ceiling). */
export function globePendants(n = 5, spread = 0.9) {
  const g = new THREE.Group();
  const glass = m('globe', { color: 0xfffaf0, emissive: 0xffe6c0, emissiveIntensity: 0.8, roughness: 0.3 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = i % 2 ? spread * 0.5 : spread * 0.25;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.5, drop = 0.9 + (i % 3) * 0.25;
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, drop, 4), BRASS()), x, -drop / 2, z));
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.11 + (i % 2) * 0.04, 20, 14), glass), x, -drop - 0.1, z));
  }
  return g;
}

/** Executive desk: marble top on a dark base and a leather chair behind it (desk front +Z). */
export function officeDesk() {
  const g = new THREE.Group();
  g.add(at(rbox(1.9, 0.05, 0.85, 0.02, WHITE_MARBLE()), 0, 0.75, 0));
  g.add(blk(1.2, 0.72, 0.6, P.darkQuartz, -0.2, 0, -0.05));
  g.add(blk(0.05, 0.72, 0.7, P.handle, 0.85, 0, 0));
  g.add(blk(0.55, 0.38, 0.03, P.screen, 0.45, 0.78, -0.25));      // monitor
  g.add(blk(0.08, 0.05, 0.08, P.handle, 0.45, 0.78, -0.22));
  const lamp = tableLamp(); lamp.position.set(-0.75, 0.78, -0.2); lamp.scale.setScalar(0.8); g.add(lamp);
  const chair = new THREE.Group();
  chair.add(at(rbox(0.6, 0.12, 0.55, 0.05, m('beigeLeather', { color: 0xd8c8b0, roughness: 0.5 })), 0, 0.5, 0));
  chair.add(at(rbox(0.56, 0.75, 0.1, 0.05, m('beigeLeather', { color: 0xd8c8b0, roughness: 0.5 })), 0, 0.95, -0.25));
  chair.add(cylY(0.03, 0.45, P.chrome, 0, 0.02, 0));
  chair.add(cylY(0.3, 0.02, P.chrome, 0, 0, 0, 24));
  chair.position.z = -0.75; g.add(chair);
  return g;
}

/** Black metal shelving with walnut shelves and LED (back on the wall, front +Z). */
export function shelving(w = 3.0, h = 2.7, d = 0.38) {
  const g = new THREE.Group();
  const frame = m('blackFrame', { color: 0x181818, roughness: 0.5, metalness: 0.4 });
  const wood = m('walnutShelf', { color: 0x6b4c36, roughness: 0.55 });
  const led = m('shelfLed', { color: 0xfff3dc, emissive: 0xffd9a0, emissiveIntensity: 1.1 });
  g.add(blk(w, h, 0.03, frame, 0, 0, -d / 2 + 0.015));
  const cols = Math.max(2, Math.round(w / 0.9));
  for (let i = 0; i <= cols; i++) g.add(blk(0.03, h, d, frame, -w / 2 + (i * w) / cols, 0, 0));
  for (let y = 0.4; y < h; y += 0.45) {
    g.add(blk(w, 0.03, d, wood, 0, y, 0));
    g.add(blk(w - 0.06, 0.01, 0.02, led, 0, y - 0.012, d / 2 - 0.03));
  }
  g.add(blk(w, 0.4, d, wood, 0, 0, 0)); // low cabinet
  // a few books / objects
  for (let y = 0.43; y < h - 0.3; y += 0.9) for (let i = 0; i < cols; i += 2) {
    g.add(blk(0.3, 0.26, 0.2, m('books' + (i % 3), { color: [0xcbb89a, 0x8c6f52, 0x40403e][i % 3] }), -w / 2 + (i + 0.5) * (w / cols), y + 0.03, 0));
  }
  return g;
}

/** Linear bio-ethanol fireplace in a black stone surround (front +Z). */
export function linearFireplace(w = 1.8) {
  const g = new THREE.Group();
  g.add(blk(w + 0.4, 0.45, 0.35, m('blackStone', { color: 0x1e1e1f, roughness: 0.3 }), 0, 0, 0));
  g.add(blk(w, 0.14, 0.02, m('flame', { color: 0xffb060, emissive: 0xff7a1a, emissiveIntensity: 3 }), 0, 0.17, 0.17));
  return g;
}

/** Sheer full-width curtain (semi-transparent white). */
export function sheer(w, h) {
  const segs = Math.max(12, Math.round(w * 18));
  const geo = new THREE.PlaneGeometry(w, h, segs, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / w) * segs * Math.PI) * 0.02);
  geo.computeVertexNormals();
  geo.translate(0, -h / 2, 0);
  const mesh = new THREE.Mesh(geo, m('sheer', { color: 0xfbf8f2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
  const g = new THREE.Group(); g.add(mesh); return g;
}

/** Extra rug palettes used by the interior design (cream floral, grey geometric, persian). */
export function rugStyled(w, d, style) {
  const pal = { cream: [0xe9e0d0, 0xd3c4ab, 0xb89a74], grey: [0x9a9792, 0xd2cfca, 0x6c6a66], persian: [0x8b3a2b, 0xd2b07c, 0x3b2a22] }[style];
  const key = 'rug_' + style;
  mats[key] ||= rugMaterial(...pal);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), mats[key]);
  mesh.position.y = 0.006; mesh.receiveShadow = true;
  const g = new THREE.Group(); g.add(mesh); return g;
}

/** Coffee corner: base cabinets + stone top, open walnut shelves with LED, espresso machine, grinder, cups (front +Z). */
export function coffeeCorner(L = 2.4) {
  const g = counterRun(L, { uppers: false });
  const wood = m('walnutShelf', { color: 0x6b4c36, roughness: 0.55 });
  const led = m('shelfLed', { color: 0xfff3dc, emissive: 0xffd9a0, emissiveIntensity: 1.1 });
  // backsplash panel in walnut + two floating shelves
  g.add(blk(L, 1.2, 0.02, wood, 0, 0.9, -0.3));
  for (const y of [1.45, 1.85]) {
    g.add(blk(L - 0.2, 0.04, 0.28, wood, 0, y, -0.15));
    g.add(blk(L - 0.3, 0.01, 0.02, led, 0, y - 0.01, -0.03));
    for (let x = -L / 2 + 0.3; x < L / 2 - 0.2; x += 0.22) g.add(cylY(0.04, 0.09, P.ceramic, x, y + 0.04, -0.15, 12));
  }
  // espresso machine
  const em = new THREE.Group();
  em.add(blk(0.4, 0.38, 0.4, P.steel, 0, 0, 0));
  em.add(blk(0.36, 0.06, 0.1, P.blackGlass, 0, 0.26, 0.2));
  em.add(cylY(0.03, 0.06, P.chrome, -0.08, 0.12, 0.22));
  em.add(cylY(0.03, 0.06, P.chrome, 0.08, 0.12, 0.22));
  em.position.set(-L / 4, 0.905, 0);
  g.add(em);
  // grinder + kettle + cups
  const gr = new THREE.Group();
  gr.add(blk(0.16, 0.25, 0.2, P.screen, 0, 0, 0));
  gr.add(cylY(0.06, 0.15, P.glass, 0, 0.25, 0, 14, 0.05));
  gr.position.set(0.05, 0.905, -0.05);
  g.add(gr);
  g.add(cylY(0.08, 0.2, P.steel, L / 4, 0.905, 0, 16, 0.06));
  for (const dx of [0.35, 0.45]) g.add(cylY(0.04, 0.08, P.ceramic, L / 4 + dx - 0.2, 0.905, 0.15, 12));
  return g;
}

/**
 * Ceiling fan with walnut blades, matte-black motor, brass trim and an opal
 * light dome. Origin at the ceiling; the blades spin while it's visible.
 */
export function ceilingFan({ span = 1.32, blades = 5, drop = 0.42 } = {}) {
  const g = new THREE.Group();
  const black = m('fanBlack', { color: 0x1b1b1c, roughness: 0.45, metalness: 0.5 });
  const walnut = m('fanWalnut', { color: 0x6b4a33, roughness: 0.55 });
  const opal = m('fanOpal', { color: 0xfff6e8, emissive: 0xffe2b8, emissiveIntensity: 0.9, roughness: 0.4 });
  // canopy + downrod
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.07, 24), black), 0, -0.035, 0));
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, drop, 8), black), 0, -drop / 2, 0));
  // motor housing with brass band
  const hub = new THREE.Group();
  hub.position.y = -drop - 0.05;
  hub.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 32), black));
  hub.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.015, 32), BRASS()), 0, -0.05, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), opal);
  dome.position.y = -0.06;
  hub.add(dome);
  g.add(hub);
  // rotor: blades on black brackets, slightly pitched
  const rotor = new THREE.Group();
  rotor.position.y = -drop - 0.06;
  const L = span / 2 - 0.12;
  for (let i = 0; i < blades; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / blades) * Math.PI * 2;
    arm.add(at(rbox(0.16, 0.012, 0.04, 0.005, black), 0.2, 0, 0));
    const blade = at(rbox(L, 0.012, 0.15, 0.006, walnut), 0.2 + L / 2, -0.004, 0);
    blade.rotation.x = 0.14; // pitch
    arm.add(blade);
    rotor.add(arm);
  }
  rotor.userData.dynamic = true;
  // spin ~1.3 rev/s while rendered (onBeforeRender fires only for meshes)
  let last = performance.now();
  rotor.children[0].children[0].onBeforeRender = () => {
    const now = performance.now();
    rotor.rotation.y -= Math.min(0.1, (now - last) / 1000) * 8;
    last = now;
  };
  g.add(rotor);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.userData.dynamic = true; } });
  return g;
}
