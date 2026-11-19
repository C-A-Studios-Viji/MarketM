import * as THREE from 'three';

const city = [
  ['Substation', 'circuit', 'industrial'], ['Service Apartments', 'memory', 'apartment'],
  ['Market Arcade', 'sorting', 'market'], ['Flood Canal', 'cleanup', 'river'],
  ['Transit Platform', 'timing', 'station'], ['Waterworks', 'valves', 'industrial'],
  ['Emergency Depot', 'circuit', 'market'], ['Riverbank Walk', 'cleanup', 'park'],
  ['Public Archive', 'memory', 'apartment'], ['Power Junction', 'timing', 'station'],
];
const greenhouse = [
  ['Propagation Lab', 'circuit', 'glass'], ['Seed Library', 'memory', 'nursery'],
  ['Compost Exchange', 'sorting', 'compost'], ['Reedwater Run', 'cleanup', 'wetland'],
  ['Mist Gallery', 'timing', 'glass'], ['Irrigation Bay', 'valves', 'industrial'],
  ['Biodiversity Vault', 'memory', 'nursery'], ['Reclamation Canal', 'cleanup', 'river'],
  ['Air Filtration', 'timing', 'industrial'], ['Hydroponic Switchyard', 'valves', 'glass'],
];
const districts = [
  'Civic District', 'Old Market', 'Transit Quarter', 'Utilities District', 'City Hall Approach',
  'Propagation Wing', 'Hydroponics Wing', 'Wetlands Wing', 'Climate Control', 'Urban Core Approach',
];
const sideRotation = ['memory', 'sorting', 'valves', 'circuit', 'timing', 'cleanup'];

export function roomPlan(door) {
  const citySide = door <= 50;
  const chapter = Math.floor((door - 1) / 10);
  const slot = (door - 1) % 10;
  const boss = door === 50 || door === 100;
  const offset = (chapter % 5) * 3;
  const [name, main, layout] = (citySide ? city : greenhouse)[(slot + offset) % 10];
  const side = sideRotation.find((kind, i) => i >= (door * 5) % 6 && kind !== main)
    ?? sideRotation.find(kind => kind !== main);
  return {
    name: boss ? (citySide ? 'City Hall' : 'Urban Core') : name,
    district: districts[chapter],
    layout: boss ? (citySide ? 'hall' : 'core') : layout,
    main,
    side: boss ? 'sorting' : side,
    tier: door <= 15 ? 0 : door <= 60 ? 1 : 2,
    relayCount: boss || door < 9 ? 0 : door <= 55 || door % 2 === 0 ? 1 : 2,
    boss,
    citySide,
    enemyType: boss || door <= 4 || door % 5 === 1
      ? null : ['sentinel', 'creeper', 'skimmer'][(door + chapter) % 3],
  };
}

export const box = new THREE.BoxGeometry(1, 1, 1);
export const sphere = new THREE.SphereGeometry(1, 14, 10);
export const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
export const cone = new THREE.ConeGeometry(1, 1, 8);
export const ring = new THREE.RingGeometry(.76, 1, 44);
const torus = new THREE.TorusGeometry(1, .075, 6, 36);
const plane = new THREE.PlaneGeometry(1, 1);
const octahedron = new THREE.OctahedronGeometry(1);
const textureLoader = new THREE.TextureLoader();

export function surface(color, roughness = .8, metalness = .05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function luminous(color, intensity = .72) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .45 });
}

function textured(file, repeat, color) {
  const map = textureLoader.load(new URL('./assets/' + file + '.webp', import.meta.url).href);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(...repeat);
  map.anisotropy = 4;
  const material = surface(color);
  material.map = map;
  return material;
}

const steel = surface(0x3e5554, .57, .68);
const darkSteel = surface(0x283436, .58, .38);
const grating = surface(0x485b53, .66, .48);
const wood = surface(0x795946);
const dirt = surface(0x473830);
const foliage = [surface(0x2b5035), surface(0x466b40), surface(0x739951)];
const stem = surface(0x365735);
const concrete = textured('weathered-concrete', [3, 4], 0xb5b5a7);
const walls = textured('weathered-concrete', [6, 2], 0x858f8c);
const gardenFloor = textured('forest-floor', [5, 7], 0xaaa78a);
const riverStone = textured('river-pebbles', [5, 3], 0x8ca899);
const glass = new THREE.MeshPhysicalMaterial({
  color: 0x9edebc, roughness: .28, opacity: .15, transparent: true,
  depthWrite: false, side: THREE.DoubleSide,
});
const lantern = luminous(0xc7f2a7, 1);
const gold = luminous(0xffbd62, .84);
const pale = luminous(0xb1dcd9, .62);
const red = luminous(0xea6f4e, .72);
const green = luminous(0x9df16a, .95);

export function piece(group, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, shadow = false) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  object.castShadow = shadow;
  object.receiveShadow = true;
  group.add(object);
  return object;
}

export function plaque(group, text, x, y, z, width, color = '#c9e2af') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1915';
  ctx.fillRect(0, 0, 640, 144);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(7, 7, 626, 130);
  ctx.fillStyle = color;
  ctx.font = '700 46px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 320, 75, 592);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  material.userData.temporary = true;
  return piece(group, plane, material, x, y, z, width, width * .225);
}

export function disposeGroup(group) {
  const materials = new Set();
  group.traverse(object => {
    if (object.isMesh && object.material.userData.temporary) materials.add(object.material);
  });
  for (const material of materials) {
    material.map?.dispose();
    material.dispose();
  }
  group.clear();
}

function seeded(door, index) {
  const sample = Math.sin(door * 71.91 + index * 127.1) * 43758.5453;
  return sample - Math.floor(sample);
}

function planter(group, x, z, width, tall, seed) {
  piece(group, box, steel, x, .36, z, width, .7, 1.2, true);
  piece(group, box, dirt, x, .72, z, width * .92, .08, 1.03);
  for (let i = 0; i < Math.max(2, Math.floor(width * 3)); i++) {
    const px = x + (seeded(seed, i + 1) - .5) * width * .76;
    const pz = z + (seeded(seed, i + 16) - .5) * .7;
    const height = tall * (.55 + seeded(seed, i + 31) * .55);
    piece(group, cylinder, stem, px, .75 + height / 2, pz, .033, height, .033);
    for (const side of [-1, 1]) {
      const blade = piece(group, sphere, foliage[(i + 1) % 3], px + side * .14, .84 + height, pz, .13, height * .38, .078);
      blade.rotation.z = side * -.6;
    }
  }
}

function roomShell(group, plan, garden, outdoors) {
  if (!outdoors) piece(group, box, garden ? gardenFloor : concrete, 0, -.24, -.8, 16.2, .48, 30.4);
  const glasshouse = ['glass', 'nursery', 'compost', 'core'].includes(plan.layout);
  for (const side of [-1, 1]) {
    if (!outdoors) {
      piece(group, box, glasshouse ? glass : walls, side * 8, 3.2, -.8, .24, 6.4, 30);
      piece(group, box, darkSteel, side * 7.94, .23, -.8, .28, .45, 30);
      piece(group, box, darkSteel, side * 7.95, 3.95, -.8, .28, .16, 30);
    } else {
      piece(group, box, steel, side * 8.06, .62, -.75, .15, .1, 29.1);
      for (let z = -14; z <= 13; z += 2.25) piece(group, box, steel, side * 8.06, .38, z, .14, .78, .14);
    }
  }
  for (let z = -14; z < 15; z += 5) {
    if (outdoors && z > -11 && z < 12) continue;
    piece(group, box, steel, -7.77, 3, z, .22, 6, .25);
    piece(group, box, steel, 7.77, 3, z, .22, 6, .25);
    piece(group, box, steel, 0, 5.86, z, 15.55, .21, .22);
  }
  if (!outdoors) {
    if (glasshouse) {
      for (const side of [-1, 1]) {
        const roof = piece(group, box, glass, side * 4, 6.6, -.9, 8.25, .11, 30);
        roof.rotation.z = side * -.17;
      }
      piece(group, box, steel, 0, 7.3, -.9, .25, .22, 30);
    } else {
      piece(group, box, darkSteel, 0, 6.05, -.9, 16.1, .2, 30);
    }
  }
  piece(group, box, garden ? steel : walls, 0, 2.75, -15.25, 16.1, 5.5, .43);
  piece(group, box, garden ? steel : walls, 0, 2.6, 13.7, 16.1, 5.2, .45);
  plaque(group, plan.name, 0, 3.45, 13.43, 5.6).rotation.y = Math.PI;
}

function furnishings(group, plan, door) {
  const colliders = [];
  const place = (material, x, y, z, w, h, d) => {
    if (h > .6) colliders.push({ x, z, halfX: w / 2, halfZ: d / 2 });
    return piece(group, box, material, x, y, z, w, h, d, true);
  };
  for (let i = 0; i < 5; i++) {
    const z = 8.9 - i * 4.45;
    const side = (door + i) % 2 === 0 ? 1 : -1;
    const x = side * 6.28;
    if (['glass', 'nursery', 'compost', 'park', 'wetland', 'core'].includes(plan.layout)) {
      if (plan.layout === 'wetland' && Math.abs(z + .8) < 2.8) continue;
      planter(group, x, z, 1.85, 1 + seeded(door, i), door + i);
      colliders.push({ x, z, halfX: .94, halfZ: .6 });
      if (plan.layout === 'glass' || plan.layout === 'core') {
        piece(group, box, steel, x, 4.26, z, 2.04, .24, .44);
        piece(group, box, lantern, x, 4.11, z, 1.82, .055, .28);
      }
    } else if (plan.layout === 'market') {
      place(wood, x, .53, z, 2.15, 1.06, 1.9);
      piece(group, box, side < 0 ? red : pale, x, 2.5, z, 2.2, .15, 2.1, true);
      for (const end of [-1, 1]) piece(group, box, steel, x, 1.75, z + end * .91, .13, 1.5, .13);
    } else if (plan.layout === 'station') {
      place(darkSteel, x, .8, z, 2.4, 1.6, 2.8);
      piece(group, box, gold, x - side * 1.22, 1.15, z, .06, .18, 2.65);
    } else if (plan.layout === 'apartment') {
      place(wood, x, 1.02, z, 1.65, 2.04, 1.55);
      piece(group, box, steel, x - side * .86, 1.08, z, .08, .21, .66);
    } else if (plan.layout === 'industrial') {
      piece(group, cylinder, steel, x, 1.38, z, .78, 2.75, .78, true);
      piece(group, cylinder, darkSteel, x, 2.34, z, .84, .15, .84);
      piece(group, torus, pale, x - side * .78, 1.43, z, .24, .24, .24).rotation.y = side * Math.PI / 2;
      colliders.push({ x, z, halfX: .75, halfZ: .75 });
    } else if (plan.layout === 'hall') {
      place(steel, x, 1.54, z, 1.18, 3.08, 1.18);
      piece(group, box, gold, x, 3.14, z, 1.2, .08, 1.21);
    } else if (Math.abs(z + .8) > 2.9) {
      planter(group, x, z, 1.65, .98, door + i);
      colliders.push({ x, z, halfX: .83, halfZ: .6 });
    }
  }
  return colliders;
}

function buildRiver(group, door, wetland) {
  const center = -.8;
  const half = wetland ? 2.1 : 2.57;
  const bridgeX = [-2.75, 0, 2.75][door % 3];
  const bridgeHalf = wetland ? 1.07 : 1.26;
  const bank = wetland ? gardenFloor : concrete;
  const nearEdge = 14.1;
  const farEdge = -15.8;
  const nearBank = center + half;
  const farBank = center - half;
  piece(group, box, bank, 0, -.25, (nearBank + nearEdge) / 2, 16.1, .5, nearEdge - nearBank);
  piece(group, box, bank, 0, -.25, (farBank + farEdge) / 2, 16.1, .5, farBank - farEdge);
  piece(group, box, riverStone, 0, -.77, center, 23, .3, half * 2.2);
  for (const side of [-1, 1]) {
    piece(group, box, riverStone, 0, -.23, center + side * half, 16.1, .45, .37);
    piece(group, box, gold, 0, .011, center + side * (half + .2), 15.7, .019, .075);
  }

  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, clean: { value: 0 } },
    vertexShader: `
      varying vec2 point;
      void main() {
        point = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 point;
      uniform float time;
      uniform float clean;
      void main() {
        float x = point.x - time * .095;
        float ripples = sin(x * 127.0 + sin(point.y * 37.0 + time) * 1.1) *
                        sin(point.y * 33.0 + x * 43.0);
        float crossflow = sin(x * 73.0 - point.y * 54.0) * .5 + .5;
        float banks = smoothstep(.3, .5, abs(point.y - .5));
        float glint = pow(max(ripples, 0.0), 10.0);
        vec3 dirty = vec3(.045, .19, .14);
        vec3 fresh = vec3(.026, .27, .27);
        vec3 color = mix(dirty, fresh, clean) + vec3(.022, .076, .071) * crossflow;
        color += glint * vec3(.16, .31, .29) + banks * vec3(.018, .055, .033);
        gl_FragColor = vec4(color, .81);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  water.userData.temporary = true;
  piece(group, plane, water, 0, -.24, center, 22.5, half * 2, 1).rotation.x = -Math.PI / 2;
  piece(group, box, darkSteel, bridgeX, -.02, center, bridgeHalf * 2, .17, half * 2 + 1.2, true);
  for (let i = -8; i <= 8; i++) {
    piece(group, box, grating, bridgeX, .075, center + i * (half + .25) / 8, bridgeHalf * 2 - .08, .025, .13);
  }
  for (const side of [-1, 1]) {
    const x = bridgeX + side * (bridgeHalf + .03);
    piece(group, box, gold, x, .78, center, .095, .12, half * 2 + .67);
    for (const z of [-half, 0, half]) piece(group, box, steel, x, .43, center + z, .11, .86, .12);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const x = (seeded(door, i + 76) - .5) * 15.6;
      if (Math.abs(x - bridgeX) < bridgeHalf + .5) continue;
      const z = center + side * (half + .25 + seeded(door, i + 51) * .37);
      const rock = piece(group, octahedron, riverStone, x, .13, z, .26, .16, .24);
      rock.rotation.y = seeded(door, i + 91) * 6.28;
    }
  }
  const debris = Array.from({ length: 9 }, (_, i) => {
    const object = piece(group, i % 2 ? cylinder : box, i % 2 ? pale : wood, -9 + i * 2, -.17, center, .13, .09, .18);
    object.rotation.z = .6 + i;
    return object;
  });
  return {
    center, half, bridgeX, bridgeHalf,
    update(time, clean) {
      water.uniforms.time.value = time;
      water.uniforms.clean.value = clean ? 1 : 0;
      for (const [i, object] of debris.entries()) {
        object.visible = !clean;
        object.position.set((i * 3.77 + time * (.45 + i * .045)) % 20 - 10,
          -.17 + Math.sin(time * 2 + i) * .035,
          center + Math.sin(i * 3.7 + time * .45) * (half - .35));
      }
    },
  };
}

function backdrop(group, plan, door) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const x = side * (10 + seeded(door, i + 45) * 7);
      const z = 16 - i * 6 + seeded(door, i + 77) * 3;
      const h = 1.8 + seeded(door, i + 64) * 7;
      if (plan.citySide && plan.layout !== 'park') {
        piece(group, box, darkSteel, x, h / 2 - .6, z, 4.5, h, 3.2);
        for (let y = .9; y < h - 1; y += 1.2) {
          piece(group, box, i % 2 ? pale : gold, x - side * 2.26, y, z, .055, .27, 1.05);
        }
      } else {
        piece(group, cylinder, wood, x, .32 * h, z, .19, h * .71, .19);
        for (let tier = 0; tier < 3; tier++) {
          piece(group, cone, foliage[tier], x, h * (.45 + tier * .17), z,
            (1.23 - tier * .23) * h / 3, h * .49, (1.23 - tier * .23) * h / 3);
        }
      }
    }
  }
}

export function buildRoom(group, plan, door) {
  const riverRoom = ['river', 'wetland', 'park'].includes(plan.layout);
  const glasshouse = ['glass', 'nursery', 'core'].includes(plan.layout);
  const garden = !plan.citySide || plan.layout === 'park';
  roomShell(group, plan, garden, riverRoom);
  const river = riverRoom ? buildRiver(group, door, plan.layout !== 'river') : null;
  if (river || glasshouse) backdrop(group, plan, door);
  const colliders = furnishings(group, plan, door);
  for (const z of [9, 2.6, -4.6, -10.9]) {
    const x = z > 0 ? 2.8 : -2.8;
    if (river) piece(group, box, steel, x, 2, z, .165, 4, .165);
    piece(group, box, steel, x, 4.48, z, 1.12, .2, .38);
    piece(group, box, garden ? lantern : pale, x, 4.34, z, .95, .1, .25);
    const light = new THREE.PointLight(garden ? 0xc2ff9d : 0xe1d5a0, river ? 12 : 24, 12, 2);
    light.position.set(x, 4.15, z);
    group.add(light);
  }
  return { river, colliders, outdoors: riverRoom || glasshouse };
}

export function buildExit(group, next) {
  piece(group, box, darkSteel, 0, 2.35, -14.62, 3.9, 4.7, .61);
  piece(group, box, steel, 0, 2.25, -14.26, 3.19, 4.12, .16);
  piece(group, box, grating, 0, .05, -13, 3.18, .087, 1.82);
  const seal = piece(group, box, red, 0, 2.19, -14.14, .12, 3.78, .1);
  plaque(group, next, 0, 4.25, -13.98, 2.75);
  return { unlock() { seal.material = green; } };
}

export function station(group, x, z, kind, title) {
  const colors = { main: gold, side: pale, relay: lantern, pickup: green, exit: red };
  const monitor = piece(group, box, colors[kind], x, 1.09, z, .62, .39, .22);
  if (kind !== 'pickup') {
    piece(group, box, darkSteel, x, .55, z-.1, .57, 1.1, .58, true);
    piece(group, box, steel, x, .81, z-.01, .72, .14, .58);
    plaque(group, title, x, 1.58, z + .04, kind === 'relay' ? 1.25 : 1.92);
  }
  return monitor;
}

export { darkSteel, steel, gold, green, red };
