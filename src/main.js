import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Stage3D, defaultQuality } from './core/scene.js';
import { createTextures } from './core/textures.js';
import { createMaterials } from './core/materials.js';
import { Timeline } from './core/timeline.js';
import { buildSite } from './build/site.js';
import { buildStructure } from './build/structure.js';
import { buildWalls } from './build/walls.js';
import { buildInterior } from './build/interior.js';
import { buildMachines } from './people/machines.js';
import { Crew } from './people/crew.js';
import { CameraRig, VIEWS } from './controls/cameras.js';
import { STAGES, T_MAX } from './data/stages.js';
import { ROOMS, LEVEL, toScene } from './data/building.js';
import { STRINGS } from './i18n.js';

const $ = (id) => document.getElementById(id);
const SHORT = {
  en: ['Site', 'Excavate', 'Footings', 'Necks', 'Slab', 'GF frame', 'FF frame', 'Roof rooms', 'Blocks', 'MEP', 'Plaster', 'Façade', 'Interior', 'Handover'],
  ar: ['الموقع', 'الحفر', 'القواعد', 'الرقاب', 'البلاطة', 'هيكل الأرضي', 'هيكل الأول', 'الغرف العلوية', 'الطابوق', 'التمديدات', 'اللياسة', 'الواجهات', 'التشطيبات', 'التسليم'],
};

const params = new URLSearchParams(location.hash.slice(1));
const state = {
  lang: params.get('lang') === 'ar' || (!params.get('lang') && navigator.language?.startsWith('ar')) ? 'ar' : 'en',
  t: 0,
  target: Number(params.get('t')) || 0,
  playing: false,
  speed: 1,
  cut: 'all',
  labels: true,
  quality: params.get('q') || defaultQuality(),
};
state.t = state.target;

const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
if (isTouch) document.body.classList.add('touch');

/* ------------------------------------------------------------------ */
async function init() {
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
  const stage3d = new Stage3D($('app'), state.quality);
  const { scene, camera, renderer } = stage3d;

  const T = createTextures(renderer, state.quality);
  const M = createMaterials(T);
  const root = new THREE.Group();
  scene.add(root);
  const TL = new Timeline();
  const plasterMat = M.plaster.clone();
  plasterMat.userData = { ...M.plaster.userData };
  const ctx = { TL, M, root, solids: [], walkables: [], plasterMat };
  buildSite(ctx);
  buildStructure(ctx);
  buildWalls(ctx);
  buildInterior(ctx);
  const machines = buildMachines(ctx);
  const crew = new Crew(scene);
  TL.update(state.t, true);

  /* ---------- room labels ---------- */
  const labelRenderer = new CSS2DRenderer({ element: $('labels') });
  labelRenderer.setSize(innerWidth, innerHeight);
  const labels = ROOMS.filter((r) => !['lift', 'stair'].includes(r.key)).map((r) => {
    const el = document.createElement('div');
    el.className = 'room-label';
    const obj = new CSS2DObject(el);
    const [x, z] = toScene((r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2);
    obj.position.set(x, (r.f ? LEVEL.ff : LEVEL.gf) + 1.4, z);
    obj.userData = { room: r };
    scene.add(obj);
    return obj;
  });

  /* ---------- section cut ---------- */
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  renderer.localClippingEnabled = true;
  const clipMats = new Set();
  const collectMats = () => {
    for (const r of [root, crew.root]) r.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) clipMats.add(m);
    });
  };
  const setCut = (cut) => {
    state.cut = cut;
    collectMats();
    const h = cut === 'gf' ? LEVEL.gf + 2.9 : cut === 'ff' ? LEVEL.ff + 2.9 : null;
    for (const m of clipMats) {
      const want = h === null ? null : [clip];
      if ((m.clippingPlanes?.length || 0) !== (want?.length || 0)) { m.clippingPlanes = want; m.needsUpdate = true; }
    }
    if (h !== null) clip.constant = h;
    for (const b of document.querySelectorAll('#cut button')) b.classList.toggle('on', b.dataset.cut === cut);
  };

  /* ---------- cameras ---------- */
  const rig = new CameraRig(camera, renderer.domElement, ctx);
  rig.onChange((mode) => {
    for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === mode);
    $('walkUI').hidden = mode !== 'walk';
    if (mode === 'tour' && !state.playing) setPlaying(true);
  });

  /* ---------- UI ---------- */
  const ticks = $('ticks');
  STAGES.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${i + 1}</b><span></span>`;
    li.addEventListener('click', () => { setPlaying(false); state.target = i + 0.72; });
    ticks.appendChild(li);
  });

  const setPlaying = (on) => {
    state.playing = on;
    if (on && state.target >= T_MAX - 0.001) { state.target = 0; state.t = 0; }
    $('play').textContent = on ? '❚❚' : '▶';
    $('play').setAttribute('aria-label', STRINGS[state.lang][on ? 'pause' : 'play']);
  };
  $('play').addEventListener('click', () => setPlaying(!state.playing));
  $('speed').addEventListener('change', (e) => { state.speed = Number(e.target.value); });
  const slider = $('slider');
  slider.max = String(T_MAX);
  slider.addEventListener('input', () => { setPlaying(false); state.target = Number(slider.value); state.t = state.target; });

  for (const b of document.querySelectorAll('#modes button')) b.addEventListener('click', () => rig.setMode(b.dataset.mode));
  for (const b of document.querySelectorAll('#cut button')) b.addEventListener('click', () => setCut(b.dataset.cut));
  $('views').addEventListener('change', (e) => { rig.goTo(e.target.value); e.target.selectedIndex = 0; });
  $('labelsToggle').addEventListener('change', (e) => { state.labels = e.target.checked; });
  $('quality').addEventListener('change', (e) => {
    state.quality = e.target.value;
    stage3d.setQuality(state.quality);
  });
  $('lang').addEventListener('click', () => setLang(state.lang === 'en' ? 'ar' : 'en'));
  $('helpBtn').addEventListener('click', () => $('help').showModal());

  // joystick (touch walk mode)
  {
    const joy = $('joystick'), knob = $('knob');
    let id = null;
    const R = 46;
    const move = (tch) => {
      const r = joy.getBoundingClientRect();
      let dx = tch.clientX - (r.left + r.width / 2), dy = tch.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      rig.setJoystick(dx / R, -dy / R);
    };
    joy.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); id = e.changedTouches[0].identifier; move(e.changedTouches[0]); }, { passive: false });
    joy.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) move(t); }, { passive: false });
    const end = () => { id = null; knob.style.transform = ''; rig.setJoystick(0, 0); };
    joy.addEventListener('touchend', end);
    joy.addEventListener('touchcancel', end);
  }

  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
    if (e.target instanceof HTMLSelectElement) return;
    if (rig.mode === 'walk' && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      setPlaying(false);
      const s = Math.floor(state.target + 0.28);
      state.target = Math.min(T_MAX, Math.max(0, (e.code === 'ArrowRight' ? s + 1 : s - 1) + 0.72));
    } else if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!state.playing);
    } else if (e.code === 'KeyL') {
      setLang(state.lang === 'en' ? 'ar' : 'en');
    } else if (/^Digit[1-7]$/.test(e.code)) {
      rig.goTo(Object.keys(VIEWS)[Number(e.code.slice(5)) - 1]);
    }
  });

  function setLang(lang) {
    state.lang = lang;
    const S = STRINGS[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = S[el.dataset.i18n];
    $('lang').textContent = lang === 'ar' ? 'EN' : 'ع';
    const views = $('views');
    views.innerHTML = `<option disabled selected>${S.views}</option>` + Object.keys(VIEWS).map((k, i) => `<option value="${k}">${i + 1} · ${S[k]}</option>`).join('');
    const q = $('quality');
    const qKey = { high: 'qHigh', medium: 'qMed', low: 'qLow' };
    q.innerHTML = Object.keys(qKey).map((k) => `<option value="${k}">${S.quality}: ${S[qKey[k]]}</option>`).join('');
    q.value = state.quality;
    [...ticks.children].forEach((li, i) => { li.querySelector('span').textContent = SHORT[lang][i]; li.title = STAGES[i][lang].name; });
    $('helpList').innerHTML = S.helpText.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    $('walkHint').textContent = isTouch ? S.walkHintTouch : S.walkHintDesktop;
    for (const l of labels) l.element.textContent = S.rooms[l.userData.room.key] || l.userData.room.key;
    $('play').setAttribute('aria-label', S[state.playing ? 'pause' : 'play']);
    lastStage = -1;
  }

  let lastStage = -1;
  let lastTaskKey = '';
  function updateCard() {
    const S = STRINGS[state.lang];
    const idx = Math.min(STAGES.length - 1, Math.floor(state.t));
    const u = state.t >= T_MAX ? 1 : state.t - idx;
    const st = STAGES[idx];
    if (idx !== lastStage) {
      lastStage = idx;
      $('stageNum').textContent = `${S.stage} ${idx + 1} / ${STAGES.length}`;
      $('stageName').textContent = st[state.lang].name;
      $('stageDesc').textContent = st[state.lang].desc;
      $('stageWeeks').textContent = `${S.weeks} ${st.weeks[0]}–${st.weeks[1]}`;
      lastTaskKey = '';
    }
    const n = st[state.lang].tasks.length;
    const key = st[state.lang].tasks.map((_, i) => (u >= (i + 1) / n ? 'd' : u >= i / n ? 'n' : '-')).join('');
    if (key !== lastTaskKey) {
      lastTaskKey = key;
      $('stageTasks').innerHTML = st[state.lang].tasks.map((tk, i) => `<li class="${key[i] === 'd' ? 'done' : key[i] === 'n' ? 'now' : ''}">${tk}</li>`).join('');
    }
    const pct = Math.round((state.t / T_MAX) * 100);
    $('bar').style.width = `${pct}%`;
    $('pct').textContent = `${pct}% ${S.complete}`;
    $('crew').textContent = crew.active ? `👷 ${crew.active} ${S.workers}` : '';
    const week = Math.min(st.weeks[1], Math.floor(st.weeks[0] + u * (st.weeks[1] - st.weeks[0] + 1)));
    $('weekLabel').textContent = `${S.week} ${week}`;
    [...ticks.children].forEach((li, i) => { li.classList.toggle('active', i === idx); li.classList.toggle('done', i < idx || state.t >= T_MAX); });
    if (document.activeElement !== slider) slider.value = String(state.t);
    slider.style.setProperty('--track-fill', `linear-gradient(90deg, var(--accent) ${(state.t / T_MAX) * 100}%, var(--track) 0)`);
  }

  function updateLabels() {
    const camY = camera.position.y;
    let floor = -1;
    if (state.cut === 'gf') floor = 0;
    else if (state.cut === 'ff') floor = 1;
    else if (Math.abs(camera.position.x) < 8.2 && Math.abs(camera.position.z) < 10.8) {
      if (camY > LEVEL.gf && camY < LEVEL.gf + 3.6) floor = 0;
      else if (camY > LEVEL.ff && camY < LEVEL.ff + 3.6) floor = 1;
    }
    const built = state.t >= 8.6;
    for (const l of labels) l.visible = state.labels && built && l.userData.room.f === floor;
  }

  setLang(state.lang);
  setCut('all');
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 800);
  addEventListener('resize', () => labelRenderer.setSize(innerWidth, innerHeight));

  // Expose a tiny API for debugging / automated screenshots.
  window.happyhome = {
    setT: (t) => { state.target = state.t = t; },
    setCut, goTo: (v) => rig.goTo(v), setMode: (m) => rig.setMode(m), rig, state, scene, camera,
  };

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let lastCollect = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;
    if (state.playing) {
      state.target = Math.min(T_MAX, state.target + (dt * state.speed) / 8);
      if (state.target >= T_MAX) setPlaying(false);
    }
    state.t += (state.target - state.t) * Math.min(1, dt * 7);
    if (Math.abs(state.target - state.t) < 1e-4) state.t = state.target;

    TL.update(state.t);
    machines.update(state.t, time);
    crew.update(state.t, time);
    if (state.cut !== 'all' && time - lastCollect > 1) { lastCollect = time; setCut(state.cut); }
    rig.update(dt);
    stage3d.followShadow(rig.focus());
    updateCard();
    updateLabels();
    stage3d.render();
    labelRenderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}

init().catch((err) => {
  console.error(err);
  const p = document.querySelector('#loading p');
  if (p) p.textContent = 'Error: ' + err.message;
});
