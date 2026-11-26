import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toScene, PLOT } from '../data/building.js';

const EYE = 1.62;
const RADIUS = 0.28;
const STEP = 0.42;

function shown(o) {
  for (let p = o; p; p = p.parent) {
    if (!p.visible) return false;
    if (p.scale.y < 0.5 || p.scale.x < 0.5) return false;
  }
  return true;
}

const at = (x, y, h) => { const [sx, sz] = toScene(x, y); return [sx, h, sz]; };
export const VIEWS = {
  viewFront: { pos: [7, 4.2, 27], target: [0, 4.5, 4] },
  viewAerial: { pos: [-14, 30, 40], target: [0, 2, 0] },
  viewBack: { pos: [-20, 17, -27], target: [0, 4, 0] },
  viewGarden: { pos: at(15300, 9000, 2.1), target: at(10500, 6500, 2.0) },
  viewLiving: { pos: at(13300, 14600, 2.0), target: at(8300, 10200, 1.5) },
  viewBedroom: { pos: at(6700, 18900, 6.4), target: at(3000, 14000, 5.4) },
  viewRoof: { pos: at(15400, 20800, 12), target: [0, 9, -2] },
};

export class CameraRig {
  constructor(camera, dom, ctx) {
    this.camera = camera;
    this.dom = dom;
    this.ctx = ctx;
    this.mode = 'orbit';
    this.orbit = new OrbitControls(camera, dom);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.minDistance = 1.5;
    this.orbit.maxDistance = 140;
    this.orbit.target.set(0, 3, 0);
    this.orbit.zoomToCursor = true;
    camera.position.set(-16, 17, 34);

    this.tween = null;
    this.walk = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), bobT: 0, yaw: 0, pitch: 0, vy: 0, keys: new Set(), joy: new THREE.Vector2(), run: false };
    this.ray = new THREE.Raycaster();
    this.ray.layers.enableAll(); // static batching moves originals to a hidden layer
    this.tour = { time: 0 };
    this.listeners = [];

    this._bindWalkInput();
  }

  onChange(fn) { this.listeners.push(fn); }
  _emit() { for (const fn of this.listeners) fn(this.mode); }

  setMode(mode) {
    if (mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode;
    this.orbit.enabled = mode === 'orbit';
    if (prev === 'walk' && document.pointerLockElement) document.exitPointerLock();
    if (mode === 'walk') this._enterWalk();
    // wider lens on foot feels more natural indoors
    this.camera.fov = mode === 'walk' ? 68 : 50;
    this.camera.updateProjectionMatrix();
    if (mode === 'orbit' && prev !== 'orbit') {
      // keep looking at roughly the same spot
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.orbit.target.copy(this.camera.position).addScaledVector(dir, 12);
      this.orbit.target.y = Math.max(0.5, this.orbit.target.y);
    }
    if (mode === 'tour') this.tour.time = 0;
    this._emit();
  }

  goTo(view) {
    const v = VIEWS[view];
    if (!v) return;
    if (this.mode !== 'orbit') this.setMode('orbit');
    this.tween = {
      t: 0, dur: 1.6,
      p0: this.camera.position.clone(), p1: new THREE.Vector3(...v.pos),
      q0: this.orbit.target.clone(), q1: new THREE.Vector3(...v.target),
    };
  }

  /* ---------------- walk mode ---------------------------------------- */
  _enterWalk() {
    const [x, z] = toScene(8400, PLOT.y1 + 900);
    this.walk.pos.set(x, 0.15, z);
    this.walk.yaw = 0; // look towards the house (−Z)
    this.walk.pitch = 0.05;
    this.walk.vy = 0;
    this.walk.vel.set(0, 0, 0);
    this.walk.eyeY = undefined;
  }

  /** Jump to a spot while walking: 'ground' (hall), 'first' (FF lobby by the stair), 'roof'. */
  walkTo(spot) {
    const spots = {
      ground: [8700, 7000, 0.5, Math.PI / 2],
      first: [8300, 9600, 4.7, Math.PI / 2],
      roof: [12000, 12000, 9.1, 0],
    };
    const s = spots[spot];
    if (!s) return;
    if (this.mode !== 'walk') this.setMode('walk');
    const [x, z] = toScene(s[0], s[1]);
    this.walk.pos.set(x, s[2], z);
    this.walk.yaw = s[3];
    this.walk.vel.set(0, 0, 0);
    this.walk.vy = 0;
    this.walk.eyeY = undefined;
  }

  _bindWalkInput() {
    const w = this.walk;
    addEventListener('keydown', (e) => {
      if (this.mode !== 'walk') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      w.keys.add(e.code);
      if (e.code === 'KeyG') this.walkTo('ground');
      if (e.code === 'KeyF') this.walkTo('first');
      if (e.code === 'KeyR') this.walkTo('roof');
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') w.run = true;
    });
    addEventListener('keyup', (e) => {
      w.keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') w.run = false;
    });
    this.dom.addEventListener('click', () => {
      if (this.mode === 'walk' && !this.touch && this.dom.requestPointerLock) this.dom.requestPointerLock();
    });
    addEventListener('mousemove', (e) => {
      if (this.mode !== 'walk' || document.pointerLockElement !== this.dom) return;
      w.yaw -= e.movementX * 0.0022;
      w.pitch = THREE.MathUtils.clamp(w.pitch - e.movementY * 0.0022, -1.35, 1.35);
    });
    // touch: drag anywhere (except the joystick) to look
    let look = null;
    this.dom.addEventListener('touchstart', (e) => {
      this.touch = true;
      if (this.mode !== 'walk') return;
      const tch = e.changedTouches[0];
      look = { id: tch.identifier, x: tch.clientX, y: tch.clientY };
    }, { passive: true });
    this.dom.addEventListener('touchmove', (e) => {
      if (this.mode !== 'walk' || !look) return;
      for (const tch of e.changedTouches) {
        if (tch.identifier !== look.id) continue;
        w.yaw -= (tch.clientX - look.x) * 0.005;
        w.pitch = THREE.MathUtils.clamp(w.pitch - (tch.clientY - look.y) * 0.005, -1.3, 1.3);
        look.x = tch.clientX; look.y = tch.clientY;
      }
    }, { passive: true });
    this.dom.addEventListener('touchend', () => { look = null; }, { passive: true });
  }

  /** Called by the on-screen joystick: x = strafe, y = forward, both −1..1. */
  setJoystick(x, y) { this.walk.joy.set(x, y); }

  _updateWalk(dt) {
    const w = this.walk;
    const k = w.keys;
    let fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let str = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    fwd += w.joy.y; str += w.joy.x;
    const input = Math.min(1, Math.hypot(fwd, str) || 0);
    const len = Math.hypot(fwd, str) || 1;
    const dirF = new THREE.Vector3(-Math.sin(w.yaw), 0, -Math.cos(w.yaw));
    const dirR = new THREE.Vector3(Math.cos(w.yaw), 0, -Math.sin(w.yaw));
    // smooth acceleration / braking instead of instant start-stop
    const target = dirF.multiplyScalar((fwd / len) * input).add(dirR.multiplyScalar((str / len) * input)).multiplyScalar(w.run ? 3.4 : 1.6);
    const rate = target.lengthSq() > w.vel.lengthSq() ? 9 : 12;
    w.vel.lerp(target, Math.min(1, dt * rate));
    if (w.vel.lengthSq() < 1e-5) w.vel.set(0, 0, 0);
    const speed = w.vel.length();
    const move = w.vel.clone().multiplyScalar(dt);

    const solids = this.ctx.solids.filter(shown);
    const walk = this.ctx.walkables.filter(shown);
    const tryAxis = (dx, dz) => {
      if (Math.abs(dx) + Math.abs(dz) < 1e-6) return;
      const d = new THREE.Vector3(dx, 0, dz);
      const dist = d.length();
      d.normalize();
      for (const h of [0.45, 1.1, 1.6]) {
        this.ray.set(new THREE.Vector3(w.pos.x, w.pos.y + h, w.pos.z), d);
        this.ray.far = dist + RADIUS;
        if (this.ray.intersectObjects(solids, false).length) return;
      }
      // furniture: footprint boxes (cheap 2D test) at the player's floor level
      const nx = w.pos.x + dx, nz = w.pos.z + dz;
      for (const b of this._furnitureBoxes()) {
        if (b.max.y < w.pos.y + 0.25 || b.min.y > w.pos.y + 1.7) continue;
        const inNew = nx > b.min.x - RADIUS && nx < b.max.x + RADIUS && nz > b.min.z - RADIUS && nz < b.max.z + RADIUS;
        const inOld = w.pos.x > b.min.x - RADIUS && w.pos.x < b.max.x + RADIUS && w.pos.z > b.min.z - RADIUS && w.pos.z < b.max.z + RADIUS;
        if (inNew && !inOld) return; // allow walking out if we ever start inside
      }
      w.pos.x += dx; w.pos.z += dz;
    };
    const bx = w.pos.x, bz = w.pos.z;
    tryAxis(move.x, 0);
    tryAxis(0, move.z);
    // blocked on an axis → kill that velocity component (slide along walls, no "sticking")
    if (Math.abs(w.pos.x - bx) < Math.abs(move.x) * 0.5) w.vel.x = 0;
    if (Math.abs(w.pos.z - bz) < Math.abs(move.z) * 0.5) w.vel.z = 0;

    // ground following (stairs, slabs, terrain) with a step-up limit
    this.ray.set(new THREE.Vector3(w.pos.x, w.pos.y + STEP + 0.05, w.pos.z), new THREE.Vector3(0, -1, 0));
    this.ray.far = 40;
    const hit = this.ray.intersectObjects(walk, false)[0];
    const groundY = hit ? hit.point.y : -50;
    if (groundY > w.pos.y - 0.05) {
      w.pos.y = THREE.MathUtils.lerp(w.pos.y, groundY, Math.min(1, dt * 18));
      w.vy = 0;
    } else {
      w.vy -= 9.8 * dt;
      w.pos.y = Math.max(groundY, w.pos.y + w.vy * dt);
      if (w.pos.y <= groundY) w.vy = 0;
    }
    // gentle head bob scaled by speed; eye height eased so stairs feel smooth
    w.bobT += dt * (w.run ? 9 : 6.5) * Math.min(1, speed / 1.6);
    const bob = Math.sin(w.bobT) * 0.012 * Math.min(1, speed / 1.6);
    w.eyeY = w.eyeY === undefined ? w.pos.y : THREE.MathUtils.lerp(w.eyeY, w.pos.y, Math.min(1, dt * 10));
    this.camera.position.set(w.pos.x, w.eyeY + EYE + bob, w.pos.z);
    this.camera.rotation.set(w.pitch, w.yaw, 0, 'YXZ');
  }

  /** World-space boxes of the visible furniture pieces (rebuilt when the set changes). */
  _furnitureBoxes() {
    const items = (this.ctx.furnitureItems || []).filter((h) => shown(h) && h.userData.collide !== false);
    const key = items.length + ':' + (this.ctx.furnitureVersion || 0);
    if (key !== this._fbKey) {
      this._fbKey = key;
      this._fb = [];
      for (const h of items) {
        const b = new THREE.Box3().setFromObject(h);
        if (b.isEmpty()) continue;
        const size = b.getSize(new THREE.Vector3());
        if (size.y < 0.08) continue; // rugs
        this._fb.push(b.expandByScalar(-0.04));
      }
    }
    return this._fb;
  }

  _updateTour(dt) {
    this.tour.time += dt;
    const a = this.tour.time * 0.12;
    const r = 30 + Math.sin(a * 0.7) * 8;
    const h = 9 + Math.sin(a * 0.5) * 7;
    this.camera.position.set(Math.sin(a) * r, h, Math.cos(a) * r + 2);
    this.camera.lookAt(0, 3.5, 0);
    this.orbit.target.set(0, 3.5, 0);
  }

  update(dt) {
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt / tw.dur;
      const e = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.orbit.target.lerpVectors(tw.q0, tw.q1, e);
      if (tw.t >= 1) this.tween = null;
    }
    if (this.mode === 'orbit') this.orbit.update();
    else if (this.mode === 'walk') this._updateWalk(Math.min(dt, 0.05));
    else if (this.mode === 'tour') this._updateTour(dt);
  }

  /** Point the shadow camera should follow. */
  focus() {
    if (this.mode === 'orbit') return this.orbit.target;
    return this.camera.position;
  }
}
