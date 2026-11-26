import * as THREE from 'three';

/** Shared PBR material library built from the procedural textures. */
export function createMaterials(T) {
  const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...opts });
  const tex = (t, opts = {}) => std({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), ...opts });

  const M = {
    concrete: tex(T.concrete, { color: 0xd8d6d0, roughness: 0.9 }),
    blinding: tex(T.concrete, { color: 0xa8a59e, roughness: 0.95 }),
    blocks: tex(T.blocks, { roughness: 0.95 }),
    plaster: tex(T.plaster, { roughness: 0.92, emissive: 0x2a2116 }),
    render: tex(T.render, { roughness: 0.9 }),
    paint: tex(T.paint, { roughness: 0.8 }),
    stone: tex(T.stone, { roughness: 0.7, normalScale: new THREE.Vector2(1, 1) }),
    texturePaint: tex(T.render, { color: 0xf3ead8, roughness: 0.85, normalScale: new THREE.Vector2(1.2, 1.2) }),
    marble: tex(T.marble, { roughness: 0.18, metalness: 0.0 }),
    porcelain: tex(T.porcelain, { roughness: 0.3 }),
    wood: tex(T.wood, { roughness: 0.45 }),
    soil: tex(T.soil, { roughness: 1 }),
    soilDark: tex(T.soil, { color: 0xb59a80, roughness: 1 }),
    sand: tex(T.sand, { roughness: 1 }),
    gravel: tex(T.gravel, { roughness: 1 }),
    grass: tex(T.grass, { roughness: 1 }),
    pavers: tex(T.pavers, { roughness: 0.85 }),
    asphalt: tex(T.asphalt, { roughness: 0.95 }),
    plywood: tex(T.plywood, { roughness: 0.8 }),
    rebar: std({ map: T.rebar.map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 }),
    rebarSolid: std({ color: 0x6a4a3a, roughness: 0.55, metalness: 0.6 }),
    steel: std({ color: 0x8f969c, roughness: 0.45, metalness: 0.8 }),
    galvanised: std({ color: 0xb8bec4, roughness: 0.35, metalness: 0.9 }),
    yellowSteel: std({ color: 0xf2b705, roughness: 0.5, metalness: 0.3 }),
    darkSteel: std({ color: 0x2b2d30, roughness: 0.5, metalness: 0.6 }),
    rubber: std({ color: 0x1b1b1b, roughness: 0.9 }),
    alu: std({ color: 0x3a3d40, roughness: 0.35, metalness: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xa9c9d8, roughness: 0.04, metalness: 0.0, transmission: 0, transparent: true, opacity: 0.32,
      envMapIntensity: 1.6, reflectivity: 0.6, side: THREE.DoubleSide, depthWrite: false,
    }),
    doorWood: tex(T.wood, { color: 0x8a5a35, roughness: 0.4 }),
    doorWhite: std({ color: 0xf1ede6, roughness: 0.5 }),
    shutter: tex(T.slats, { color: 0xc9ccd0, roughness: 0.4, metalness: 0.6 }),
    white: std({ color: 0xf5f3ef, roughness: 0.9 }),
    // slight self-illumination stands in for bounced daylight inside rooms
    gypsum: tex(T.paint, { color: 0xfbf7f0, roughness: 0.95, emissive: 0x7a7060 }),
    membrane: std({ color: 0x3b3f45, roughness: 0.75 }),
    coolRoof: tex(T.plaster, { color: 0xf7f7f5, roughness: 0.85 }),
    polythene: std({ color: 0x5aa0d8, roughness: 0.35, transparent: true, opacity: 0.75 }),
    bitumen: std({ color: 0x1d1d1f, roughness: 0.4 }),
    conduit: std({ color: 0xff8a1f, roughness: 0.5 }),
    pipeWater: std({ color: 0x2f9e5b, roughness: 0.45 }),
    pipeDrain: std({ color: 0x9aa1a8, roughness: 0.5 }),
    ductSleeve: std({ color: 0xc0c4c8, roughness: 0.4, metalness: 0.7 }),
    tape: std({ color: 0xff4d2e, roughness: 0.6 }),
    stake: std({ color: 0xd06a2a, roughness: 0.8 }),
    hoarding: std({ color: 0x1f6f8b, roughness: 0.7 }),
    hoardingWhite: std({ color: 0xf2f2f2, roughness: 0.7 }),
    container: std({ color: 0xe7e2d6, roughness: 0.6, metalness: 0.2 }),
    toilet: std({ color: 0x2a6fd6, roughness: 0.6 }),
    waterTank: std({ color: 0x2f74b5, roughness: 0.35 }),
    tankWhite: std({ color: 0xf4f6f8, roughness: 0.4 }),
    led: new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd9a0, emissiveIntensity: 2.2 }),
    leaf: std({ color: 0x4f7f34, roughness: 0.8, side: THREE.DoubleSide }),
    leafDark: std({ color: 0x3c6a2b, roughness: 0.8, side: THREE.DoubleSide }),
    palmTrunk: std({ color: 0x8a6a48, roughness: 1 }),
    fabric: std({ color: 0xd8cbb5, roughness: 1 }),
    fabricDark: std({ color: 0x6b5b4b, roughness: 1 }),
    fabricBlue: std({ color: 0x3b5577, roughness: 1 }),
    cushion: std({ color: 0xb08a5a, roughness: 1 }),
    sanitary: std({ color: 0xf8f8f6, roughness: 0.15 }),
    counter: std({ color: 0x2c2c2e, roughness: 0.25 }),
    cabinet: std({ color: 0xe9e4dc, roughness: 0.5 }),
    rug: std({ color: 0x8a3b2f, roughness: 1 }),
    carRed: std({ color: 0x8b1c1c, roughness: 0.25, metalness: 0.6 }),
    carWhite: std({ color: 0xeeeeee, roughness: 0.25, metalness: 0.5 }),
    neighbour: std({ color: 0xd6c7ad, roughness: 0.95 }),
    neighbour2: std({ color: 0xcbbda6, roughness: 0.95 }),
    kerb: std({ color: 0xbdbab4, roughness: 0.9 }),
    lineWhite: std({ color: 0xf0f0f0, roughness: 0.8 }),
    wallTile: tex(T.wallTiles, { roughness: 0.18 }),
    travertine: tex(T.travertine, { roughness: 0.42 }),
    travertineFloor: tex(T.travertine, { roughness: 0.38, color: 0xfff1da }),
    greyMarble: tex(T.greyMarble, { roughness: 0.16, color: 0xfff6ea }),
    neroMarble: tex(T.neroMarble, { roughness: 0.14 }),
    creamMarble: tex(T.creamMarble, { roughness: 0.16, emissive: 0x1a1510 }),
    lightOak: tex(T.wood, { color: 0xf5dcb8, roughness: 0.45, emissive: 0x15100a }),
    walnut: tex(T.wood, { color: 0x7a5a42, roughness: 0.5 }),
    greige: tex(T.paint, { color: 0xe5dccd, roughness: 0.85 }),
    linenPanel: tex(T.plaster, { color: 0xe2d6c4, roughness: 0.95, normalScale: new THREE.Vector2(1.4, 1.4) }),
    navyPanel: tex(T.plaster, { color: 0x2f3a4f, roughness: 0.9 }),
    brass: std({ color: 0xc9a56a, roughness: 0.28, metalness: 0.95 }),
    covedLed: new THREE.MeshStandardMaterial({ color: 0xfff3dc, emissive: 0xffd9a0, emissiveIntensity: 1.6 }),
  };

  // Real-world texture repeat size (m) used when generating UVs.
  const tiles = {
    concrete: 2, blinding: 2, blocks: 1.2, plaster: 2, render: 2, paint: 2, stone: 2.4, texturePaint: 2,
    marble: 1.2, porcelain: 1.2, wood: 1.8, soil: 4, soilDark: 4, sand: 3, gravel: 1.5, grass: 3, pavers: 1.2,
    asphalt: 4, plywood: 2.44, wallTile: 1.2, travertine: 1.2, travertineFloor: 1.2, greyMarble: 1.2, neroMarble: 1.2, creamMarble: 1.2, lightOak: 1.8, walnut: 1.8, greige: 2, linenPanel: 2, navyPanel: 2, rebar: 1.2, doorWood: 1.8, shutter: 1, gypsum: 2, coolRoof: 2,
  };
  for (const [k, v] of Object.entries(tiles)) M[k].userData.tile = v;
  return M;
}

/** Concrete materials whose colour shifts from wet (dark) to cured. */
export function pourMaterial(base) {
  const m = base.clone();
  m.userData.dry = base.color.clone();
  m.userData.wet = new THREE.Color(0x8f8a84);
  return m;
}
