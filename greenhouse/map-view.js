export function createMapView() {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Overhead map of The Greenhouse');
  const context = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  const textures = {};
  for (const [kind, file] of Object.entries({
    concrete: 'weathered-concrete', garden: 'forest-floor', river: 'river-pebbles',
  })) {
    const image = new Image();
    image.src = new URL('./assets/' + file + '.webp', import.meta.url).href;
    textures[kind] = image;
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio, 1.6);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function render({ plan, geometry, player, interactables, threats, unlocked, clean, time, preview }) {
    context.fillStyle = '#071411';
    context.fillRect(0, 0, width, height);
    const unit = Math.max(5, Math.min((width - 32) / 18, (height - (height < 680 ? 218 : 165)) / 31));
    const mapX = preview && width >= 920 ? width * .73 : width * .5;
    const mapY = height * .53;
    const x = world => mapX + world * unit;
    const y = world => mapY + (world + 1) * unit;
    const rectangle = (left, top, w, h, color) => {
      context.fillStyle = color;
      context.fillRect(x(left), y(top), w * unit, h * unit);
    };
    const point = (px, pz, radius, color, stroke = false) => {
      context.beginPath();
      context.arc(x(px), y(pz), radius * unit, 0, Math.PI * 2);
      if (stroke) {
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.stroke();
      } else {
        context.fillStyle = color;
        context.fill();
      }
    };
    const { river } = geometry;
    const garden = !plan.citySide || plan.layout === 'park';

    rectangle(-8.45, -15.75, 16.9, 29.8, '#45665b');
    const floor = textures[garden ? 'garden' : 'concrete'];
    if (floor.complete && floor.naturalWidth) {
      context.drawImage(floor, x(-8), y(-15.25), 16 * unit, 28.8 * unit);
    }
    rectangle(-8, -15.25, 16, 28.8, garden ? '#143028a8' : '#0d2027b8');
    for (let z = -11; z < 14; z += 5) {
      rectangle(-7.88, z, 15.76, .035, '#8eb0a337');
      rectangle(-7.85, z, .28, .28, '#84a99a');
      rectangle(7.57, z, .28, .28, '#84a99a');
    }

    if (river) {
      const bank = river.center - river.half;
      const bed = textures.river;
      if (bed.complete && bed.naturalWidth) {
        context.drawImage(bed, x(-8), y(bank), 16 * unit, 2 * river.half * unit);
      }
      rectangle(-8, bank, 16, 2 * river.half, clean ? '#197586ca' : '#175553dc');
      for (let i = 0; i < 20; i++) {
        const vx = (i * 2.71 + time * .72) % 15.5 - 7.75;
        const vz = bank + .19 + (i * .73 % (river.half * 2 - .38));
        rectangle(vx, vz, .47, .027, '#c3f0e171');
        if (!clean && i % 3 === 0) point(vx, vz + .13, .075, '#d2b598');
      }
      rectangle(-8, bank, 16, .055, '#cfba78');
      rectangle(-8, bank + river.half * 2, 16, .055, '#cfba78');
      const bridge = river.bridgeX - river.bridgeHalf;
      rectangle(bridge, bank - .52, river.bridgeHalf * 2, river.half * 2 + 1.04, '#253d39');
      for (let i = 0; i < 11; i++) rectangle(bridge, bank - .39 + i * .53, river.bridgeHalf * 2, .05, '#77968d');
      rectangle(bridge, bank - .52, .086, river.half * 2 + 1.04, '#ffc56b');
      rectangle(bridge + river.bridgeHalf * 2 - .086, bank - .52, .086, river.half * 2 + 1.04, '#ffc56b');
    }

    for (const prop of geometry.colliders) {
      rectangle(prop.x - prop.halfX, prop.z - prop.halfZ, prop.halfX * 2, prop.halfZ * 2, garden ? '#557c58' : '#647570');
    }
    for (const item of interactables) {
      if (!item.visible || !item.kind) continue;
      const colors = { main: '#ffca7d', side: '#8fdde6', relay: '#a8ed8f', pickup: '#74eab6' };
      point(item.x, item.z, .53, colors[item.kind], true);
      point(item.x, item.z, .18, colors[item.kind]);
    }
    rectangle(-1.75, -14.4, 3.5, .48, unlocked ? '#b0f591' : '#f17f65');
    const hazards = threats?.overview?.();
    if (hazards) {
      for (const zone of hazards.zones) point(zone.x, zone.z, zone.radius, '#ff8768', true);
      for (const shot of hazards.shots) point(shot.projectile.position.x, shot.projectile.position.z, .21, '#ffc18e');
      point(hazards.actor.x, hazards.actor.z, hazards.boss ? .73 : .47, '#ef8068');
      if (hazards.aiming) point(hazards.actor.x, hazards.actor.z, 1, '#ffd17e', true);
    }

    if (preview) return;
    context.save();
    context.translate(x(player.position.x), y(player.position.z));
    context.beginPath();
    context.moveTo(0, -.59 * unit);
    context.lineTo(.36 * unit, .32 * unit);
    context.lineTo(-.36 * unit, .32 * unit);
    context.closePath();
    context.fillStyle = '#f3fff5';
    context.fill();
    context.restore();
  }
  resize();
  return { canvas, resize, render };
}
