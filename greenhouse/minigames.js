const $ = id => document.getElementById(id);
const dialog = $('minigame');
const board = $('game-board');
let leave;
let cancelTimers = [];

const directionNames = ['north', 'east', 'south', 'west'];
const pipeGlyphs = { 3: '└', 5: '│', 6: '┌', 9: '┘', 10: '─', 12: '┐' };
const circuitPaths = [
  [3, 4, 5],
  [3, 0, 1, 4, 5],
  [3, 6, 7, 4, 5],
  [3, 0, 1, 4, 7, 8, 5],
  [3, 6, 7, 4, 1, 2, 5],
  [3, 0, 1, 2, 5],
  [3, 6, 7, 8, 5],
];
const waste = [
  ['Aluminium can', 0], ['Cardboard box', 0], ['Glass jar', 0],
  ['Plastic drink bottle', 0], ['Banana peel', 1], ['Dried leaves', 1],
  ['Vegetable scraps', 1], ['Coffee grounds', 1], ['Leaking battery', 2],
  ['Solvent can', 2], ['Spent pesticide bottle', 2], ['Old fluorescent tube', 2],
];

function button(label, action, className) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (className) element.className = className;
  element.onclick = action;
  return element;
}

function grid(columns) {
  const element = document.createElement('div');
  element.className = 'game-grid';
  element.style.setProperty('--columns', columns);
  board.append(element);
  return element;
}

function status(text) {
  $('game-status').textContent = text;
}

function later(action, ms) {
  const id = setTimeout(action, ms);
  cancelTimers.push(() => clearTimeout(id));
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffled(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pipeDirection(from, to) {
  return [-3, 1, 3, -1].indexOf(to - from);
}

function circuit({ tier, seed, random, win }) {
  const route = circuitPaths[tier === 0 ? 0 : 1 + seed % (circuitPaths.length - 1)];
  const tiles = Array.from({ length: 9 }, () => Number(Object.keys(pipeGlyphs)[Math.floor(random() * 6)]));
  for (let i = 0; i < route.length; i++) {
    const position = route[i];
    const input = i === 0 ? 3 : pipeDirection(position, route[i - 1]);
    const output = i === route.length - 1 ? 1 : pipeDirection(position, route[i + 1]);
    tiles[position] = (1 << input) | (1 << output);
  }
  function rotate(mask) {
    return ((mask << 1) | (mask >> 3)) & 15;
  }

  const solution = [...tiles];
  for (const [index, tile] of tiles.entries()) {
    const turns = tier === 0 && !route.includes(index) ? 0 : 1 + Math.floor(random() * 3);
    for (let n = 0; n < turns; n++) tiles[index] = rotate(tiles[index]);
  }
  // A route tile always starts disconnected, including straight pipes with symmetric rotations.
  tiles[3] = rotate(solution[3]);

  const tray = grid(3);
  const cells = tiles.map((_, i) => button('', () => {
    tiles[i] = rotate(tiles[i]);
    const flow = render();
    status(flow.complete ? 'Connection ready. Send power to test it.' : 'Power reaches ' + flow.reached.size + ' tile(s).');
  }, 'secondary pipe'));
  tray.append(...cells);

  const controls = document.createElement('div');
  controls.className = 'circuit-controls';
  controls.append(
    button('Send power', () => {
      if (render().complete) win();
      else status('Circuit open. Follow the lit tiles and rotate the next connection.');
    }),
    button('Repair hint', () => {
      const next = route.find(index => tiles[index] !== solution[index]);
      if (next === undefined) return status('Connection ready. Send power to test it.');
      tiles[next] = solution[next];
      render();
      status('Aligned the pipe at row ' + (1 + Math.floor(next / 3)) + ', column ' + (1 + next % 3) + '.');
    }, 'secondary')
  );
  board.append(controls);

  function render() {
    const reached = new Set();
    let current = 3;
    let entering = 3;
    let complete = false;
    while (!reached.has(current) && tiles[current] & (1 << entering)) {
      reached.add(current);
      const exit = Math.log2(tiles[current] ^ (1 << entering));
      if (exit === 1 && current === 5) {
        complete = true;
        break;
      }
      const col = current % 3;
      if ((exit === 1 && col === 2) || (exit === 3 && col === 0)) break;
      current += [-3, 1, 3, -1][exit];
      entering = (exit + 2) % 4;
    }
    for (const [index, cell] of cells.entries()) {
      const glyph = document.createElement('b');
      glyph.textContent = pipeGlyphs[tiles[index]];
      glyph.setAttribute('aria-hidden', 'true');
      cell.replaceChildren(glyph);
      if (index === 3 || index === 5) cell.append(index === 3 ? 'IN →' : '→ OUT');
      const connections = directionNames.filter((_, n) => tiles[index] & (1 << n)).join(' and ');
      const port = index === 3 ? ', input' : index === 5 ? ', output' : '';
      cell.setAttribute('aria-label', 'Row ' + (1 + Math.floor(index / 3)) + ', column ' + (1 + index % 3) + port + ', ' + connections);
      cell.dataset.lit = String(reached.has(index));
    }
    return { reached, complete };
  }
  render();
}

function memory({ tier, random, win }) {
  const names = ['A · Rain', 'B · Leaf', 'C · Sun', 'D · Wind'];
  const sequence = Array.from({ length: 3 + tier }, () => Math.floor(random() * names.length));
  let entered = 0;
  let showing = false;
  const tray = grid(2);
  const cells = names.map((name, id) => button(name, () => {
    if (showing) return;
    if (id !== sequence[entered]) {
      entered = 0;
      status('Different signal. Replay the sequence or try again.');
      return;
    }
    entered++;
    if (entered === sequence.length) win();
    else status(entered + ' / ' + sequence.length + ' signals matched.');
  }, 'secondary'));
  tray.append(...cells);
  const replay = button('Replay sequence', () => {
    if (showing) return;
    entered = 0;
    showing = true;
    cells.forEach(cell => cell.disabled = true);
    replay.disabled = true;
    status('Watch the lights.');
    for (const [index, signal] of sequence.entries()) {
      later(() => {
        cells[signal].dataset.lit = 'true';
        status('Signal ' + (index + 1) + ' · ' + names[signal]);
      }, 360 + index * 810);
      later(() => cells[signal].dataset.lit = 'false', 990 + index * 810);
    }
    later(() => {
      showing = false;
      replay.disabled = false;
      cells.forEach(cell => cell.disabled = false);
      cells[0].focus();
      status('Enter the ' + sequence.length + ' signals in order.');
    }, 400 + sequence.length * 810);
  }, 'secondary');
  replay.style.marginTop = '10px';
  board.append(replay);
  status('Select Replay sequence when ready.');
}

function timing({ tier, random, win }) {
  const hitsNeeded = tier === 0 ? 2 : 3;
  let hits = 0;
  const track = document.createElement('div');
  track.className = 'timing-track';
  track.setAttribute('aria-hidden', 'true');
  const zone = document.createElement('div');
  zone.className = 'timing-zone';
  const marker = document.createElement('div');
  marker.className = 'timing-marker';
  track.append(zone, marker);

  const width = [.31, .25, .21][tier];
  let start = .28;
  let animation;
  let phaseStart = performance.now();
  function position(time) {
    const cycle = ((time - phaseStart) / [3200, 2600, 2250][tier]) % 2;
    return 1 - Math.abs(1 - cycle);
  }

  function nextZone() {
    start = .12 + random() * (.74 - width);
    zone.style.left = (start * 100) + '%';
    zone.style.width = (width * 100) + '%';
  }

  function draw(time) {
    marker.style.left = (position(time) * 100) + '%';
    animation = requestAnimationFrame(draw);
  }
  board.append(track, button('Lock pressure', () => {
    const here = position(performance.now());
    if (here < start || here > start + width) return status('Missed the band. Keep your ' + hits + ' successful locks and try again.');
    hits++;
    if (hits === hitsNeeded) return win();
    status(hits + ' / ' + hitsNeeded + ' pressure locks.');
    phaseStart = performance.now();
    nextZone();
  }));
  nextZone();
  animation = requestAnimationFrame(draw);
  cancelTimers.push(() => cancelAnimationFrame(animation));
  status('0 / ' + hitsNeeded + ' pressure locks.');
}

function sorting({ tier, random, win }) {
  const samples = shuffled(waste, random).slice(0, 3 + tier);
  let index = 0;
  const item = document.createElement('div');
  item.className = 'sort-item';
  board.append(item);
  const tray = grid(3);
  const options = ['Recycling', 'Organics', 'Hazardous'];
  tray.append(...options.map((label, id) => button(label, () => {
    if (id !== samples[index][1]) return status('Wrong stream. Try another bin.');
    index++;
    if (index === samples.length) return win();
    render();
  }, 'secondary')));
  function render() {
    item.textContent = samples[index][0];
    status(index + ' / ' + samples.length + ' sorted.');
  }
  render();
}

function cleanup({ tier, random, win }) {
  const targets = 3 + tier;
  const samples = shuffled([
    ...['Bottle', 'Can', 'Wrapper', 'Torn bag', 'Foam cup'].slice(0, targets),
    'River reed', 'Pebbles', 'River snail', 'Water lily',
  ], random);
  let recovered = 0;
  const tray = grid(3);
  for (const sample of samples) {
    const tile = button(sample, () => {
      if (['River reed', 'Pebbles', 'River snail', 'Water lily'].includes(sample)) {
        return status('Leave natural material and wildlife in the river.');
      }
      recovered++;
      tile.disabled = true;
      tile.textContent = '✓ ' + sample;
      tile.dataset.done = 'true';
      if (recovered === targets) return win();
      status(recovered + ' / ' + targets + ' pieces recovered.');
    }, 'secondary');
    tray.append(tile);
  }
  status('0 / ' + targets + ' pieces recovered.');
}

function valves({ tier, random, win }) {
  const drain = tier + 2;
  const fill = tier + 4;
  const initial = 21 + Math.floor(random() * 13);
  const target = initial + fill * (2 + tier) - drain * 2;
  let pressure = initial;
  const readout = document.createElement('div');
  readout.className = 'pressure';
  const operators = grid(3);
  board.prepend(readout);
  operators.append(
    button('Drain −' + drain, () => change(-drain), 'secondary'),
    button('Supply +' + fill, () => change(fill), 'secondary'),
    button('Reset', () => {
      pressure = initial;
      render();
    }, 'secondary'),
  );
  function change(amount) {
    pressure = Math.min(100, Math.max(0, pressure + amount));
    render();
    if (pressure === target) win();
  }
  function render() {
    readout.textContent = pressure + ' kPa → ' + target + ' kPa';
  }
  render();
}

export const gameNames = {
  circuit: 'Circuit Bypass',
  memory: 'Signal Echo',
  timing: 'Pressure Lock',
  sorting: 'Waste Shift',
  cleanup: 'River Cleanup',
  valves: 'Valve Balance',
};

const minigames = {
  circuit: ['Rotate the pipes to carry power from IN to OUT. Send power when the path is connected.', circuit],
  memory: ['Replay the signals, then select the pads in the order they lit up.', memory],
  timing: ['Lock the pressure when the white marker crosses the green band.', timing],
  sorting: ['Send each item to its correct waste stream.', sorting],
  cleanup: ['Lift litter out of the river. Leave wildlife and natural materials where they are.', cleanup],
  valves: ['Use the supply and drain valves to reach the target pressure.', valves],
};

function finish(won) {
  if (!leave) return;
  const callback = leave;
  leave = undefined;
  for (const cancel of cancelTimers) cancel();
  cancelTimers = [];
  dialog.close();
  callback(won);
}

$('leave-game').onclick = () => finish(false);
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  finish(false);
});

export function openMinigame({ kind, label, tier, seed }, onLeave) {
  const [description, build] = minigames[kind];
  leave = onLeave;
  $('game-label').textContent = label;
  $('game-title').textContent = gameNames[kind];
  $('game-description').textContent = description;
  board.replaceChildren();
  status('');
  dialog.showModal();
  build({ tier, seed, random: seeded(seed), win: () => finish(true) });
}
