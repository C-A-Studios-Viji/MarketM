# The Greenhouse

A first-person 3D survival game about restoring civic infrastructure, inspired by UN Sustainable Development Goal 11. The expedition spans 100 doors, from the abandoned city and City Hall to the greenhouse and Urban Core.

[Play on GitHub Pages](https://c-a-studios-viji.github.io/MarketM/greenhouse.html)

## How to play

- **WASD or arrow keys** to move, **mouse** to look, **E** to use a nearby station, **Shift** to sprint, **F** to heal, and **Esc** to pause.
- On a touchscreen, use the direction buttons and drag on the right to look. Use, Heal and Pause have dedicated buttons.
- Complete the **amber repair station** to unlock the far door. Later rooms also require one or two **green relays**.
- The **blue side station** offers an optional minigame and rewards one medkit. You can carry up to six.
- In river rooms, follow the yellow rails across the bridge. Clearing the River Cleanup challenge removes floating litter and improves water clarity.
- Walk or sprint away from attack cues. Sprinting drains stamina and alerts enemies from farther away. The Sentinel charges, the Root Crawler lunges, and the Canal Skimmer fires across the room.
- At Door 50, repair three terminals to defeat The Mayor. At Door 100, the Rewilding, Rebuilding or Purification protocol determines the final boss and its terminal challenges.
- Continue from the main menu to restore your current door, repair and side-game progress, health, medkits and final protocol. Previous Greenhouse saves can continue at their saved door.

## Challenges

| Minigame | Objective |
| --- | --- |
| Circuit Bypass | Rotate the pipes to connect the input to the output. |
| Signal Echo | Replay and repeat a signal sequence. |
| Pressure Lock | Catch the marker in the green band. |
| Waste Shift | Sort materials into the designated waste streams. |
| River Cleanup | Recover litter while leaving wildlife and natural material in the river. |
| Valve Balance | Adjust the inlet and drain to reach the target pressure. |

## Run locally

Start an HTTP server from the repository root with `python3 -m http.server 8000`. Open `http://localhost:8000/greenhouse.html`. The game needs a WebGL2-capable browser and an internet connection to load the pinned [Three.js](https://github.com/mrdoob/three.js) module (MIT).

## Asset credits

The room textures below are distributed under [Poly Haven's CC0 license](https://polyhaven.com/license). Color maps are bundled as resized WebP files. Geometry, water animation, effects and sound cues are produced by the game.

| Bundled texture | Source |
| --- | --- |
| Weathered concrete | [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02) |
| Greenhouse ground | [Forest Floor](https://polyhaven.com/a/forest_floor) |
| Riverbed and banks | [River Small Rocks](https://polyhaven.com/a/river_small_rocks) |
