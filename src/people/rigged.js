import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { makeTool } from './worker.js';

/*
 * Skinned construction workers (Quaternius "Ultimate Modular Men/Women",
 * CC0). Each worker plays a base clip (Idle / Walk) through an
 * AnimationMixer; task motions (hammering, shovelling, kneeling, laying
 * blocks…) are layered on top as world-space bone rotations, so they work
 * regardless of the bones' local axes.
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
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

export class RiggedWorker {
  constructor(asset, seed) {
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(asset.scene);
    this.root.add(this.model);
    this.speed = 0.85 + ((seed * 13) % 7) / 20;
    this.phase = seed * 1.37;

    // per-worker colour variation
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
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

    // GLTFLoader sanitises node names ("UpperArm.R" → "UpperArmR")
    const b = (n) => this.model.getObjectByName(n.replace('.', ''));
    this.bones = {
      hips: b('Hips'), abdomen: b('Abdomen'), torso: b('Torso'), chest: b('Chest'), neck: b('Neck'),
      uaL: b('UpperArm.L'), uaR: b('UpperArm.R'), laL: b('LowerArm.L'), laR: b('LowerArm.R'),
      wristR: b('Wrist.R'), ulL: b('UpperLeg.L'), ulR: b('UpperLeg.R'), llL: b('LowerLeg.L'), llR: b('LowerLeg.R'),
      footL: b('Foot.L'), footR: b('Foot.R'),
    };

    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const c of asset.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.current = null;
    this.toolHolder = new THREE.Group();
    this.root.add(this.toolHolder);
    this.tool = null;
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._v = new THREE.Vector3();
  }

  setTool(kind) {
    if (this.toolKind === kind) return;
    if (this.tool) this.tool.removeFromParent();
    this.toolKind = kind;
    this.tool = kind ? makeTool(kind) : null;
    if (this.tool) this.toolHolder.add(this.tool);
  }

  _play(name) {
    if (this.current === name) return;
    const next = this.actions[name] || this.actions.Idle;
    if (this.current) this.actions[this.current]?.fadeOut(0.25);
    next.reset().fadeIn(0.25).play();
    next.time = this.phase % next.getClip().duration;
    this.current = name;
  }

  /** Rotate a bone about an axis given in character space (radians). */
  _rot(bone, axis, angle) {
    if (!bone || !angle) return;
    angle *= this.gain ?? 0.7; // clip poses already carry some of the motion
    const parent = bone.parent;
    parent.updateWorldMatrix(true, false);
    const pW = parent.getWorldQuaternion(this._q);
    const rootQ = this.root.getWorldQuaternion(this._q2);
    const worldAxis = this._v.copy(axis).applyQuaternion(rootQ);
    const r = new THREE.Quaternion().setFromAxisAngle(worldAxis, angle);
    // local delta = pW⁻¹ · r · pW
    const delta = pW.clone().invert().multiply(r).multiply(pW);
    bone.quaternion.premultiply(delta);
    bone.updateMatrixWorld(true);
  }

  pose(action, time, dt = 1 / 60) {
    const t = time * this.speed + this.phase;
    const s = Math.sin;
    const B = this.bones;
    this.gain = action === 'kneel' ? 1 : 0.7;
    const walking = action === 'walk' || action === 'carry';
    this._play(walking ? 'Walk' : action === 'idle' || action === 'hold' ? 'Idle' : 'Idle_Neutral');
    this.mixer.update(dt);
    this.model.position.y = 0;
    this.model.updateMatrixWorld(true);

    switch (action) {
      case 'carry':
        this._rot(B.uaL, X, -1.0); this._rot(B.uaR, X, -1.0);
        this._rot(B.laL, X, -0.7); this._rot(B.laR, X, -0.7);
        break;
      case 'hammer': {
        const c = (t * 2.2) % 1;
        const up = c < 0.65 ? c / 0.65 : 1 - (c - 0.65) / 0.35;
        this._rot(B.abdomen, X, 0.35);
        this._rot(B.uaR, X, -0.8 - up * 1.7);
        this._rot(B.laR, X, -0.5 - up * 0.6);
        this._rot(B.uaL, X, -0.9); this._rot(B.laL, X, -0.6);
        this._rot(B.neck, X, 0.3);
        break;
      }
      case 'shovel': {
        const c = s(t * 2.4);
        this._rot(B.abdomen, X, 0.45 + c * 0.25);
        this._rot(B.uaR, X, -0.9 + c * 0.4); this._rot(B.uaL, X, -1.2 + c * 0.4);
        this._rot(B.laR, X, -0.4); this._rot(B.laL, X, -0.3);
        this._rot(B.ulL, X, -0.35); this._rot(B.llL, X, 0.5);
        this._rot(B.ulR, X, 0.2);
        break;
      }
      case 'kneel': {
        this.model.position.y = -0.42;
        this.model.updateMatrixWorld(true);
        this._rot(B.ulL, X, -1.45); this._rot(B.llL, X, 1.5);
        this._rot(B.ulR, X, 0.15); this._rot(B.llR, X, 1.55);
        this._rot(B.abdomen, X, 0.55 + s(t * 3) * 0.05);
        this._rot(B.neck, X, 0.3);
        this._rot(B.uaR, X, -0.9 + s(t * 7) * 0.15); this._rot(B.uaL, X, -0.8 + s(t * 7 + 1.5) * 0.15);
        this._rot(B.laR, X, -0.5); this._rot(B.laL, X, -0.5);
        break;
      }
      case 'trowel':
        this._rot(B.abdomen, X, 0.3);
        this._rot(B.uaR, X, -1.2); this._rot(B.uaR, Y, s(t * 2.5) * 0.5); this._rot(B.laR, X, -0.4);
        this._rot(B.uaL, X, -0.7); this._rot(B.laL, X, -0.8);
        this._rot(B.neck, X, 0.2);
        break;
      case 'plaster': {
        const c = s(t * 2);
        this._rot(B.uaR, X, -1.6 - c * 0.6); this._rot(B.laR, X, -0.3);
        this._rot(B.uaL, X, -1.0); this._rot(B.laL, X, -1.0);
        this._rot(B.neck, X, -0.2 - c * 0.15);
        break;
      }
      case 'paint': {
        const c = s(t * 1.8);
        this._rot(B.uaR, X, -1.4 - c * 0.5); this._rot(B.uaL, X, -1.3 - c * 0.5);
        this._rot(B.laR, X, -0.6); this._rot(B.laL, X, -0.6);
        this._rot(B.neck, X, -0.35);
        break;
      }
      case 'drill':
        this._rot(B.uaR, X, -1.45 + s(t * 40) * 0.015); this._rot(B.laR, X, -0.2);
        this._rot(B.uaL, X, -1.35); this._rot(B.laL, X, -0.4);
        break;
      case 'survey':
        this._rot(B.abdomen, X, 0.25); this._rot(B.neck, X, 0.25);
        this._rot(B.uaR, X, -1.0); this._rot(B.laR, X, -0.9);
        this._rot(B.uaL, X, -1.0); this._rot(B.laL, X, -0.9);
        break;
      case 'point':
        this._rot(B.uaR, X, -1.5 + s(t * 0.8) * 0.1); this._rot(B.uaR, Y, 0.3);
        this._rot(B.neck, Y, s(t * 0.5) * 0.4);
        break;
      case 'vibrate':
        this._rot(B.abdomen, X, 0.35);
        this._rot(B.uaR, X, -0.9 + s(t * 30) * 0.02); this._rot(B.uaL, X, -1.0);
        this._rot(B.laR, X, -0.5); this._rot(B.laL, X, -0.5);
        break;
      default:
        break;
    }

    // tool follows the right wrist, kept upright in character space
    if (this.tool && B.wristR) {
      B.wristR.getWorldPosition(this._v);
      this.root.worldToLocal(this._v);
      this.toolHolder.position.copy(this._v);
      const ua = B.uaR.getWorldQuaternion(new THREE.Quaternion());
      const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
      // tool hangs along the forearm direction, relative to the character
      this.toolHolder.quaternion.copy(rootQ.invert().multiply(ua));
      this.toolHolder.rotateX(Math.PI);
    }
  }
}
