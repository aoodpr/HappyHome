import * as THREE from 'three';

/*
 * Procedural construction worker: a simple jointed rig (hips, spine, head,
 * shoulders/elbows, hips/knees) with PPE and hand tools. Actions are
 * driven procedurally from the clock, so no skeletal assets are needed.
 */

const SKIN = [0x8d5524, 0xc68642, 0xe0ac69, 0xa0662f, 0x6b3e1f, 0xd8a47a];
const VEST = [0xff7a00, 0xd7f205, 0xff9f1a, 0xc8e600];
const PANTS = [0x2f3b52, 0x4a4a3f, 0x3c4a5c, 0x5a5146, 0x26324a];
const HAT = [0xf6f6f6, 0xffd21f, 0xff8c1a, 0xf6f6f6, 0x2e7dd1];

const mats = new Map();
function mat(color, rough = 0.8, extra = {}) {
  const key = color + ':' + rough + JSON.stringify(extra);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }));
  return mats.get(key);
}

const geo = {
  limb: (r, l) => { const g = new THREE.CapsuleGeometry(r, l, 4, 8); g.translate(0, -l / 2 - r * 0.2, 0); return g; },
};
const G = {
  torso: new THREE.CapsuleGeometry(0.17, 0.32, 4, 10),
  head: new THREE.SphereGeometry(0.11, 14, 10),
  hat: new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  brim: new THREE.CylinderGeometry(0.16, 0.16, 0.015, 16),
  upperArm: geo.limb(0.05, 0.24),
  foreArm: geo.limb(0.045, 0.22),
  hand: new THREE.SphereGeometry(0.048, 8, 6),
  thigh: geo.limb(0.075, 0.34),
  shin: geo.limb(0.06, 0.34),
  boot: new THREE.BoxGeometry(0.12, 0.09, 0.26),
  stripe: new THREE.CylinderGeometry(0.178, 0.178, 0.035, 14, 1, true),
  pelvis: new THREE.CapsuleGeometry(0.15, 0.08, 4, 10),
};
G.torso.translate(0, 0.27, 0);
G.torso.scale(1, 1, 0.72);
G.pelvis.rotateZ(Math.PI / 2);
G.pelvis.scale(1, 1, 0.75);
G.boot.translate(0, -0.045, 0.05);

function part(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function makeTool(kind) {
  const g = new THREE.Group();
  const steel = mat(0x8a9096, 0.4, { metalness: 0.8 });
  const wood = mat(0x9b6a3c, 0.7);
  const yellow = mat(0xf2b705, 0.5);
  switch (kind) {
    case 'hammer':
      g.add(part(new THREE.CylinderGeometry(0.015, 0.015, 0.32), wood, 0, -0.1, 0));
      g.add(part(new THREE.BoxGeometry(0.12, 0.04, 0.04), steel, 0, -0.26, 0));
      break;
    case 'shovel':
      g.add(part(new THREE.CylinderGeometry(0.018, 0.018, 1.2), wood, 0, -0.35, 0));
      g.add(part(new THREE.BoxGeometry(0.24, 0.3, 0.02), steel, 0, -1.05, 0.03));
      break;
    case 'trowel':
      g.add(part(new THREE.BoxGeometry(0.12, 0.01, 0.22), steel, 0, -0.08, 0.08));
      break;
    case 'roller':
      g.add(part(new THREE.CylinderGeometry(0.012, 0.012, 1.4), mat(0x666666), 0, 0.55, 0));
      { const r = part(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 10), mat(0xf4f1ea, 0.9), 0, 1.25, 0); r.rotation.z = Math.PI / 2; g.add(r); }
      break;
    case 'drill':
      g.add(part(new THREE.BoxGeometry(0.07, 0.16, 0.2), yellow, 0, -0.06, 0.06));
      { const bit = part(new THREE.CylinderGeometry(0.008, 0.008, 0.16), steel, 0, -0.02, 0.22); bit.rotation.x = Math.PI / 2; g.add(bit); }
      break;
    case 'block':
      g.add(part(new THREE.BoxGeometry(0.4, 0.2, 0.2), mat(0xb9b5ad, 0.95), 0.2, -0.05, 0.12));
      break;
    case 'clipboard':
      g.add(part(new THREE.BoxGeometry(0.22, 0.3, 0.01), mat(0x8a5a35), 0, -0.05, 0.05));
      break;
    case 'prism':
      g.add(part(new THREE.CylinderGeometry(0.012, 0.012, 2.0), mat(0xd23c2a, 0.5), 0, 0.55, 0));
      g.add(part(new THREE.SphereGeometry(0.04, 8, 6), mat(0xeeeeee, 0.2), 0, 1.55, 0));
      break;
    case 'rake':
      g.add(part(new THREE.CylinderGeometry(0.015, 0.015, 1.6), wood, 0, -0.5, 0));
      g.add(part(new THREE.BoxGeometry(0.45, 0.05, 0.04), steel, 0, -1.3, 0));
      break;
    case 'vibrator':
      g.add(part(new THREE.CylinderGeometry(0.02, 0.02, 1.4), mat(0x222222), 0, -0.6, 0));
      break;
    default:
      break;
  }
  return g;
}

export class Worker {
  constructor(seed = 0) {
    const pick = (arr) => arr[(seed * 7 + arr.length * 3 + seed * seed) % arr.length];
    this.root = new THREE.Group();
    this.hips = new THREE.Group();
    this.hips.position.y = 0.92;
    this.root.add(this.hips);

    const pants = mat(pick(PANTS), 0.9);
    const vest = mat(pick(VEST), 0.7);
    const shirt = mat(seed % 3 ? 0x3d5a80 : 0x6d6d6d, 0.85);
    const skin = mat(SKIN[seed % SKIN.length], 0.6);
    const hat = mat(HAT[seed % HAT.length], 0.4);
    const boot = mat(0x4a3424, 0.8);
    const reflect = mat(0xe8e8e8, 0.2, { metalness: 0.6 });

    this.hips.add(part(G.pelvis, pants, 0, 0, 0));
    this.spine = new THREE.Group();
    this.spine.position.y = 0.04;
    this.hips.add(this.spine);
    this.spine.add(part(G.torso, vest));
    const stripe = part(G.stripe, reflect, 0, 0.18, 0);
    stripe.scale.z = 0.72;
    this.spine.add(stripe);
    const stripe2 = stripe.clone(); stripe2.position.y = 0.32; this.spine.add(stripe2);

    this.neck = new THREE.Group();
    this.neck.position.y = 0.6;
    this.spine.add(this.neck);
    this.neck.add(part(G.head, skin, 0, 0.1, 0));
    this.neck.add(part(G.hat, hat, 0, 0.14, 0));
    this.neck.add(part(G.brim, hat, 0, 0.145, 0.02));

    const arm = (s) => {
      const sh = new THREE.Group();
      sh.position.set(0.22 * s, 0.5, 0);
      this.spine.add(sh);
      sh.add(part(G.upperArm, shirt));
      const el = new THREE.Group();
      el.position.y = -0.3;
      sh.add(el);
      el.add(part(G.foreArm, skin));
      const hand = new THREE.Group();
      hand.position.y = -0.29;
      el.add(hand);
      hand.add(part(G.hand, skin));
      return { sh, el, hand };
    };
    this.armL = arm(1);
    this.armR = arm(-1);

    const leg = (s) => {
      const hip = new THREE.Group();
      hip.position.set(0.1 * s, -0.04, 0);
      this.hips.add(hip);
      hip.add(part(G.thigh, pants));
      const knee = new THREE.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      knee.add(part(G.shin, pants));
      const ankle = new THREE.Group();
      ankle.position.y = -0.43;
      knee.add(ankle);
      ankle.add(part(G.boot, boot));
      return { hip, knee, ankle };
    };
    this.legL = leg(1);
    this.legR = leg(-1);

    this.tool = null;
    this.phase = seed * 1.37;
    this.speed = 0.85 + ((seed * 13) % 7) / 20;
  }

  setTool(kind) {
    if (this.toolKind === kind) return;
    if (this.tool) this.tool.removeFromParent();
    this.toolKind = kind;
    this.tool = kind ? makeTool(kind) : null;
    if (this.tool) this.armR.hand.add(this.tool);
  }

  reset() {
    for (const j of [this.spine, this.neck, this.armL.sh, this.armL.el, this.armR.sh, this.armR.el,
      this.legL.hip, this.legL.knee, this.legR.hip, this.legR.knee, this.legL.ankle, this.legR.ankle, this.hips]) {
      j.rotation.set(0, 0, 0);
    }
    this.hips.position.y = 0.92;
    this.armL.sh.rotation.z = 0.08;
    this.armR.sh.rotation.z = -0.08;
  }

  /** Pose the rig for an action at time `time` (seconds). */
  pose(action, time) {
    this.reset();
    const t = time * this.speed + this.phase;
    const s = Math.sin;
    const { armL, armR, legL, legR } = this;
    switch (action) {
      case 'walk':
      case 'carry': {
        const w = t * 6;
        legL.hip.rotation.x = s(w) * 0.5;
        legR.hip.rotation.x = -s(w) * 0.5;
        legL.knee.rotation.x = Math.max(0, -s(w + 1.2)) * 0.8;
        legR.knee.rotation.x = Math.max(0, s(w + 1.2)) * 0.8;
        this.hips.position.y = 0.92 + Math.abs(s(w)) * 0.03;
        if (action === 'carry') {
          armL.sh.rotation.x = -1.1; armR.sh.rotation.x = -1.1;
          armL.el.rotation.x = -0.6; armR.el.rotation.x = -0.6;
          armL.sh.rotation.z = -0.25; armR.sh.rotation.z = 0.25;
        } else {
          armL.sh.rotation.x = -s(w) * 0.45;
          armR.sh.rotation.x = s(w) * 0.45;
          armL.el.rotation.x = -0.25; armR.el.rotation.x = -0.25;
        }
        break;
      }
      case 'hammer': {
        const c = (t * 2.2) % 1;
        const up = c < 0.65 ? c / 0.65 : 1 - (c - 0.65) / 0.35;
        armR.sh.rotation.x = -0.6 - up * 1.8;
        armR.el.rotation.x = -0.4 - up * 0.9;
        armL.sh.rotation.x = -0.9; armL.el.rotation.x = -0.6;
        this.spine.rotation.x = 0.25;
        this.neck.rotation.x = 0.3;
        break;
      }
      case 'shovel': {
        const c = s(t * 2.4);
        this.spine.rotation.x = 0.45 + c * 0.25;
        armR.sh.rotation.x = -0.9 + c * 0.4;
        armL.sh.rotation.x = -1.2 + c * 0.4;
        armR.el.rotation.x = -0.5; armL.el.rotation.x = -0.3;
        armL.sh.rotation.z = -0.3;
        legL.hip.rotation.x = -0.35; legL.knee.rotation.x = 0.5;
        legR.hip.rotation.x = 0.25;
        this.hips.position.y = 0.88;
        break;
      }
      case 'kneel': {
        // rebar tying / tiling: kneeling with hands busy at ground level
        this.hips.position.y = 0.55;
        legL.hip.rotation.x = -1.4; legL.knee.rotation.x = 1.45;
        legR.hip.rotation.x = 0.1; legR.knee.rotation.x = 1.5;
        legR.ankle.rotation.x = -0.3;
        this.spine.rotation.x = 0.55 + s(t * 3) * 0.05;
        this.neck.rotation.x = 0.3;
        armR.sh.rotation.x = -0.9 + s(t * 7) * 0.15;
        armL.sh.rotation.x = -0.8 + s(t * 7 + 1.5) * 0.15;
        armR.el.rotation.x = -0.5; armL.el.rotation.x = -0.5;
        break;
      }
      case 'trowel': {
        this.spine.rotation.x = 0.35;
        armR.sh.rotation.x = -1.2;
        armR.sh.rotation.y = s(t * 2.5) * 0.5;
        armR.el.rotation.x = -0.4;
        armL.sh.rotation.x = -0.7; armL.el.rotation.x = -0.8;
        this.neck.rotation.x = 0.2;
        break;
      }
      case 'plaster': {
        const c = s(t * 2);
        armR.sh.rotation.x = -1.6 - c * 0.6;
        armR.el.rotation.x = -0.3;
        armL.sh.rotation.x = -1.0; armL.el.rotation.x = -1.0;
        this.neck.rotation.x = -0.2 - c * 0.15;
        break;
      }
      case 'paint': {
        const c = s(t * 1.8);
        armR.sh.rotation.x = -1.4 - c * 0.5;
        armL.sh.rotation.x = -1.3 - c * 0.5;
        armR.el.rotation.x = -0.6; armL.el.rotation.x = -0.6;
        armL.sh.rotation.z = -0.35; armR.sh.rotation.z = 0.35;
        this.neck.rotation.x = -0.35;
        break;
      }
      case 'drill': {
        armR.sh.rotation.x = -1.45 + s(t * 40) * 0.015;
        armL.sh.rotation.x = -1.35; armL.sh.rotation.z = -0.4;
        armR.el.rotation.x = -0.2; armL.el.rotation.x = -0.4;
        this.spine.rotation.x = -0.05;
        break;
      }
      case 'survey': {
        this.spine.rotation.x = 0.25;
        this.neck.rotation.x = 0.25;
        armR.sh.rotation.x = -1.0; armR.el.rotation.x = -0.9;
        armL.sh.rotation.x = -1.0; armL.el.rotation.x = -0.9;
        break;
      }
      case 'hold': {
        armR.sh.rotation.x = -0.4; armR.el.rotation.x = -0.6;
        this.neck.rotation.y = s(t * 0.4) * 0.5;
        break;
      }
      case 'point': {
        armR.sh.rotation.x = -1.5 + s(t * 0.8) * 0.1;
        armR.sh.rotation.y = 0.3;
        armL.sh.rotation.x = -0.4; armL.el.rotation.x = -1.2;
        this.neck.rotation.y = s(t * 0.5) * 0.4;
        break;
      }
      case 'vibrate': {
        this.spine.rotation.x = 0.35;
        armR.sh.rotation.x = -0.9 + s(t * 30) * 0.02;
        armL.sh.rotation.x = -1.0; armR.el.rotation.x = -0.5; armL.el.rotation.x = -0.5;
        break;
      }
      case 'idle':
      default: {
        this.spine.rotation.x = s(t * 1.2) * 0.02;
        this.neck.rotation.y = s(t * 0.35) * 0.6;
        armL.el.rotation.x = -0.15; armR.el.rotation.x = -0.15;
        break;
      }
    }
  }
}
