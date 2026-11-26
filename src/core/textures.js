import * as THREE from 'three';

/*
 * Procedural PBR textures generated on canvases at start-up so the project
 * needs no external image assets. Each generator returns { map, normalMap }
 * covering `size` metres of real-world surface (see TILE below).
 */

// ---------- deterministic noise ------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value-noise fBm on an N×N grid. Returns Float32Array in 0..1. */
function fbm(N, { seed = 1, octaves = 5, base = 4, gain = 0.5 } = {}) {
  const rand = mulberry32(seed);
  const out = new Float32Array(N * N);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = base << o;
    const lat = new Float32Array(cells * cells);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    const step = cells / N;
    for (let y = 0; y < N; y++) {
      const fy = y * step, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      const y0c = y0 % cells, y1c = (y0 + 1) % cells;
      for (let x = 0; x < N; x++) {
        const fx = x * step, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
        const x0c = x0 % cells, x1c = (x0 + 1) % cells;
        const a = lat[y0c * cells + x0c], b = lat[y0c * cells + x1c];
        const c = lat[y1c * cells + x0c], d = lat[y1c * cells + x1c];
        out[y * N + x] += amp * (a + (b - a) * sx + (c - a + (a - b + d - c) * sx) * sy);
      }
    }
    total += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Builds colour + normal canvases from a per-pixel shader fn(x, y) → [r,g,b,height]. */
function bake(N, fn, { normalStrength = 2 } = {}) {
  const col = document.createElement('canvas');
  col.width = col.height = N;
  const cctx = col.getContext('2d');
  const img = cctx.createImageData(N, N);
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const [r, g, b, height] = fn(x, y);
      const i = (y * N + x) * 4;
      img.data[i] = clamp01(r) * 255;
      img.data[i + 1] = clamp01(g) * 255;
      img.data[i + 2] = clamp01(b) * 255;
      img.data[i + 3] = 255;
      h[y * N + x] = height ?? 0.5;
    }
  }
  cctx.putImageData(img, 0, 0);

  const nor = document.createElement('canvas');
  nor.width = nor.height = N;
  const nctx = nor.getContext('2d');
  const nimg = nctx.createImageData(N, N);
  const H = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * normalStrength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * normalStrength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      nimg.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  return { col, nor };
}

function toTextures({ col, nor }, anisotropy) {
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(nor);
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    t.generateMipmaps = true;
  }
  return { map, normalMap };
}

// ---------- generators -------------------------------------------------------
const mix = (a, b, t) => a + (b - a) * t;
const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

function concrete(N) {
  const n1 = fbm(N, { seed: 11, octaves: 6, base: 4 });
  const n2 = fbm(N, { seed: 12, octaves: 3, base: 32 });
  const pores = mulberry32(5);
  const holes = new Uint8Array(N * N);
  for (let i = 0; i < N * N * 0.004; i++) holes[Math.floor(pores() * N * N)] = 1;
  return bake(N, (x, y) => {
    const i = y * N + x;
    const v = 0.55 + (n1[i] - 0.5) * 0.35 + (n2[i] - 0.5) * 0.12 - holes[i] * 0.25;
    return [v * 0.98, v * 0.97, v * 0.94, n2[i] * 0.4 - holes[i] * 0.6];
  }, { normalStrength: 3 });
}

/** CMU block wall: 400×200 blocks, 10 mm mortar — 1.2 m × 1.2 m tile. */
function blocks(N) {
  const n = fbm(N, { seed: 21, octaves: 5, base: 8 });
  const tint = mulberry32(3);
  const bt = Array.from({ length: 64 }, () => tint() * 0.08);
  const px = N / 1.2; // pixels per metre
  return bake(N, (x, y) => {
    const course = Math.floor(y / (0.2 * px));
    const off = course % 2 ? 0.2 * px : 0;
    const bx = Math.floor((x + off) / (0.4 * px));
    const lx = (x + off) % (0.4 * px), ly = y % (0.2 * px);
    const m = 0.012 * px;
    const mortar = lx < m || ly < m;
    const i = y * N + x;
    if (mortar) {
      const v = 0.62 + (n[i] - 0.5) * 0.1;
      return [v, v * 0.98, v * 0.93, 0.1];
    }
    const v = 0.74 + (n[i] - 0.5) * 0.22 - bt[(course * 7 + bx) & 63];
    return [v * 0.97, v * 0.96, v * 0.92, 0.6 + n[i] * 0.3];
  }, { normalStrength: 4 });
}

function plaster(N, hex = 0xe9e4da, rough = 0.06) {
  const n = fbm(N, { seed: 31, octaves: 6, base: 16 });
  const c = rgb(hex);
  return bake(N, (x, y) => {
    const i = y * N + x;
    const v = 1 + (n[i] - 0.5) * rough * 2;
    return [c[0] * v, c[1] * v, c[2] * v, n[i]];
  }, { normalStrength: 1.2 });
}

/** Limestone cladding 1200×300 tiles with 20 mm grooves — 2.4 × 2.4 m tile. */
function stone(N) {
  const n = fbm(N, { seed: 41, octaves: 6, base: 6 });
  const v2 = fbm(N, { seed: 42, octaves: 4, base: 3 });
  const tint = mulberry32(9);
  const bt = Array.from({ length: 128 }, () => (tint() - 0.5) * 0.08);
  const px = N / 2.4;
  const c = rgb(0xd9cbb0);
  return bake(N, (x, y) => {
    const row = Math.floor(y / (0.3 * px));
    const off = row % 2 ? 0.6 * px : 0;
    const col = Math.floor((x + off) / (1.2 * px));
    const lx = (x + off) % (1.2 * px), ly = y % (0.3 * px);
    const g = 0.01 * px;
    const i = y * N + x;
    if (lx < g || ly < g) return [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 0];
    const vein = Math.abs(Math.sin((v2[i] * 12 + x / N * 3) * Math.PI)) < 0.04 ? -0.05 : 0;
    const v = 1 + (n[i] - 0.5) * 0.16 + bt[(row * 13 + col) & 127] + vein;
    return [c[0] * v, c[1] * v, c[2] * v, 0.7 + n[i] * 0.2];
  }, { normalStrength: 3 });
}

/** Polished marble, 600×600 tiles — 1.2 × 1.2 m tile. */
function marble(N) {
  const n = fbm(N, { seed: 51, octaves: 6, base: 3 });
  const w = fbm(N, { seed: 52, octaves: 5, base: 5 });
  const px = N / 1.2;
  return bake(N, (x, y) => {
    const i = y * N + x;
    const lx = x % (0.6 * px), ly = y % (0.6 * px);
    if (lx < 1.2 || ly < 1.2) return [0.75, 0.73, 0.7, 0];
    const vein = Math.pow(1 - Math.abs(Math.sin((x / N * 4 + n[i] * 6 + w[i] * 3) * Math.PI)), 18);
    const v = 0.93 - vein * 0.35 + (w[i] - 0.5) * 0.05;
    return [v, v * 0.985, v * 0.96, 0.5];
  }, { normalStrength: 0.6 });
}

/** Oak floor planks 180 mm wide — 1.8 × 1.8 m tile. */
function wood(N, hex = 0xa77b52) {
  const n = fbm(N, { seed: 61, octaves: 5, base: 4 });
  const g = fbm(N, { seed: 62, octaves: 3, base: 64 });
  const tint = mulberry32(17);
  const bt = Array.from({ length: 64 }, () => (tint() - 0.5) * 0.18);
  const px = N / 1.8;
  const c = rgb(hex);
  return bake(N, (x, y) => {
    const plank = Math.floor(x / (0.18 * px));
    const off = (plank * 0.37 % 1) * N;
    const ly = (y + off) % (1.2 * px);
    const i = y * N + x;
    if (x % (0.18 * px) < 1 || ly < 1) return [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, 0];
    const grain = Math.sin((x / N * 140 + n[i] * 10) ) * 0.06;
    const v = 1 + grain + bt[plank & 63] + (g[i] - 0.5) * 0.08;
    return [c[0] * v, c[1] * v, c[2] * v, 0.5 + grain];
  }, { normalStrength: 1 });
}

function ground(N, hex, seed, rough = 0.25) {
  const n = fbm(N, { seed, octaves: 7, base: 4 });
  const s = fbm(N, { seed: seed + 1, octaves: 3, base: 48 });
  const c = rgb(hex);
  return bake(N, (x, y) => {
    const i = y * N + x;
    const v = 1 + (n[i] - 0.5) * rough * 2 + (s[i] - 0.5) * 0.25;
    return [c[0] * v, c[1] * v, c[2] * v, s[i]];
  }, { normalStrength: 4 });
}

function grass(N) {
  const n = fbm(N, { seed: 71, octaves: 6, base: 4 });
  const blades = mulberry32(72);
  const noise = new Float32Array(N * N).map(() => blades());
  return bake(N, (x, y) => {
    const i = y * N + x;
    const v = 0.85 + (n[i] - 0.5) * 0.5 + (noise[i] - 0.5) * 0.25;
    return [0.30 * v, 0.47 * v, 0.20 * v, noise[i]];
  }, { normalStrength: 2 });
}

/** Interlock pavers 200×100 herringbone-ish — 1.2 × 1.2 m tile. */
function pavers(N) {
  const n = fbm(N, { seed: 81, octaves: 5, base: 8 });
  const tint = mulberry32(83);
  const bt = Array.from({ length: 256 }, () => (tint() - 0.5) * 0.12);
  const px = N / 1.2;
  const c = rgb(0xc9b79c);
  return bake(N, (x, y) => {
    const row = Math.floor(y / (0.1 * px));
    const off = row % 2 ? 0.1 * px : 0;
    const col = Math.floor((x + off) / (0.2 * px));
    const lx = (x + off) % (0.2 * px), ly = y % (0.1 * px);
    const i = y * N + x;
    if (lx < 1.5 || ly < 1.5) return [0.45, 0.42, 0.38, 0];
    const v = 1 + bt[(row * 31 + col) & 255] + (n[i] - 0.5) * 0.1;
    return [c[0] * v, c[1] * v, c[2] * v, 0.6];
  }, { normalStrength: 3 });
}

function asphalt(N) {
  const n = fbm(N, { seed: 91, octaves: 4, base: 8 });
  const r = mulberry32(92);
  return bake(N, (x, y) => {
    const i = y * N + x;
    const speck = r();
    const v = 0.22 + (n[i] - 0.5) * 0.08 + (speck > 0.97 ? 0.15 : 0) + (speck - 0.5) * 0.04;
    return [v, v, v * 1.02, speck];
  }, { normalStrength: 3 });
}

/** Plywood formwork panels 1.22 × 2.44 m. */
function plywood(N) {
  const n = fbm(N, { seed: 101, octaves: 5, base: 3 });
  const px = N / 2.44;
  return bake(N, (x, y) => {
    const i = y * N + x;
    if (x % (1.22 * px) < 1.5 || y < 1.5) return [0.35, 0.22, 0.12, 0];
    const grain = Math.sin((y / N * 40 + n[i] * 8)) * 0.05;
    const v = 1 + grain + (n[i] - 0.5) * 0.12;
    return [0.78 * v, 0.52 * v, 0.28 * v, 0.5 + grain];
  }, { normalStrength: 1 });
}

/** Rebar mesh (alpha-tested) — 200 mm spacing, 1.2 m tile. */
function rebarGrid(N) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, N, N);
  const px = N / 1.2;
  ctx.strokeStyle = '#5a4033';
  ctx.lineWidth = Math.max(2, 0.016 * px);
  for (let i = 0; i < 6; i++) {
    const p = (i + 0.5) * 0.2 * px;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, N); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(N, p); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return { map: t };
}

/** Rolling shutter slats. */
function slats(N) {
  return bake(N, (x, y) => {
    const s = (y % (N / 12)) / (N / 12);
    const v = 0.78 - Math.abs(s - 0.5) * 0.25 - (s < 0.06 ? 0.3 : 0);
    return [v * 0.95, v * 0.95, v, s < 0.06 ? 0 : 0.5 + Math.sin(s * Math.PI) * 0.4];
  }, { normalStrength: 4 });
}

/** Glazed wall tiles 600×300 with 2 mm grout — 1.2 × 1.2 m tile. */
function wallTiles(N) {
  const n = fbm(N, { seed: 131, octaves: 4, base: 6 });
  const px = N / 1.2;
  return bake(N, (x, y) => {
    const i = y * N + x;
    const lx = x % (0.6 * px), ly = y % (0.3 * px);
    if (lx < 1.5 || ly < 1.5) return [0.72, 0.71, 0.69, 0];
    const v = 0.93 + (n[i] - 0.5) * 0.04;
    return [v, v, v * 0.99, 0.55];
  }, { normalStrength: 2.5 });
}

/** Travertine 600×1200 (portrait) with fine grout and banded veining — 1.2 × 1.2 m tile. */
function travertine(N) {
  const n = fbm(N, { seed: 141, octaves: 6, base: 4 });
  const band = fbm(N, { seed: 142, octaves: 5, base: 3 });
  const pores = mulberry32(143);
  const holes = new Uint8Array(N * N);
  for (let i = 0; i < N * N * 0.0025; i++) holes[Math.floor(pores() * N * N)] = 1;
  const tint = mulberry32(144);
  const bt = [tint() - 0.5, tint() - 0.5].map((v) => v * 0.05);
  const px = N / 1.2;
  return bake(N, (x, y) => {
    const i = y * N + x;
    const tile = Math.floor(x / (0.6 * px));
    if (x % (0.6 * px) < 1.2 || y < 1.2) return [0.78, 0.74, 0.67, 0];
    // fine straight streaks along the long (vertical) side of the tile, slightly broken up
    const streak = Math.sin((x / N) * 220 + band[i] * 4) * 0.5 + Math.sin((x / N) * 95 + n[i] * 2.5) * 0.5;
    const vein = Math.max(0, streak) ** 4 * 0.05;
    const v = 1 + (n[i] - 0.5) * 0.06 - vein + bt[tile % 2] - holes[i] * 0.08;
    return [0.92 * v, 0.85 * v, 0.73 * v, 0.6 - vein * 3 - holes[i] * 0.4];
  }, { normalStrength: 2 });
}

/** Real-world size (m) covered by one texture repeat. */
export const TILE = {
  concrete: 2.0, blocks: 1.2, plaster: 2.0, paint: 2.0, stone: 2.4, marble: 1.2, wood: 1.8,
  soil: 4.0, sand: 3.0, grass: 3.0, pavers: 1.2, asphalt: 4.0, gravel: 1.5, plywood: 2.44, rebar: 1.2, slats: 1.0,
  porcelain: 1.2,
};

export function createTextures(renderer, quality = 'high') {
  const N = quality === 'low' ? 256 : 512;
  const an = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const T = {};
  T.concrete = toTextures(concrete(N), an);
  T.blocks = toTextures(blocks(N), an);
  T.plaster = toTextures(plaster(N, 0xe6e1d7, 0.05), an);
  T.paint = toTextures(plaster(N, 0xf4efe6, 0.03), an);
  T.render = toTextures(plaster(N, 0xe8dcc6, 0.08), an);
  T.stone = toTextures(stone(N), an);
  T.marble = toTextures(marble(N), an);
  T.porcelain = toTextures(plaster(N, 0xd4cfc6, 0.04), an);
  T.wood = toTextures(wood(N), an);
  T.soil = toTextures(ground(N, 0x9c7a55, 201, 0.25), an);
  T.sand = toTextures(ground(N, 0xd8c29a, 211, 0.12), an);
  T.gravel = toTextures(ground(N, 0xb9ad9a, 221, 0.35), an);
  T.grass = toTextures(grass(N), an);
  T.pavers = toTextures(pavers(N), an);
  T.asphalt = toTextures(asphalt(N), an);
  T.plywood = toTextures(plywood(N), an);
  T.rebar = rebarGrid(N);
  T.slats = toTextures(slats(256), an);
  T.wallTiles = toTextures(wallTiles(N), an);
  T.travertine = toTextures(travertine(N), an);
  return T;
}

/**
 * Assigns world-scale box-projected UVs to a geometry (in its local space,
 * offset by `origin` so neighbouring meshes don't repeat identically).
 */
export function worldUV(geometry, tile = 1, origin = [0, 0, 0]) {
  const pos = geometry.attributes.position;
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + origin[0], y = pos.getY(i) + origin[1], z = pos.getZ(i) + origin[2];
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}
