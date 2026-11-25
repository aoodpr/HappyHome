import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/*
 * Static batching. While the timeline is still (paused, or scrubbed to a
 * stage and left there), every fully-built, non-animating element is merged
 * into one mesh per material — thousands of draw calls become a few hundred,
 * which matters on iPad. The originals are moved to a hidden render layer
 * (not made invisible), so walk-mode collisions and picking keep working.
 * As soon as t changes the batch is dropped and the originals come back.
 */
const HIDDEN_LAYER = 5;

export class Baker {
  constructor(scene, timeline) {
    this.scene = scene;
    this.TL = timeline;
    this.group = new THREE.Group();
    this.group.name = 'baked';
    this.group.matrixAutoUpdate = false;
    scene.add(this.group);
    this.lastT = null;
    this.changedAt = 0;
    this.moved = [];
    this.enabled = true;
  }

  update(t, now) {
    if (t !== this.lastT) {
      this.lastT = t;
      this.changedAt = now;
      if (this.moved.length) this.unbake();
      return;
    }
    if (this.enabled && !this.moved.length && now - this.changedAt > 0.6) this.bake(t);
  }

  unbake() {
    for (const m of this.moved) m.layers.set(0);
    this.moved = [];
    for (const c of this.group.children) c.geometry.dispose();
    this.group.clear();
  }

  bake(t) {
    const buckets = new Map();
    const candidates = [];
    for (const it of this.TL.items) {
      if (t < it.in[1]) continue; // still animating in
      if (it.out && t >= it.out[0]) continue; // being removed
      if (!it.obj.visible) continue;
      candidates.push(it.obj);
    }
    this.scene.updateMatrixWorld(true);
    const isShown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    const inFurniture = (o) => { for (let q = o; q; q = q.parent) if (q.name?.startsWith('furniture:')) return true; return false; };
    for (const root of candidates) {
      if (inFurniture(root)) continue; // furniture has its own distance culling
      root.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
        if (!isShown(o) || o.layers.mask !== 1) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (mats.length !== 1) return;
        const mat = mats[0];
        if (mat.transparent) return; // keep sorting correct for glass
        if (o.matrixWorld.determinant() < 0) return;
        const g = o.geometry;
        if (!g.attributes.position || !g.attributes.normal) return;
        const key = mat.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
        if (!buckets.has(key)) buckets.set(key, { mat, cast: o.castShadow, receive: o.receiveShadow, geos: [], meshes: [] });
        const b = buckets.get(key);
        let geo = g.index ? g.toNonIndexed() : g.clone();
        for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
        if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        geo.morphAttributes = {};
        geo.clearGroups();
        geo.applyMatrix4(o.matrixWorld);
        b.geos.push(geo);
        b.meshes.push(o);
      });
    }
    for (const b of buckets.values()) {
      if (b.geos.length < 2) { b.geos.forEach((g) => g.dispose()); continue; }
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      for (const m of b.meshes) { m.layers.set(HIDDEN_LAYER); this.moved.push(m); }
    }
  }
}

/** Raycasters must also see the hidden layer so collisions keep working. */
export function seeAllLayers(raycaster) {
  raycaster.layers.enableAll();
  return raycaster;
}
