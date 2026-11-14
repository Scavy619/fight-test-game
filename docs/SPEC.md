# Mythic Neon: game specification

Working title: **MYTHIC NEON**. A local two-player 2D fighting game in the browser: martial arts, weapons, elemental powers and world mythology, drawn as neon procedural figures.

## 1. Goals and non-goals

Goals (first version):
- Local versus (two players, one keyboard or gamepads) and practice against AI (easy, normal, hard).
- 4 fighters, 3 arenas, best-of-three rounds, health and meter, combos, block, dodge, three specials and one ultimate per fighter, cinematic finisher.
- Character select, arena select, results, pause, controls help, lore screen.
- Data-driven content: a new fighter or arena is one new file plus a registry entry.

Non-goals: online play, story mode, sprite or image assets, mobile touch, more than 4 fighters or 3 arenas.

## 2. Stack

- TypeScript (strict), Vite, Vitest, ESLint flat config. Node 24. Latest stable versions at scaffold time, pinned in `package.json`.
- Canvas 2D only. No runtime dependencies. No image, font or audio asset files: everything is drawn or synthesized in code.

## 3. Architecture

| Folder | Responsibility | May import |
|---|---|---|
| `src/sim/` | Pure deterministic combat simulation. No DOM, no `Math.random`, no time APIs. | nothing outside `sim` |
| `src/content/` | Fighter and arena definitions (data), registries, lore data. | `sim` types, `render` types |
| `src/engine/` | Fixed-step loop, input devices, scene manager, canvas setup. | `sim` types |
| `src/render/` | Rig, poses, neon drawing, weapons, trails, particles, arenas, HUD. | `sim` types, `content` |
| `src/ai/` | AI controller producing `InputFrame`s from sim state. Seeded RNG. | `sim` |
| `src/audio/` | Web Audio synthesized effects and music. | nothing |
| `src/scenes/` | Title, select, fight, results, lore. Wires everything. | all |

The sim advances at a fixed 60 steps per second. Rendering interpolates nothing in the sim; it reads the latest state and plays visual-only effects from sim events.

### 3.1 Coordinates

- Logical canvas 1280 x 720, scaled to fit the window with letterboxing.
- Sim space: `x` in pixels across the stage, `y` is **height above ground** (0 on the ground, positive up). Stage bounds for fighter centres: x 60 to 1220. Renderer maps ground to screen y = 600.
- Move data (hitboxes, velocities) is written facing right; the sim mirrors it by `facing` (1 or -1).

### 3.2 Input

```ts
interface InputFrame {
  left: boolean; right: boolean; up: boolean; down: boolean;
  light: boolean; heavy: boolean; special: boolean; block: boolean; dodge: boolean;
}
```
The sim receives one `InputFrame` per fighter per step and does its own edge detection and a 6-frame press buffer. Humans, gamepads and the AI all produce this struct.

Default bindings:
- P1: `A D` move, `W` jump, `S` crouch, `F` light, `G` heavy, `H` special, `R` block, `T` dodge.
- P2: arrows, `K` light, `L` heavy, `;` special, `I` block, `O` dodge. Numpad `1 2 3 4 5` mirror light, heavy, special, block, dodge.
- Grab button: `Q` (P1), `U` or Numpad 7 (P2), LB on a pad. Power button: `E` (P1), `P` or Numpad 8 (P2), LT on a pad; hold to charge, release to strike. Light + heavy together also grabs (`F G`, `K L`, X + Y, left + right mouse buttons in solo).
- Solo action bar: six clickable buttons above the meters (BLOCK, DODGE, GRAB, POWER, SPECIAL, ULTIMATE). While the cursor is over the bar it stops steering the fighter; the left button presses the hovered action (BLOCK and POWER are held). The two presses may be up to `GRAB_CHORD_FRAMES` (4) apart: a light or heavy that just started becomes the grab when the other button arrives.
- Holding heavy after a heavy normal charges the power strike (`charge` state); releasing, or reaching the maximum charge, throws it. On the mouse: hold the right button.
- Holding back (away from the opponent) blocks when the opponent's strike can reach or a projectile is heading in (proximity guard); back + down blocks low. The block button still works everywhere and is the only way to block pre-emptively.
- Gamepad (standard mapping): stick or d-pad, X light, Y heavy, B special, RB block, A dodge. First pad drives P1 in practice mode; in versus, pad 1 is P1 and pad 2 is P2, keyboard stays active for both.
- Menus: P1 or P2 direction keys navigate, light or dodge confirms (X or A on a pad), heavy goes back (Y), `Esc` or Start pauses, `Enter` also confirms. In solo play both keyboard sets and every connected gamepad drive the human.
- Difficulty handicap: `MatchConfig.damageScale` multiplies the damage and chip each side deals; solo play sets the computer's to 0.5 (easy), 0.8 (normal), 1 (hard). The mouse also works in menus: hover highlights, click confirms.
- Mouse (solo play only, merged with P1's keyboard and pad): the fighter walks toward the cursor outside a 44 px dead zone, jumps when the cursor is more than 1.45 body heights above its feet, crouches when the cursor is below the floor line; left button light, right button heavy, middle button special, right + middle with a full meter ultimate. Block and dodge stay on the keyboard. A click shorter than one step still counts as a press.

### 3.3 Sim rules

Constants (tune in `src/sim/constants.ts`): health 1000, meter 100, round time 60 s, first to 2 rounds.

Fighter states: `idle, walk, crouch, prejump (3f), air, attack, block, blockstun, hitstun, knockdown, getup, dodge, ko, win`.

- **Movement**: walk speed, jump velocity and gravity come from the fighter's stats. Fighters turn to face the opponent whenever grounded and not attacking. Bodies cannot overlap (push apart), except during a forward dodge.
- **Moves** are frame data: `startup`, `active`, `recovery` frames; `damage`; `level` (`mid`, `low`, `overhead`); `hitstun`, `blockstun`; `knockback {x, y}`; one or more hitboxes `{x, y, w, h}` relative to the fighter origin (feet centre), with the frames they are live; optional self velocity per frame range; optional invulnerable frame range; optional projectile spawn; `launches` (causes knockdown); `throw` (unblockable, only hits grounded non-stunned opponents at close range); `chip` fraction; `meterGain`; `cancels` (slots this move may cancel into on hit or block, until a given frame); `anim` id; timed `fx` tags.
- **Move slots**: `light, heavy, crouchLight, crouchHeavy, airLight, airHeavy, specialN, specialF, specialD, ultimate, throw, power`. `special` with no direction is N, with forward held is F, with down held is D. `power` is the charged strike: entered from the `charge` state (heavy held `CHARGE_HOLD_FRAMES` after any heavy, released or auto-fired at `CHARGE_MAX_FRAMES`), `unblockable`, with `armor` frames over its startup (hits deal damage but do not interrupt it unless they KO), launches, never cancels. `throw` is the grab: light and heavy pressed together (within the press buffer) on the ground; its move sets `throw: true`, reaches about 70-80 px, cannot be blocked, whiffs against airborne, stunned or dodging opponents, tosses on hit (`launches`), never cancels, and has enough recovery to be punished on a whiff.
- **Combos**: default cancel chain light → light → heavy → special → ultimate (a light may cancel into one more light, never a third: the sim tracks `chainedFrom`). Cancel windows run to the end of the move once it has connected, so late presses still chain. Each further hit in a combo does 0.9x the previous scaling, floor 0.4. Combo counter resets when the defender leaves hitstun.
- **Block**: hold block. Standing block stops `mid` and `overhead`; crouching block (down + block) stops `mid` and `low`. Air attacks are `overhead`. Blocked specials and ultimates deal chip damage (chip cannot KO). No blocking in the air.
- **Dodge**: 18 frames, invulnerable on frames 3 to 12, travels back by default or forward if forward is held (forward dodge passes through the opponent). 30-frame cooldown.
- **Hitstop**: both fighters freeze for 6 (light), 9 (heavy), 12 (special) frames on hit; half on block.
- **Meter**: gained on dealing hits (move's `meterGain`), half that on blocked hits, and 40% of damage taken / 10. Ultimate costs the full meter.
- **Ultimate**: heavy + special held with at least one newly pressed, meter full, fighter grounded and actionable (or within the first 3 startup frames of heavy or special). Starts with a 45-frame super freeze in which only the caster's animation advances.
- **Finisher**: if an ultimate lands the KO in a round that decides the match, the sim emits `finisher`; the renderer plays the extended cinematic. No separate input.
- **Projectiles**: position, velocity, hitbox, damage, lifetime, owner. Two opposing projectiles cancel each other. One live projectile per owner per move.
- **Rounds**: 90-frame intro (no input), fight, KO or time-out, 120-frame outro. Time-out: higher health fraction wins; equal health replays the round. Meter carries between rounds, health resets.
- **Events**: each `step()` returns events for render and audio: `moveStart, hit, block, whiff, jump, land, dodge, projectileSpawn, projectileHit, projectileClash, superFreeze, ko, finisher, roundStart, roundEnd, matchEnd`, each with position and the fighter or move's `element` and strength where relevant.

### 3.4 Rig and animation

- Skeleton: root at hips; `spine, head, upperArmL/R, lowerArmL/R, upperLegL/R, lowerLegL/R`, plus hand and foot end points. Bone lengths come from the fighter's `look` (height, bulk).
- `Pose = { root: {x, y}, lean: number, angles: Record<Bone, number>, weapon: number }` (radians; `weapon` is the weapon's angle relative to the front forearm).
- `Animation = { frames: {t: number, pose: Pose, ease?: 'linear'|'in'|'out'|'inOut'}[], loop: boolean }` where `t` is in sim frames. The renderer interpolates angles between keys. Attack animations are keyed so the strike pose lines up with the move's active frames.
- Poses are written facing right and mirrored by `facing`.
- Shared base animations (idle, walk, crouch, jump, block, hitstun, knockdown, getup, dodge, ko, win) live in `src/render/anims/base.ts`; each fighter may override any and adds its own attack animations.

## 4. Visual direction

Futuristic neon on near-black, anime-style silhouettes.

- Background base `#070A14`. Fighters are dark bodies (`#0E1324`) with bright neon rim strokes in their accent colour, a wider low-alpha stroke under a thin bright stroke for glow (avoid `shadowBlur` on many paths; it is slow). Effects use `globalCompositeOperation = 'lighter'`.
- Limbs are tapered capsules, not sticks; torso is a shaped polygon; each fighter has a distinct head silhouette and a flowing ribbon element (scarf, sash, tail, cape) simulated as a short chain.
- Weapons leave a fading additive trail during active frames.
- Hit sparks, element particles, screen shake and a brief white flash on heavy hits. Super freeze darkens the arena to 30% and draws speed lines behind the caster.
- Text: `'Segoe UI', system-ui, sans-serif`, weight 800, italic, uppercase, letter-spaced.

Accent colours: Rei `#2FF3E0` (cyan), Vira `#FF8A2A` (fire orange), Sun Wukong `#5CFF8A` (jade), Thor `#9D7BFF` (storm violet). P1 HUD tint `#3DA9FF`, P2 HUD tint `#FF4D6D`.

HUD: health bars top left and right draining toward the centre with a delayed white "damage ghost"; fighter names under the bars; round pips next to the names; timer top centre; meter bars bottom left and right, pulsing when full; combo counter at the side of the attacker; centre announcer text (ROUND 1, FIGHT, K.O., name WINS).

## 5. Roster

Elements are tags used for particles and sound: `wind, fire, earth, lightning, shadow`.

| Fighter | Kind | Style, weapon | Stats | specialN | specialF | specialD | Ultimate |
|---|---|---|---|---|---|---|---|
| **Rei Kurogane** | Original champion who channels Susanoo | Kenjutsu, ninjutsu; katana | Fast, low health (900) | Shuriken (projectile) | Wind-slash dash | Shadow step (teleport behind) | Eightfold Storm: eight-slash rush |
| **Vira** | Original champion who channels Kartikeya | Kalaripayattu; vel spear | Balanced (1000), long reach | Spiral Orb (slow energy sphere) | Spear lunge | Leaping flame arc (anti-air) | Vel of the Six Fires: spear rain |
| **Sun Wukong** | Himself | Wushu; Ruyi staff | Agile (950), high jump | Clone strike (delayed clone attacks) | Cloud dash (passes through) | Staff pillar slam (earth, low) | Havoc in Heaven: giant staff |
| **Thor** | Himself | Hammer; glima wrestling | Slow, tough (1150) | Hammer throw (returns) | Charging shoulder | Glima throw (command throw) | Mjolnir's Judgment: lightning column |

## 6. Arenas

Each arena is a procedural parallax scene (far, mid, near layers, ground, ambient particles) with its own palette:
- **Storm Shrine** (Japan): neon torii and shimenawa over a dark sea, rain, distant lightning.
- **Lamp Citadel** (India): temple gopuram silhouettes at dusk, rows of oil lamps, drifting embers.
- **Bifrost Bridge** (Norse): bridge of crystal light with a burning red band, aurora bands, falling snow, Yggdrasil silhouette.

## 7. Mythology and respect rules

- Figures worshipped today as major deities (Shiva, Vishnu, Kali, Durga, Kartikeya, Amaterasu, Susanoo and others) are never playable and never shown being struck. They appear as patrons whose power an original champion channels.
- Legendary heroes and tricksters long depicted as fighters in popular retellings (Sun Wukong, Thor) are playable as themselves.
- `docs/LORE.md` and the in-game lore screen give, per fighter and arena, two clearly labelled parts: **Tradition** (what the source mythology says) and **In this game** (our fiction).
- No real anime names or characters. "Spiral Orb" is our own energy-sphere move.

## 8. Definition of done (first version)

- `npm run test`, `npm run lint`, `npm run build` pass.
- Both modes playable start to finish through menus; all 4 fighters and 3 arenas selectable.
- Every fighter has all 12 move slots (including the grab and the power strike), animations for every state (`charge` may use the shared base animation), and an ultimate with super freeze.
- AI at three difficulties is beatable on easy and puts up a fight on hard.
- AI-versus-AI balance run shows no pairing worse than about 60/40.
- Holds 60 fps on a normal laptop in Chrome.
