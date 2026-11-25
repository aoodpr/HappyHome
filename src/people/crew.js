import * as THREE from 'three';
import { Worker } from './worker.js';
import { RiggedWorker, loadRiggedWorkers } from './rigged.js';
import { LEVEL, SLAB_T, toScene } from '../data/building.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const PIT = LEVEL.foundationBottom + 0.075;
const DECK_FF = LEVEL.ffSSL - SLAB_T, DECK_RF = LEVEL.rfSSL - SLAB_T, DECK_UR = LEVEL.urSSL - SLAB_T;
const LIFT = (n) => n * 2 + 0.16; // scaffold plank level n

/*
 * Each stage lists its crew. A task: [action, tool, x, y (plan mm), level, face°, options]
 *   level: metres, or fn(u) of the stage progress u ∈ [0,1)
 *   options.when: [u0, u1] sub-window, options.to: [x, y] walk back and forth
 */
const T = (action, tool, x, y, level, face = 0, opts = {}) => ({ action, tool, x, y, level, face, ...opts });
const backfill = (u) => LEVEL.foundationBottom + clamp01((u - 0.68) / 0.3) * 1.75;

export const CREW = [
  // 0 · Mobilisation & survey
  [
    T('hammer', 'hammer', 4200, 21000, 0, 0, { when: [0, 0.45] }),
    T('hammer', 'hammer', 12500, 21000, 0, 0, { when: [0, 0.45] }),
    T('carry', 'block', 1500, 20800, 0, 90, { to: [9000, 20800], when: [0, 0.45] }),
    T('survey', null, 2500, 20250, 0, 180, { when: [0.38, 1] }),
    T('hold', 'prism', 15500, 700, 0, 200, { when: [0.4, 1] }),
    T('walk', null, 2094, 2000, 0, 0, { to: [15994, 2000], when: [0.45, 1] }),
    T('idle', 'clipboard', 9000, 21900, 0, 180),
  ],
  // 1 · Excavation
  [
    T('point', null, 900, 20900, 0, 150),
    T('shovel', 'shovel', 700, 6500, 0, 90),
    T('shovel', 'shovel', 700, 13800, 0, 90, { when: [0.2, 1] }),
    T('idle', 'clipboard', 12000, 22000, 0, 180),
    T('shovel', 'rake', 5000, 8000, PIT - 0.07, 30, { when: [0.75, 1] }),
    T('shovel', 'rake', 11500, 15000, PIT - 0.07, -60, { when: [0.75, 1] }),
  ],
  // 2 · Blinding & footings
  [
    T('kneel', null, 7900, 13300, PIT, 180, { when: [0.15, 0.55] }),
    T('kneel', null, 10300, 15700, PIT, 90, { when: [0.15, 0.55] }),
    T('kneel', null, 2900, 6100, PIT, -45, { when: [0.15, 0.55] }),
    T('hammer', 'hammer', 11700, 4800, PIT, 180, { when: [0.3, 0.7] }),
    T('hammer', 'hammer', 3200, 10900, PIT, 90, { when: [0.3, 0.7] }),
    T('carry', 'block', 4000, 19500, PIT, 0, { to: [8000, 14500], when: [0, 0.5] }),
    T('vibrate', 'vibrator', 7900, 9800, PIT, 160, { when: [0.5, 0.95] }),
    T('shovel', 'rake', 13000, 9500, PIT, -120, { when: [0.5, 0.95] }),
    T('idle', 'clipboard', 9000, 22000, 0, 180),
  ],
  // 3 · Necks, ground beams, backfill
  [
    T('hammer', 'hammer', 7900, 13100, PIT, 180, { when: [0, 0.6] }),
    T('kneel', null, 11800, 5900, PIT, 0, { when: [0, 0.6] }),
    T('paint', 'roller', 2700, 8000, PIT, -90, { when: [0.35, 0.68] }),
    T('kneel', null, 14400, 15500, PIT, 90, { when: [0, 0.6] }),
    T('shovel', 'shovel', 5000, 9000, backfill, 45, { when: [0.68, 1] }),
    T('shovel', 'shovel', 12000, 18000, backfill, -45, { when: [0.68, 1] }),
    T('walk', null, 6000, 12000, backfill, 0, { to: [6000, 15000], when: [0.7, 1] }),
  ],
  // 4 · Grade slab
  [
    T('kneel', null, 5000, 5000, LEVEL.gfSSL - 0.15, 30, { when: [0, 0.5] }),
    T('kneel', null, 9500, 12000, LEVEL.gfSSL - 0.15, -90, { when: [0, 0.5] }),
    T('kneel', null, 13000, 18500, LEVEL.gfSSL - 0.15, 180, { when: [0.1, 0.5] }),
    T('shovel', 'rake', 6000, 10000, LEVEL.gfSSL, 0, { when: [0.5, 1] }),
    T('shovel', 'rake', 10000, 4000, LEVEL.gfSSL, 90, { when: [0.5, 1] }),
    T('vibrate', 'vibrator', 8000, 14000, LEVEL.gfSSL, 45, { when: [0.5, 0.9] }),
    T('walk', null, 4000, 15000, LEVEL.gfSSL, 0, { to: [6000, 15000], when: [0.8, 1] }),
  ],
  // 5 · GF columns + FF slab
  [
    T('hammer', 'hammer', 7700, 13200, LEVEL.gfSSL, -90, { when: [0, 0.42] }),
    T('hammer', 'hammer', 2650, 5900, LEVEL.gfSSL, -90, { when: [0, 0.42] }),
    T('hammer', 'hammer', 11500, 5900, LEVEL.gfSSL, 180, { when: [0, 0.42] }),
    T('kneel', null, 10200, 21000, LEVEL.gfSSL, -90, { when: [0.05, 0.4] }),
    T('kneel', null, 4000, 4000, DECK_FF, 45, { when: [0.55, 0.8] }),
    T('kneel', null, 8000, 8000, DECK_FF, 0, { when: [0.55, 0.8] }),
    T('kneel', null, 12500, 18000, DECK_FF, 180, { when: [0.55, 0.8] }),
    T('carry', 'block', 3000, 2000, DECK_FF, 90, { to: [12000, 2000], when: [0.5, 0.8] }),
    T('vibrate', 'vibrator', 8000, 12000, DECK_FF + 0.15, 30, { when: [0.78, 1] }),
    T('shovel', 'rake', 11000, 17500, DECK_FF + 0.15, -60, { when: [0.78, 1] }),
    T('shovel', 'rake', 4500, 15000, DECK_FF + 0.15, 120, { when: [0.8, 1] }),
  ],
  // 6 · FF columns + roof slab
  [
    T('hammer', 'hammer', 7700, 13200, LEVEL.ffSSL, -90, { when: [0, 0.38] }),
    T('hammer', 'hammer', 2650, 10800, LEVEL.ffSSL, -90, { when: [0, 0.38] }),
    T('walk', null, 9000, 4000, LEVEL.ffSSL, 0, { to: [9000, 12000], when: [0, 0.4] }),
    T('kneel', null, 4000, 4000, DECK_RF, 45, { when: [0.55, 0.78] }),
    T('kneel', null, 8000, 8000, DECK_RF, 0, { when: [0.55, 0.78] }),
    T('kneel', null, 12500, 18000, DECK_RF, 180, { when: [0.55, 0.78] }),
    T('vibrate', 'vibrator', 8000, 12000, DECK_RF + 0.15, 30, { when: [0.76, 1] }),
    T('shovel', 'rake', 11000, 17500, DECK_RF + 0.15, -60, { when: [0.76, 1] }),
  ],
  // 7 · Roof rooms + upper roof
  [
    T('hammer', 'hammer', 2600, 8000, LEVEL.rfSSL, -90, { when: [0, 0.32] }),
    T('hammer', 'hammer', 8700, 2300, LEVEL.rfSSL, 90, { when: [0, 0.32] }),
    T('walk', null, 10000, 15000, LEVEL.rfSSL, 0, { to: [14500, 15000] }),
    T('kneel', null, 4000, 9000, DECK_UR, 30, { when: [0.42, 0.62] }),
    T('vibrate', 'vibrator', 5000, 8900, DECK_UR + 0.15, 90, { when: [0.6, 0.78] }),
    T('trowel', 'trowel', 12000, 600, LEVEL.rfSSL, 180, { when: [0.75, 1] }),
    T('trowel', 'trowel', 15400, 12000, LEVEL.rfSSL, 90, { when: [0.75, 1] }),
  ],
  // 8 · Blockwork
  [
    T('trowel', 'trowel', 2700, 3000, LEVEL.gf, -90, { when: [0, 0.5] }),
    T('trowel', 'trowel', 4500, 17800, LEVEL.gf, 0, { when: [0, 0.5] }),
    T('trowel', 'trowel', 13300, 12000, LEVEL.gf, 90, { when: [0, 0.5] }),
    T('carry', 'block', 6000, 13000, LEVEL.gf, 0, { to: [6000, 17000], when: [0, 0.5] }),
    T('trowel', 'trowel', 2700, 3000, LEVEL.ff, -90, { when: [0.45, 0.9] }),
    T('trowel', 'trowel', 5000, 18900, LEVEL.ff, 0, { when: [0.45, 0.9] }),
    T('trowel', 'trowel', 15300, 18000, LEVEL.ff, 90, { when: [0.45, 0.9] }),
    T('carry', 'block', 9000, 6000, LEVEL.ff, 0, { to: [9000, 11000], when: [0.45, 0.9] }),
    T('trowel', 'trowel', 4000, 20500, LIFT(2), 180, { when: [0.5, 0.95] }),
    T('trowel', 'trowel', 5000, 8000, LEVEL.rf, -90, { when: [0.85, 1] }),
  ],
  // 9 · MEP rough-in
  [
    T('drill', 'drill', 5000, 5150, LEVEL.gf, 180),
    T('drill', 'drill', 9000, 13700, LEVEL.gf, 180),
    T('kneel', null, 3300, 6600, LEVEL.gf, 180),
    T('kneel', null, 3300, 11200, LEVEL.ff, 180, { when: [0.3, 1] }),
    T('drill', 'drill', 4000, 13000, LEVEL.ff, 180, { when: [0.2, 1] }),
    T('carry', 'block', 8500, 6000, LEVEL.gf, 0, { to: [8500, 14000] }),
    T('kneel', null, 13500, 1500, LEVEL.rf, 0, { when: [0.6, 1] }),
  ],
  // 10 · Plaster & waterproofing
  [
    T('plaster', 'trowel', 4000, 4900, LEVEL.gf, 180, { when: [0, 0.4] }),
    T('plaster', 'trowel', 11000, 14500, LEVEL.gf, 180, { when: [0, 0.4] }),
    T('plaster', 'trowel', 4000, 4900, LEVEL.ff, 180, { when: [0.25, 0.6] }),
    T('plaster', 'trowel', 3500, 20500, LIFT(1), 180, { when: [0, 0.7] }),
    T('plaster', 'trowel', 6000, 20500, LIFT(3), 180, { when: [0.1, 0.7] }),
    T('plaster', 'trowel', 12500, 22400, LIFT(2), 180, { when: [0.1, 0.7] }),
    T('paint', 'roller', 11000, 15000, LEVEL.rfSSL + 0.14, 0, { when: [0.6, 1] }),
    T('paint', 'roller', 5000, 2500, LEVEL.rfSSL + 0.14, 90, { when: [0.6, 1] }),
  ],
  // 11 · Façade, windows, doors
  [
    T('trowel', 'trowel', 4000, 20500, LIFT(1), 180, { when: [0, 0.6] }),
    T('trowel', 'trowel', 6500, 20500, LIFT(2), 180, { when: [0, 0.6] }),
    T('trowel', 'trowel', 12000, 22400, LIFT(1), 180, { when: [0.1, 0.6] }),
    T('trowel', 'trowel', 14000, 22400, LIFT(3), 180, { when: [0.2, 0.6] }),
    T('carry', 'block', 3000, 19200, LEVEL.gf - 0.3, 90, { to: [8800, 19200], when: [0.45, 0.9] }),
    T('drill', 'drill', 4600, 17900, LEVEL.gf, 0, { when: [0.5, 0.9] }),
    T('drill', 'drill', 12500, 21000, LEVEL.ff, 0, { when: [0.5, 0.9] }),
    T('idle', 'clipboard', 10000, 22800, 0, 180),
  ],
  // 12 · Interior finishes
  [
    T('kneel', null, 4600, 3000, LEVEL.gf, 0, { when: [0, 0.35] }),
    T('kneel', null, 10500, 12000, LEVEL.gf, 90, { when: [0, 0.35] }),
    T('kneel', null, 4600, 15000, LEVEL.ff, 0, { when: [0.1, 0.35] }),
    T('paint', 'roller', 2600, 3000, LEVEL.gf, -90, { when: [0.4, 0.7] }),
    T('paint', 'roller', 6700, 15000, LEVEL.gf, 90, { when: [0.4, 0.7] }),
    T('paint', 'roller', 2600, 15000, LEVEL.ff, -90, { when: [0.45, 0.75] }),
    T('carry', 'block', 8500, 9000, LEVEL.gf, 0, { to: [8500, 14500], when: [0.6, 1] }),
    T('drill', 'drill', 13000, 700, LEVEL.gf, 180, { when: [0.6, 1] }),
  ],
  // 13 · Landscaping & handover
  [
    T('shovel', 'shovel', 1500, 7500, 0.2, -90, { when: [0.3, 0.8] }),
    T('shovel', 'shovel', 13500, 7000, 0.35, 0, { when: [0.3, 0.8] }),
    T('kneel', null, 4500, 18600, 0.2, 180, { when: [0.4, 0.8] }),
    T('carry', 'block', 3000, 20500, 0.2, 90, { to: [8000, 20500], when: [0.2, 0.6] }),
    T('idle', 'clipboard', 8300, 19800, 0.2, 180, { when: [0.6, 0.92] }),
    T('point', null, 9000, 19800, 0.2, 200, { when: [0.6, 0.92] }),
  ],
];

export class Crew {
  constructor(root) {
    this.root = new THREE.Group();
    root.add(this.root);
    this.pool = [];
    this.active = 0;
    this.enabled = true;
    this.assets = null;
    this.lastTime = 0;
    // Skinned CC0 workers replace the procedural fallback once loaded.
    loadRiggedWorkers().then((a) => {
      this.assets = a;
      for (const w of this.pool) w.root.removeFromParent();
      this.pool = [];
    }).catch((e) => console.warn('rigged workers unavailable', e));
  }

  _worker(i) {
    while (this.pool.length <= i) {
      const n = this.pool.length;
      const w = this.assets ? new RiggedWorker(this.assets[n % 3 === 2 ? 1 : 0], n + 3) : new Worker(n + 3);
      this.pool.push(w);
      this.root.add(w.root);
    }
    return this.pool[i];
  }

  update(t, time) {
    const dt = Math.min(0.1, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    let stage = Math.floor(t);
    let u = t - stage;
    if (stage >= CREW.length) { stage = CREW.length - 1; u = 1; }
    const tasks = this.enabled ? (CREW[stage] || []).filter((k) => !k.when || (u >= k.when[0] && u <= k.when[1])) : [];
    tasks.forEach((k, i) => {
      const w = this._worker(i);
      w.root.visible = true;
      w.setTool(k.tool);
      let x = k.x, y = k.y, face = (k.face * Math.PI) / 180;
      let action = k.action;
      if (k.to) {
        const dx = k.to[0] - k.x, dy = k.to[1] - k.y;
        const len = Math.hypot(dx, dy);
        const s = ((time * 1100 * w.speed) / len + i * 0.37) % 2;
        const f = s < 1 ? s : 2 - s;
        x = k.x + dx * f; y = k.y + dy * f;
        face = Math.atan2(dx * (s < 1 ? 1 : -1), dy * (s < 1 ? 1 : -1));
        if (action !== 'carry') action = 'walk';
      }
      const [sx, sz] = toScene(x, y);
      const level = typeof k.level === 'function' ? k.level(u) : k.level;
      w.root.position.set(sx, level, sz);
      w.root.rotation.y = face;
      w.pose(action, time, dt);
    });
    for (let i = tasks.length; i < this.pool.length; i++) this.pool[i].root.visible = false;
    this.active = tasks.length;
  }
}
