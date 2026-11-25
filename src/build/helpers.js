import * as THREE from 'three';
import { worldUV } from '../core/textures.js';
import { toScene } from '../data/building.js';

export const tileOf = (mat) => mat?.userData?.tile || 1;

function finish(mesh, { cast = true, receive = true } = {}) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

/** Box with its pivot at the centre of its base. Sizes/positions in metres. */
export function box(w, h, d, mat, x = 0, y = 0, z = 0, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  worldUV(g, tileOf(mat), [x, y, z]);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return finish(m, opts);
}

/** Box from a plan rectangle in millimetres. */
export function rectBox(x0, y0, x1, y1, yBase, h, mat, opts) {
  const [sx0, sz0] = toScene(Math.min(x0, x1), Math.min(y0, y1));
  const [sx1, sz1] = toScene(Math.max(x0, x1), Math.max(y0, y1));
  return box(sx1 - sx0, h, sz1 - sz0, mat, (sx0 + sx1) / 2, yBase, (sz0 + sz1) / 2, opts);
}

/** Vertical cylinder with pivot at its base. */
export function cyl(r, h, mat, x = 0, y = 0, z = 0, seg = 12, opts = {}) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return finish(m, opts);
}

/** Cylinder between two points (for pipes, scaffold tubes, rebar). */
export function tube(a, b, r, mat, seg = 8) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(va);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  m.castShadow = true;
  return m;
}

/** Extruded plan polygon (mm) with holes, pivot at y = yBase. */
export function slabMesh(outline, holes, yBase, h, mat, opts) {
  const toShapePts = (pts) => pts.map(([x, y]) => {
    const [sx, sz] = toScene(x, y);
    return new THREE.Vector2(sx, -sz);
  });
  const shape = new THREE.Shape(toShapePts(outline));
  for (const hole of holes || []) shape.holes.push(new THREE.Path(toShapePts(hole)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  worldUV(g, tileOf(mat));
  const m = new THREE.Mesh(g, mat);
  m.position.y = yBase;
  return finish(m, opts);
}

/** Point-in-polygon for plan coordinates (mm). */
export function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Deterministic pseudo-random generator. */
export function rng(seed = 1) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { toScene };
