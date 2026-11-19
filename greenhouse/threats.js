import * as THREE from 'three';
import { box, sphere, cylinder, cone, ring, piece, surface, luminous, steel, darkSteel } from './rooms.js';

const colors = {
  sentinel: luminous(0xffa35a, 1.25), creeper: luminous(0xf76468, 1.12), skimmer: luminous(0x87d9fa, 1.17),
  mayor: luminous(0xffa970, 1.27), rewilding: luminous(0xa6f36f, 1.16),
  rebuild: luminous(0xffa35a, 1.27), air: luminous(0xd0b0ff, 1.16),
};
const bark = surface(0x426246, .95);
const hazardColor = luminous(0xff753d, .85);
const worldUp = new THREE.Vector3(0, 1, 0);

const enemies = {
  sentinel: { name: 'Sentinel', warn: 'Sentinel charging · break line of movement', windup: 1.05, speed: 3.7, range: 7.2 },
  creeper: { name: 'Root Crawler', warn: 'Root Crawler poised · change direction', windup: .86, speed: 4.35, range: 5.1 },
  skimmer: { name: 'Canal Skimmer', warn: 'Canal Skimmer targeting · dodge sideways', windup: 1.13, speed: 3, range: 9.8 },
};

export const bossNames = {
  mayor: 'The Mayor', rewilding: 'The Overgrowth', rebuild: 'The Engineer', air: 'The Smog',
};

function model(parent, kind) {
  const group = new THREE.Group();
  parent.add(group);
  const eyes = colors[kind];
  const limbs = [];
  if (kind === 'sentinel') {
    piece(group, cylinder, darkSteel, 0, .9, 0, .46, .7, .46);
    piece(group, box, steel, 0, 1.64, 0, .89, .79, .5, true);
    piece(group, box, darkSteel, 0, 2.19, 0, .65, .43, .53);
    piece(group, box, eyes, 0, 2.2, .285, .49, .11, .07);
    for (const side of [-1, 1]) {
      limbs.push(piece(group, box, steel, side * .63, 1.49, .03, .25, .98, .28));
      piece(group, box, darkSteel, side * .32, .37, .05, .29, .76, .41);
    }
  } else if (kind === 'creeper') {
    piece(group, sphere, bark, 0, .54, -.13, .5, .32, .7, true);
    piece(group, sphere, darkSteel, 0, .65, .53, .36, .25, .39);
    for (const side of [-1, 1]) {
      piece(group, sphere, eyes, side * .16, .71, .855, .091, .069, .06);
      for (let i = 0; i < 3; i++) {
        limbs.push(piece(group, box, bark, side * .51, .39, i * .43 - .44, .47, .097, .12));
        piece(group, cone, bark, side * .74, .19, i * .43 - .44, .12, .39, .12).rotation.z = side * .3;
      }
    }
  } else if (kind === 'skimmer') {
    piece(group, sphere, steel, 0, 1.65, 0, .57, .32, .49, true);
    piece(group, sphere, eyes, 0, 1.61, .43, .27, .15, .17);
    for (const side of [-1, 1]) {
      piece(group, box, darkSteel, side * .64, 1.68, 0, .59, .12, .26);
      piece(group, cylinder, steel, side * .92, 1.68, 0, .28, .22, .28);
      limbs.push(piece(group, box, eyes, side * .92, 1.84, 0, .52, .037, .096));
    }
  } else {
    const organic = kind === 'rewilding';
    piece(group, organic ? cylinder : box, organic ? bark : steel, 0, 1.63, 0, organic ? .87 : 1.87, 2.34, 1.07, true);
    piece(group, sphere, darkSteel, 0, 3.22, .12, .69, .64, .62, true);
    piece(group, box, eyes, 0, 1.92, .59, .42, .58, .12);
    for (const side of [-1, 1]) {
      piece(group, box, eyes, side * .28, 3.28, .685, .29, .12, .09);
      limbs.push(piece(group, organic ? cone : box, organic ? bark : steel, side * 1.27, 1.58, .17, .45, 2.17, .53, true));
      if (organic) {
        piece(group, cone, bark, side * .47, 3.83, -.08, .25, .88, .25).rotation.z = side * -.39;
      } else {
        piece(group, box, darkSteel, side * 1.03, 2.64, 0, .67, .38, .73, true);
      }
    }
  }
  return { group, limbs };
}

function direction(from, to) {
  return new THREE.Vector3(to.x - from.x, 0, to.z - from.z).normalize();
}

function face(object, target) {
  const offset = direction(object.position, target);
  if (offset.lengthSq()) object.rotation.y = Math.atan2(offset.x, offset.z);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function createThreats(group, plan, protocol, river, { alert, hit, move }) {
  const kind = plan.boss ? protocol : plan.enemyType;
  const shots = [];
  const zones = [];
  let time = 0;
  let runs = 0;
  let dead = false;
  if (!kind) return { update() {}, stop() {} };

  const boss = plan.boss;
  const profile = enemies[kind];
  const actor = model(group, kind);
  const body = actor.group;
  const marker = piece(group, ring, hazardColor, 0, .024, 0, 1, 1, 1);
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;

  const side = plan.tier % 2 ? 1 : -1;
  const route = river
    ? [[side * 4.9, -7.3], [river.bridgeX, -4.3], [river.bridgeX, 2.65], [side * 4.2, 4.8]]
    : [[side * 4.7, -5.9], [side * 1.7, -2.0], [-side * 4.0, -6.8], [-side * 1.3, -9.3]];
  body.position.set(boss ? 0 : route[0][0], 0, boss ? -7.15 : route[0][1]);

  let waypoint = 1;
  let state = 'patrol';
  let phase = boss ? 3.3 : 0;
  let aim = new THREE.Vector3();
  let lunge = new THREE.Vector3();

  function shoot(target, spread, speed, damage) {
    const from = body.position;
    const projectile = piece(group, sphere, colors[kind], from.x, 1.35, from.z, .21, .21, .21);
    const heading = direction(from, target).applyAxisAngle(worldUp, spread);
    shots.push({ projectile, heading, speed, damage, remaining: 3.7 });
  }

  function zone(target, radius, delay, duration, damage) {
    const z = { x: target.x, z: target.z, radius, delay, duration, damage, age: 0, struck: false };
    z.ring = piece(group, ring, hazardColor, z.x, .045, z.z, radius, radius, 1);
    z.ring.rotation.x = -Math.PI / 2;
    zones.push(z);
  }

  function bossAttack(player) {
    runs++;
    const target = player.position.clone();
    const n = bossNames[kind];
    if (kind === 'mayor') {
      if (runs % 2) {
        alert(n + ' fires paired bolts · strafe');
        for (const angle of [-.13, 0, .13]) shoot(target, angle, 6.2, 13);
      } else {
        alert(n + ' marks your position · move out of the ring');
        zone(target, 2.15, 1.25, .38, 19);
      }
    } else if (kind === 'rewilding') {
      alert('Roots gathering · leave the marked ground');
      zone(target, 2.2, 1.18, .62, 17);
      zone({ x: -target.x, z: target.z - 3.3 }, 1.85, 1.55, .5, 15);
      zone({ x: -target.x * .7, z: target.z + 2.9 }, 1.6, 1.68, .5, 15);
    } else if (kind === 'rebuild') {
      alert('The Engineer fires a fan · slip between the bolts');
      for (const angle of [-.36, -.18, 0, .18, .36]) shoot(target, angle, 7.1, 16);
    } else {
      alert('Smog gathering · leave the ring before it fills');
      zone(target, 2.65, 1.22, 3.7, 15);
      if (runs % 2 === 0) shoot(target, 0, 4.4, 11);
    }
  }

  function steer(target, speed, step) {
    let next = target;
    if (river && kind !== 'skimmer') {
      const across = (body.position.z - river.center) * (target.z - river.center) < 0;
      if (across && Math.abs(body.position.x - river.bridgeX) > .35) {
        next = { x: river.bridgeX, z: body.position.z };
      } else if (across) {
        next = { x: river.bridgeX, z: target.z };
      }
    }
    face(body, next);
    const heading = direction(body.position, next);
    move(body.position, heading, speed * step, kind === 'skimmer');
  }

  function updateEnemy(step, player) {
    const pos = player.position;
    const gap = distance(body.position, pos);
    phase -= step;
    if (state === 'windup') {
      face(body, aim);
      marker.position.set(body.position.x, .031, body.position.z);
      marker.scale.setScalar(.87 + Math.sin(time * 8) * .08);
      if (phase > 0) return;
      marker.visible = false;
      if (kind === 'skimmer') {
        shoot(aim, 0, 6, 11);
        state = 'cooldown';
        phase = 2.35;
        return;
      }
      lunge = direction(body.position, aim);
      state = 'lunge';
      phase = kind === 'creeper' ? .5 : .62;
      return;
    }
    if (state === 'lunge') {
      move(body.position, lunge, profile.speed * (kind === 'creeper' ? 2.6 : 2.05) * step);
      if (phase <= 0 || gap < 1.04) {
        if (gap < 1.04) hit(kind === 'creeper' ? 14 : 16, profile.name);
        state = 'cooldown';
        phase = 2.5;
      }
      return;
    }
    if (state === 'cooldown' && phase > 0) return;
    const visible = gap < profile.range || (player.sprinting && gap < profile.range + 2.5);
    if (visible) {
      const attackRange = kind === 'skimmer' ? 8.6 : kind === 'creeper' ? 3.35 : 3.8;
      const bridgeBlocksLunge = river && kind !== 'skimmer'
        && (body.position.z - river.center) * (pos.z - river.center) < 0
        && Math.abs(body.position.x - river.bridgeX) > river.bridgeHalf - .3;
      if (gap < attackRange && !bridgeBlocksLunge) {
        aim.copy(pos);
        phase = profile.windup;
        state = 'windup';
        marker.visible = true;
        marker.position.set(body.position.x, .031, body.position.z);
        alert(profile.warn);
      } else {
        steer(pos, profile.speed * .88, step);
      }
      return;
    }
    state = 'patrol';
    const [x, z] = route[waypoint];
    const target = { x, z };
    if (distance(body.position, target) < .36) waypoint = (waypoint + 1) % route.length;
    steer(target, profile.speed * .43, step);
  }

  function updateHazards(step, position) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i];
      shot.projectile.position.addScaledVector(shot.heading, shot.speed * step);
      shot.remaining -= step;
      if (distance(position, shot.projectile.position) < .57) {
        hit(shot.damage, boss ? bossNames[kind] : profile.name);
        shot.remaining = 0;
      }
      if (shot.remaining > 0) continue;
      group.remove(shot.projectile);
      shots.splice(i, 1);
    }
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      z.age += step;
      const live = z.age >= z.delay;
      z.ring.scale.setScalar(z.radius * (live ? 1 : .89 + .11 * Math.min(1, z.age / z.delay)));
      if (live && !z.struck && distance(position, z) < z.radius) {
        hit(z.damage, bossNames[kind]);
        z.struck = true;
      }
      if (z.age <= z.delay + z.duration) continue;
      group.remove(z.ring);
      zones.splice(i, 1);
    }
  }

  return {
    overview() {
      return dead ? null : { actor: body.position, boss, aiming: state === 'windup', shots, zones };
    },
    update(step, player) {
      if (dead) return;
      time += step;
      if (boss) {
        phase -= step;
        body.position.x = Math.sin(time * .63) * 1.4;
        body.position.y = kind === 'air' ? .38 + Math.sin(time * 2.2) * .13 : 0;
        face(body, player.position);
        if (phase <= 0) {
          phase = kind === 'air' ? 2.8 : 3.45;
          bossAttack(player);
        }
      } else {
        updateEnemy(step, player);
        if (kind === 'skimmer') body.position.y = .13 + Math.sin(time * 3.6) * .16;
      }
      for (const [i, limb] of actor.limbs.entries()) {
        if (kind === 'skimmer') limb.rotation.y += step * 13;
        else limb.rotation.x = Math.sin(time * 6 + i) * (state === 'windup' ? .61 : .17);
      }
      updateHazards(step, player.position);
    },
    stop() {
      dead = true;
      body.visible = false;
      marker.visible = false;
      for (const shot of shots) group.remove(shot.projectile);
      for (const area of zones) group.remove(area.ring);
    },
  };
}
