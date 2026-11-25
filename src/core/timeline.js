import * as THREE from 'three';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => v * v * (3 - 2 * v);
const easeOutBack = (v) => {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
};

/**
 * The timeline drives every construction element from one continuous value
 * t ∈ [0, STAGES.length]. Each element appears over a window `in: [t0, t1]`
 * using an animation, and may be removed again over `out: [t2, t3]`.
 *
 * Animations (objects are expected to have their pivot at their base):
 *   rise    grow upwards (scale.y)
 *   course  grow upwards in 200 mm block courses
 *   pour    grow upwards + wet → cured concrete colour
 *   pop     scale up from zero with a little overshoot
 *   drop    lowered into place from above (crane / hand placement)
 *   slide   slide in along X (opts.dir)
 *   show    simply appear
 *   sink    (out only) sink into the ground
 */
export class Timeline {
  constructor() {
    this.items = [];
    this.hooks = [];
    this.t = -1;
  }

  add(obj, opts) {
    const item = {
      obj,
      in: opts.in,
      out: opts.out || null,
      anim: opts.anim || 'rise',
      outAnim: opts.outAnim || (opts.anim === 'pour' || opts.anim === 'course' ? 'rise' : opts.anim || 'rise'),
      h: opts.h || 1,
      cure: opts.cure || null,
      dir: opts.dir || 1,
      base: { pos: obj.position.clone(), scale: obj.scale.clone() },
      tag: opts.tag,
    };
    obj.visible = false;
    this.items.push(item);
    return obj;
  }

  /** Register a custom per-t callback, e.g. a machine animation. */
  hook(fn) { this.hooks.push(fn); }

  update(t, force = false) {
    if (!force && Math.abs(t - this.t) < 1e-6) return;
    this.t = t;
    for (const it of this.items) this._apply(it, t);
    for (const fn of this.hooks) fn(t);
  }

  _apply(it, t) {
    const [a, b] = it.in;
    const pin = clamp01((t - a) / Math.max(1e-6, b - a));
    let pout = 0;
    if (it.out) pout = clamp01((t - it.out[0]) / Math.max(1e-6, it.out[1] - it.out[0]));
    const obj = it.obj;
    const removing = pout > 0;
    const p = removing ? 1 - pout : pin;
    const anim = removing ? it.outAnim : it.anim;
    if (p <= 0.0005) { obj.visible = false; return; }
    obj.visible = true;
    const { pos, scale } = it.base;
    obj.position.copy(pos);
    obj.scale.copy(scale);
    const e = smooth(p);
    switch (anim) {
      case 'rise':
        obj.scale.y = scale.y * Math.max(0.002, e);
        break;
      case 'course': {
        const courses = Math.max(1, Math.round(it.h / 0.2));
        const c = Math.ceil(p * courses - 1e-6) / courses;
        obj.scale.y = scale.y * Math.max(0.002, c);
        break;
      }
      case 'pour': {
        obj.scale.y = scale.y * Math.max(0.002, e);
        const m = obj.material;
        if (m?.userData?.wet) {
          let cure = 0;
          if (it.cure) cure = clamp01((t - it.cure[0]) / (it.cure[1] - it.cure[0]));
          else cure = clamp01((t - b) / 0.25);
          m.color.copy(m.userData.wet).lerp(m.userData.dry, cure);
        }
        break;
      }
      case 'pop':
        obj.scale.copy(scale).multiplyScalar(Math.max(0.002, p < 1 ? easeOutBack(p) : 1));
        break;
      case 'drop':
        obj.position.y = pos.y + (1 - e) * 4;
        break;
      case 'slide':
        obj.position.x = pos.x + (1 - e) * 3 * it.dir;
        break;
      case 'sink':
        obj.position.y = pos.y - (1 - e) * 3;
        break;
      case 'show':
      default:
        break;
    }
  }
}

/** Utility: evenly distribute n items over [t0, t1] with overlap. */
export function stagger(i, n, t0, t1, overlap = 3) {
  const span = t1 - t0;
  const each = Math.min(span, (span / Math.max(1, n)) * overlap);
  const start = t0 + (n <= 1 ? 0 : (i / (n - 1)) * (span - each));
  return [start, start + each];
}

export { THREE };
