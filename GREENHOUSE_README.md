# THE GREENHOUSE — SDG 11 3D Survival Game

A standalone HTML/WebGL first-person horror survival game built with [Three.js](https://threejs.org/). It is added separately from MarketM's existing pages.

## Play

**GitHub Pages:** [Open the playable 3D game](https://c-a-studios-viji.github.io/MarketM/greenhouse.html) when the Pages deployment is active. Opening the repository root on GitHub.com shows the source code, not a running game. The GitHub Pages address runs it in-browser.

Open `greenhouse.html` through an HTTP(S) server. From a clone of MarketM, run `python3 -m http.server 8000` and visit `http://localhost:8000/greenhouse.html`. A network connection is required for the pinned Three.js CDN module.

### Controls

- **WASD / arrow keys:** move
- **Mouse:** look around (click game to lock pointer)
- **Shift:** sprint
- **E:** interact with doors, supplies, and boss terminals
- **F:** use a medical supply
- **Esc:** pause
- **Touch:** directional buttons and right-side swipe look, USE button for interaction

## Game design

- **Doors 1–49:** procedurally varied city locations, including apartments, shops, metro, offices, and streets.
- **Door 50:** mid-boss **The Mayor**, defeated by activating three city-system terminals while evading attacks.
- **Doors 51–99:** greenhouse wings with hydroponics, compost, filtration, and the Urban Core.
- **Door 100:** select Rewilding / Rebuilding / Purification, leading to **Overgrowth / Engineer / Smog**. The final bosses use different attack patterns and are defeated by completing three terminal activations.
- Supplies, health, dynamic lighting, shadow maps, fog, first-person camera, enemy patrols, projectile attacks, interactive pickups and progression saving.
- Every tenth or ninth regular door offers a system-repair SDG 11 interaction.

## Free asset and engine licensing

All scene geometry, simple characters, effects, UI, and signage are original procedural assets made in code for this game. The only third-party runtime is [Three.js](https://github.com/mrdoob/three.js), distributed under the MIT license. This ensures that no paid, pirated, or license-ambiguous models are needed. Suitable **optional future upgrades** from verified CC0 libraries include [Poly Haven](https://polyhaven.com/license) and [ambientCG](https://docs.ambientcg.com/license/). Those external libraries are **not bundled or represented as integrated**.

## Technical scope

This is a playable browser-based 3D game, not an Unreal Engine/AAA photorealistic production. Rooms use reusable layouts with procedural variation, not 100 individually hand-modeled levels. Lighting quality, shadows, and frame rate depend on the device and browser. It is single-player and requires WebGL2-capable browser hardware.
