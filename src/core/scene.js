import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { N8AOPass } from 'n8ao';

/** Quality presets: desktop defaults to high, touch devices (iPad) to medium. */
export const QUALITY = {
  high: { pixelRatio: 2, shadowMap: 4096, ao: true, aoMode: 'High', halfRes: false, smaa: true, bloom: true },
  medium: { pixelRatio: 1.5, shadowMap: 2048, ao: true, aoMode: 'Low', halfRes: true, smaa: false },
  low: { pixelRatio: 1, shadowMap: 1024, ao: false, aoMode: 'Performance', halfRes: true, smaa: false },
};

export function defaultQuality() {
  const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
  return touch ? 'medium' : 'high';
}

export class Stage3D {
  constructor(container, quality) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Khronos PBR Neutral: keeps material colours true (ACES/AgX wash them out) with a soft highlight roll-off
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.62;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = false;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 800);
    this.camera.position.set(22, 14, 30);

    this._buildSky();
    this._buildLights();
    this.setQuality(quality);

    addEventListener('resize', () => this.resize());
  }

  _buildSky() {
    const sky = new Sky();
    sky.scale.setScalar(4000);
    const u = sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;
    this.sky = sky;
    this.scene.add(sky);

    // Late-morning sun, coming over the front-right of the villa.
    this.sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(48), THREE.MathUtils.degToRad(35));
    u.sunPosition.value.copy(this.sunDir);

    this.timeOfDay = 'day';
    this._buildEnv();
    this.scene.environmentIntensity = 0.75;

    this.scene.fog = new THREE.Fog(0xcfd8de, 120, 520);
  }

  /** Image-based lighting generated from the sky itself (re-run when the sun moves). */
  _buildEnv(groundColor = 0xa9a49b) {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const envSky = this.sky.clone();
    envSky.material = this.sky.material.clone();
    envSky.material.uniforms.sunPosition.value.copy(this.sunDir);
    envScene.add(envSky);
    // simple ground bounce so reflections aren't black underneath
    const groundEnv = new THREE.Mesh(new THREE.CircleGeometry(3000, 16), new THREE.MeshBasicMaterial({ color: groundColor }));
    groundEnv.rotation.x = -Math.PI / 2;
    groundEnv.position.y = -10;
    envScene.add(groundEnv);
    this.scene.environment?.dispose();
    this.scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
  }

  /** 'day' (late morning) or 'dusk' (low warm sun, lights on). */
  setTimeOfDay(mode) {
    this.timeOfDay = mode;
    const dusk = mode === 'dusk';
    const u = this.sky.material.uniforms;
    this.sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(dusk ? 86 : 48), THREE.MathUtils.degToRad(dusk ? 235 : 35));
    u.sunPosition.value.copy(this.sunDir);
    u.turbidity.value = dusk ? 9 : 6;
    u.rayleigh.value = dusk ? 3.2 : 1.6;
    this.sun.color.setHex(dusk ? 0xff9752 : 0xfff1dc);
    this.sun.intensity = dusk ? 1.6 : 3.2;
    this.hemi.color.setHex(dusk ? 0x7486b0 : 0xdfe9f5);
    this.hemi.groundColor.setHex(dusk ? 0x3b3129 : 0xc9c0b2);
    this.hemi.intensity = dusk ? 0.22 : 0.6;
    this._buildEnv(dusk ? 0x2a2622 : 0xa9a49b);
    this.scene.environmentIntensity = dusk ? 0.35 : 0.75;
    this.renderer.toneMappingExposure = dusk ? 0.95 : 0.62;
    this.scene.fog.color.setHex(dusk ? 0x5c5866 : 0xcfd8de);
    this._buildComposer();
  }

  _buildLights() {
    const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
    sun.position.copy(this.sunDir).multiplyScalar(60);
    sun.castShadow = true;
    const s = sun.shadow.camera;
    s.left = -32; s.right = 32; s.top = 32; s.bottom = -32; s.near = 5; s.far = 140;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.target.position.set(0, 0, 0);
    this.scene.add(sun, sun.target);
    this.sun = sun;

    this.hemi = new THREE.HemisphereLight(0xdfe9f5, 0xc9c0b2, 0.6);
    this.scene.add(this.hemi);
  }

  setQuality(name) {
    const q = QUALITY[name] || QUALITY.high;
    this.qualityName = name;
    this.quality = q;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    if (this.sun.shadow.mapSize.x !== q.shadowMap) {
      this.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this._buildComposer();
  }

  _buildComposer() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.composer?.dispose();
    const q = this.quality;
    const composer = new EffectComposer(this.renderer);
    if (q.ao) {
      const ao = new N8AOPass(this.scene, this.camera, w, h);
      ao.configuration.gammaCorrection = false;
      ao.configuration.aoRadius = 1.6;
      ao.configuration.distanceFalloff = 0.6;
      ao.configuration.intensity = 2.6;
      ao.configuration.halfRes = q.halfRes;
      ao.setQualityMode(q.aoMode);
      composer.addPass(ao);
      this.aoPass = ao;
    } else {
      composer.addPass(new RenderPass(this.scene, this.camera));
      this.aoPass = null;
    }
    const dusk = this.timeOfDay === 'dusk';
    if (q.bloom || (dusk && q.pixelRatio > 1)) {
      // subtle glow on lamps / LEDs only (high threshold), stronger at dusk
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), dusk ? 0.55 : 0.18, 0.45, dusk ? 0.9 : 1.05));
    }
    composer.addPass(new OutputPass());
    if (q.smaa) composer.addPass(new SMAAPass(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio()));
    this.composer = composer;
    this.resize();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  }

  /** Keep the shadow frustum centred on what the camera is looking at. */
  followShadow(target) {
    const t = this.sun.target.position;
    t.set(Math.round(target.x / 4) * 4, 0, Math.round(target.z / 4) * 4);
    this.sun.position.copy(t).addScaledVector(this.sunDir, 60);
  }

  render() {
    this.composer.render();
  }
}
