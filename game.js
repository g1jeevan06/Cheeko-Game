import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#game');
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#92c6df');
scene.fog = new THREE.FogExp2('#b7cdbb', 0.0036);
const camera = new THREE.PerspectiveCamera(59, 1, 0.1, 260);
camera.position.set(0, 3.0, -7.2);
const hemi = new THREE.HemisphereLight('#e9f8ff', '#536243', 1.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe5b0', 3.0);
sun.position.set(-18, 26, -8);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -18;
sun.shadow.bias = -0.00025;
scene.add(sun);

const material = (color, roughness = 0.86, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const bark = material('#65402a');
const barkLight = material('#98643b');
const leafColors = ['#356b43', '#4b8050', '#6b9655', '#879f5b', '#2c5c46'].map((c) => material(c));
const gold = material('#ffc644', 0.24, { metalness: 0.5, emissive: '#a0640c', emissiveIntensity: 0.23 });
const laneX = [-2.25, 0, 2.25];
const groundTexture = makeGroundTexture(false);
const pathTexture = makeGroundTexture(true);

function makeGroundTexture(path) {
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = 256; canvasTexture.height = 256;
  const ctx = canvasTexture.getContext('2d');
  ctx.fillStyle = path ? '#9f7148' : '#64844d';
  ctx.fillRect(0, 0, 256, 256);
  const palette = path ? ['#bc8b5b', '#805634', '#d4a46b', '#98663e', '#755438'] : ['#88a85c', '#72954f', '#476f45', '#a2ae65', '#547b45'];
  for (let i = 0; i < 4200; i++) {
    ctx.globalAlpha = path ? 0.12 + Math.random() * 0.18 : 0.1 + Math.random() * 0.18;
    ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
    const size = path ? 1 + Math.random() * 4 : 1 + Math.random() * 3;
    ctx.beginPath(); ctx.ellipse(Math.random() * 256, Math.random() * 256, size, size * (0.35 + Math.random()), Math.random(), 0, Math.PI * 2); ctx.fill();
  }
  if (path) {
    for (let i = 0; i < 65; i++) {
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#e0bb83';
      ctx.beginPath(); ctx.ellipse(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 14);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const grassMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 });
const pathMaterial = new THREE.MeshStandardMaterial({ map: pathTexture, roughness: 0.96 });
const grassBase = new THREE.Mesh(new THREE.PlaneGeometry(360, 760), grassMaterial);
grassBase.rotation.x = -Math.PI / 2;
grassBase.position.set(0, -0.18, 270);
grassBase.receiveShadow = true;
scene.add(grassBase);

function box(parent, w, h, d, mat, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const treeTrunkGeometry = new THREE.CylinderGeometry(0.18, 0.38, 3.8, 9);
const treeCrownGeometry = new THREE.IcosahedronGeometry(1, 2);
function makeTree(parent, x, z, scale = 1) {
  const tree = new THREE.Group(); tree.position.set(x, 0, z); tree.scale.setScalar(scale);
  tree.userData.windPhase = Math.random() * Math.PI * 2;
  parent.add(tree);
  const trunk = new THREE.Mesh(treeTrunkGeometry, bark);
  trunk.position.y = 1.85; trunk.castShadow = true; trunk.receiveShadow = true; tree.add(trunk);
  const crown = new THREE.Group(); crown.position.y = 3.05; tree.add(crown);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(treeCrownGeometry, leafColors[(Math.random() * leafColors.length) | 0]);
    const angle = i * 2.399;
    const ring = i === 0 ? 0 : 0.38 + Math.random() * 0.7;
    leaf.position.set(Math.cos(angle) * ring, (Math.random() - 0.35) * 0.8, Math.sin(angle) * ring * 0.72);
    const size = 0.66 + Math.random() * 0.5;
    leaf.scale.set(size * (0.95 + Math.random() * 0.25), size * (0.78 + Math.random() * 0.32), size);
    leaf.castShadow = true; leaf.receiveShadow = true; crown.add(leaf);
  }
  return tree;
}

function buildTrackChunk(index) {
  const chunk = new THREE.Group();
  chunk.userData.baseZ = index * 110;
  const road = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 110), pathMaterial);
  road.position.y = -0.025; road.receiveShadow = true; chunk.add(road);
  for (const side of [-1, 1]) {
    const edge = box(chunk, 0.17, 0.13, 110, material('#d1a573'), side * 4.13, 0.015, 0, false);
    edge.receiveShadow = true;
    for (let z = -51; z <= 51; z += 5.5) {
      box(chunk, 0.22, 0.94, 0.24, bark, side * 4.55, 0.46, z);
      for (const y of [0.35, 0.77]) box(chunk, 0.14, 0.12, 5.55, barkLight, side * 4.55, y, z + 2.55);
    }
    for (let i = 0; i < 8; i++) {
      const z = -47 + i * 13 + Math.random() * 5;
      if (Math.random() < 0.6) makeMushroom(chunk, side * (5.1 + Math.random() * 1.5), z, 0.45 + Math.random() * 0.55);
      if (Math.random() < 0.7) makeStone(chunk, side * (5 + Math.random() * 2.2), z + 4, 0.45 + Math.random() * 0.8);
    }
    for (const z of [-44, -23, -2, 19, 40]) {
      makeTree(chunk, side * (6.5 + Math.random() * 1.7), z + (Math.random() - 0.5) * 7, 0.9 + Math.random() * 0.7);
    }
  }
  return chunk;
}

function makeMushroom(parent, x, z, scale) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); parent.add(group);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.4, 8), material('#eee1c6'));
  stem.position.y = 0.2; stem.castShadow = true; group.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), material('#cf513f'));
  cap.scale.y = 0.48; cap.position.y = 0.43; cap.castShadow = true; group.add(cap);
  for (const [dx, dz] of [[-0.17, 0.23], [0.14, 0.27], [0, 0.39]]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 6), material('#fff1dc'));
    dot.position.set(dx, 0.53, dz); group.add(dot);
  }
}

function makeStone(parent, x, z, scale) {
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), material('#858f7b'));
  stone.position.set(x, 0.22 * scale, z); stone.scale.set(1.2 * scale, 0.7 * scale, scale);
  stone.rotation.y = Math.random() * 3; stone.castShadow = true; stone.receiveShadow = true; parent.add(stone);
}

const chunks = Array.from({ length: 5 }, (_, i) => {
  const chunk = buildTrackChunk(i); scene.add(chunk); return chunk;
});

// Use the supplied forest FBX as the repeating tree line, not as a static picture.
new FBXLoader().load('./assets/forest-props/forest-props.fbx', (forestModel) => {
  forestModel.traverse((node) => {
    if (node.isMesh && node.name.toLowerCase() === 'cube') { node.parent?.remove(node); return; }
    if (node.isMesh) {
      node.castShadow = true; node.receiveShadow = true;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => { if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace; });
    }
  });
  forestModel.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(forestModel);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const fit = 8.5 / Math.max(size.x, size.z);
  forestModel.scale.setScalar(fit);
  forestModel.position.set(-center.x * fit, -bounds.min.y * fit, -center.z * fit);
  for (const chunk of chunks) {
    for (const side of [-1, 1]) {
      for (const z of [-31, 0, 31]) {
        const grove = forestModel.clone(true);
        grove.position.x += side * 18;
        grove.position.z += z;
        grove.rotation.y = (Math.random() - 0.5) * 0.36;
        chunk.add(grove);
      }
    }
  }
}, undefined, (error) => console.warn('Forest prop FBX could not load.', error));

// Low-poly silhouette is only used until the supplied character model arrives.
const fox = new THREE.Group(); scene.add(fox);
const fallbackFox = new THREE.Group(); fox.add(fallbackFox);
const foxOrange = material('#df762d');
const foxCream = material('#f5e5c9');
const foxDark = material('#432d25');
function ellipsoid(parent, r, mat, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
ellipsoid(fallbackFox, 0.4, foxOrange, 0, 0.72, 0, 0.78, 0.8, 1.1);
ellipsoid(fallbackFox, 0.25, foxCream, 0, 0.72, 0.31, 0.8, 0.78, 0.5);
ellipsoid(fallbackFox, 0.32, foxOrange, 0, 1.28, 0.1, 1, 0.9, 0.88);
ellipsoid(fallbackFox, 0.18, foxCream, 0, 1.22, 0.38, 1.1, 0.6, 0.45);
for (const side of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), foxOrange);
  ear.position.set(side * 0.21, 1.59, 0.05); ear.rotation.z = -side * 0.16; ear.castShadow = true; fallbackFox.add(ear);
  const eye = ellipsoid(fallbackFox, 0.04, foxDark, side * 0.13, 1.31, 0.56, 0.8, 1, 0.5);
  eye.userData.leg = side;
}
ellipsoid(fallbackFox, 0.06, foxDark, 0, 1.22, 0.61, 1, 0.8, 0.7);
const fallbackTail = ellipsoid(fallbackFox, 0.26, foxOrange, 0, 0.45, -0.6, 0.78, 0.75, 1.8);
ellipsoid(fallbackFox, 0.16, foxCream, 0, 0.45, -1.03, 0.8, 0.8, 0.9);
const fallbackLegs = [];
for (const side of [-1, 1]) {
  const leg = box(fallbackFox, 0.14, 0.4, 0.17, foxDark, side * 0.2, 0.23, 0.04);
  fallbackLegs.push(leg);
}

let rigBones = {};
new FBXLoader().load('./assets/cheeko-fox/cheeko-fox.fbx', (foxModel) => {
  foxModel.traverse((node) => {
    if (node.isCamera || node.isLight || (node.isMesh && node.name.toLowerCase() === 'cube')) { node.parent?.remove(node); return; }
    if (node.isMesh) {
      node.castShadow = true; node.receiveShadow = true;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => { if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace; });
    }
    if (node.isBone) {
      const name = node.name.split(':').pop();
      rigBones[name] = { bone: node, rest: node.rotation.clone() };
    }
  });
  foxModel.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(foxModel);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const fit = 2.18 / Math.max(0.01, size.y);
  foxModel.scale.setScalar(fit);
  foxModel.position.set(-center.x * fit, -bounds.min.y * fit, -center.z * fit);
  fox.add(foxModel);
  fallbackFox.visible = false;
}, undefined, (error) => console.warn('Cheeko FOX FBX could not load; keeping the fallback fox.', error));

const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#f4f6eb', transparent: true, opacity: 0.78, roughness: 1 });
for (let i = 0; i < 9; i++) {
  const cloud = new THREE.Group(); cloud.position.set((Math.random() - 0.5) * 58, 16 + Math.random() * 9, 24 + i * 24);
  for (let j = 0; j < 4; j++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1.8 + Math.random() * 1.6, 12, 9), cloudMaterial);
    puff.position.set(j * 2.1, Math.random() * 0.8, 0); puff.scale.y = 0.56; cloud.add(puff);
  }
  scene.add(cloud);
}
const distantSun = new THREE.Mesh(new THREE.SphereGeometry(2.1, 20, 16), new THREE.MeshBasicMaterial({ color: '#fff0bd' }));
distantSun.position.set(-19, 22, 115); scene.add(distantSun);

function makeCoin() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.09, 10, 22), gold);
  ring.rotation.x = Math.PI / 2; ring.castShadow = true; group.add(ring);
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 18), gold);
  center.rotation.x = Math.PI / 2; group.add(center);
  scene.add(group);
  return group;
}

const coinRows = Array.from({ length: 31 }, (_, i) => {
  const lane = (i * 2 + Math.floor(i / 3)) % 3;
  const row = { lane, worldZ: 13 + i * 8.3, coins: [] };
  for (let n = 0; n < 3; n++) {
    const mesh = makeCoin(); row.coins.push(mesh);
  }
  return row;
});

const obstacleMaterial = material('#8b5735');
const obstacleLight = material('#bd8651');
const metal = material('#414a44', 0.45, { metalness: 0.5 });
const holeMaterial = new THREE.MeshBasicMaterial({ color: '#18221e' });

function obstacleSet() {
  const root = new THREE.Group(); scene.add(root);
  const variants = {};
  const crate = new THREE.Group();
  box(crate, 1.15, 1.25, 1.0, obstacleMaterial, 0, 0.63, 0);
  for (const y of [0.13, 1.13]) box(crate, 1.24, 0.1, 1.08, obstacleLight, 0, y, 0);
  for (const side of [-1, 1]) {
    box(crate, 0.12, 1.15, 1.1, obstacleLight, side * 0.38, 0.63, 0).rotation.z = side * 0.72;
    box(crate, 0.12, 1.15, 1.1, obstacleLight, side * 0.38, 0.63, 0).rotation.z = -side * 0.72;
  }
  variants.crate = crate;

  const log = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 2.25, 12), obstacleLight);
  trunk.rotation.z = Math.PI / 2; trunk.position.y = 0.52; trunk.castShadow = true; log.add(trunk);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(0.47, 12), material('#b98650'));
  cut.position.set(-1.13, 0.52, 0); cut.rotation.y = -Math.PI / 2; log.add(cut);
  const cut2 = cut.clone(); cut2.position.x = 1.13; cut2.rotation.y = Math.PI / 2; log.add(cut2);
  for (const x of [-0.72, 0, 0.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.035, 6, 14), obstacleMaterial);
    ring.rotation.y = Math.PI / 2; ring.position.set(x, 0.52, 0); log.add(ring);
  }
  variants.log = log;

  const gate = new THREE.Group();
  for (const x of [-3.55, 3.55]) box(gate, 0.32, 2.25, 0.36, bark, x, 1.12, 0);
  box(gate, 7.35, 0.46, 0.5, obstacleLight, 0, 2.05, 0);
  for (let x = -3; x <= 3; x += 1) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), leafColors[(x + 8) % leafColors.length]);
    leaf.position.set(x, 2.28 + Math.random() * 0.25, 0); leaf.scale.set(1.25, 0.85, 0.8); leaf.castShadow = true; gate.add(leaf);
  }
  variants.gate = gate;

  const gap = new THREE.Group();
  box(gap, 2.05, 0.1, 3.5, holeMaterial, 0, -0.12, 0, false);
  for (const x of [-1.13, 1.13]) box(gap, 0.1, 0.08, 3.7, obstacleLight, x, -0.01, 0, false);
  variants.gap = gap;
  for (const variant of Object.values(variants)) { variant.visible = false; root.add(variant); }
  return { root, variants };
}

// Pool the obstacle meshes and recycle them ahead as the trail streams by.
const liveObstacles = [];
for (let i = 0; i < 17; i++) {
  const item = obstacleSet();
  const kind = i % 7 === 6 ? 'gate' : ['crate', 'log', 'gap', 'crate', 'log', 'crate'][i % 6];
  const lane = i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 1;
  item.worldZ = 28 + i * 19; item.kind = kind; item.lane = lane; item.checked = false;
  item.variants[kind].visible = true;
  item.root.position.set(kind === 'gate' ? 0 : laneX[lane], 0, item.worldZ);
  liveObstacles.push(item);
}

let running = false, paused = false, distance = 0, coinsCollected = 0, playerLane = 1;
let jumpHeight = 0, jumpVelocity = 0, slideTimer = 0, speed = 11, score = 0, lastTime = 0;
let turnChecked = -1, turnFeedback = 0;
let displayName = 'Cheeko', soundEnabled = true, audioContext = null;
let bestDistance = readStore('cheekoBestDistance', 0);
let bankCoins = readStore('cheekoCoinBank', 0);
const screens = { menu: $('#menuScreen'), pause: $('#pauseScreen'), over: $('#overScreen'), how: $('#howScreen') };

function readStore(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}
function saveStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be disabled */ } }
function openScreen(name) { for (const [key, screen] of Object.entries(screens)) screen.hidden = key !== name; }
function setHUD() {
  $('#runnerNameHud').textContent = displayName.toUpperCase();
  $('#distance').textContent = Math.floor(distance).toLocaleString();
  $('#coins').textContent = coinsCollected.toLocaleString();
  $('#score').textContent = score.toLocaleString();
  $('#bestDistance').textContent = `${Math.floor(bestDistance).toLocaleString()} m`;
  $('#menuBest').textContent = `${Math.floor(bestDistance).toLocaleString()} m`;
  $('#bankCoins').textContent = bankCoins.toLocaleString();
}
setHUD();

function tone(frequency, duration = 0.08, wave = 'sine') {
  if (!soundEnabled) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch { /* audio isn't required for play */ }
}

function resetRun() {
  distance = 0; coinsCollected = 0; score = 0; playerLane = 1; jumpHeight = 0; jumpVelocity = 0; slideTimer = 0; speed = 11;
  turnChecked = -1; turnFeedback = 0; $('#turnCallout').classList.remove('show');
  fox.position.set(0, 0, 0); fox.scale.set(1, 1, 1); fox.rotation.set(0, 0, 0);
  liveObstacles.forEach((item, i) => {
    item.worldZ = 28 + i * 19; item.checked = false;
    const kind = i % 7 === 6 ? 'gate' : ['crate', 'log', 'gap', 'crate', 'log', 'crate'][i % 6];
    item.kind = kind; item.lane = i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 1;
    for (const [name, variant] of Object.entries(item.variants)) variant.visible = name === kind;
  });
    coinRows.forEach((row, i) => {
    row.lane = (i * 2 + Math.floor(i / 3)) % 3; row.worldZ = 13 + i * 8.3;
    row.coins.forEach((coin, n) => { coin.visible = true; coin.position.set(laneX[row.lane], 1.15 + (n === 1 ? 0.28 : 0), row.worldZ + (n - 1) * 1.05); });
  });
  setHUD();
}

function startRun() {
  const entered = $('#playerName').value.trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 16);
  displayName = entered || 'Runner';
  try { localStorage.setItem('cheekoPlayerName', displayName); } catch { /* optional */ }
  resetRun(); running = true; paused = false; openScreen('');
  $('#runnerNameHud').textContent = displayName.toUpperCase();
  $('#gameStatus')?.remove();
  tone(540, 0.12, 'triangle');
}

function endRun(reason = 'A little forest tumble.') {
  if (!running) return;
  running = false; paused = false;
  const points = Math.floor(distance * 10 + coinsCollected * 25);
  if (distance > bestDistance) bestDistance = Math.floor(distance);
  bankCoins += coinsCollected;
  saveStore('cheekoBestDistance', bestDistance); saveStore('cheekoCoinBank', bankCoins);
  $('#resultName').textContent = displayName.toUpperCase();
  $('#resultTitle').textContent = distance > 500 ? 'What a wild run!' : 'The trail caught up.';
  $('#resultCopy').textContent = reason;
  $('#finalDistance').textContent = `${Math.floor(distance).toLocaleString()} m`;
  $('#finalScore').textContent = points.toLocaleString();
  $('#finalCoins').textContent = coinsCollected.toLocaleString();
  setHUD(); openScreen('over'); tone(115, 0.32, 'sawtooth');
}

function pauseRun() {
  if (!running) return;
  paused = !paused;
  openScreen(paused ? 'pause' : '');
  $('#pauseBtn').textContent = paused ? '▶' : 'Ⅱ';
}

function changeLane(direction) {
  if (!running || paused) return;
  playerLane = THREE.MathUtils.clamp(playerLane + direction, 0, 2);
}
function jump() {
  if (!running || paused || jumpHeight > 0 || slideTimer > 0) return;
  jumpVelocity = 8.3; tone(370, 0.055, 'triangle');
}
function slide() { if (running && !paused && jumpHeight < 0.25) slideTimer = 0.78; }
function perform(action) { if (action === 'left') changeLane(-1); if (action === 'right') changeLane(1); if (action === 'jump') jump(); if (action === 'slide') slide(); }

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) event.preventDefault();
  if (event.repeat) return;
  if (!running && !screens.menu.hidden && key === 'enter') { startRun(); return; }
  if (key === 'arrowleft' || key === 'a') perform('left');
  else if (key === 'arrowright' || key === 'd') perform('right');
  else if (key === 'arrowup' || key === 'w' || key === ' ') perform('jump');
  else if (key === 'arrowdown' || key === 's') perform('slide');
  else if (key === 'p' || key === 'escape') pauseRun();
});
document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('pointerdown', (event) => {
  event.preventDefault(); perform(button.dataset.action);
}));
$('#startBtn').addEventListener('click', startRun);
$('#retryBtn').addEventListener('click', startRun);
$('#pauseBtn').addEventListener('click', pauseRun);
$('#resumeBtn').addEventListener('click', pauseRun);
$('#pauseHomeBtn').addEventListener('click', () => { running = false; paused = false; $('#pauseBtn').textContent = 'Ⅱ'; openScreen('menu'); setHUD(); });
$('#overHomeBtn').addEventListener('click', () => { openScreen('menu'); setHUD(); });
$('#howBtn').addEventListener('click', () => openScreen('how'));
$('#howBackBtn').addEventListener('click', () => openScreen('menu'));
$('#resetNameBtn').addEventListener('click', () => $('#playerName').focus());
$('#soundToggle').addEventListener('click', () => { soundEnabled = !soundEnabled; $('#soundToggle').textContent = soundEnabled ? '♫' : '♪̸'; $('#soundToggle').setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on'); if (soundEnabled) tone(620); });
$('#fullscreenBtn').addEventListener('click', async () => {
  try { if (!document.fullscreenElement) await stage.requestFullscreen(); else await document.exitFullscreen(); } catch { /* fullscreen is optional */ }
});
try { $('#playerName').value = localStorage.getItem('cheekoPlayerName') || 'Cheeko'; } catch { /* optional */ }

let touchStart = null;
canvas.addEventListener('pointerdown', (event) => { touchStart = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener('pointerup', (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 34) {
    if (Math.abs(dx) > Math.abs(dy)) perform(dx < 0 ? 'left' : 'right');
    else perform(dy < 0 ? 'jump' : 'slide');
  }
  touchStart = null;
});

function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();

function tick(timeMs) {
  requestAnimationFrame(tick);
  const time = timeMs * 0.001;
  const dt = Math.min(0.04, lastTime ? (timeMs - lastTime) * 0.001 : 0);
  lastTime = timeMs;

  if (running && !paused) {
    speed = Math.min(25, 11 + distance * 0.012);
    distance += speed * dt;
    jumpHeight += jumpVelocity * dt;
    jumpVelocity -= 20 * dt;
    if (jumpHeight <= 0) { jumpHeight = 0; jumpVelocity = 0; }
    slideTimer = Math.max(0, slideTimer - dt);
    const targetX = laneX[playerLane];
    fox.position.x += (targetX - fox.position.x) * Math.min(1, dt * 11);
    fox.position.y = jumpHeight + (slideTimer > 0 ? -0.18 : Math.abs(Math.sin(time * 12)) * 0.035);
    fox.scale.y = slideTimer > 0 ? 0.68 : 1;
    fox.rotation.z = (targetX - fox.position.x) * -0.11;

    for (const chunk of chunks) chunk.position.z = chunk.userData.baseZ - (distance % 550);
    for (const row of coinRows) {
      const z = row.worldZ - distance;
      if (z < -12) { row.worldZ += coinRows.length * 8.3; row.coins.forEach((coin, n) => { coin.visible = true; coin.position.set(laneX[row.lane], 1.15 + (n === 1 ? 0.28 : 0), row.worldZ + (n - 1) * 1.05); }); }
      row.coins.forEach((coin) => {
        coin.rotation.y += dt * 3.5;
        if (coin.visible && Math.abs(coin.position.z) < 0.78 && playerLane === row.lane && Math.abs(jumpHeight + 0.9 - coin.position.y) < 2.1) {
          coin.visible = false; coinsCollected++; tone(820 + Math.min(420, coinsCollected * 4), 0.07, 'sine');
        }
      });
      row.coins.forEach((coin) => { if (coin.visible) coin.position.z = row.worldZ + (coin === row.coins[0] ? -1.05 : coin === row.coins[2] ? 1.05 : 0) - distance; });
    }

    const turnIndex = Math.floor(distance / 160);
    const turnAt = 150 + turnIndex * 160;
    const turnLane = turnIndex % 2 === 0 ? 0 : 2;
    const turnSign = turnLane === 0 ? 'LEFT' : 'RIGHT';
    const turnCallout = $('#turnCallout');
    if (distance > turnAt - 25 && distance < turnAt + 2) {
      turnCallout.textContent = `${turnLane === 0 ? '↰' : '↱'} PATH TURNS ${turnSign}`;
      turnCallout.classList.add('show');
    } else turnCallout.classList.remove('show');
    if (distance >= turnAt && turnChecked !== turnIndex) {
      turnChecked = turnIndex;
      if (playerLane !== turnLane) { endRun(`Cheeko missed the ${turnSign.toLowerCase()} turn. Follow the arrow and move to that side before the bend.`); }
      else { turnFeedback = 0.75; tone(640, 0.1, 'triangle'); }
    }
    turnFeedback = Math.max(0, turnFeedback - dt);

    for (const obstacle of liveObstacles) {
      obstacle.root.position.z = obstacle.worldZ - distance;
      if (obstacle.root.position.z < -10) {
        obstacle.worldZ += liveObstacles.length * 19;
        obstacle.checked = false;
        obstacle.lane = (Math.random() * 3) | 0;
        obstacle.kind = Math.random() < 0.16 ? 'gate' : ['crate', 'log', 'gap'][Math.random() * 3 | 0];
        for (const [name, variant] of Object.entries(obstacle.variants)) variant.visible = name === obstacle.kind;
      }
      obstacle.root.position.x = obstacle.kind === 'gate' ? 0 : laneX[obstacle.lane];
      if (!obstacle.checked && obstacle.root.position.z < 0.72 && obstacle.root.position.z > -0.45) {
        obstacle.checked = true;
        const inLane = obstacle.kind === 'gate' || playerLane === obstacle.lane;
        const safe = obstacle.kind === 'gate' ? slideTimer > 0.08 : obstacle.kind === 'log' || obstacle.kind === 'gap' ? jumpHeight > 0.62 : false;
        if (inLane && !safe) { endRun(obstacle.kind === 'gate' ? 'A low branch caught Cheeko. Try sliding next time.' : obstacle.kind === 'gap' ? 'The trail broke away. Jump over the gap next time.' : obstacle.kind === 'log' ? 'A fallen log blocked the path. Jump a little earlier.' : 'A trail crate blocked the lane. Weave around it.'); break; }
      }
    }

    score = Math.floor(distance * 10 + coinsCollected * 25);
    if (Math.floor(distance) > bestDistance) bestDistance = Math.floor(distance);
    $('#bestDistance').textContent = `${bestDistance.toLocaleString()} m`;
    $('#menuBest').textContent = `${bestDistance.toLocaleString()} m`;
    $('#bankCoins').textContent = bankCoins.toLocaleString();
    $('#distance').textContent = Math.floor(distance).toLocaleString();
    $('#coins').textContent = coinsCollected.toLocaleString();
    $('#score').textContent = score.toLocaleString();
  }

  const sway = running && !paused ? 1 : 0.22;
  chunks.forEach((chunk) => { chunk.children.forEach((child) => { if (child.userData.sway) child.rotation.z = Math.sin(time * 1.4 + child.position.x) * 0.025 * sway; }); });
  fallbackTail.rotation.x = Math.sin(time * 8) * 0.18;
  const stride = running && !paused ? Math.sin(time * (13 + speed * 0.14)) : Math.sin(time * 1.5) * 0.08;
  fallbackLegs.forEach((leg, i) => { leg.rotation.x = stride * (i ? -0.4 : 0.4); });
  for (const [name, item] of Object.entries(rigBones)) {
    const { bone, rest } = item;
    let motion = 0;
    if (name === 'LeftUpLeg' || name === 'LeftLeg') motion = stride * (name === 'LeftLeg' ? 0.23 : 0.48);
    if (name === 'RightUpLeg' || name === 'RightLeg') motion = -stride * (name === 'RightLeg' ? 0.23 : 0.48);
    if (name === 'LeftArm' || name === 'LeftForeArm') motion = -stride * 0.35;
    if (name === 'RightArm' || name === 'RightForeArm') motion = stride * 0.35;
    if (name === 'Spine' || name === 'Spine1') motion = Math.abs(stride) * 0.035;
    bone.rotation.x = rest.x + motion;
  }
  camera.position.x += (fox.position.x * 0.23 - camera.position.x) * Math.min(1, dt * 2.5);
  camera.position.y = 3.0 + Math.sin(time * 2.2) * 0.035;
  camera.position.z = -7.2;
  camera.lookAt(fox.position.x * 0.14, 1.05 + jumpHeight * 0.08, 8.5);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
