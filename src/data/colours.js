import * as THREE from 'three';

/**
 * Jotun paint schedule chosen by the owner.
 * Hex values are the published on-screen approximations of each Jotun colour
 * (a physical sample under daylight is the reference). `dilute` is the
 * shop's "مخفف" reduction: the tint is made that much lighter (mixed towards white).
 */
export const JOTUN = {
  rooms:    { code: '8181', name: 'Pastel Mint', hex: 0xe7e1c9, dilute: 0.3, use: 'First-floor bedrooms + dressing rooms' },
  interior: { code: '1931', name: 'Cashew',      hex: 0xe3ddcd, dilute: 0.3, use: 'All other interior walls' },
  exterior: { code: '1964', name: 'Sadaf',       hex: 0xedddc6, dilute: 0,   use: 'Exterior painted walls + parapets' },
  trim:     { code: '0568', name: 'Woodsmoke',   hex: 0xdbcab5, dilute: 0,   use: 'Exterior cornices, window surrounds, projections' },
};

/** Final paint colour (linear) after the shop's dilution. */
export function paintColour(spec) {
  return new THREE.Color(spec.hex).lerp(new THREE.Color(1, 1, 1), spec.dilute || 0);
}

/**
 * Material colour that makes `texture base colour × material colour` equal the paint
 * colour (the procedural plaster / render textures carry their own tint).
 */
export function paintTint(spec, textureBaseHex) {
  const want = paintColour(spec), base = new THREE.Color(textureBaseHex);
  return new THREE.Color(want.r / base.r, want.g / base.g, want.b / base.b);
}

/** First-floor rooms painted with the "rooms" colour. */
export const ROOMS_PAINT = (room) => room.f === 1 && /bedroom|dress/i.test(room.key);
