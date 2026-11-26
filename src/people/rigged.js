import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/*
 * Skinned construction workers (Quaternius "Ultimate Modular Men/Women",
 * CC0), rebuilt in Blender by tools/blender/worker_anims.py:
 *   - baked looping task clips: Hammer, Shovel, Kneel, Trowel, Plaster, Paint,
 *     Drill, Survey, Point, Vibrate, Carry (+ the original Idle / Walk / Run)
 *   - hand tools modelled in Blender and skinned to the right wrist bone
 *     (Tool_hammer, Tool_roller, …) so they always stay in the hand.
 * At runtime a worker just cross-fades to the clip for its task and shows
 * the one tool it needs.
 */

let assets = null;
export function loadRiggedWorkers() {
  if (assets) return assets;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  assets = Promise.all(['worker_m', 'worker_f'].map((n) => loader.loadAsync(`./models/${n}.glb`)))
    .then((g) => g.map((x) => ({ scene: x.scene, clips: x.animations })));
  return assets;
}

const HAT = [0xf2c200, 0xf4f4f4, 0xff8a1f, 0xf2c200, 0x2e7dd1, 0xf2c200];
const SKIN = [0xc68642, 0x8d5524, 0xe0ac69, 0xa0662f, 0xf1c27d, 0x6b3e1f];
const PANTS = [0x6b5a3e, 0x2f3b52, 0x4a4a3f, 0x3c4a5c];

const CLIP_FOR = {
  walk: 'Walk', carry: 'Carry', idle: 'Idle', hold: 'Idle', hammer: 'Hammer', shovel: 'Shovel',
  kneel: 'Kneel', trowel: 'Trowel', plaster: 'Plaster', paint: 'Paint', drill: 'Drill',
  survey: 'Survey', point: 'Point', vibrate: 'Vibrate',
};
const TOOL_ALIAS = { rake: 'shovel' };

export class RiggedWorker {
  constructor(asset, seed) {
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(asset.scene);
    this.root.add(this.model);
    this.speed = 0.9 + ((seed * 13) % 7) / 25;
    this.phase = seed * 1.37;
    this.tools = {};

    // tools: top-most object named Tool_<kind> (multi-material tools load as a group)
    this.model.traverse((o) => {
      const m = /^Tool_([a-z]+)/.exec(o.name);
      if (m && !/^Tool_/.test(o.parent?.name || '')) { this.tools[m[1]] = o; o.visible = false; }
    });
    const inTool = (o) => { for (let q = o; q; q = q.parent) if (/^Tool_/.test(q.name)) return true; return false; };
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      if (inTool(o)) return;
      // per-worker colour variation
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const out = mats.map((m) => {
        const c = m.clone();
        if (m.name === 'Worker_Yellow') c.color.setHex(HAT[seed % HAT.length]);
        if (m.name === 'Skin') c.color.setHex(SKIN[seed % SKIN.length]);
        if (m.name === 'LightBrown') c.color.setHex(PANTS[seed % PANTS.length]);
        c.roughness = Math.max(0.55, c.roughness ?? 0.8);
        return c;
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    });

    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const c of asset.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.current = null;
  }

  setTool(kind) {
    kind = TOOL_ALIAS[kind] || kind;
    if (this.toolKind === kind) return;
    if (this.toolKind && this.tools[this.toolKind]) this.tools[this.toolKind].visible = false;
    this.toolKind = kind;
    if (kind && this.tools[kind]) this.tools[kind].visible = true;
  }

  pose(action, time, dt = 1 / 60) {
    const name = CLIP_FOR[action] || 'Idle';
    if (this.current !== name) {
      const next = this.actions[name] || this.actions.Idle;
      if (this.current) this.actions[this.current]?.fadeOut(0.3);
      next.reset().fadeIn(0.3).play();
      next.time = this.phase % next.getClip().duration;
      this.current = name;
    }
    this.mixer.timeScale = this.speed;
    this.mixer.update(dt);
  }
}
