import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { INFO, PROJECT, ROADS_H, ROADS_V, BUILDING_NAMES, COMPANY_TYPES, COURSES } from './data.js';

/* =========================================================
   Утилиты
   ========================================================= */
const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
const fmt = (n, d = 0) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + fmt(n / 1e9, 2) + ' млрд';
  if (a >= 1e6) return '$' + fmt(n / 1e6, 2) + ' млн';
  if (a >= 1e4) return '$' + fmt(n / 1e3, 1) + ' тыс';
  return '$' + fmt(n);
};
const hhmm = (h) => { const m = Math.floor(((h % 24) + 24) % 24 * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const $ = (id) => document.getElementById(id);

/* =========================================================
   Рендерер, сцена, камера
   ========================================================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
$('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3ff);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.fog = new THREE.Fog(0x9fd3ff, 260, 700);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 3000);
const HOME_POS = new THREE.Vector3(175, 150, 205);
camera.position.copy(HOME_POS);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = PI * 0.47;
controls.minDistance = 10;
controls.maxDistance = 520;
controls.autoRotateSpeed = 0.7;
controls.target.set(0, 0, 0);
controls.screenSpacePanning = false;

/* Свет */
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x46503f, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 10, far: 700 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);
const ambient = new THREE.AmbientLight(0x8090c0, 0.12);
scene.add(ambient);

/* Звёзды */
const stars = (() => {
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * 2 * PI, ph = Math.acos(Math.random() * 0.9 + 0.1), r = 1200;
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const p = new THREE.Points(g, m); scene.add(p); return p;
})();

/* =========================================================
   Материалы и текстуры
   ========================================================= */
const std = (color, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const glow = (color, intensity = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
const M = {
  asphalt: std(0x2a2e35, 0.95),
  sidewalk: std(0xb9bec6, 0.9),
  grass: std(0x6aa84f, 1),
  grassDark: std(0x5a9443, 1),
  lawn: std(0x77b85a, 1),
  roof: std(0x6d7480, 0.85),
  concrete: std(0xd7dade, 0.8),
  white: std(0xf1f3f5, 0.55),
  dark: std(0x2b3038, 0.6, 0.3),
  panel: std(0x3a4150, 0.5, 0.5),
  metal: std(0xa3adb9, 0.35, 0.85),
  glass: new THREE.MeshStandardMaterial({ color: 0x86b8e8, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 }),
  gold: std(0xd4a640, 0.28, 1),
  water: new THREE.MeshStandardMaterial({ color: 0x3d8fd1, roughness: 0.08, metalness: 0.4 }),
  marking: new THREE.MeshBasicMaterial({ color: 0xe9e7dc }),
  yellowLine: new THREE.MeshBasicMaterial({ color: 0xe8c547 }),
  trunk: std(0x6b4a2f, 0.9),
  leaf: std(0x3f8f3a, 0.85),
  solar: new THREE.MeshStandardMaterial({ color: 0x1b2f66, roughness: 0.2, metalness: 0.7 }),
  red: glow(0xef4444, 1.2),
  green: std(0x22c55e, 0.6),
  tire: std(0x16181c, 0.9),
  carGlass: new THREE.MeshStandardMaterial({ color: 0x1c2b3d, roughness: 0.1, metalness: 0.8 }),
  head: new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xfff3c4, emissiveIntensity: 0.3 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0xff2222, emissiveIntensity: 0.4 }),
  cyan: glow(0x22d3ee, 1.6),
  violet: glow(0xa78bfa, 1.6),
  blueLight: glow(0x3b82f6, 1.8),
  greenLight: glow(0x4ade80, 1.6),
  orangeLight: glow(0xfb923c, 1.6),
};

function windowTexture(style, seed) {
  const rnd = mulberry32(seed);
  const W = 256, H = 512, cols = 4, rows = 8, cw = W / cols, ch = H / rows;
  const c1 = document.createElement('canvas'); c1.width = W; c1.height = H;
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
  const g = c1.getContext('2d'), e = c2.getContext('2d');
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  g.fillStyle = style === 'glass' ? '#c3ccd6' : '#ece7de'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw, y = r * ch;
    const [px, py, pw, ph] = style === 'glass' ? [x + 3, y + 5, cw - 6, ch - 10] : [x + 13, y + 14, cw - 26, ch - 24];
    const gr = g.createLinearGradient(px, py, px + pw, py + ph);
    gr.addColorStop(0, style === 'glass' ? '#4a6684' : '#3a4656'); gr.addColorStop(1, '#18202b');
    g.fillStyle = gr; g.fillRect(px, py, pw, ph);
    if (rnd() < 0.45) {
      const b = 0.5 + rnd() * 0.5;
      e.fillStyle = rnd() < 0.72 ? `rgba(255,${(200 + rnd() * 30) | 0},${(130 + rnd() * 50) | 0},${b})` : `rgba(190,225,255,${b})`;
      e.fillRect(px, py, pw, ph);
    }
  }
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: mk(c1), emap: mk(c2) };
}
const TEX = { glassA: windowTexture('glass', 11), glassB: windowTexture('glass', 17), resA: windowTexture('res', 21), resB: windowTexture('res', 29) };
const winMats = [];
function winMat(color, tex, rough = 0.3, metal = 0.5) {
  const m = new THREE.MeshStandardMaterial({ color, map: tex.map, emissive: 0xffffff, emissiveMap: tex.emap, emissiveIntensity: 0, roughness: rough, metalness: metal });
  winMats.push(m); return m;
}
const WM = {
  blue: winMat(0x9cc4ee, TEX.glassA, 0.18, 0.6),
  teal: winMat(0x93dbd3, TEX.glassB, 0.18, 0.6),
  grey: winMat(0xd0d8e2, TEX.glassB, 0.22, 0.55),
  violet: winMat(0xb9b0ec, TEX.glassA, 0.2, 0.55),
  warm: winMat(0xf2dcb8, TEX.resA, 0.8, 0),
  white: winMat(0xffffff, TEX.resB, 0.8, 0),
  rose: winMat(0xeab9a9, TEX.resA, 0.8, 0),
  sand: winMat(0xe3cf9f, TEX.resB, 0.8, 0),
  orange: winMat(0xffa36b, TEX.glassB, 0.35, 0.3),
  yellow: winMat(0xffd35c, TEX.glassA, 0.35, 0.3),
  lime: winMat(0x9be08e, TEX.glassB, 0.35, 0.3),
  pink: winMat(0xf49ac1, TEX.glassA, 0.35, 0.3),
};

function boxGeo(w, h, d, uw = 8, uh = 25.6) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const [su, sv] = f < 2 ? [d / uw, h / uh] : f < 4 ? [w / uw, d / uw] : [w / uw, h / uh];
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv); }
  }
  g.translate(0, h / 2, 0);
  return g;
}
function tower(w, h, d, side, roof = M.roof) {
  const m = new THREE.Mesh(boxGeo(w, h, d), [side, side, roof, roof, side, side]);
  m.castShadow = m.receiveShadow = true; return m;
}
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) { return mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), mat, x, y, z, shadow); }
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0), mat, x, y, z); }

const carMats = [0xf8fafc, 0x111827, 0x2563eb, 0xdc2626, 0x9ca3af, 0x0ea5e9, 0xfacc15, 0x16a34a, 0x7c3aed].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.6 }));
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12).rotateX(PI / 2);
function makeCarMesh(color, type) {
  const g = new THREE.Group();
  const body = typeof color === 'number' ? new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 }) : color;
  if (type === 'shuttle') {
    g.add(box(7, 2.6, 2.3, body, 0, 0.45, 0, false));
    g.add(box(6.2, 1.1, 2.34, M.carGlass, 0, 1.6, 0, false));
    g.add(box(7.05, 0.3, 2.35, M.cyan, 0, 0.75, 0, false));
    for (const x of [-2.4, 2.4]) for (const z of [-1.1, 1.1]) g.add(mesh(wheelGeo, M.tire, x, 0.42, z, false));
    g.add(box(0.1, 0.35, 1.8, M.head, 3.52, 1.0, 0, false), box(0.1, 0.35, 1.8, M.tail, -3.52, 1.0, 0, false));
  } else {
    g.add(box(4, 0.9, 1.9, body, 0, 0.35, 0, false));
    g.add(box(2.2, 0.75, 1.7, M.carGlass, -0.2, 1.25, 0, false));
    g.add(box(0.35, 0.22, 0.35, M.cyan, -0.2, 2.0, 0, false)); // лидар
    for (const x of [-1.3, 1.3]) for (const z of [-0.9, 0.9]) g.add(mesh(wheelGeo, M.tire, x, 0.42, z, false));
    g.add(box(0.1, 0.22, 0.45, M.head, 2.0, 0.85, -0.6, false), box(0.1, 0.22, 0.45, M.head, 2.0, 0.85, 0.6, false));
    g.add(box(0.1, 0.22, 0.45, M.tail, -2.0, 0.85, -0.6, false), box(0.1, 0.22, 0.45, M.tail, -2.0, 0.85, 0.6, false));
  }
  g.children[0].castShadow = true;
  return g;
}

function textTexture(lines, { w = 512, h = 128, bg = '#0b1226', fg = '#22d3ee', font = 'bold 54px Inter, Arial', sub = '#e6eefc' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.draw = (ls) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = ls.length;
    ls.forEach((s, i) => {
      g.fillStyle = i === 0 ? fg : sub;
      g.font = i === 0 ? font : font.replace(/\d+px/, (m) => Math.round(parseInt(m) * 0.55) + 'px');
      g.fillText(s, w / 2, h * (i + 0.5) / n + (n > 1 ? (i === 0 ? 4 : -2) : 0));
    });
    t.needsUpdate = true;
  };
  t.draw(lines);
  return t;
}
function sign(lines, w, h, opts) {
  const tex = textTexture(lines, opts);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.65, roughness: 0.5 }));
  m.userData.tex = tex;
  return m;
}

/* =========================================================
   Генплан города
   ========================================================= */
const R = [-66, -22, 22, 66];      // оси дорог
const EDGE = 130;                    // половина размера города
const SLAB = 0.3;                    // высота тротуаров/кварталов
const CELLS = [[-EDGE, -71], [-61, -27], [-17, 17], [27, 61], [71, EDGE]];

const entities = [];
const pickRoots = [];
const anims = [];          // функции анимации (dt, t)
const reservations = [];   // зарезервированные прямоугольники {x0,x1,z0,z1}
const treeSpots = [];
const reserve = (x0, x1, z0, z1) => reservations.push({ x0, x1, z0, z1 });
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

function register(root, ent) {
  ent.obj = root; root.userData.ent = ent;
  pickRoots.push(root); entities.push(ent);
  return ent;
}
function landmark(id, group, x, z, extra = {}) {
  group.position.set(x, SLAB, z);
  scene.add(group);
  return register(group, { id, kind: 'landmark', listed: true, ...INFO[id], ...extra });
}

/* Земля и кварталы */
(() => {
  const outer = mesh(new THREE.PlaneGeometry(4000, 4000), std(0x5f8a4c, 1), 0, -0.05, 0, false);
  outer.rotation.x = -PI / 2; outer.receiveShadow = true; scene.add(outer);
  const asph = mesh(new THREE.PlaneGeometry(EDGE * 2, EDGE * 2), M.asphalt, 0, 0, 0, false);
  asph.rotation.x = -PI / 2; asph.receiveShadow = true; scene.add(asph);

  const grassCells = new Set(['0,2', '0,3', '2,0']);
  for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 5; iz++) {
    const [x0, x1] = CELLS[ix], [z0, z1] = CELLS[iz];
    const mat = grassCells.has(ix + ',' + iz) ? M.grass : M.sidewalk;
    const s = mesh(new THREE.BoxGeometry(x1 - x0, SLAB, z1 - z0), mat, (x0 + x1) / 2, SLAB / 2, (z0 + z1) / 2, false);
    s.receiveShadow = true; scene.add(s);
  }

  // Разметка: пунктир по центру дорог и пешеходные переходы
  const dash = [], zebra = [];
  for (const r of R) {
    for (let t = -EDGE + 3; t < EDGE; t += 7) {
      if (R.some((c) => Math.abs(t - c) < 9)) continue;
      dash.push([t, r, 3.2, 0.28], [r, t, 0.28, 3.2]);
    }
  }
  for (const cx of R) for (const cz of R) {
    for (let o = -4; o <= 4; o += 1.35) {
      zebra.push([cx + 6.2, cz + o, 2.4, 0.65], [cx - 6.2, cz + o, 2.4, 0.65], [cx + o, cz + 6.2, 0.65, 2.4], [cx + o, cz - 6.2, 0.65, 2.4]);
    }
  }
  const inst = (list, mat) => {
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), mat, list.length);
    const m4 = new THREE.Matrix4();
    list.forEach(([x, z, sx, sz], i) => { m4.makeScale(sx, 1, sz).setPosition(x, 0.02, z); im.setMatrixAt(i, m4); });
    im.receiveShadow = true; scene.add(im);
  };
  inst(dash, M.yellowLine); inst(zebra, M.marking);
})();

/* =========================================================
   Состояние симуляции
   ========================================================= */
const S = {
  hour: 9, rate: 3, playing: true,
  aiTraffic: true, aiEnergy: true,
  wind: 9, cloud: 0.15,
  solarMW: 0, windMW: 0, demandMW: 0, soc: 0.62, gridMW: 0,
  revenue: 0, revenueRate: 0, sectors: [], savings: 0, co2: 0, renewMWh: 0, solarMWh: 0,
  aiRate: 0, decisions: 0, parcels: 0, loans: 0, fraud: 0, patients: 0, evMWh: 0,
  waits: { ai: [], fixed: [] },
  work: 0, retail: 0, night: 0, elev: 0,
  boost: { energy: 0, revenue: 0, logistics: 0 },
};
const SECTORS = [
  { name: 'Ритейл', color: '#f472b6', base: 46000, curve: () => S.retail },
  { name: 'FinTech', color: '#facc15', base: 38000, curve: () => 0.25 + 0.75 * S.work },
  { name: 'IT и стартапы', color: '#a78bfa', base: 34000, curve: () => 0.2 + 0.8 * S.work },
  { name: 'Логистика', color: '#fb923c', base: 26000, curve: () => 0.45 + 0.55 * S.work },
  { name: 'Медицина', color: '#4ade80', base: 18000, curve: () => 0.6 + 0.4 * S.work },
];
const workCurve = (h) => smooth(7, 9, h) * (1 - smooth(18, 20, h));
const retailCurve = (h) => 0.08 + 0.92 * smooth(9, 11, h) * (1 - smooth(21, 23, h)) * (0.8 + 0.2 * gauss(h, 19, 2));
const sunElev = (h) => Math.sin(PI * (h - 6) / 12);
function demandAt(h) {
  const d = 46 + 16 * gauss(h, 8.5, 1.8) + 30 * gauss(h, 19.5, 2.3) + 10 * gauss(h, 13.5, 3) - 12 * gauss(h, 3.5, 2.5);
  return d * (S.aiEnergy ? 0.9 - S.boost.energy : 1);
}

/* =========================================================
   Ориентиры (landmarks)
   ========================================================= */
let coreEnt, trafficEnt, analyticsBars = [], trafficScreen, energyEnt, solarEnt, windEnt, logisticsEnt;
const turbines = [];
const coreTop = new THREE.Vector3(0, 60, 0);

/* NeuroCore */
(() => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(16, 16, 0.15, 64).translate(0, 0.075, 0), M.concrete, 0, 0, 0, false));
  const ring = mesh(new THREE.RingGeometry(12.2, 12.9, 96), M.cyan, 0, 0.18, 0, false); ring.rotation.x = -PI / 2; g.add(ring);
  const ring2 = mesh(new THREE.RingGeometry(14.5, 14.8, 96), M.violet, 0, 0.18, 0, false); ring2.rotation.x = -PI / 2; g.add(ring2);
  g.add(cyl(9, 10.5, 6, M.white));
  g.add(cyl(9.3, 9.3, 0.5, M.cyan, 0, 6, 0, 48));
  const tmap = TEX.glassA.map.clone(); tmap.repeat.set(6, 2.2); tmap.needsUpdate = true;
  const temap = TEX.glassA.emap.clone(); temap.repeat.set(6, 2.2); temap.needsUpdate = true;
  const tm = new THREE.MeshStandardMaterial({ color: 0x8cc3f5, map: tmap, emissive: 0xffffff, emissiveMap: temap, emissiveIntensity: 0, roughness: 0.12, metalness: 0.7 });
  winMats.push(tm);
  g.add(cyl(4.4, 6, 48, tm, 0, 6.5, 0, 40));
  for (let i = 0; i < 5; i++) g.add(cyl(6.2 - i * 0.33, 6.2 - i * 0.33, 0.35, M.cyan, 0, 14 + i * 9, 0, 40));
  g.add(cyl(2.2, 4.4, 4, M.white, 0, 54.5, 0, 32));
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 2.2, roughness: 0.2 });
  const sphere = mesh(new THREE.SphereGeometry(3.3, 40, 20), coreMat, 0, 61.5, 0, false); g.add(sphere);
  const rings = [];
  [[7.5, M.cyan], [9.2, M.violet], [11, M.cyan]].forEach(([r, mat], i) => {
    const t = mesh(new THREE.TorusGeometry(r, 0.16, 8, 120), mat, 0, 61.5, 0, false);
    t.rotation.set(PI / 2 + i * 0.5, i * 0.7, 0); g.add(t); rings.push(t);
  });
  g.add(cyl(0.12, 0.2, 9, M.metal, 0, 64.5, 0, 8));
  const beacon = mesh(new THREE.SphereGeometry(0.45, 12, 8), M.red, 0, 73.6, 0, false); g.add(beacon);
  const pl = new THREE.PointLight(0x22d3ee, 0, 120, 1.6); pl.position.set(0, 61.5, 0); g.add(pl);
  anims.push((dt, t) => {
    rings.forEach((r, i) => { r.rotation.z += dt * (0.4 + i * 0.25); r.rotation.x += dt * 0.15 * (i - 1); });
    const s = 1 + Math.sin(t * 2.2) * 0.06; sphere.scale.set(s, s, s);
    coreMat.emissiveIntensity = 1.8 + Math.sin(t * 2.2) * 0.5;
    beacon.visible = Math.sin(t * 4) > 0;
    pl.intensity = 400 * S.night;
  });
  coreEnt = landmark('core', g, 0, 0, { labelY: 78 });
  reserve(-17, 17, -17, 17);
})();

/* Business Analytics Tower + FinTech Bank (финансовый квартал) */
(() => {
  const g = new THREE.Group();
  g.add(tower(12, 40, 12, WM.violet));
  g.add(box(12.6, 1, 12.6, M.dark, 0, 40, 0));
  const colors = SECTORS.map((s) => new THREE.Color(s.color));
  colors.forEach((c, i) => {
    const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, roughness: 0.4 });
    const b = mesh(new THREE.BoxGeometry(1.7, 1, 1.7).translate(0, 0.5, 0), m, -4.8 + i * 2.4, 41, 0);
    g.add(b); analyticsBars.push(b);
  });
  anims.push((dt) => {
    const max = Math.max(...S.sectors.map((s) => s.value), 1);
    analyticsBars.forEach((b, i) => { const target = 1 + 11 * ((S.sectors[i]?.value || 0) / max); b.scale.y = lerp(b.scale.y, target, dt * 2); });
  });
  landmark('analytics', g, -8, -44, { labelY: 56 });
  reserve(-15, -1, -51, -37);

  const b = new THREE.Group();
  b.add(tower(13, 30, 13, WM.grey));
  b.add(box(13.6, 0.8, 13.6, M.gold, 0, 30, 0));
  b.add(tower(10, 7, 10, WM.grey).translateY(30.8));
  const pyr = mesh(new THREE.ConeGeometry(7.4, 6.5, 4).translate(0, 3.25, 0), M.gold, 0, 37.8, 0); pyr.rotation.y = PI / 4; b.add(pyr);
  for (let i = -1.5; i <= 1.5; i++) b.add(cyl(0.45, 0.45, 6, M.white, i * 2.8, 0, 7.6, 12));
  b.add(box(13, 0.7, 2.6, M.white, 0, 6, 7.4));
  const s = sign(['FinTech Bank'], 9, 1.6, { fg: '#facc15', font: 'bold 64px Inter, Arial' }); s.position.set(0, 7.6, 8.75); b.add(s);
  landmark('bank', b, 9, -44, { labelY: 50 });
  reserve(1.5, 16.5, -51, -37);
})();

/* Data Center + 5G */
(() => {
  const g = new THREE.Group();
  g.add(box(28, 9, 14, M.panel));
  for (const y of [2.5, 5, 7.5]) g.add(box(28.15, 0.25, 14.15, M.blueLight, 0, y, 0, false));
  const fans = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    const x = -11 + i * 4.4, z = -3 + j * 6;
    g.add(cyl(1.5, 1.5, 0.9, M.metal, x, 9, z, 20));
    const f = box(2.6, 0.08, 0.4, M.dark, x, 9.95, z, false); g.add(f); fans.push(f);
  }
  const s = sign(['CloudMind', 'AI DATA CENTER'], 9, 2.6, { fg: '#60a5fa', h: 160 }); s.position.set(0, 5.4, 7.08); g.add(s);
  anims.push((dt) => fans.forEach((f) => (f.rotation.y += dt * (6 + S.work * 6))));
  landmark('datacenter', g, -44, -50, { labelY: 16 });
  reserve(-58, -30, -57, -43);

  const t = new THREE.Group();
  t.add(cyl(0.6, 2.2, 30, new THREE.MeshStandardMaterial({ color: 0xc0c8d2, wireframe: true }), 0, 0, 0, 4));
  t.add(cyl(0.35, 0.6, 30, M.metal, 0, 0, 0, 8));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * 2 * PI;
    const p = box(0.5, 2.4, 1.1, M.white, Math.cos(a) * 1.1, 24, Math.sin(a) * 1.1); p.rotation.y = -a; t.add(p);
  }
  const dish = mesh(new THREE.SphereGeometry(1.4, 16, 8, 0, 2 * PI, 0, PI / 2.6), M.white, 0, 19, 1.3); dish.rotation.x = PI / 2; t.add(dish);
  const tip = mesh(new THREE.SphereGeometry(0.5, 12, 8), M.red, 0, 30.4, 0, false); t.add(tip);
  const waves = [];
  for (let i = 0; i < 3; i++) {
    const w = mesh(new THREE.TorusGeometry(1, 0.06, 6, 48), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6 }), 0, 26, 0, false);
    w.rotation.x = PI / 2; t.add(w); waves.push(w);
  }
  anims.push((dt, tt) => {
    tip.visible = Math.sin(tt * 5) > -0.2;
    waves.forEach((w, i) => { const p = (tt * 0.6 + i / 3) % 1; const s = 1 + p * 9; w.scale.set(s, s, s); w.material.opacity = 0.6 * (1 - p); });
  });
  landmark('tower5g', t, -35, -34, { labelY: 34 });
  reserve(-40, -30, -39, -29);
})();

/* Startup Hub */
(() => {
  const g = new THREE.Group();
  const lawn = box(30, 0.1, 30, M.lawn, 0, 0, 0, false); lawn.receiveShadow = true; g.add(lawn);
  const blocks = [
    [-8, -8, 12, 8, 10, 0, WM.orange], [-8, -8, 9, 7, 8, 8, WM.yellow], [-6, -9, 7, 6, 6, 15, WM.pink],
    [8, -7, 11, 10, 10, 0, WM.lime], [9, -6, 8, 6, 9, 10, WM.teal],
    [-7, 8, 10, 6, 11, 0, WM.violet], [-8, 9, 8, 7, 7, 6, WM.orange],
    [8, 8, 10, 12, 10, 0, WM.yellow], [7, 8, 7, 6, 7, 12, WM.pink], [8, 7, 5, 5, 5, 18, WM.lime],
  ];
  for (const [x, z, w, h, d, y, mat] of blocks) { const m = tower(w, h, d, mat, M.grassDark); m.position.set(x, y, z); g.add(m); }
  const pole = cyl(0.2, 0.3, 6, M.metal); g.add(pole);
  const bulb = mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffd34d, emissiveIntensity: 1.6 }), 0, 7.3, 0, false); g.add(bulb);
  anims.push((dt, t) => { bulb.position.y = 7.3 + Math.sin(t * 1.8) * 0.4; });
  landmark('startup', g, 44, -44, { labelY: 30 });
  reserve(27, 61, -61, -27);
})();

/* AI Traffic Control Hub */
(() => {
  const g = new THREE.Group();
  g.add(tower(16, 13, 14, WM.teal));
  g.add(box(16.4, 0.6, 14.4, M.cyan, 0, 13, 0, false));
  g.add(cyl(3.2, 3.6, 2, M.white, 0, 13.6, 0));
  const dome = mesh(new THREE.SphereGeometry(3.2, 24, 12, 0, 2 * PI, 0, PI / 2), M.white, 0, 15.6, 0); g.add(dome);
  const radar = new THREE.Group(); radar.position.set(0, 19, 0);
  radar.add(cyl(0.15, 0.15, 1.5, M.metal, 0, -1.5, 0, 8));
  const dish = box(4, 1.4, 0.25, M.metal, 0, -0.4, 0); radar.add(dish); g.add(radar);
  const scr = sign(['AI TRAFFIC', '…'], 12, 5.2, { w: 512, h: 220, fg: '#4ade80', font: 'bold 56px Inter, Arial' });
  scr.position.set(0, 6.8, -7.06); scr.rotation.y = PI; g.add(scr);
  trafficScreen = scr.userData.tex;
  anims.push((dt) => (radar.rotation.y += dt * 1.4));
  trafficEnt = landmark('traffic', g, -51, -7, { labelY: 26 });
  reserve(-59, -43, -14, 0);
})();

/* SmartMall */
(() => {
  const g = new THREE.Group();
  g.add(box(30, 4, 24, M.glass));
  g.add(box(30.4, 0.5, 24.4, M.violet, 0, 4, 0, false));
  g.add(tower(30, 7, 24, WM.white).translateY(4.5));
  const dome = mesh(new THREE.SphereGeometry(7, 32, 16, 0, 2 * PI, 0, PI / 2), M.glass, 0, 11.5, 0); g.add(dome);
  g.add(cyl(7.2, 7.2, 0.4, M.metal, 0, 11.3, 0, 32));
  const s = sign(['SMART MALL', 'магазин без касс · AI'], 14, 3.6, { fg: '#f472b6', h: 180 }); s.position.set(0, 8, 12.06); g.add(s);
  const s2 = s.clone(); s2.position.set(0, 8, -12.06); s2.rotation.y = PI; g.add(s2);
  landmark('mall', g, 44, 0, { labelY: 22 });
  reserve(29, 59, -12, 12);
})();

/* Университет */
(() => {
  const g = new THREE.Group();
  const lawn = box(32, 0.1, 32, M.lawn, 0, 0, 0, false); lawn.receiveShadow = true; g.add(lawn);
  g.add(box(3, 0.12, 14, M.concrete, 0, 0, 9, false));
  g.add(tower(26, 11, 10, WM.sand).translateZ(-9));
  for (let i = 0; i < 8; i++) g.add(cyl(0.45, 0.5, 9, M.white, -8.75 + i * 2.5, 0, -2.6, 14));
  g.add(box(22, 1, 3.4, M.white, 0, 9, -2.8));
  const ped = mesh(new THREE.CylinderGeometry(2, 2, 22, 3, 1, false, PI / 2).rotateZ(PI / 2), M.white, 0, 10.6, -2.8);
  ped.scale.set(1, 0.6, 1); g.add(ped);
  g.add(cyl(4.6, 4.6, 2, M.white, 0, 11, -9, 32));
  g.add(mesh(new THREE.SphereGeometry(4.4, 32, 16, 0, 2 * PI, 0, PI / 2), new THREE.MeshStandardMaterial({ color: 0x2dd4bf, metalness: 0.6, roughness: 0.3 }), 0, 13, -9));
  g.add(tower(8, 8, 14, WM.sand).translateX(-12).translateZ(5));
  g.add(tower(8, 8, 14, WM.sand).translateX(12).translateZ(5));
  const s = sign(['AI in Business & Technology', 'UNIVERSITY · FACULTY'], 16, 2.2, { w: 1024, h: 140, fg: '#2dd4bf', font: 'bold 64px Inter, Arial' });
  s.position.set(0, 7.3, -1.05); g.add(s);
  for (const [x, z] of [[-6, 4], [6, 4], [-6, 12], [6, 12], [-13, 14], [13, 14], [-14, -14], [14, -14]]) treeSpots.push([-44 + x, 44 + z, 1.1]);
  landmark('university', g, -44, 44, { labelY: 22 });
  reserve(-61, -27, 27, 61);
})();

/* Smart Hospital */
(() => {
  const g = new THREE.Group();
  g.add(tower(26, 15, 13, WM.white).translateZ(-6));
  g.add(tower(11, 9, 12, WM.white).translateX(-7.5).translateZ(7));
  g.add(box(1.2, 4.2, 0.3, M.red, 6, 9, 0.6, false));
  g.add(box(4.2, 1.2, 0.3, M.red, 6, 10.5, 0.6, false));
  g.add(cyl(4.2, 4.2, 0.25, M.dark, 4, 15, -6, 32));
  g.add(box(0.6, 0.06, 3.4, M.marking, 2.8, 15.27, -6, false), box(0.6, 0.06, 3.4, M.marking, 5.2, 15.27, -6, false), box(2.4, 0.06, 0.6, M.marking, 4, 15.27, -6, false));
  const ring = mesh(new THREE.TorusGeometry(3.6, 0.12, 6, 48), M.greenLight, 4, 15.3, -6, false); ring.rotation.x = PI / 2; g.add(ring);
  const s = sign(['SMART HOSPITAL'], 10, 1.8, { fg: '#ef4444', bg: '#ffffff' }); s.position.set(-7.5, 7, 13.06); g.add(s);
  for (const [x, z] of [[4, 6], [10, 6], [4, 12], [10, 12], [14, 9]]) treeSpots.push([x, 44 + z, 1.2]);
  landmark('hospital', g, 0, 44, { labelY: 24 });
  reserve(-17, 17, 27, 61);
})();

/* Smart Grid + EV charging */
(() => {
  const g = new THREE.Group();
  const lights = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
    const x = -4 + c * 7.5, z = -11 + r * 5.5;
    g.add(box(6.4, 3, 3, M.white, x, 0, z));
    const l = box(6.5, 0.35, 3.1, M.greenLight.clone(), x, 2.2, z, false); g.add(l); lights.push(l);
  }
  g.add(box(4, 4, 4, M.panel, -4, 0, 12));
  for (let i = 0; i < 3; i++) g.add(cyl(0.25, 0.35, 2.4, M.white, -5.3 + i * 1.3, 4, 12, 8));
  g.add(box(4, 4, 4, M.panel, 3.5, 0, 12));
  anims.push(() => {
    const charging = S.netMW > 0;
    lights.forEach((l, i) => { l.material.emissive.setHex(i / lights.length < S.soc ? (charging ? 0x4ade80 : 0xfacc15) : 0x1f2937); });
  });
  energyEnt = landmark('energy', g, 36, 44, { labelY: 10 });
  reserve(29, 44, 28, 60);

  const e = new THREE.Group();
  e.add(box(14, 0.5, 10, M.white, 0, 5, 0));
  for (const [x, z] of [[-6.5, -4.5], [6.5, -4.5], [-6.5, 4.5], [6.5, 4.5]]) e.add(cyl(0.25, 0.25, 5, M.metal, x, 0, z, 8));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const p = box(3.1, 0.12, 4.4, M.solar, -4.9 + i * 3.25, 5.55, -2.4 + j * 4.8, false); p.rotation.x = j ? -0.06 : 0.06; e.add(p);
  }
  for (let i = 0; i < 4; i++) {
    e.add(box(0.7, 1.8, 0.5, M.white, -4.5 + i * 3, 0, -1.2));
    e.add(box(0.5, 0.3, 0.52, M.greenLight, -4.5 + i * 3, 1.3, -1.21, false));
  }
  const c1 = makeCarMesh(0x2563eb, 'car'); c1.position.set(-4.5, 0, 1.6); c1.rotation.y = PI / 2; e.add(c1);
  const c2 = makeCarMesh(0xf8fafc, 'car'); c2.position.set(1.5, 0, 1.6); c2.rotation.y = PI / 2; e.add(c2);
  landmark('ev', e, 53, 44, { labelY: 9 });
  reserve(45, 61, 37, 51);
})();

/* Robotic Logistics Hub */
const HUB_PAD = new THREE.Vector3(100, 14, 0);
(() => {
  const g = new THREE.Group();
  g.add(box(42, 9, 22, M.concrete));
  const roof = mesh(new THREE.CylinderGeometry(11, 11, 42, 28, 1, false, 0, PI).rotateZ(PI / 2), M.metal, 0, 9, 0);
  roof.scale.set(1, 0.32, 1); g.add(roof);
  for (let i = 0; i < 5; i++) g.add(box(4, 5, 0.3, M.dark, -16 + i * 8, 0, 11.05, false));
  g.add(box(42.3, 0.4, 22.3, M.orangeLight, 0, 6.5, 0, false));
  const s = sign(['ROBO LOGISTICS'], 14, 2.2, { fg: '#fb923c' }); s.position.set(0, 7.8, 11.08); g.add(s);
  for (const x of [-12, 0, 12]) {
    g.add(cyl(2.6, 2.6, 0.2, M.dark, x, 12.45, 0, 24));
    const r = mesh(new THREE.TorusGeometry(2.3, 0.1, 6, 40), M.orangeLight, x, 12.7, 0, false); r.rotation.x = PI / 2; g.add(r);
  }
  for (let i = 0; i < 3; i++) {
    const tr = new THREE.Group();
    tr.add(box(3, 3.2, 2.4, M.white, 1.5, 0.5, 0), box(2, 2.4, 2.3, M.orangeLight, -1.3, 0.5, 0));
    tr.position.set(-14 + i * 8, 0, 15); tr.rotation.y = PI / 2; g.add(tr);
  }
  logisticsEnt = landmark('logistics', g, 100, 0, { labelY: 18 });
  reserve(71, 130, -17, 17);
})();

/* AI Recycling Plant */
(() => {
  const g = new THREE.Group();
  g.add(tower(22, 10, 15, WM.grey).translateX(-5));
  g.add(cyl(3.5, 3.5, 15, M.green, 11, 0, -4, 24), cyl(3.5, 3.5, 12, M.green, 11, 0, 4.5, 24));
  g.add(cyl(1.1, 1.4, 22, M.white, -13, 0, -5, 16));
  g.add(box(2.6, 0.5, 2.6, M.greenLight, -13, 21.6, -5, false));
  const conv = box(12, 0.8, 2, M.dark, 4, 7, 0); conv.rotation.z = 0.35; g.add(conv);
  const s = sign(['♻ AI RECYCLING'], 10, 1.8, { fg: '#4ade80' }); s.position.set(-5, 7.5, 7.56); g.add(s);
  landmark('recycling', g, 100, 44, { labelY: 26 });
  reserve(71, 130, 27, 61);
})();

/* Солнечная электростанция */
(() => {
  const g = new THREE.Group();
  const spots = [];
  for (let x = -126; x <= -76; x += 4.6) {
    for (let z = -13; z <= 13; z += 3.4) spots.push([x, z]);
    for (let z = 31; z <= 57; z += 3.4) spots.push([x, z]);
  }
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 0.12, 2.4), M.solar, spots.length);
  const legs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), M.metal, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.45, 0, 0));
  spots.forEach(([x, z], i) => {
    m4.compose(new THREE.Vector3(x + 100, 1.6, z - 22), q, new THREE.Vector3(1, 1, 1)); panels.setMatrixAt(i, m4);
    m4.makeTranslation(x + 100, 0.7, z - 22); legs.setMatrixAt(i, m4);
  });
  panels.castShadow = true; panels.receiveShadow = true;
  g.add(panels, legs);
  solarEnt = landmark('solar', g, -100, 22, { labelY: 8, panels: spots.length });
  reserve(-130, -71, -17, 61);
})();

/* Ветропарк */
(() => {
  const g = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.7, 14, 0.25).translate(0, 7.4, 0);
  [-100, -50, 0, 50, 100].forEach((z, i) => {
    const t = new THREE.Group(); t.position.set((i % 2) * 14 - 7, 0, z);
    t.add(cyl(0.6, 1.1, 34, M.white, 0, 0, 0, 16));
    const head = new THREE.Group(); head.position.y = 34;
    head.add(box(1.6, 1.6, 4, M.white, 0, -0.8, -0.6));
    const rotor = new THREE.Group(); rotor.position.set(0, 0, 1.6);
    rotor.add(mesh(new THREE.SphereGeometry(0.7, 12, 8), M.white));
    for (let k = 0; k < 3; k++) { const b = mesh(bladeGeo, M.white); b.rotation.z = (k * 2 * PI) / 3; rotor.add(b); }
    head.add(rotor); t.add(head);
    head.rotation.y = PI / 2 + (i - 2) * 0.08;
    g.add(t);
    turbines.push({ rotor, head, health: 92 + Math.random() * 7, id: 'W-' + (i + 1) });
  });
  anims.push((dt) => turbines.forEach((tb, i) => (tb.rotor.rotation.z += dt * (S.wind / 12) * 2.4 * (0.9 + i * 0.05))));
  windEnt = landmark('wind', g, -168, 0, { labelY: 50 });
  g.position.y = 0;
})();

/* Smart Park */
(() => {
  const g = new THREE.Group();
  const ground = box(34, 0.08, 59, M.lawn, 0, 0, 0, false); ground.receiveShadow = true; g.add(ground);
  const pond = mesh(new THREE.CircleGeometry(1, 48), M.water, 0, 0.12, 4, false); pond.rotation.x = -PI / 2; pond.scale.set(8, 11, 1); g.add(pond);
  g.add(box(3, 0.1, 59, M.concrete, -12, 0.02, 0, false), box(34, 0.1, 3, M.concrete, 0, 0.02, -20, false));
  const fountain = cyl(0.6, 1, 2.5, M.white, 0, 0, 4, 12); g.add(fountain);
  const jet = mesh(new THREE.ConeGeometry(1.2, 3, 16, 1, true).translate(0, 1.5, 0), new THREE.MeshStandardMaterial({ color: 0xbfe7ff, transparent: true, opacity: 0.5, emissive: 0x7dd3fc, emissiveIntensity: 0.3 }), 0, 2.5, 4, false);
  g.add(jet);
  anims.push((dt, t) => { jet.scale.y = 1 + Math.sin(t * 3) * 0.2; });
  for (const z of [-24, 14, 24]) {
    g.add(cyl(0.12, 0.15, 3.4, M.metal, 6, 0, z, 8));
    g.add(box(0.9, 0.9, 0.9, M.cyan, 6, 3.4, z, false));
  }
  const rnd = mulberry32(5);
  for (let i = 0; i < 26; i++) {
    const x = (rnd() - 0.5) * 30, z = (rnd() - 0.5) * 54;
    if (Math.hypot(x / 9, (z - 4) / 12) < 1.1 || Math.abs(x + 12) < 2.5 || Math.abs(z + 20) < 2.5) continue;
    treeSpots.push([x, -100.5 + z, 0.9 + rnd() * 0.8]);
  }
  landmark('park', g, 0, -100.5, { labelY: 10 });
  reserve(-17, 17, -130, -71);
})();

/* =========================================================
   Рядовая застройка (офисы, жилые дома)
   ========================================================= */
(() => {
  const rnd = mulberry32(42);
  let n = 0;
  for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 5; iz++) {
    const [x0, x1] = CELLS[ix], [z0, z1] = CELLS[iz];
    const inner = ix > 0 && ix < 4 && iz > 0 && iz < 4;
    const W = x1 - x0 - 2, D = z1 - z0 - 2;
    const nx = Math.max(1, Math.round(W / 17)), nz = Math.max(1, Math.round(D / 17));
    const lw = W / nx, ld = D / nz;
    let built = 0;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const lot = { x0: x0 + 1 + a * lw + 1.5, x1: x0 + 1 + (a + 1) * lw - 1.5, z0: z0 + 1 + b * ld + 1.5, z1: z0 + 1 + (b + 1) * ld - 1.5 };
      if (reservations.some((r) => overlaps(r, lot))) continue;
      const cx = (lot.x0 + lot.x1) / 2, cz = (lot.z0 + lot.z1) / 2;
      const dist = Math.hypot(cx, cz);
      if (!inner && rnd() < 0.12) { // мини-сквер
        for (let k = 0; k < 4; k++) treeSpots.push([cx + (rnd() - 0.5) * (lw - 5), cz + (rnd() - 0.5) * (ld - 5), 0.9 + rnd() * 0.6]);
        continue;
      }
      const isOffice = inner ? rnd() < 0.8 : rnd() < 0.35;
      const w = lot.x1 - lot.x0 - rnd() * 3, d = lot.z1 - lot.z0 - rnd() * 3;
      const h = isOffice ? lerp(16, 46, rnd()) * (1.25 - dist / 300) : lerp(7, 24, rnd());
      const mat = isOffice ? pick([WM.blue, WM.teal, WM.grey, WM.violet]) : pick([WM.warm, WM.white, WM.rose, WM.sand]);
      const g = new THREE.Group();
      g.add(tower(w, h, d, mat));
      if (isOffice && rnd() < 0.6) g.add(tower(w * 0.65, h * 0.18, d * 0.65, mat).translateY(h));
      const topH = isOffice && g.children.length > 1 ? h * 1.18 : h;
      if (rnd() < 0.5) g.add(box(2.2, 1.6, 2.2, M.metal, w * 0.18, topH, -d * 0.15));
      if (!isOffice && rnd() < 0.55) { // солнечные панели на крыше
        const p = box(w * 0.7, 0.15, d * 0.55, M.solar, 0, h + 0.3, 0, false); p.rotation.x = -0.15; g.add(p);
      }
      if (isOffice && rnd() < 0.3) { g.add(cyl(0.1, 0.1, 6, M.metal, -w * 0.2, topH, d * 0.2, 6)); g.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), M.red, -w * 0.2, topH + 6.1, d * 0.2, false)); }
      g.position.set(cx, SLAB, cz);
      scene.add(g);
      const seed = (rnd() * 1e9) | 0;
      const r2 = mulberry32(seed);
      const name = BUILDING_NAMES[n % BUILDING_NAMES.length] + (n >= BUILDING_NAMES.length ? ' ' + (1 + Math.floor(n / BUILDING_NAMES.length)) : '');
      const floors = Math.max(2, Math.round(h / 3.2));
      const ent = isOffice
        ? { id: 'office', kind: 'office', ...INFO.office, name: 'Бизнес-центр «' + name + '»', floors, companies: 6 + ((r2() * 40) | 0), staff: floors * (60 + ((r2() * 60) | 0)), sector: pick(COMPANY_TYPES), saving: 18 + r2() * 14, boost: 0 }
        : { id: 'residential', kind: 'residential', ...INFO.residential, name: 'ЖК «' + name + '»', floors, flats: floors * (4 + ((r2() * 6) | 0)), solarRoof: g.children.some((c) => c.material === M.solar), saving: 12 + r2() * 12, boost: 0 };
      ent.listed = false; ent.labelY = topH + 2;
      register(g, ent);
      n++; built++;
    }
    // деревья по периметру кварталов с застройкой
    if (built) {
      for (let t = x0 + 5; t < x1 - 4; t += 7) { treeSpots.push([t, z0 + 1.3, 0.8]); treeSpots.push([t, z1 - 1.3, 0.8]); }
    }
  }
})();

/* Деревья (instanced) */
(() => {
  const spots = treeSpots;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 1.8, 6).translate(0, 0.9, 0), M.trunk, spots.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 0), M.leaf, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    m4.compose(new THREE.Vector3(x, SLAB, z), q, new THREE.Vector3(s, s, s)); trunks.setMatrixAt(i, m4);
    q.setFromEuler(new THREE.Euler(0, Math.random() * PI, 0));
    m4.compose(new THREE.Vector3(x, SLAB + 2.6 * s, z), q, new THREE.Vector3(s, s * 1.2, s)); crowns.setMatrixAt(i, m4);
    crowns.setColorAt(i, col.setHSL(0.27 + Math.random() * 0.08, 0.5, 0.32 + Math.random() * 0.1));
    q.identity();
  });
  trunks.castShadow = crowns.castShadow = true;
  scene.add(trunks, crowns);
})();

/* =========================================================
   Светофоры
   ========================================================= */
const LAMP = {
  r1: new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff2020, emissiveIntensity: 2.5 }),
  r0: new THREE.MeshStandardMaterial({ color: 0x3a1010, roughness: 0.6 }),
  y1: new THREE.MeshStandardMaterial({ color: 0xffd23b, emissive: 0xffc400, emissiveIntensity: 2.5 }),
  y0: new THREE.MeshStandardMaterial({ color: 0x3a3010, roughness: 0.6 }),
  g1: new THREE.MeshStandardMaterial({ color: 0x3bff7a, emissive: 0x20ff60, emissiveIntensity: 2.5 }),
  g0: new THREE.MeshStandardMaterial({ color: 0x0f3a1c, roughness: 0.6 }),
};
const GREEN_FIXED = 12, YELLOW = 1.6, ALLRED = 1.0, MIN_GREEN = 4, MAX_GREEN = 18;
const lights = []; // lights[i][j]
const lampGeo = new THREE.SphereGeometry(0.34, 10, 8);
let lightCounter = 0;
for (let i = 0; i < 4; i++) {
  lights.push([]);
  for (let j = 0; j < 4; j++) {
    const cx = R[i], cz = R[j];
    const g = new THREE.Group();
    const L = {
      i, j, cx, cz, phase: Math.random() < 0.5 ? 'EW' : 'NS', stage: 'green', t: Math.random() * 8,
      demand: { EW: 0, NS: 0 }, lamps: { EW: [], NS: [] }, switches: 0, passed: 0, lastKey: '',
      num: ++lightCounter,
    };
    for (const [dx, dz, axis] of [[6, 6, 'EW'], [-6, -6, 'EW'], [6, -6, 'NS'], [-6, 6, 'NS']]) {
      const p = new THREE.Group(); p.position.set(cx + dx, SLAB, cz + dz);
      p.add(cyl(0.12, 0.14, 4.6, M.dark, 0, 0, 0, 8));
      p.add(box(0.62, 2.1, 0.62, M.dark, 0, 4.2, 0, false));
      const r = mesh(lampGeo, LAMP.r0, 0, 5.9, 0, false), y = mesh(lampGeo, LAMP.y0, 0, 5.25, 0, false), gg = mesh(lampGeo, LAMP.g0, 0, 4.6, 0, false);
      p.add(r, y, gg); g.add(p);
      L.lamps[axis].push([r, y, gg]);
    }
    scene.add(g);
    L.ent = register(g, {
      id: 'light', kind: 'light', ...INFO.light, listed: false, labelY: 7, L,
      name: `Умный светофор №${L.num}`,
    });
    lights[i].push(L);
  }
}
const allLights = lights.flat();
function paintLight(L) {
  const key = L.phase + L.stage;
  if (key === L.lastKey) return; L.lastKey = key;
  for (const axis of ['EW', 'NS']) {
    const on = L.phase === axis ? L.stage : 'red';
    for (const [r, y, g] of L.lamps[axis]) {
      r.material = on === 'red' || on === 'allred' ? LAMP.r1 : LAMP.r0;
      y.material = on === 'yellow' ? LAMP.y1 : LAMP.y0;
      g.material = on === 'green' ? LAMP.g1 : LAMP.g0;
    }
  }
}
function updateLights(dt) {
  for (const L of allLights) {
    L.t += dt;
    const other = L.phase === 'EW' ? 'NS' : 'EW';
    if (L.stage === 'yellow') { if (L.t >= YELLOW) { L.stage = 'allred'; L.t = 0; } }
    else if (L.stage === 'allred') { if (L.t >= ALLRED) { L.phase = other; L.stage = 'green'; L.t = 0; L.switches++; } }
    else if (S.aiTraffic) {
      const cur = L.demand[L.phase], oth = L.demand[other];
      if (L.t >= MIN_GREEN && ((oth > 0 && cur === 0) || oth > cur * 1.7 + 1 || (L.t >= MAX_GREEN && oth > 0))) { L.stage = 'yellow'; L.t = 0; S.decisions++; }
    } else if (L.t >= GREEN_FIXED) { L.stage = 'yellow'; L.t = 0; }
    paintLight(L);
  }
}

/* =========================================================
   Беспилотный транспорт
   ========================================================= */
const lanes = [];
for (let k = 0; k < 4; k++) {
  lanes.push({ axis: 'x', road: k, dir: 1, c: R[k] + 2.5 }, { axis: 'x', road: k, dir: -1, c: R[k] - 2.5 });
  lanes.push({ axis: 'z', road: k, dir: 1, c: R[k] - 2.5 }, { axis: 'z', road: k, dir: -1, c: R[k] + 2.5 });
}
lanes.forEach((l) => (l.cars = []));
const cars = [];
let carCounter = 0;
function spawnCar() {
  const horiz = Math.random() < 0.66;
  const pool = lanes.filter((l) => (l.axis === 'x') === horiz);
  for (let tries = 0; tries < 30; tries++) {
    const lane = pick(pool);
    const p = rand(-EDGE + 5, EDGE - 5);
    const type = Math.random() < 0.12 ? 'shuttle' : 'car';
    const len = type === 'shuttle' ? 7 : 4;
    if (lane.cars.some((o) => Math.abs(o.p - p) < (o.len + len) / 2 + 4)) continue;
    if (R.some((c) => Math.abs(c - p) < 9)) continue;
    const meshG = makeCarMesh(pick(carMats), type);
    scene.add(meshG);
    const car = {
      lane, p, v: 0, len, type, mesh: meshG, waitAcc: 0, waitTotal: 0, nextIdx: -2, hidden: false, dist: 0,
      vmax: type === 'shuttle' ? rand(7.5, 9) : rand(9.5, 13), battery: rand(35, 98), pax: type === 'shuttle' ? (rand(3, 18) | 0) : (rand(0, 4) | 0),
      num: ++carCounter,
    };
    car.ent = register(meshG, {
      id: type, kind: 'vehicle', ...INFO[type], listed: false, moving: true, car,
      name: (type === 'shuttle' ? 'Робо-шаттл S-' : 'Робомобиль AV-') + String(car.num).padStart(3, '0'),
    });
    lane.cars.push(car); cars.push(car);
    placeCar(car);
    return car;
  }
  return null;
}
function removeCar() {
  const car = cars.find((c) => selected !== c.ent) || null;
  if (!car) return;
  cars.splice(cars.indexOf(car), 1);
  car.lane.cars.splice(car.lane.cars.indexOf(car), 1);
  scene.remove(car.mesh);
  const pi = pickRoots.indexOf(car.mesh); if (pi >= 0) pickRoots.splice(pi, 1);
  const ei = entities.indexOf(car.ent); if (ei >= 0) entities.splice(ei, 1);
}
function placeCar(car) {
  const { lane, p } = car;
  if (lane.axis === 'x') { car.mesh.position.set(p, 0, lane.c); car.mesh.rotation.y = lane.dir > 0 ? 0 : PI; }
  else { car.mesh.position.set(lane.c, 0, p); car.mesh.rotation.y = lane.dir > 0 ? -PI / 2 : PI / 2; }
  car.mesh.visible = !car.hidden;
}
function nextIntersection(car) {
  const d = car.lane.dir, pass = 7.5 + car.len / 2 - 0.6;
  if (d > 0) { for (let i = 0; i < 4; i++) if (R[i] - car.p > pass) return i; }
  else { for (let i = 3; i >= 0; i--) if (car.p - R[i] > pass) return i; }
  return -1;
}
function recordWait(car) {
  const arr = S.waits[S.aiTraffic ? 'ai' : 'fixed'];
  arr.push(car.waitAcc); if (arr.length > 260) arr.shift();
  car.waitAcc = 0;
}
function updateCars(dt, visual = true) {
  for (const L of allLights) { L.demand.EW = 0; L.demand.NS = 0; }
  for (const car of cars) {
    const ln = car.lane, d = ln.dir;
    if (car.hidden) {
      const spawn = -(EDGE + 4) * d;
      if (!ln.cars.some((o) => o !== car && !o.hidden && (o.p - spawn) * d < (o.len + car.len) / 2 + 5)) { car.hidden = false; car.p = spawn; car.v = car.vmax * 0.7; car.nextIdx = -2; }
      else continue;
    }
    let limit = Infinity;
    const ni = nextIntersection(car);
    if (ni !== car.nextIdx) {
      if (car.nextIdx >= 0) {
        recordWait(car);
        const Lp = ln.axis === 'x' ? lights[car.nextIdx][ln.road] : lights[ln.road][car.nextIdx];
        Lp.passed++;
      }
      car.nextIdx = ni;
    }
    if (ni >= 0) {
      const L = ln.axis === 'x' ? lights[ni][ln.road] : lights[ln.road][ni];
      const key = ln.axis === 'x' ? 'EW' : 'NS';
      const gap = (R[ni] - car.p) * d - 7.5 - car.len / 2;
      if (gap < 45) L.demand[key] += car.v < 0.5 ? 2 : 1;
      if (!(L.phase === key && L.stage === 'green')) {
        const yellow = L.phase === key && L.stage === 'yellow';
        const canStop = gap > (car.v * car.v) / (2 * 14) - 0.5;
        if (!yellow || canStop) limit = Math.min(limit, gap);
      }
    }
    for (const o of ln.cars) {
      if (o === car || o.hidden) continue;
      const dd = (o.p - car.p) * d;
      if (dd > 0 && dd < 60) limit = Math.min(limit, dd - (o.len + car.len) / 2 - 2.2);
    }
    const vT = Math.min(car.vmax, Math.sqrt(2 * 10 * Math.max(0, limit - 0.3)));
    car.v = vT > car.v ? Math.min(vT, car.v + 5 * dt) : Math.max(vT, car.v - 25 * dt);
    car.v = Math.max(0, Math.min(car.v, (limit - 0.05) / dt));
    car.p += car.v * d * dt;
    car.dist += car.v * dt;
    if (car.v < 0.5) { car.waitAcc += dt; car.waitTotal += dt; }
    car.battery = Math.max(8, car.battery - car.v * dt * 0.0008);
    if (car.p * d > EDGE + 4) { car.hidden = true; if (car.battery < 20) car.battery = rand(80, 100); }
    if (visual) placeCar(car);
  }
}
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

/* =========================================================
   Дроны доставки
   ========================================================= */
const drones = [];
const droneTargets = () => pickRoots.filter((r) => r.userData.ent && (r.userData.ent.kind === 'office' || r.userData.ent.kind === 'residential' || ['hospital', 'mall', 'university', 'startup'].includes(r.userData.ent.id)));
const CARGO = ['Лекарства', 'Электроника', 'Документы', 'Еда из ресторана', 'Запчасти', 'Книги', 'Анализы для лаборатории', 'Подарок'];
function makeDrone() {
  const g = new THREE.Group();
  g.add(box(1.4, 0.35, 1.4, M.white, 0, 0, 0, false));
  const rotors = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const arm = box(1.3, 0.12, 0.15, M.dark, x * 0.5, 0.15, z * 0.5, false); arm.rotation.y = Math.atan2(z, x) * -1; g.add(arm);
    const r = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 14), new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.5 }), x * 0.95, 0.35, z * 0.95, false);
    g.add(r); rotors.push(r);
  }
  g.add(box(0.8, 0.7, 0.8, std(0xd6a96b), 0, -0.75, 0, false));
  g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), M.orangeLight, 0, -0.05, 0.75, false));
  g.scale.setScalar(1.3);
  return { g, rotors };
}
function newTrip(dr) {
  const targets = droneTargets();
  const tgt = pick(targets);
  const box3 = new THREE.Box3().setFromObject(tgt);
  dr.from = HUB_PAD.clone().add(new THREE.Vector3(pick([-12, 0, 12]), 0, 0));
  dr.to = new THREE.Vector3((box3.min.x + box3.max.x) / 2, box3.max.y + 2, (box3.min.z + box3.max.z) / 2);
  dr.dest = tgt.userData.ent.name;
  dr.cargo = pick(CARGO);
  dr.t = 0; dr.dir = 1; dr.wait = 0;
  dr.len = dr.from.distanceTo(dr.to);
}
for (let i = 0; i < 7; i++) {
  const { g, rotors } = makeDrone();
  scene.add(g);
  const dr = { g, rotors, battery: rand(55, 100), num: i + 1, speed: rand(14, 19) };
  newTrip(dr); dr.t = Math.random();
  dr.ent = register(g, { id: 'drone', kind: 'drone', ...INFO.drone, listed: false, moving: true, drone: dr, name: 'Дрон доставки D-' + (i + 1) });
  drones.push(dr);
}
function updateDrones(dt) {
  for (const dr of drones) {
    dr.rotors.forEach((r) => (r.rotation.y += dt * 40));
    if (dr.wait > 0) { dr.wait -= dt; continue; }
    dr.t += (dt * dr.speed) / dr.len;
    if (dr.t >= 1) {
      dr.t = 1;
      if (dr.dir === 1) { dr.dir = -1; dr.t = 0; dr.wait = 1.5; S.parcels++; [dr.from, dr.to] = [dr.to, dr.from]; dr.cargo = 'возврат на базу'; }
      else { newTrip(dr); dr.wait = 1; dr.battery = Math.min(100, dr.battery + 12); }
    }
    const t = dr.t, e = t * t * (3 - 2 * t);
    const p = new THREE.Vector3().lerpVectors(dr.from, dr.to, e);
    p.y += Math.sin(PI * t) * (22 + dr.len * 0.08);
    const prev = dr.g.position.clone();
    dr.g.position.copy(p);
    const dx = p.x - prev.x, dz = p.z - prev.z;
    if (dx * dx + dz * dz > 1e-6) dr.g.rotation.y = Math.atan2(-dz, dx);
    dr.battery = Math.max(15, dr.battery - dt * 0.15);
  }
}

/* =========================================================
   AI-сеть данных (линии от NeuroCore к объектам)
   ========================================================= */
const network = new THREE.Group();
scene.add(network);
const pulses = [];
(() => {
  const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35, depthWrite: false });
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
  const pulseGeo = new THREE.SphereGeometry(0.55, 10, 8);
  for (const ent of entities.filter((e) => e.kind === 'landmark' && e.id !== 'core')) {
    const b = new THREE.Box3().setFromObject(ent.obj);
    const end = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 1, (b.min.z + b.max.z) / 2);
    const mid = coreTop.clone().add(end).multiplyScalar(0.5); mid.y = Math.max(coreTop.y, end.y) + 22;
    const curve = new THREE.QuadraticBezierCurve3(coreTop.clone(), mid, end);
    network.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), lineMat));
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(pulseGeo, pulseMat); network.add(m);
      pulses.push({ m, curve, t: Math.random(), speed: rand(0.18, 0.32) * (k ? -1 : 1) });
    }
  }
})();
anims.push((dt) => {
  if (!network.visible) return;
  for (const p of pulses) { p.t = (p.t + dt * p.speed + 1) % 1; p.curve.getPoint(p.t, p.m.position); }
});

/* =========================================================
   Симуляция города: время, энергия, бизнес
   ========================================================= */
const skyDay = new THREE.Color(0x9fd3ff), skyNight = new THREE.Color(0x070b1e), skySet = new THREE.Color(0xf6a26b);
const tmpC = new THREE.Color();
function simStep(dt) {
  const dtH = S.playing ? (dt * S.rate) / 60 : 0;
  if (S.playing) {
    const before = S.hour;
    S.hour = (S.hour + dtH) % 24;
    if (S.hour < before) { S.revenue = 0; S.co2 = 0; S.parcels = 0; S.solarMWh = 0; S.savings = 0; S.evMWh = 0; S.loans = 0; S.fraud = 0; S.patients = 0; }
  }
  const h = S.hour;
  S.work = workCurve(h); S.retail = retailCurve(h);
  S.elev = sunElev(h);
  S.wind = clamp(S.wind + (Math.random() - 0.5) * dt * 1.5 + (9 - S.wind) * dt * 0.02, 3, 15);
  S.cloud = clamp(S.cloud + (Math.random() - 0.5) * dt * 0.06, 0, 0.6);
  S.solarMW = 72 * Math.max(0, S.elev) * (1 - S.cloud * 0.7);
  S.windMW = turbines.length * 3.2 * Math.min(1, (S.wind / 12) ** 3);
  S.demandMW = demandAt(h) * (1 + Math.sin(performance.now() / 3000) * 0.015);
  const net = S.solarMW + S.windMW - S.demandMW;
  S.netMW = net;
  const cap = 160;
  S.soc = clamp(S.soc + (net * dtH) / cap, 0.03, 1);
  S.gridMW = S.soc <= 0.031 && net < 0 ? -net : S.soc >= 0.999 && net > 0 ? -net : 0;
  S.solarMWh += S.solarMW * dtH;
  S.co2 += (S.solarMW + S.windMW) * dtH * 0.45 + (S.aiEnergy ? demandAt(h) / (0.9 - S.boost.energy) * (0.1 + S.boost.energy) * dtH * 0.45 : 0);
  S.savings += (S.aiEnergy ? (demandAt(h) / (0.9 - S.boost.energy)) * (0.1 + S.boost.energy) * 120 * dtH : 0);

  S.sectors = SECTORS.map((s) => ({ ...s, value: s.base * s.curve() * (1 + S.boost.revenue) * (S.aiTraffic ? 1.04 : 1) }));
  S.revenueRate = S.sectors.reduce((a, s) => a + s.value, 0);
  S.revenue += S.revenueRate * dtH;
  S.aiRate = 900 + 1400 * S.work + 600 * S.retail + cars.length * 6 + Math.random() * 60;
  S.loans += (40 + 220 * S.work) * dtH;
  S.fraud += (0.4 + 2.5 * S.work) * dtH;
  S.patients += (12 + 30 * S.work) * dtH;
  S.evMWh += (0.6 + 1.2 * S.work + 1.5 * gauss(h, 2, 2)) * dtH;
}

function updateEnvironment() {
  const elev = S.elev;
  const day = smooth(-0.12, 0.22, elev);
  S.night = 1 - day;
  const az = (PI * (S.hour - 6)) / 12;
  sun.position.set(Math.cos(az) * 260, Math.max(0.08, elev) * 300 + 20, -90 + Math.sin(az) * 40);
  sun.intensity = 2.4 * day + 0.25 * (1 - day);
  const setW = gauss(elev, 0.05, 0.12) * day;
  sun.color.setRGB(1, lerp(1, 0.72, setW), lerp(1, 0.5, setW));
  if (day < 0.5) sun.color.setHex(0x9fb4ff);
  hemi.intensity = 0.18 + 0.55 * day;
  ambient.intensity = 0.25 * (1 - day) + 0.1;
  scene.environmentIntensity = 0.15 + 0.85 * day;
  tmpC.copy(skyNight).lerp(skyDay, day).lerp(skySet, setW * 0.55);
  scene.background.copy(tmpC);
  scene.fog.color.copy(tmpC);
  stars.material.opacity = clamp((1 - day) * 1.2 - 0.1, 0, 1);
  const wi = 0.03 + 1.5 * S.night;
  for (const m of winMats) m.emissiveIntensity = wi;
  M.head.emissiveIntensity = 0.3 + 3 * S.night;
  M.tail.emissiveIntensity = 0.4 + 2 * S.night;
  renderer.toneMappingExposure = 1 + 0.15 * S.night;
}

/* =========================================================
   Статистика объектов и AI-инсайты
   ========================================================= */
function stopped() { return cars.filter((c) => !c.hidden && c.v < 0.5).length; }
function avgSpeed() { const a = cars.filter((c) => !c.hidden); return a.length ? avg(a.map((c) => c.v)) * 3.6 : 0; }
function peakForecast() {
  let best = 0, bh = 0;
  for (let k = 1; k <= 24; k++) { const hh = (S.hour + k) % 24; const v = demandAt(hh); if (v > best) { best = v; bh = hh; } }
  return { h: Math.floor(bh), mw: best };
}
function topSector() { return [...S.sectors].sort((a, b) => b.value - a.value)[0]; }
const roadName = (ln) => (ln.axis === 'x' ? ROADS_H[ln.road] : ROADS_V[ln.road]);
const dirName = (ln) => (ln.axis === 'x' ? (ln.dir > 0 ? 'на восток' : 'на запад') : (ln.dir > 0 ? 'на юг' : 'на север'));
const waitAI = () => avg(S.waits.ai), waitFixed = () => avg(S.waits.fixed);
function trafficGain() { const a = waitAI(), f = waitFixed(); return f > 0 ? ((f - a) / f) * 100 : 0; }
const st = (l, v, cls = '') => ({ l, v, cls });

const LOGIC = {
  core: {
    stats: () => [
      st('Решений ИИ / сек', fmt(S.aiRate)), st('IoT-датчиков онлайн', fmt(48210 + ((Math.random() * 40) | 0))),
      st('Точность прогнозов', '97,4 %', 'good'), st('Время реакции', (11 + Math.random() * 3).toFixed(1) + ' мс'),
      st('Беспилотных машин', fmt(cars.length)), st('Дронов в воздухе', fmt(drones.filter((d) => d.wait <= 0).length)),
    ],
    metric: ['Решений ИИ в секунду', () => S.aiRate, (v) => fmt(v)],
    insight: () => { const p = peakForecast(); return `Прогноз: пик потребления энергии около ${String(p.h).padStart(2, '0')}:00 — ${fmt(p.mw)} МВт. Хранилище заряжено на ${fmt(S.soc * 100)}%, светофорные циклы и тарифы на зарядку заранее перенастроены.`; },
    actions: [{ label: '📋 Сформировать AI-отчёт по городу', run: () => {
      const ts = topSector(); const g = trafficGain();
      return `Отчёт NeuroCore на ${hhmm(S.hour)}:\n• Выручка бизнеса сегодня: ${money(S.revenue)} (лидер — ${ts.name})\n• Энергия: ${fmt(S.solarMW + S.windMW)} МВт выработка / ${fmt(S.demandMW)} МВт спрос\n• Доля ВИЭ: ${fmt(Math.min(100, ((S.solarMW + S.windMW) / S.demandMW) * 100))}%\n• AI-светофоры сокращают ожидание на ${fmt(Math.max(0, g))}%\n• Экономия от ИИ в энергетике: ${money(S.savings)}\nРекомендация: увеличить долю солнечной генерации и расширить хранилище на 20%.`;
    } }],
  },
  traffic: {
    stats: () => [
      st('Режим светофоров', S.aiTraffic ? 'ИИ-адаптивный' : 'Фиксированный', S.aiTraffic ? 'good' : 'warn'),
      st('Машин на дорогах', fmt(cars.length)), st('Стоят сейчас', fmt(stopped()), stopped() > cars.length * 0.4 ? 'bad' : ''),
      st('Средняя скорость', fmt(avgSpeed()) + ' км/ч'),
      st('Ожидание (ИИ)', S.waits.ai.length ? waitAI().toFixed(1) + ' с' : '—', 'good'),
      st('Ожидание (фикс.)', S.waits.fixed.length ? waitFixed().toFixed(1) + ' с' : '—', 'warn'),
    ],
    metric: ['Средняя скорость, км/ч', avgSpeed, (v) => fmt(v)],
    insight: () => {
      const g = trafficGain();
      return g > 0
        ? `Адаптивные светофоры сокращают среднее ожидание на перекрёстке на ${fmt(g)}% по сравнению с фиксированным циклом (${waitAI().toFixed(1)} с против ${waitFixed().toFixed(1)} с). На горизонтальных проспектах трафик выше, поэтому ИИ даёт им более длинный зелёный.`
        : 'Сравните режимы: переключите светофоры в фиксированный режим и обратно — система измеряет реальное время ожидания машин.';
    },
    actions: [
      { label: '🔁 Переключить режим светофоров (ИИ / фикс.)', run: () => { setAiTraffic(!S.aiTraffic); return `Режим светофоров: ${S.aiTraffic ? 'ИИ-адаптивный' : 'фиксированный цикл 12 с'}. Следите за графиком ожидания внизу экрана.`; } },
      { label: '🚗 Смоделировать час пик (+20 машин)', run: () => { setCarCount(Math.min(110, cars.length + 20)); return `На дорогах теперь ${cars.length} машин. ИИ перераспределяет фазы светофоров под возросшую нагрузку.`; } },
    ],
  },
  datacenter: {
    stats: () => [
      st('Загрузка GPU', fmt(52 + 38 * S.work + Math.random() * 4) + ' %'), st('PUE (энергоэффективность)', '1,12', 'good'),
      st('Хранилище данных', '18,4 ПБ'), st('Моделей ИИ в работе', fmt(312 + ((S.work * 40) | 0))),
      st('Потребление', fmt(5.2 + 2.6 * S.work, 1) + ' МВт'), st('Температура залов', (21.6 + Math.random() * 0.8).toFixed(1) + ' °C'),
    ],
    metric: ['Загрузка GPU, %', () => 52 + 38 * S.work + Math.random() * 4, (v) => fmt(v)],
    insight: () => 'ИИ-охлаждение снизило энергопотребление дата-центра на 31%. Тепло серверов обогревает 1 200 квартир соседних кварталов. В рабочие часы 40% мощностей арендуют компании города.',
  },
  analytics: {
    stats: () => { const ts = topSector(); return [
      st('Выручка бизнеса сегодня', money(S.revenue), 'good'), st('Текущая выручка', money(S.revenueRate) + '/ч'),
      st('Прогноз на день', money(S.revenue + forecastRest())), st('Транзакций в минуту', fmt(1200 + 5200 * S.retail + 3000 * S.work)),
      st('Компаний-клиентов', '1 284'), st('Лидер по выручке', ts.name),
    ]; },
    metric: ['Выручка города, $/час', () => S.revenueRate, (v) => money(v)],
    insight: () => { const ts = topSector(); const share = (ts.value / S.revenueRate) * 100; return `Сектор «${ts.name}» сейчас приносит ${fmt(share)}% выручки города. Модель прогноза спроса рекомендует ${S.retail > 0.5 ? 'усилить персонализированную рекламу в SmartMall на вечерние часы' : 'перенести маркетинговые бюджеты на 18:00–21:00, когда растёт потребительский спрос'}.`; },
    actions: [{ label: '📈 AI-прогноз выручки на завтра', run: () => {
      const base = SECTORS.reduce((a, s) => a + s.base, 0) * 15.2;
      const lines = SECTORS.map((s) => `• ${s.name}: ${money(s.base * (11 + Math.random() * 6) * (1 + S.boost.revenue))}`).join('\n');
      return `Прогноз модели (градиентный бустинг, точность 94%):\nВыручка завтра ≈ ${money(base * (1 + S.boost.revenue) * rand(0.97, 1.06))}\n${lines}`;
    } }, { label: '⚙️ Запустить AI-оптимизацию цен и рекламы', run: (done) => optimizeRun(done, () => { const g = rand(2.5, 5); S.boost.revenue = Math.min(0.25, S.boost.revenue + g / 100); return `Динамическое ценообразование и таргетинг перенастроены.\nВыручка города выросла на +${g.toFixed(1)}% (суммарно +${fmt(S.boost.revenue * 100, 1)}%). Столбцы на крыше башни выросли.`; }) }],
  },
  bank: {
    stats: () => [
      st('Кредитных заявок сегодня', fmt(S.loans)), st('Одобрено автоматически', '78 %', 'good'),
      st('Среднее время решения', '2 мин 40 с'), st('Мошенничеств заблокировано', fmt(S.fraud), 'good'),
      st('Активы под управлением', '$2,4 млрд'), st('Транзакций в секунду', fmt(180 + 900 * S.work + 500 * S.retail)),
    ],
    metric: ['Транзакций в секунду', () => 180 + 900 * S.work + 500 * S.retail + Math.random() * 40, (v) => fmt(v)],
    insight: () => 'Антифрод-модель анализирует каждую транзакцию за 30 мс: сумму, геолокацию, устройство и поведение клиента. Ложные срабатывания снижены на 45% по сравнению с правилами вручную.',
    actions: [{ label: '💳 Кредитный скоринг клиента (демо)', run: () => creditScoring() }],
  },
  startup: {
    stats: () => [
      st('Стартапов в инкубаторе', '64'), st('Привлечено инвестиций', '$186 млн', 'good'),
      st('Рабочих мест создано', '2 940'), st('В коворкинге сейчас', fmt(80 + 620 * S.work)),
      st('AI-стартапов', '38'), st('«Единорогов»', '2'),
    ],
    metric: ['Людей в коворкинге', () => 80 + 620 * S.work + Math.random() * 20, (v) => fmt(v)],
    insight: () => 'Стартапы тестируют продукты на открытых данных NeuroCity (трафик, энергия, торговля). Самые быстрорастущие направления: Generative AI для маркетинга, FinTech и умная логистика.',
    actions: [{ label: '🧪 AI-оценка идеи стартапа', run: () => startupScore() }],
  },
  mall: {
    stats: () => [
      st('Посетителей сейчас', fmt(4800 * S.retail + 60)), st('Касс', '0 — оплата автоматически', 'good'),
      st('Средний чек', '$' + fmt(46 + 10 * S.retail)), st('Конверсия', fmt(31 + 6 * S.retail) + ' %'),
      st('Выручка, $/час', money(S.sectors[0]?.value || 0)), st('Точность рекомендаций', '91 %', 'good'),
    ],
    metric: ['Посетителей в ТЦ', () => 4800 * S.retail + 60 + Math.random() * 50, (v) => fmt(v)],
    insight: () => S.retail > 0.6 ? 'Пиковый поток покупателей. ИИ поднял цены на популярные товары на 3% и предложил скидки на залежавшиеся позиции — выручка растёт без потери конверсии.' : 'Поток покупателей низкий. Рекомендательная система рассылает персональные предложения, чтобы привлечь клиентов в вечерние часы.',
    actions: [{ label: '🛒 Персональная рекомендация покупателю', run: () => recommend() }],
  },
  hospital: {
    stats: () => [
      st('Пациентов сегодня', fmt(S.patients)), st('Точность AI-диагностики', '96,8 %', 'good'),
      st('Среднее ожидание', fmt(6 + 8 * S.work) + ' мин'), st('Телемедицина сейчас', fmt(40 + 160 * S.work) + ' сеансов'),
      st('Свободных коек', fmt(58 - ((S.work * 20) | 0))), st('Доставок лекарств дронами', fmt(S.parcels * 0.2 + 3)),
    ],
    metric: ['Сеансов телемедицины', () => 40 + 160 * S.work + Math.random() * 8, (v) => fmt(v)],
    insight: () => 'Нейросеть анализирует снимок КТ за 20 секунд и отмечает подозрительные участки для врача. Модель прогнозирует загрузку отделений на 3 дня вперёд и планирует смены персонала.',
  },
  university: {
    stats: () => [
      st('Студентов факультета', '3 450'), st('AI-проектов студентов', '128'),
      st('Компаний-партнёров', '46'), st('Трудоустройство выпускников', '94 %', 'good'),
      st('Студентов на кампусе', fmt(120 + 2200 * S.work)), st('Стартапов выпускников', '17'),
    ],
    metric: ['Студентов на кампусе', () => 120 + 2200 * S.work + Math.random() * 30, (v) => fmt(v)],
    insight: () => 'Студенты факультета AI in Business & Technology работают с реальными данными NeuroCity: прогноз спроса для SmartMall, оптимизация светофоров, кредитный скоринг для FinTech Bank.',
    actions: [{ label: '📚 Дисциплины факультета', run: () => 'Ключевые дисциплины:\n' + COURSES.map((c) => '• ' + c).join('\n') }],
  },
  logistics: {
    stats: () => [
      st('Посылок доставлено сегодня', fmt(S.parcels * 37 + 410 * S.hour / 24 * 10)), st('Дронов в воздухе', fmt(drones.filter((d) => d.wait <= 0).length)),
      st('Среднее время доставки', fmt(26 * (1 - S.boost.logistics)) + ' мин', 'good'), st('Складских роботов', '184'),
      st('Уровень автоматизации', '92 %', 'good'), st('Снижение затрат', fmt(30 + S.boost.logistics * 100) + ' %'),
    ],
    metric: ['Дронов в полёте', () => drones.filter((d) => d.wait <= 0).length, (v) => fmt(v)],
    insight: () => 'ИИ решает задачу маршрутизации (VRP) каждые 30 секунд: учитывает ветер, заряд дронов и приоритет грузов. Срочные лекарства для Smart Hospital доставляются вне очереди.',
    actions: [{ label: '⚙️ Оптимизировать маршруты доставки', run: (done) => optimizeRun(done, () => { const g = rand(3, 7); S.boost.logistics = Math.min(0.3, S.boost.logistics + g / 100); drones.forEach((d) => (d.speed *= 1 + g / 100)); return `Маршруты пересчитаны. Время доставки сокращено на ${g.toFixed(1)}%, дроны летают быстрее.`; }) }],
  },
  energy: {
    stats: () => [
      st('Выработка ВИЭ', fmt(S.solarMW + S.windMW, 1) + ' МВт'), st('Потребление города', fmt(S.demandMW, 1) + ' МВт'),
      st('Заряд хранилища', fmt(S.soc * 100) + ' %', S.soc < 0.2 ? 'bad' : 'good'), st('Режим', S.netMW > 0 ? 'Зарядка ⬆' : 'Отдача энергии ⬇', S.netMW > 0 ? 'good' : 'warn'),
      st('Доля ВИЭ', fmt(Math.min(100, ((S.solarMW + S.windMW) / S.demandMW) * 100)) + ' %'), st('AI-управление', S.aiEnergy ? 'Включено (−10% спрос)' : 'Выключено', S.aiEnergy ? 'good' : 'warn'),
    ],
    metric: ['Заряд хранилища, %', () => S.soc * 100, (v) => fmt(v)],
    insight: () => { const p = peakForecast(); return S.aiEnergy ? `ИИ заранее заряжает хранилище перед вечерним пиком (${String(p.h).padStart(2, '0')}:00) и сдвигает зарядку электромобилей на ночь. Экономия сегодня: ${money(S.savings)}.` : 'AI-управление выключено: спрос не сглаживается, пики потребления выше на 10%. Включите систему, чтобы снизить затраты.'; },
    actions: [{ label: '🔁 Вкл/выкл AI-управление энергосетью', run: () => { setAiEnergy(!S.aiEnergy); return S.aiEnergy ? 'AI-управление включено: спрос снижен на 10% за счёт Demand Response.' : 'AI-управление выключено: потребление выросло. Посмотрите на график энергосистемы.'; } },
      { label: '⚙️ AI-оптимизация энергопотребления', run: (done) => optimizeRun(done, () => { if (!S.aiEnergy) setAiEnergy(true); const g = rand(1, 2.5); S.boost.energy = Math.min(0.08, S.boost.energy + g / 100); return `Модель перенастроила климат в зданиях и уличное освещение.\nПотребление снижено ещё на ${g.toFixed(1)}% (суммарно −${fmt(10 + S.boost.energy * 100, 1)}%).`; }) }],
  },
  ev: {
    stats: () => [
      st('Зарядных мест', '12'), st('Занято сейчас', fmt(Math.round(3 + 7 * (S.work * 0.5 + gauss(S.hour, 2, 2.5))))),
      st('Выдано энергии сегодня', fmt(S.evMWh, 1) + ' МВт·ч'), st('Средняя зарядка', '18 мин'),
      st('Тариф сейчас', '$' + (S.netMW > 0 ? '0,09' : '0,21') + '/кВт·ч', S.netMW > 0 ? 'good' : 'warn'), st('Робомобилей в парке', fmt(cars.length)),
    ],
    metric: ['Выдано энергии, МВт·ч', () => S.evMWh, (v) => fmt(v, 1)],
    insight: () => S.netMW > 0 ? 'В сети избыток солнечной и ветровой энергии — тариф снижен, ИИ отправляет робомобили с низким зарядом на зарядку прямо сейчас.' : 'Дефицит энергии в сети — тариф повышен. ИИ откладывает зарядку машин с запасом хода больше 40%.',
  },
  tower5g: {
    stats: () => [
      st('Подключённых устройств', fmt(52000 + 9000 * S.work + ((Math.random() * 300) | 0))), st('Задержка', (3.2 + Math.random()).toFixed(1) + ' мс', 'good'),
      st('Трафик', fmt(18 + 30 * S.work + 12 * S.retail) + ' Гбит/с'), st('Покрытие', '99,7 %', 'good'),
      st('Машин на связи (V2X)', fmt(cars.length)), st('Дронов на связи', fmt(drones.length)),
    ],
    metric: ['Трафик, Гбит/с', () => 18 + 30 * S.work + 12 * S.retail + Math.random() * 2, (v) => fmt(v)],
    insight: () => 'Edge-вычисления на вышке обрабатывают видео с камер прямо на месте: в NeuroCore уходят только результаты распознавания, что экономит 80% сетевого трафика.',
  },
  recycling: {
    stats: () => [
      st('Переработано сегодня', fmt((340 * S.hour) / 24) + ' т'), st('Точность сортировки', '98,5 %', 'good'),
      st('Доля переработки', '76 %', 'good'), st('Роботов-сортировщиков', '42'),
      st('Доход от вторсырья', money((340 * S.hour) / 24 * 85)), st('Мусоровозов на маршруте', fmt(4 + 10 * S.work)),
    ],
    metric: ['Переработано, т', () => (340 * S.hour) / 24, (v) => fmt(v)],
    insight: () => 'Умные контейнеры сообщают о заполненности, поэтому мусоровозы едут только к полным — пробег сократился на 35%. Камеры распознают 40 видов пластика.',
  },
  solar: {
    stats: () => [
      st('Мощность сейчас', fmt(S.solarMW, 1) + ' МВт', S.solarMW > 5 ? 'good' : 'warn'), st('Панелей', fmt(solarEnt.panels * 12)),
      st('Выработано сегодня', fmt(S.solarMWh, 1) + ' МВт·ч'), st('КПД панелей', '22,8 %'),
      st('Облачность', fmt(S.cloud * 100) + ' %'), st('Высота солнца', fmt(Math.max(0, S.elev) * 90) + '°'),
    ],
    metric: ['Мощность, МВт', () => S.solarMW, (v) => fmt(v, 1)],
    insight: () => S.solarMW > 1 ? `Модель прогнозирует выработку ${fmt(S.solarMW * 0.9 + 5)}–${fmt(S.solarMW * 1.1 + 8)} МВт в ближайший час. Роботы-очистители запланированы на ночь, чтобы не терять выработку.` : 'Ночь — солнечная станция не работает. Город питается от ветра и энергохранилища. Сдвиньте время на день, чтобы увидеть выработку.',
  },
  wind: {
    stats: () => [
      st('Скорость ветра', S.wind.toFixed(1) + ' м/с'), st('Мощность парка', fmt(S.windMW, 1) + ' МВт', 'good'),
      ...turbines.slice(0, 3).map((t) => st(`${t.id}: состояние лопастей`, fmt(t.health) + ' %', t.health > 95 ? 'good' : 'warn')),
      st('Обороты ротора', fmt((S.wind / 12) * 18) + ' об/мин'),
    ],
    metric: ['Мощность, МВт', () => S.windMW, (v) => fmt(v, 1)],
    insight: () => { const w = [...turbines].sort((a, b) => a.health - b.health)[0]; return `Предиктивная модель по вибродатчикам: у турбины ${w.id} износ лопастей ${fmt(100 - w.health)}%. Обслуживание запланировано на безветренные часы, чтобы не терять выработку.`; },
  },
  park: {
    stats: () => [
      st('Индекс качества воздуха', fmt(22 + 18 * S.work + avgSpeed() * 0.1) + ' AQI', 'good'), st('Температура', (12 + 9 * Math.max(0, S.elev)).toFixed(1) + ' °C'),
      st('Влажность почвы', '64 %'), st('Посетителей', fmt(30 + 600 * gauss(S.hour, 17, 3.5))),
      st('Экономия воды', '40 %', 'good'), st('Освещение', S.night > 0.5 ? 'По датчикам движения' : 'Выключено'),
    ],
    metric: ['Качество воздуха, AQI', () => 22 + 18 * S.work + Math.random() * 2, (v) => fmt(v)],
    insight: () => 'Полив включается только если модель не прогнозирует дождь в ближайшие 12 часов. Данные датчиков воздуха открыты для жителей и стартапов.',
  },
};
const LOGIC_GENERIC = {
  office: {
    stats: (e) => [
      st('Этажей', fmt(e.floors)), st('Компаний', fmt(e.companies)),
      st('Сотрудников в здании', fmt(e.staff * (0.05 + 0.9 * S.work))), st('Профиль арендаторов', e.sector),
      st('Потребление', fmt((e.floors * 28 * (0.3 + 0.7 * S.work)) * (1 - e.boost)) + ' кВт'), st('Экономия от ИИ', fmt(e.saving + e.boost * 100) + ' %', 'good'),
    ],
    metric: ['Сотрудников в здании', (e) => e.staff * (0.05 + 0.9 * S.work), (v) => fmt(v)],
    insight: (e) => `Датчики присутствия показывают загрузку офисов ${fmt(100 * (0.05 + 0.9 * S.work))}%. ${S.work < 0.3 ? 'ИИ перевёл свободные этажи в энергосберегающий режим.' : 'ИИ заранее охлаждает переговорные, забронированные на ближайший час.'}`,
    actions: [{ label: '⚙️ AI-оптимизация здания', run: (done, e) => optimizeRun(done, () => { const g = rand(3, 7); e.boost = Math.min(0.25, e.boost + g / 100); return `Климат и освещение перенастроены.\nПотребление здания −${g.toFixed(1)}%, экономия ≈ ${money(e.floors * 28 * g * 9)} в месяц.`; }) }],
  },
  residential: {
    stats: (e) => [
      st('Этажей', fmt(e.floors)), st('Квартир', fmt(e.flats)),
      st('Жителей', fmt(e.flats * 2.4)), st('Дома сейчас', fmt(100 * (1 - 0.65 * S.work)) + ' %'),
      st('Потребление', fmt(e.flats * (0.4 + 0.9 * gauss(S.hour, 20, 2.5) + 0.3 * gauss(S.hour, 8, 1.5)) * (1 - e.boost)) + ' кВт'), st('Солнечные панели', e.solarRoof ? 'Есть' : 'Нет', e.solarRoof ? 'good' : ''),
    ],
    metric: ['Потребление, кВт', (e) => e.flats * (0.4 + 0.9 * gauss(S.hour, 20, 2.5) + 0.3 * gauss(S.hour, 8, 1.5)) * (1 - e.boost), (v) => fmt(v)],
    insight: (e) => `ИИ-термостаты экономят жителям ${fmt(e.saving + e.boost * 100)}% на отоплении: модель знает расписание семьи и прогноз погоды. ${S.night > 0.5 ? 'Ночью стиральные машины и зарядка авто работают по дешёвому тарифу.' : ''}`,
    actions: [{ label: '⚙️ AI-оптимизация энергопотребления', run: (done, e) => optimizeRun(done, () => { const g = rand(3, 8); e.boost = Math.min(0.3, e.boost + g / 100); return `Умные термостаты и бытовые приборы перенастроены.\nПотребление дома −${g.toFixed(1)}%, каждая семья экономит ≈ $${fmt(g * 1.6)} в месяц.`; }) }],
  },
  car: {
    stats: (e) => { const c = e.car; return [
      st('Скорость', fmt(c.v * 3.6) + ' км/ч'), st('Статус', c.hidden ? 'Въезжает в город' : c.v < 0.5 ? 'Ждёт на светофоре' : 'В пути', c.v < 0.5 ? 'warn' : 'good'),
      st('Улица', roadName(c.lane)), st('Направление', dirName(c.lane)),
      st('Заряд батареи', fmt(c.battery) + ' %', c.battery < 25 ? 'bad' : 'good'), st('Пассажиров', fmt(c.pax)),
      st('Пройдено', fmt(c.dist / 1000, 2) + ' км'), st('Простой на светофорах', fmt(c.waitTotal) + ' с'),
    ]; },
    metric: ['Скорость, км/ч', (e) => e.car.v * 3.6, (v) => fmt(v)],
    insight: (e) => { const c = e.car; return c.v < 0.5 ? 'Автопилот видит красный сигнал по V2X-связи заранее и плавно тормозит — это экономит энергию и снижает износ.' : `Автопилот держит безопасную дистанцию и подстраивает скорость под «зелёную волну». ${c.battery < 30 ? 'Заряд низкий — ИИ запланировал заезд на EV-станцию.' : ''}`; },
    actions: [{ label: '🎥 Следовать камерой / остановить', run: (done, e) => { follow = follow === e ? null : e; return follow ? 'Камера следует за машиной. Вращайте мышью вокруг неё.' : 'Слежение выключено.'; } }],
  },
  drone: {
    stats: (e) => { const d = e.drone; return [
      st('Груз', d.dir === 1 ? d.cargo : '—'), st('Пункт назначения', d.dir === 1 ? d.dest : 'Logistics Hub'),
      st('Высота', fmt(d.g.position.y) + ' м'), st('Скорость', fmt(d.wait > 0 ? 0 : d.speed * 3.6) + ' км/ч'),
      st('Заряд батареи', fmt(d.battery) + ' %', d.battery < 30 ? 'bad' : 'good'), st('Прогресс рейса', fmt(d.t * 100) + ' %'),
    ]; },
    metric: ['Высота, м', (e) => e.drone.g.position.y, (v) => fmt(v)],
    insight: (e) => `Маршрут построен с учётом ветра ${S.wind.toFixed(1)} м/с и воздушных коридоров над дорогами. Посадка на крышу — по визуальным маркерам с точностью 10 см.`,
    actions: [{ label: '🎥 Следовать камерой / остановить', run: (done, e) => { follow = follow === e ? null : e; return follow ? 'Камера следует за дроном.' : 'Слежение выключено.'; } }],
  },
  light: {
    stats: (e) => { const L = e.L; const ph = (a) => (L.phase === a ? ({ green: 'Зелёный', yellow: 'Жёлтый', allred: 'Красный' })[L.stage] : 'Красный');
      return [
        st('Режим', S.aiTraffic ? 'ИИ-адаптивный' : 'Фиксированный', S.aiTraffic ? 'good' : 'warn'), st('Перекрёсток', `${ROADS_H[L.j]} × ${ROADS_V[L.i]}`),
        st('Восток–Запад', ph('EW'), ph('EW') === 'Зелёный' ? 'good' : 'bad'), st('Север–Юг', ph('NS'), ph('NS') === 'Зелёный' ? 'good' : 'bad'),
        st('Очередь В–З', fmt(L.demand.EW)), st('Очередь С–Ю', fmt(L.demand.NS)),
        st('Таймер фазы', L.t.toFixed(1) + ' с'), st('Машин проехало', fmt(L.passed)),
      ]; },
    metric: ['Машин в очереди (оба направления)', (e) => e.L.demand.EW + e.L.demand.NS, (v) => fmt(v)],
    insight: (e) => { const L = e.L; const a = L.demand.EW, b = L.demand.NS;
      if (!S.aiTraffic) return `Фиксированный цикл: каждое направление получает ${GREEN_FIXED} с зелёного независимо от очереди. Включите AI-светофоры, чтобы сравнить.`;
      if (a === 0 && b === 0) return 'Перекрёсток пуст — ИИ держит текущую фазу и переключит её, как только камера увидит машину.';
      const main = a >= b ? 'Восток–Запад' : 'Север–Юг';
      return `Камера видит: В–З ${a}, С–Ю ${b} (остановившиеся машины считаются с весом 2). ИИ отдаёт приоритет направлению «${main}», минимальный зелёный ${MIN_GREEN} с, максимальный ${MAX_GREEN} с.`; },
    actions: [{ label: '🔁 Переключить фазу вручную', run: (done, e) => { const L = e.L; if (L.stage === 'green') { L.stage = 'yellow'; L.t = 0; } return 'Фаза переключается: жёлтый → красный → зелёный для другого направления.'; } }],
  },
};
LOGIC_GENERIC.shuttle = LOGIC_GENERIC.car;
function logicOf(e) { return LOGIC[e.id] && e.kind === 'landmark' ? LOGIC[e.id] : LOGIC_GENERIC[e.id]; }

function forecastRest() {
  let s = 0; const h0 = S.hour;
  for (let h = h0; h < 24; h += 0.25) { const w = workCurve(h), r = retailCurve(h); s += SECTORS.reduce((a, sec, i) => a + sec.base * [r, 0.25 + 0.75 * w, 0.2 + 0.8 * w, 0.45 + 0.55 * w, 0.6 + 0.4 * w][i], 0) * 0.25 * (1 + S.boost.revenue); }
  return s;
}
function creditScoring() {
  const name = pick(['ООО «Кофе-Бот»', 'ИП Алиев', 'ООО «ДронДоставка»', 'Стартап «EduAI»', 'ООО «ЭкоПак»', 'ИП Каримова']);
  const income = Math.round(rand(20, 180)) * 1000, debt = rand(0.05, 0.7), hist = Math.round(rand(0, 9)), late = Math.round(rand(0, 4));
  const score = Math.round(clamp(300 + income / 400 - debt * 380 + hist * 35 - late * 60 + rand(-25, 25), 300, 850));
  const ok = score >= 620;
  const amount = Math.round((income * (ok ? rand(3, 6) : 0)) / 1000) * 1000;
  return `Клиент: ${name}\n• Доход в месяц: $${fmt(income)}\n• Долговая нагрузка: ${fmt(debt * 100)}%\n• Кредитная история: ${hist} ${hist % 10 === 1 && hist !== 11 ? 'год' : hist % 10 >= 2 && hist % 10 <= 4 ? 'года' : 'лет'}, просрочек: ${late}\n\nAI-скоринг: ${score} / 850\nРешение: ${ok ? '✅ ОДОБРЕНО — лимит $' + fmt(amount) + ', ставка ' + (14 - (score - 620) / 40).toFixed(1) + '%' : '❌ ОТКАЗ — высокий риск невозврата'}\nВремя решения: ${(rand(1.2, 3.5)).toFixed(1)} с`;
}
function startupScore() {
  const ideas = ['AI-ассистент для малого бизнеса', 'Маркетплейс аренды дронов', 'Прогноз спроса для кафе', 'Чат-бот для туристов', 'Умные парковки', 'AI-репетитор по математике', 'Анализ отзывов клиентов'];
  const idea = pick(ideas); const m = Math.round(rand(55, 95)), t = Math.round(rand(50, 95)), c = Math.round(rand(35, 90));
  const total = Math.round(m * 0.4 + t * 0.35 + c * 0.25);
  return `Идея: «${idea}»\n• Размер рынка: ${m}/100\n• Технологическая реализуемость: ${t}/100\n• Конкуренция (меньше — лучше): ${100 - c}/100\n\nИтоговая оценка ИИ: ${total}/100 — ${total > 75 ? '🚀 рекомендовано к инвестициям' : total > 60 ? '🙂 нужна доработка бизнес-модели' : '⚠️ высокий риск'}`;
}
function recommend() {
  const people = [['Анна, 24 года', ['беспроводные наушники', 'кофе в зёрнах', 'абонемент в фитнес']], ['Тимур, 35 лет', ['детский конструктор', 'умная колонка', 'кроссовки для бега']], ['Мария, 52 года', ['кофемашина', 'книга по садоводству', 'фитнес-браслет']], ['Дамир, 19 лет', ['игровая мышь', 'энергетик со скидкой', 'худи']]];
  const [p, items] = pick(people);
  return `Покупатель: ${p}\nИстория: ${Math.round(rand(4, 30))} покупок, любимая категория — ${pick(['электроника', 'спорт', 'дом', 'книги'])}\n\nРекомендации ИИ:\n${items.map((i, k) => `${k + 1}. ${i} — вероятность покупки ${Math.round(rand(35, 85))}%`).join('\n')}\nПерсональная скидка: ${Math.round(rand(5, 15))}%`;
}
function optimizeRun(done, finish) {
  done({ progress: true, text: '🤖 Модель анализирует данные и подбирает параметры…' });
  setTimeout(() => done({ text: '✅ ' + finish() }), 1500);
  return null;
}

/* =========================================================
   Выбор объектов, панели, подписи
   ========================================================= */
let selected = null, follow = null, selBox = null, hovered = null;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const tooltip = $('tooltip');
const infoEl = $('info');
let metricHist = [];

function hitTest(clientX, clientY) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickRoots, true);
  for (const h of hits) {
    if (!h.object.visible) continue;
    let o = h.object;
    while (o && !o.userData.ent) o = o.parent;
    if (o) return o.userData.ent;
  }
  return null;
}

function select(ent, fly = true) {
  selected = ent;
  if (follow && follow !== ent) follow = null;
  if (selBox) { scene.remove(selBox); selBox.geometry.dispose(); selBox = null; }
  document.querySelectorAll('#objList li').forEach((li) => li.classList.toggle('active', li.dataset.uid === String(entities.indexOf(ent))));
  document.querySelectorAll('.label').forEach((l) => l.classList.remove('active'));
  if (!ent) { infoEl.classList.add('hidden'); document.body.classList.remove('info-open'); return; }
  if (ent.labelEl) ent.labelEl.classList.add('active');
  selBox = new THREE.BoxHelper(ent.obj, 0x22d3ee);
  selBox.material.depthTest = false; selBox.material.transparent = true; selBox.material.opacity = 0.9; selBox.renderOrder = 999;
  scene.add(selBox);
  const lg = logicOf(ent);
  $('iIcon').textContent = ent.icon;
  $('iCat').textContent = ent.category;
  $('iName').textContent = ent.name;
  $('iDesc').textContent = ent.desc;
  $('iTech').innerHTML = (ent.tech || []).map((t) => `<span>${t}</span>`).join('');
  $('iValue').textContent = ent.value || '';
  $('iMetricLbl').textContent = lg.metric[0];
  $('iResult').classList.add('hidden');
  const acts = $('iActions'); acts.innerHTML = '';
  (lg.actions || []).forEach((a) => {
    const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = a.label;
    b.onclick = () => {
      const res = $('iResult');
      const done = ({ text, progress }) => {
        res.classList.remove('hidden');
        if (progress) { res.innerHTML = `${text}<div class="bar"><i></i></div>`; requestAnimationFrame(() => requestAnimationFrame(() => { const i = res.querySelector('.bar i'); if (i) i.style.width = '100%'; })); acts.querySelectorAll('button').forEach((x) => (x.disabled = true)); }
        else { res.textContent = text; acts.querySelectorAll('button').forEach((x) => (x.disabled = false)); refreshInfo(); }
      };
      const out = a.run(done, ent);
      if (typeof out === 'string') done({ text: out });
    };
    acts.appendChild(b);
  });
  const g = lg.metric[1];
  const v0 = g(ent);
  metricHist = Array.from({ length: 30 }, (_, i) => v0 * (1 + (Math.random() - 0.5) * 0.06 * (1 - i / 30)));
  infoEl.classList.remove('hidden');
  document.body.classList.add('info-open');
  infoEl.scrollTop = 0;
  refreshInfo();
  if (fly) flyTo(ent);
  if (ent.moving) follow = ent;
}
function refreshInfo() {
  if (!selected) return;
  const lg = logicOf(selected);
  $('iStats').innerHTML = lg.stats(selected).map((s) => `<div class="stat"><small>${s.l}</small><b class="${s.cls}">${s.v}</b></div>`).join('');
  $('iInsight').textContent = lg.insight(selected);
  const v = lg.metric[1](selected);
  $('iMetricVal').textContent = lg.metric[2](v);
  drawSpark($('iChart'), metricHist);
}

/* Полёт камеры */
let flight = null;
function entCenter(ent, out = new THREE.Vector3()) {
  const b = new THREE.Box3().setFromObject(ent.obj);
  return b.getCenter(out);
}
function flyTo(ent) {
  const b = new THREE.Box3().setFromObject(ent.obj);
  const size = b.getSize(new THREE.Vector3());
  const c = b.getCenter(new THREE.Vector3());
  const dist = clamp(Math.max(size.x, size.y, size.z) * 1.9 + 14, 22, 230);
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.42) { dir.y = 0.42; dir.normalize(); }
  flight = { ent, t: 0, p0: camera.position.clone(), t0: controls.target.clone(), off: dir.multiplyScalar(dist), cy: c.y - b.min.y };
}
function flyHome(top = false) {
  selected = null; select(null); follow = null;
  flight = { ent: null, t: 0, p0: camera.position.clone(), t0: controls.target.clone(), target: new THREE.Vector3(0, 0, 0), pos: top ? new THREE.Vector3(0.1, 330, 1) : HOME_POS.clone() };
}
const followPrev = new THREE.Vector3();
function updateCamera(dt) {
  if (flight) {
    flight.t = Math.min(1, flight.t + dt / 1.3);
    const e = 1 - Math.pow(1 - flight.t, 3);
    let tgt, pos;
    if (flight.ent) { tgt = entCenter(flight.ent); pos = tgt.clone().add(flight.off); }
    else { tgt = flight.target; pos = flight.pos; }
    controls.target.lerpVectors(flight.t0, tgt, e);
    camera.position.lerpVectors(flight.p0, pos, e);
    if (flight.t >= 1) { if (flight.ent && flight.ent.moving) followPrev.copy(flight.ent.obj.position); flight = null; }
  } else if (follow) {
    const c = follow.obj.position;
    const d = c.clone().sub(followPrev);
    if (d.lengthSq() < 400) { camera.position.add(d); controls.target.add(d); }
    followPrev.copy(c);
  }
}

/* Подписи над ориентирами */
const labelsEl = $('labels');
const listed = entities.filter((e) => e.listed);
for (const e of listed) {
  const el = document.createElement('div'); el.className = 'label'; el.textContent = e.icon + ' ' + e.short;
  el.onclick = () => select(e);
  labelsEl.appendChild(el); e.labelEl = el;
  const b = new THREE.Box3().setFromObject(e.obj);
  e.labelPos = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 3, (b.min.z + b.max.z) / 2);
}
const v3 = new THREE.Vector3();
function updateLabels() {
  const show = $('tLabels').checked;
  labelsEl.style.display = show ? '' : 'none';
  if (!show) return;
  const w = window.innerWidth, h = window.innerHeight;
  for (const e of listed) {
    v3.copy(e.labelPos).project(camera);
    const dist = camera.position.distanceTo(e.labelPos);
    const vis = v3.z < 1 && v3.x > -1.1 && v3.x < 1.1 && v3.y > -1.1 && v3.y < 1.1 && dist < 460;
    if (!vis) { e.labelEl.style.display = 'none'; continue; }
    e.labelEl.style.display = '';
    e.labelEl.style.transform = `translate(${((v3.x + 1) / 2) * w}px, ${((1 - v3.y) / 2) * h}px) translate(-50%, -100%)`;
    e.labelEl.style.opacity = String(clamp(1.4 - dist / 400, 0.35, 1));
    e.labelEl.style.zIndex = String(1000 - Math.round(dist));
  }
}

/* Список объектов */
function buildList(filter = '') {
  const ul = $('objList'); ul.innerHTML = '';
  const f = filter.trim().toLowerCase();
  const items = [...listed];
  if (f) {
    const extra = entities.filter((e) => !e.listed && (e.kind === 'office' || e.kind === 'residential') && e.name.toLowerCase().includes(f)).slice(0, 12);
    items.push(...extra);
  }
  for (const e of items) {
    if (f && !(e.name + ' ' + e.category + ' ' + (e.short || '')).toLowerCase().includes(f)) continue;
    const li = document.createElement('li'); li.dataset.uid = String(entities.indexOf(e));
    li.innerHTML = `<span class="li-i">${e.icon}</span><div><div class="li-n">${e.name}</div><div class="li-c">${e.category}</div></div>`;
    li.onclick = () => { select(e); if (window.innerWidth < 900) document.body.classList.remove('menu-open'); };
    if (e === selected) li.classList.add('active');
    ul.appendChild(li);
  }
}
buildList();

/* =========================================================
   Графики (canvas 2D)
   ========================================================= */
function prepCanvas(cv) {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  return { g, w, h };
}
function drawSpark(cv, data) {
  const { g, w, h } = prepCanvas(cv);
  if (!data.length || !w) return;
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || Math.abs(mx) * 0.1 || 1;
  const X = (i) => (i / (data.length - 1)) * w, Y = (v) => h - 6 - ((v - mn) / rg) * (h - 14);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(34,211,238,.35)'); grd.addColorStop(1, 'rgba(34,211,238,0)');
  g.beginPath(); data.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = grd; g.fill();
  g.beginPath(); data.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)))); g.strokeStyle = '#22d3ee'; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.arc(X(data.length - 1), Y(data[data.length - 1]), 3.5, 0, 2 * PI); g.fillStyle = '#fff'; g.fill();
}
const energyHist = [];
function drawEnergy() {
  const cv = $('cEnergy'); if (!cv.clientWidth) return;
  const { g, w, h } = prepCanvas(cv);
  const pad = { l: 26, r: 6, t: 6, b: 14 };
  const max = Math.max(100, ...energyHist.map((e) => Math.max(e.s + e.w, e.d))) * 1.05;
  const X = (i) => pad.l + (i / Math.max(1, energyHist.length - 1)) * (w - pad.l - pad.r), Y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  g.font = '10px Inter, sans-serif'; g.fillStyle = '#93a4c3'; g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const v = (max / 4) * k; g.beginPath(); g.moveTo(pad.l, Y(v)); g.lineTo(w - pad.r, Y(v)); g.stroke(); g.fillText(Math.round(v), 2, Y(v) + 3); }
  if (energyHist.length < 2) return;
  g.fillText(energyHist[0].t, pad.l, h - 2); g.textAlign = 'right'; g.fillText(energyHist[energyHist.length - 1].t, w - pad.r, h - 2); g.textAlign = 'left';
  const area = (fn, col) => { g.beginPath(); energyHist.forEach((e, i) => (i ? g.lineTo(X(i), Y(fn(e))) : g.moveTo(X(i), Y(fn(e))))); g.lineTo(X(energyHist.length - 1), Y(0)); g.lineTo(X(0), Y(0)); g.closePath(); g.fillStyle = col; g.fill(); };
  const line = (fn, col, wd = 2) => { g.beginPath(); energyHist.forEach((e, i) => (i ? g.lineTo(X(i), Y(fn(e))) : g.moveTo(X(i), Y(fn(e))))); g.strokeStyle = col; g.lineWidth = wd; g.stroke(); };
  area((e) => e.s + e.w, 'rgba(34,211,238,.25)');
  area((e) => e.s, 'rgba(250,204,21,.35)');
  line((e) => e.s + e.w, '#22d3ee'); line((e) => e.s, '#facc15'); line((e) => e.d, '#f87171', 2.2);
}
function drawTraffic() {
  const cv = $('cTraffic'); if (!cv.clientWidth) return;
  const { g, w, h } = prepCanvas(cv);
  const a = waitAI(), f = waitFixed();
  const max = Math.max(a, f, 1) * 1.25;
  const bars = [['ИИ', a, '#4ade80', S.waits.ai.length], ['Фикс. цикл', f, '#facc15', S.waits.fixed.length]];
  const bw = Math.min(70, w / 4);
  g.font = '11px Inter, sans-serif'; g.textAlign = 'center';
  bars.forEach(([name, v, col, n], i) => {
    const x = w * (0.28 + i * 0.44), bh = (v / max) * (h - 38);
    const grd = g.createLinearGradient(0, h - 18 - bh, 0, h - 18); grd.addColorStop(0, col); grd.addColorStop(1, col + '55');
    g.fillStyle = grd; g.beginPath(); g.roundRect(x - bw / 2, h - 18 - bh, bw, bh, 6); g.fill();
    g.fillStyle = '#e6eefc'; g.font = 'bold 13px Inter, sans-serif'; g.fillText(n ? v.toFixed(1) + ' с' : '—', x, h - 24 - bh);
    g.fillStyle = '#93a4c3'; g.font = '10.5px Inter, sans-serif'; g.fillText(name + (S.aiTraffic === (i === 0) ? ' ●' : ''), x, h - 4);
  });
  const gain = trafficGain();
  if (gain > 0) { g.fillStyle = '#4ade80'; g.font = 'bold 12px Inter, sans-serif'; g.fillText('−' + fmt(gain) + '% ожидания с ИИ', w / 2, 13); }
  g.textAlign = 'left';
}
function drawRevenue() {
  const cv = $('cRevenue'); if (!cv.clientWidth) return;
  const { g, w, h } = prepCanvas(cv);
  const max = Math.max(...SECTORS.map((s) => s.base)) * 1.3;
  const rowH = (h - 4) / S.sectors.length;
  g.font = '10.5px Inter, sans-serif'; g.textBaseline = 'middle';
  S.sectors.forEach((s, i) => {
    const y = 2 + i * rowH, bw = ((w - 150) * s.value) / max;
    g.fillStyle = '#93a4c3'; g.textAlign = 'left'; g.fillText(s.name, 0, y + rowH / 2);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.roundRect(84, y + 4, w - 150, rowH - 8, 4); g.fill();
    g.fillStyle = s.color; g.beginPath(); g.roundRect(84, y + 4, Math.max(2, bw), rowH - 8, 4); g.fill();
    g.fillStyle = '#e6eefc'; g.textAlign = 'right'; g.fillText(money(s.value), w, y + rowH / 2);
  });
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}

/* =========================================================
   KPI и периодические обновления
   ========================================================= */
function dayPart(h) { return h < 5 ? 'Ночь' : h < 11 ? 'Утро' : h < 17 ? 'День' : h < 22 ? 'Вечер' : 'Ночь'; }
let lastHist = -1;
function tick1s() {
  $('k-time').textContent = hhmm(S.hour);
  $('k-daypart').textContent = dayPart(S.hour) + (S.playing ? '' : ' · пауза');
  $('k-energy').textContent = `${fmt(S.solarMW + S.windMW)} / ${fmt(S.demandMW)}`;
  $('k-battery').textContent = fmt(S.soc * 100) + ' %';
  const wa = S.aiTraffic ? waitAI() : waitFixed();
  $('k-wait').textContent = wa.toFixed(1) + ' с';
  $('k-wait-l').textContent = 'Ожидание · ' + (S.aiTraffic ? 'режим ИИ' : 'фикс. режим');
  $('k-ai').textContent = fmt(S.aiRate);
  $('k-rev').textContent = money(S.revenue);
  $('k-co2').textContent = fmt(S.co2, 1) + ' т';
  $('timeLbl').textContent = hhmm(S.hour);
  if (!timeDragging) $('timeSlider').value = S.hour;

  energyHist.push({ s: S.solarMW, w: S.windMW, d: S.demandMW, t: hhmm(S.hour) });
  if (energyHist.length > 90) energyHist.shift();
  drawEnergy(); drawTraffic(); drawRevenue();

  if (selected) {
    const lg = logicOf(selected);
    metricHist.push(lg.metric[1](selected)); if (metricHist.length > 40) metricHist.shift();
    refreshInfo();
  }
  if (trafficScreen) {
    const g = trafficGain();
    trafficScreen.draw([S.aiTraffic ? 'AI MODE ●' : 'FIXED MODE', `ожидание ${(S.aiTraffic ? waitAI() : waitFixed()).toFixed(1)} с · ${cars.length} авто` + (g > 0 ? ` · −${fmt(g)}%` : '')]);
  }
}
function seedEnergyHistory() {
  const h0 = S.hour;
  for (let k = 60; k > 0; k--) {
    const hh = (h0 - (k * S.rate) / 60 + 24) % 24;
    const el = sunElev(hh);
    energyHist.push({ s: 72 * Math.max(0, el) * (1 - S.cloud * 0.7), w: turbines.length * 3.2 * Math.min(1, ((S.wind + Math.sin(k) * 0.6) / 12) ** 3), d: demandAt(hh), t: hhmm(hh) });
  }
}

/* =========================================================
   UI: элементы управления
   ========================================================= */
let timeDragging = false;
function toast(msg, ms = 2600) {
  const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
function setAiTraffic(v) { S.aiTraffic = v; $('tAiTraffic').checked = v; toast(v ? '🚦 AI-светофоры включены: фазы подстраиваются под очередь' : '🚦 Фиксированный цикл светофоров: 12 с на направление'); }
function setAiEnergy(v) { S.aiEnergy = v; $('tAiEnergy').checked = v; toast(v ? '⚡ AI-управление энергосетью включено (−10% спрос)' : '⚡ AI-управление энергосетью выключено'); }
function setCarCount(n) {
  while (cars.length < n) if (!spawnCar()) break;
  while (cars.length > n) removeCar();
  $('carsSlider').value = cars.length; $('carsLbl').textContent = cars.length;
}
$('playBtn').onclick = () => { S.playing = !S.playing; $('playBtn').textContent = S.playing ? '⏸' : '▶'; tick1s(); };
$('timeSlider').addEventListener('input', (e) => { timeDragging = true; S.hour = parseFloat(e.target.value) % 24; $('timeLbl').textContent = hhmm(S.hour); });
$('timeSlider').addEventListener('change', () => { timeDragging = false; tick1s(); });
document.querySelectorAll('.seg').forEach((b) => (b.onclick = () => { S.hour = parseFloat(b.dataset.t); tick1s(); }));
$('speedSel').onchange = (e) => (S.rate = parseFloat(e.target.value));
$('tAiTraffic').onchange = (e) => setAiTraffic(e.target.checked);
$('tAiEnergy').onchange = (e) => setAiEnergy(e.target.checked);
$('tNetwork').onchange = (e) => (network.visible = e.target.checked);
$('tRotate').onchange = (e) => (controls.autoRotate = e.target.checked);
$('carsSlider').addEventListener('input', (e) => setCarCount(parseInt(e.target.value)));
$('search').addEventListener('input', (e) => buildList(e.target.value));
$('infoClose').onclick = () => select(null);
$('menuBtn').onclick = () => document.body.classList.toggle('menu-open');
$('dashToggle').onclick = () => { $('dash').classList.toggle('collapsed'); setTimeout(tick1s, 50); };
if (window.innerWidth < 900) $('dash').classList.add('collapsed');
if (PROJECT.author) $('author').textContent = '👤 Автор: ' + PROJECT.author;

function zoom(f) {
  flight = null;
  const off = camera.position.clone().sub(controls.target);
  const len = clamp(off.length() * f, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(off.setLength(len));
}
function rotate(a) {
  flight = null;
  const off = camera.position.clone().sub(controls.target);
  off.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
  camera.position.copy(controls.target).add(off);
}
$('zIn').onclick = () => zoom(0.75);
$('zOut').onclick = () => zoom(1.33);
$('rL').onclick = () => rotate(-PI / 8);
$('rR').onclick = () => rotate(PI / 8);
$('vReset').onclick = () => flyHome(false);
$('vTop').onclick = () => flyHome(true);
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
  if (e.key === '+' || e.key === '=') zoom(0.8);
  else if (e.key === '-' || e.key === '_') zoom(1.25);
  else if (e.key === 'q' || e.key === 'Q' || e.key === 'й') rotate(-PI / 12);
  else if (e.key === 'e' || e.key === 'E' || e.key === 'у') rotate(PI / 12);
  else if (e.key === 'r' || e.key === 'R' || e.key === 'к') flyHome(false);
  else if (e.key === 'Escape') select(null);
});

/* Мышь / касания */
let downPos = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
  downPos = null;
  if (moved > 6) return;
  const ent = hitTest(e.clientX, e.clientY);
  if (ent) select(ent); else select(null);
});
let hoverQueued = null;
renderer.domElement.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') hoverQueued = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerleave', () => { hoverQueued = null; tooltip.classList.add('hidden'); });
controls.addEventListener('start', () => { flight = null; });
function processHover() {
  if (!hoverQueued) return;
  const [x, y] = hoverQueued; hoverQueued = null;
  if (downPos) { tooltip.classList.add('hidden'); return; }
  const ent = hitTest(x, y);
  hovered = ent;
  renderer.domElement.style.cursor = ent ? 'pointer' : 'grab';
  if (ent) {
    tooltip.innerHTML = `${ent.icon} ${ent.name}<small>${ent.category}</small>`;
    tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px';
    tooltip.classList.remove('hidden');
  } else tooltip.classList.add('hidden');
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  tick1s();
});

/* =========================================================
   Старт: прогрев трафика (сравнение ИИ и фиксированного цикла)
   ========================================================= */
setCarCount(60);
(() => {
  const step = 0.1;
  S.aiTraffic = false;
  for (let k = 0; k < 900; k++) { updateCars(step, false); updateLights(step); }
  S.waits.fixed = S.waits.fixed.slice(-200);
  S.aiTraffic = true;
  for (let k = 0; k < 900; k++) { updateCars(step, false); updateLights(step); }
  cars.forEach(placeCar);
})();
simStep(0);
seedEnergyHistory();
updateEnvironment();

/* =========================================================
   Главный цикл
   ========================================================= */
const clock = new THREE.Clock();
let acc = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  simStep(dt);
  updateCars(dt);
  updateLights(dt);
  updateDrones(dt);
  for (const a of anims) a(dt, t);
  updateEnvironment();
  updateCamera(dt);
  controls.update();
  if (selBox) selBox.update();
  processHover();
  renderer.render(scene, camera);
  updateLabels();
  acc += dt;
  if (acc >= 1) { acc = 0; tick1s(); }
}
loop();
tick1s();
setTimeout(() => {
  $('loader').classList.add('done');
  toast('👋 Добро пожаловать в NeuroCity! Вращайте город мышью и кликайте по зданиям', 4500);
}, 400);

// для отладки из консоли
window.NeuroCity = { S, cars, entities, select, scene, camera };
