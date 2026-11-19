import * as THREE from 'three';
import { gameNames, openMinigame } from './minigames.js';
import { createMapView } from './map-view.js';
import { buildExit, buildRoom, disposeGroup, green, plaque, roomPlan, station } from './rooms.js';
import { bossNames, createThreats } from './threats.js?v=map';

const $ = id => document.getElementById(id);
const saveKey = 'greenhouse-100-doors-v2';
const totalDoors = 100;
const maxSupplies = 6;
const protocols = ['rewilding', 'rebuild', 'air'];
const finePointer = matchMedia('(pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x172c30);
scene.fog = new THREE.FogExp2(0x172c30, .025);
const world = new THREE.Group();
scene.add(world);

const camera = new THREE.PerspectiveCamera(73, innerWidth / innerHeight, .07, 170);
camera.rotation.order = 'YXZ';
function createRenderer() {
  const canvas = document.createElement('canvas');
  try {
    const context = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
    if (!context) return null;
    const view = new THREE.WebGLRenderer({ canvas, context });
    view.setPixelRatio(Math.min(devicePixelRatio, finePointer.matches ? 1.55 : 1.3));
    view.setSize(innerWidth, innerHeight);
    view.outputColorSpace = THREE.SRGBColorSpace;
    view.toneMapping = THREE.ACESFilmicToneMapping;
    view.toneMappingExposure = 1.16;
    view.shadowMap.enabled = true;
    view.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.setAttribute('aria-label', 'First-person view of The Greenhouse');
    return view;
  } catch {
    return null;
  }
}

const renderer = createRenderer();
const mapView = renderer ? null : createMapView();
const gameCanvas = renderer?.domElement ?? mapView.canvas;
document.body.prepend(gameCanvas);
if (mapView) $('view-note').hidden = false;

const hemi = new THREE.HemisphereLight(0xcde2d5, 0x3d332b, 1.35);
const sun = new THREE.DirectionalLight(0xc8f0d5, 1.8);
sun.position.set(7, 15, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 18, bottom: -18, far: 55 });
sun.shadow.normalBias = .025;
scene.add(hemi, sun);

const player = {
  position: new THREE.Vector3(0, 1.68, 10.6),
  sprinting: false,
};
const clock = new THREE.Clock();
const heading = new THREE.Vector3();
const pressed = new Set();
const touchKeys = new Set();
const doorsCleared = new Set();
let state = 'menu';
let session = fresh();
let plan;
let geometry;
let threats;
let interactables = [];
let exit;
let yaw = 0;
let pitch = 0;
let stamina = 100;
let exhausted = false;
let time = 0;
let dangerCooldown = 0;
let toastUntil = 0;
let damageFlash = 0;
let touchLook;
let audio;
let previousHint = '';
let bankBlocked = false;
let isPreview = true;

function fresh() {
  return { door: 1, hp: 100, supplies: 2, choice: null, sideWins: 0, cleared: [] };
}

function validInt(value, fallback, max) {
  return Number.isInteger(value) && value >= 0 ? Math.min(max, value) : fallback;
}

function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(saveKey));
    if (!data || !Number.isInteger(data.door)) return null;
    return {
      door: THREE.MathUtils.clamp(data.door, 1, totalDoors),
      hp: Number.isFinite(data.hp) && data.hp > 0 ? Math.min(100, data.hp) : 100,
      supplies: validInt(data.supplies, 2, maxSupplies),
      choice: protocols.includes(data.choice) ? data.choice : null,
      sideWins: validInt(data.sideWins, 0, totalDoors),
      cleared: Array.isArray(data.cleared)
        ? data.cleared.filter(key => /^(repair|side|pickup|relay[12]|terminal[123])$/.test(key))
        : [],
    };
  } catch {
    return null;
  }
}

function recordCheckpoint() {
  try {
    localStorage.setItem(saveKey, JSON.stringify({ ...session, cleared: [...doorsCleared] }));
  } catch {
    // Private-mode storage can be disabled. The current run stays playable.
  }
}

function tone(alert = false) {
  if (!audio || audio.state !== 'running') return;
  const start = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = alert ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(alert ? 200 : 415, start);
  oscillator.frequency.exponentialRampToValueAtTime(alert ? 105 : 620, start + .19);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(.11, start + .025);
  gain.gain.exponentialRampToValueAtTime(.0001, start + .23);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + .24);
}

function enableAudio() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  audio ??= new Context();
  if (audio.state === 'suspended') audio.resume().catch(() => {});
}

function notify(message, alert = false, duration = 2.6) {
  const item = $('toast');
  item.textContent = message;
  item.dataset.alert = String(alert);
  item.hidden = false;
  toastUntil = performance.now() + duration * 1000;
  if (alert) tone(true);
}

function setButton(label, action, secondary = false) {
  const item = document.createElement('button');
  item.textContent = label;
  if (secondary) item.className = 'secondary';
  item.onclick = action;
  return item;
}

function showMenu(label, title, text, actions, controls = false) {
  $('menu-label').textContent = label;
  $('menu-title').textContent = title;
  $('menu-text').textContent = text;
  $('choices').replaceChildren(...actions);
  $('menu-controls').hidden = !controls;
  $('overlay').hidden = false;
}

function clearInput() {
  pressed.clear();
  touchKeys.clear();
  touchLook = undefined;
}

function unlockPointer() {
  if (document.pointerLockElement === gameCanvas) document.exitPointerLock?.();
}

function requestLook() {
  if (!renderer || !finePointer.matches || document.pointerLockElement === gameCanvas) return;
  try {
    gameCanvas.requestPointerLock?.()?.catch?.(() => {});
  } catch {
    // Movement and click-to-look remain available if pointer lock is restricted.
  }
}

function play() {
  enableAudio();
  state = 'playing';
  clearInput();
  $('overlay').hidden = true;
  $('hud').hidden = false;
  $('mobile').hidden = false;
  requestLook();
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  clearInput();
  unlockPointer();
  showMenu('Door ' + formatDoor(session.door), 'Paused', 'Your room repairs, side wins and supplies are saved as you play.', [
    setButton('Resume', play),
    setButton('Main menu', mainMenu, true),
  ]);
}

function mainMenu() {
  state = 'menu';
  unlockPointer();
  $('hud').hidden = true;
  $('mobile').hidden = true;
  const previous = loadSave();
  const actions = [setButton('New expedition', () => begin(fresh()), !!previous)];
  if (previous) actions.unshift(setButton('Continue · Door ' + formatDoor(previous.door), () => begin(previous)));
  showMenu('MarketM / SDG 11', 'The Greenhouse',
    'Find the repair station, restore the system, and get through the door. Follow the river from the abandoned city to the wetlands, and stay alert for what moves in the dark.',
    actions, true);
}

function begin(data) {
  session = data;
  if (session.door === totalDoors && !session.choice) return chooseProtocol();
  setupRoom(session.cleared);
  play();
  roomIntroduction();
}

function formatDoor(door) {
  return String(door).padStart(3, '0');
}

function relayProgress() {
  return Number(doorsCleared.has('relay1')) + Number(doorsCleared.has('relay2'));
}

function terminalProgress() {
  return [1, 2, 3].filter(i => doorsCleared.has('terminal' + i)).length;
}

function activeProtocol() {
  return session.door === 50 ? 'mayor' : session.choice;
}

function canExit() {
  return plan.boss ? terminalProgress() === 3 : doorsCleared.has('repair');
}

function updateHUD() {
  $('zone').textContent = (plan.citySide ? 'The City' : 'The Greenhouse') + ' / ' + plan.district;
  $('room-name').textContent = plan.name;
  $('room-number').textContent = 'Door ' + formatDoor(session.door) + ' / ' + totalDoors;
  $('health').textContent = Math.ceil(session.hp);
  $('health-fill').style.transform = 'scaleX(' + session.hp / 100 + ')';
  $('supplies').textContent = session.supplies;
  $('side-wins').textContent = session.sideWins;
  $('stamina-fill').style.transform = 'scaleX(' + stamina / 100 + ')';
  $('side-objective').textContent = doorsCleared.has('side')
    ? 'Optional side challenge cleared' : 'Optional · ' + gameNames[plan.side] + ' for a medkit';
  let objective = 'Find the amber repair station · ' + gameNames[plan.main];
  if (plan.boss) objective = bossNames[activeProtocol()] + ' · Purge terminals ' + terminalProgress() + '/3';
  else if (relayProgress() < plan.relayCount) objective = 'Bring relays online · ' + relayProgress() + '/' + plan.relayCount;
  if (canExit()) objective = session.door === totalDoors ? 'Core restored · reach the exit' : 'Exit unlocked · reach the far door';
  $('objective').textContent = objective;
}

function addStation(kind, x, z, title, key, action) {
  const object = station(world, x, z, kind, title);
  const entry = { kind, x, z, object, title, action, visible: true };
  if (key && doorsCleared.has(key)) completed(entry, kind === 'pickup');
  interactables.push(entry);
  return entry;
}

function completed(entry, hide = false) {
  entry.visible = false;
  entry.object.visible = !hide;
  entry.object.material = green;
}

function challenge(kind, title, key, entry, tier = plan.tier) {
  state = 'challenge';
  hideToast();
  clearInput();
  unlockPointer();
  openMinigame({
    kind,
    label: title,
    tier,
    seed: session.door * 1117 + [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0),
  }, won => {
    if (won) {
      doorsCleared.add(key);
      completed(entry);
      if (key === 'side') {
        session.sideWins++;
        const reward = session.supplies < maxSupplies;
        session.supplies = Math.min(maxSupplies, session.supplies + 1);
        notify(reward ? 'Side challenge complete · medkit acquired' : 'Side challenge complete · medkit pouch full');
      } else {
        notify(canExit() ? 'System restored · exit unlocked' : 'Terminal purged · ' + terminalProgress() + '/3');
      }
      if (canExit()) {
        exit.unlock();
        if (plan.boss) threats.stop();
      }
      tone();
      updateHUD();
      recordCheckpoint();
    }
    play();
  });
}

function setUpObjectives() {
  const door = session.door;
  const next = door === totalDoors ? 'Extraction' : 'Door ' + formatDoor(door + 1);
  exit = buildExit(world, next);
  interactables.push({
    x: 0, z: -12.8, visible: true,
    title: () => canExit() ? 'Open ' + next : 'Locked door · finish the room objective',
    action: () => {
      if (!canExit()) return notify('Exit sealed. Complete the room objective.');
      if (door === totalDoors) return endGame();
      session.door++;
      doorsCleared.clear();
      if (session.door === totalDoors) {
        recordCheckpoint();
        chooseProtocol();
        return;
      }
      setupRoom();
      roomIntroduction();
    },
  });

  const sideX = door % 2 ? 4.07 : -4.07;
  const side = addStation('side', sideX, -9.1, 'Side station', 'side',
    () => challenge(plan.side, 'Optional / medkit', 'side', side));
  side.title = 'Side game · ' + gameNames[plan.side];

  const pickupX = -Math.sign(sideX) * 3.9;
  if (door === 1 || door % 4 === 0 || plan.boss) {
    const item = addStation('pickup', pickupX, 6.3, 'Collect medkit', 'pickup', () => {
      if (session.supplies >= maxSupplies) return notify('Medkit pouch full');
      doorsCleared.add('pickup');
      completed(item, true);
      session.supplies++;
      tone();
      notify('Medkit collected');
      updateHUD();
      recordCheckpoint();
    });
  }

  if (plan.boss) {
    const games = session.door === 50 ? ['circuit', 'memory', 'timing']
      : session.choice === 'rewilding' ? ['cleanup', 'memory', 'valves']
      : session.choice === 'rebuild' ? ['circuit', 'valves', 'timing']
      : ['sorting', 'timing', 'memory'];
    const points = [[-3.35, 3.5], [3.45, -2.4], [-3.68, -7.7]];
    for (const [index, [x, z]] of points.entries()) {
      const key = 'terminal' + (index + 1);
      const pad = addStation('main', x, z, 'Terminal ' + (index + 1), key,
        () => challenge(games[index], bossNames[activeProtocol()] + ' / terminal ' + (index + 1), key, pad));
      pad.title = 'Purge Terminal ' + (index + 1) + ' · ' + gameNames[games[index]];
    }
    plaque(world, bossNames[activeProtocol()], 0, 4.65, -10.9, 3.9, '#ffb579');
  } else {
    const repair = addStation('main', -sideX * .82, -6.05, 'Repair station', 'repair', () => {
      if (relayProgress() < plan.relayCount) return notify('Power this station at the green relays first.');
      challenge(plan.main, plan.name + ' / required repair', 'repair', repair);
    });
    repair.title = 'Repair station · ' + gameNames[plan.main];

    const relayPositions = [[-sideX, 5.2], [sideX, -4.4]];
    for (let index = 0; index < plan.relayCount; index++) {
      const [x, z] = relayPositions[index];
      const key = 'relay' + (index + 1);
      const relay = addStation('relay', x, z, 'Relay ' + (index + 1), key, () => {
        doorsCleared.add(key);
        completed(relay);
        tone();
        notify(relayProgress() === plan.relayCount ? 'Repair station powered' : 'Relay ' + (index + 1) + ' online');
        recordCheckpoint();
        updateHUD();
      });
    }
  }
  if (canExit()) exit.unlock();
}

function setupRoom(cleared = [], preview = false) {
  isPreview = preview;
  disposeGroup(world);
  doorsCleared.clear();
  for (const key of cleared) doorsCleared.add(key);
  interactables = [];
  time = 0;
  dangerCooldown = 0;
  stamina = 100;
  exhausted = false;
  bankBlocked = false;
  damageFlash = 0;
  $('damage-flash').style.opacity = '0';
  previousHint = '';
  player.position.set(preview ? -2.5 : 0, preview ? 2.1 : 1.68, 10.6);
  player.sprinting = false;
  yaw = preview ? -.27 : 0;
  pitch = preview ? -.035 : 0;
  camera.position.copy(player.position);
  camera.rotation.set(pitch, yaw, 0);
  const door = preview ? 58 : session.door;
  plan = roomPlan(door);
  geometry = buildRoom(world, plan, door);
  const sky = plan.citySide
    ? geometry.river ? 0x526970 : 0x192731
    : geometry.river ? 0x3f6b60 : geometry.outdoors ? 0x304b3d : 0x192d25;
  scene.background.set(sky);
  scene.fog.color.set(sky);
  scene.fog.density = geometry.outdoors ? .036 : .025;
  hemi.color.set(plan.citySide ? 0xaac8d9 : 0xc5e6c0);
  sun.color.set(plan.citySide ? 0xffd3af : 0xd1f1c1);
  sun.intensity = geometry.outdoors ? 1.9 : .85;

  if (preview) {
    buildExit(world, 'The Greenhouse');
    station(world, 3.1, -5.6, 'main', 'Repair station');
    geometry.river?.update(0, false);
    return;
  }

  setUpObjectives();
  threats = createThreats(world, plan, activeProtocol(), geometry.river, {
    alert: message => notify(message, true),
    hit: damage,
    move,
  });
  if (plan.boss && canExit()) threats.stop();
  hideToast();
  updateHUD();
  recordCheckpoint();
}

function roomIntroduction() {
  if (plan.boss && !canExit()) return notify(bossNames[activeProtocol()] + ' · Restore all three terminals', true, 4);
  if (session.door === 1 && !canExit()) return notify('Find the amber repair station. Press E or Use near it.', false, 4);
  if (geometry.river) return notify('Follow the yellow rail lights to cross the river.', false, 3.6);
  if (session.door === 9) return notify('New objective · find the green relay to power the repair station.', false, 4.2);
}

function chooseProtocol() {
  state = 'protocol';
  clearInput();
  unlockPointer();
  $('hud').hidden = true;
  $('mobile').hidden = true;
  showMenu('Door 100 / Urban Core', 'Choose a protocol',
    'Rewilding challenges The Overgrowth. Rebuilding challenges The Engineer. Purification challenges The Smog.',
    [['rewilding', 'Rewilding'], ['rebuild', 'Rebuilding'], ['air', 'Purification']].map(([choice, label]) =>
      setButton(label, () => {
        session.choice = choice;
        setupRoom();
        play();
        roomIntroduction();
      })));
}

function endGame() {
  state = 'complete';
  clearInput();
  unlockPointer();
  $('hud').hidden = true;
  $('mobile').hidden = true;
  showMenu('Expedition complete / SDG 11', 'City restored',
    'You reached extraction and defeated ' + bossNames[activeProtocol()] + '. Side challenges completed: ' + session.sideWins + '.',
    [setButton('New expedition', () => begin(fresh())), setButton('Main menu', mainMenu, true)]);
  try { localStorage.removeItem(saveKey); } catch {}
}

function heal() {
  if (state !== 'playing') return;
  if (session.supplies === 0) return notify('No medkits available.');
  if (session.hp >= 100) return notify('Health is full.');
  session.hp = Math.min(100, session.hp + 30);
  session.supplies--;
  tone();
  notify('Medkit used');
  updateHUD();
  recordCheckpoint();
}

function damage(amount, source) {
  if (state !== 'playing' || dangerCooldown > 0) return;
  dangerCooldown = .95;
  damageFlash = .7;
  session.hp = Math.max(0, session.hp - amount);
  notify(source + ' hit you · −' + amount + ' health', true);
  updateHUD();
  recordCheckpoint();
  if (session.hp > 0) return;
  state = 'dead';
  clearInput();
  unlockPointer();
  showMenu('Checkpoint / Door ' + formatDoor(session.door), 'Expedition lost',
    'Retry this room with restored health. Completed station repairs and side challenges are saved.',
    [setButton('Retry this room', () => {
      session.hp = 100;
      session.supplies = Math.max(2, session.supplies);
      setupRoom([...doorsCleared]);
      play();
      roomIntroduction();
    }), setButton('Main menu', mainMenu, true)]);
}

function nearestStation() {
  let best;
  let range = 2.23;
  const { x, z } = player.position;
  for (const entry of interactables) {
    if (!entry.visible) continue;
    const gap = Math.hypot(entry.x - x, entry.z - z);
    if (gap >= range) continue;
    if (geometry.river && (z - geometry.river.center) * (entry.z - geometry.river.center) < 0) continue;
    range = gap;
    best = entry;
  }
  return best;
}

function interact() {
  if (state !== 'playing') return;
  const nearest = nearestStation();
  if (!nearest) return notify('Move closer to a station or door.', false, 1.25);
  nearest.action();
}

function passable(x, z, flying) {
  const river = geometry.river;
  if (!flying && river && Math.abs(z - river.center) < river.half + .04
      && Math.abs(x - river.bridgeX) > river.bridgeHalf - .22) {
    return false;
  }
  return flying || !geometry.colliders.some(object =>
    Math.abs(object.x - x) < object.halfX + .25 && Math.abs(object.z - z) < object.halfZ + .25);
}

function move(position, vector, amount, flying = false) {
  const x = THREE.MathUtils.clamp(position.x + vector.x * amount, -7.36, 7.36);
  const z = THREE.MathUtils.clamp(position.z + vector.z * amount, -13.35, 12.05);
  let blocked = false;
  if (passable(x, position.z, flying)) position.x = x;
  else blocked = true;
  if (passable(position.x, z, flying)) position.z = z;
  else blocked = true;
  return blocked;
}

function hideToast() {
  $('toast').hidden = true;
  toastUntil = 0;
}

function update(step) {
  const moving = pressed.has('KeyW') || pressed.has('ArrowUp') || touchKeys.has('forward');
  const backing = pressed.has('KeyS') || pressed.has('ArrowDown') || touchKeys.has('back');
  const left = pressed.has('KeyA') || pressed.has('ArrowLeft') || touchKeys.has('left');
  const right = pressed.has('KeyD') || pressed.has('ArrowRight') || touchKeys.has('right');
  heading.set(Number(right) - Number(left), 0, Number(backing) - Number(moving));
  const walking = heading.lengthSq() > 0;
  if (exhausted && stamina >= 30) exhausted = false;
  player.sprinting = walking && !exhausted && (pressed.has('ShiftLeft') || pressed.has('ShiftRight'));
  const nextStamina = THREE.MathUtils.clamp(stamina + (player.sprinting ? -25 : walking ? 13 : 22) * step, 0, 100);
  if (nextStamina !== stamina) $('stamina-fill').style.transform = 'scaleX(' + nextStamina / 100 + ')';
  stamina = nextStamina;
  if (stamina === 0) exhausted = true;
  if (walking) {
    const moveX = heading.x * Math.cos(yaw) + heading.z * Math.sin(yaw);
    const moveZ = heading.z * Math.cos(yaw) - heading.x * Math.sin(yaw);
    heading.set(moveX, 0, moveZ).normalize();
    const blocked = move(player.position, heading, (player.sprinting ? 6.55 : 4.45) * step);
    bankBlocked = !!geometry.river && blocked && Math.abs(player.position.z - geometry.river.center) < geometry.river.half + .27;
  }

  player.position.y = 1.68 + (walking && !reducedMotion.matches ? Math.sin(time * 13) * .022 : 0);
  camera.position.copy(player.position);
  camera.rotation.set(pitch, yaw, 0);
  const nearest = nearestStation();
  const prefix = finePointer.matches ? '[E] ' : 'Use · ';
  const title = nearest && (typeof nearest.title === 'function' ? nearest.title() : nearest.title);
  const hint = title ? prefix + title : bankBlocked ? 'Cross via the bridge with yellow rails'
    : canExit() ? 'Follow the room to the far door' : 'Amber · repair  /  blue · optional  /  green · relay or supply';
  if (hint !== previousHint) {
    $('hint').textContent = hint;
    previousHint = hint;
  }

  dangerCooldown = Math.max(0, dangerCooldown - step);
  if (damageFlash > 0) {
    damageFlash = Math.max(0, damageFlash - step * 2.4);
    $('damage-flash').style.opacity = String(damageFlash);
  }
  threats.update(step, player);
}

const movementKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight']);
addEventListener('keydown', event => {
  if (state !== 'playing') return;
  if (movementKeys.has(event.code)) {
    event.preventDefault();
    pressed.add(event.code);
  }
  if (event.repeat) return;
  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyF') heal();
  if (event.code === 'Escape') pause();
});
addEventListener('keyup', event => pressed.delete(event.code));
addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('pointerlockchange', () => {
  if (state === 'playing' && !document.pointerLockElement) pause();
});
gameCanvas.addEventListener('click', () => { if (state === 'playing') requestLook(); });

function look(dx, dy) {
  yaw -= dx;
  pitch = THREE.MathUtils.clamp(pitch - dy, -1.35, 1.35);
}

document.addEventListener('mousemove', event => {
  if (renderer && state === 'playing' && (document.pointerLockElement === gameCanvas || event.buttons === 1 && event.target === gameCanvas)) {
    look(event.movementX * .0024, event.movementY * .0024);
  }
});

for (const id of ['forward', 'left', 'back', 'right']) {
  const item = $(id);
  item.onpointerdown = event => {
    event.preventDefault();
    if (state !== 'playing') return;
    touchKeys.add(id);
    item.setPointerCapture(event.pointerId);
  };
  item.onlostpointercapture = item.onpointerup = item.onpointercancel = () => touchKeys.delete(id);
}

$('look').onpointerdown = event => {
  if (!renderer || state !== 'playing' || touchLook) return;
  touchLook = { id: event.pointerId, x: event.clientX, y: event.clientY };
  $('look').setPointerCapture(event.pointerId);
};
$('look').onpointermove = event => {
  if (touchLook?.id !== event.pointerId || state !== 'playing') return;
  look((event.clientX - touchLook.x) * .0052, (event.clientY - touchLook.y) * .0052);
  touchLook.x = event.clientX;
  touchLook.y = event.clientY;
};
$('look').onlostpointercapture = $('look').onpointerup = $('look').onpointercancel = event => {
  if (touchLook?.id === event.pointerId) touchLook = undefined;
};
$('interact').onclick = interact;
$('heal').onclick = heal;
$('pause').onclick = pause;

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer?.setSize(innerWidth, innerHeight);
  mapView?.resize();
});

function frame() {
  const step = Math.min(clock.getDelta(), .065);
  if (state === 'playing' || state === 'menu') time += step;
  if (state === 'playing') update(step);
  geometry.river?.update(time, doorsCleared.has('repair'));
  if (toastUntil && performance.now() >= toastUntil) hideToast();
  if (renderer) renderer.render(scene, camera);
  else mapView.render({
    plan, geometry, player, interactables, threats, time,
    unlocked: !isPreview && canExit(), clean: doorsCleared.has('repair'), preview: isPreview,
  });
  requestAnimationFrame(frame);
}

setupRoom([], true);
mainMenu();
frame();
