# ASTRA: game specification

Title: **ASTRA** (engine and package name `mythic-neon`; the prototype was called Mythic Neon). A single-player mythic-fantasy 2D fighting game in the browser, inspired by Indian epic traditions, drawn as neon procedural figures. Two players on one keyboard or two pads remain supported. The campaign and lore are an original fictional adaptation inspired by epic traditions, not a retelling, and the game says so on the title, campaign and gallery screens.

## 1. Goals and non-goals

Goals (ASTRA, phase 2; phase 1 was the four-fighter prototype):
- Eight playable heroes from the "Astra: Eight Heroes" brief (section 5), each with a distinct weapon style, combat role, bio, campaign role and unlock condition.
- Modes: Story Campaign (eight chapters, choices, saves), Arcade (ladder with a rival and a per-hero ending), Versus CPU (easy, normal, hard), Two Players, Practice (dummy modes, reset, move list), Character Gallery, Controls.
- Best-of-three rounds, health and meter, combos, block (button or hold back), dodge, grab, power strike, three specials and one ultimate per hero; readable startup, impact and recovery with counterplay; status effects named in text, never by colour alone.
- Data-driven content: a hero is one file (`src/content/heroes/<id>.ts`) whose single profile feeds the select screen, gallery, practice move list and combat.
- Saves in `localStorage` (versioned, safe defaults, in-memory fallback).

Non-goals: online play, image, font or audio asset files, mobile touch, paid services or accounts, parallax arenas and audio (later phases).

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

Accent colours per hero come from the brief's palettes (section 5). P1 HUD tint `#3DA9FF`, P2 HUD tint `#FF4D6D`. Status effects (shield, armour, slowed, stance, charging) are shown as short text tags over the fighter as well as by colour.

HUD: health bars top left and right draining toward the centre with a delayed white "damage ghost"; fighter names under the bars; round pips next to the names; timer top centre; meter bars bottom left and right, pulsing when full; combo counter at the side of the attacker; centre announcer text (ROUND 1, FIGHT, K.O., name WINS).

## 5. Roster

Elements are tags used for particles and sound: `wind, fire, earth, lightning, shadow`.

Every hero has one rendered weapon; secondary weapons appear through projectiles and visuals (arrows from a bow, a thrown axe). Each hero also has the shared grab (`throw`) and power strike (`power`) slots.

| Hero | Title, palette, element | Rendered weapon | Health · pace | specialN | specialF | specialD | Ultimate | Unlock |
|---|---|---|---|---|---|---|---|---|
| **Arjuna** | The Astra-Bound Archer · indigo, bronze, saffron · wind | bow (short blade for close normals) | 900 · fast | Arrow Volley (fan arrow, 2 hits, short range) | Piercing Astra (charged arrow, pierces a guard raised late) | Archer's Step (invulnerable side-step) | Celestial Salvo: skyward shot, three warned arrow lanes | start |
| **Bhima** | The Mountain's Strength · forest green, bronze, stone · earth | mace (gada) | 1150 · slow | Earthsplitter (ground shockwave) | Iron Grip (command grab) | Shoulder Rush (armoured dash) | Mountain's Wrath: heavy blows into a shockwave | start |
| **Karna** | The Sun's Chosen · gold, carmine, navy · fire | spear (arrows as projectiles) | 1000 · medium | Sunline Shot (fast arrow) | Spearpoint Lunge | Radiant Armor (shield: absorbs one light or heavy hit) | Solar Descent: leap onto a marked landing zone | chapter 4 |
| **Abhimanyu** | The Circle Breaker · emerald, silver, amber · lightning | sword | 900 · fastest | Spinning Edge | Breakthrough Dash (passes through, punishable landing) | Formation Breaker (three pushing strikes) | Chakravyuha Break: three marked paths, interruptible finish | start |
| **Ghatotkacha** | The Night-Born Guardian · indigo, violet, silver · shadow | mace (tall, broad) | 1100 · medium, high jump | Phantom Double (decoy) | Shadow Leap | Nightfall Slam (marked crash) | Sky of Illusions: decoys, then a telegraphed slam | chapter 5 |
| **Parashurama** | The Axe-Bearing Teacher · ochre, forest green, iron · earth | axe (parashu) | 1050 · medium-slow | Return Arc (returning axe) | Crescent Axe (wide, visible startup) | Tempered Stance (shield: halves one hit, broken by heavy) | Storm of the Parashu: sweeps with gaps | start |
| **Ekalavya** | The Self-Taught Archer · moss, bark, copper · wind | bow (knife for close normals) | 950 · fast | Swift Arrow | Snare (slow-field trap) | Hunter's Step (back-step and arrow) | Warden's Net: slow field and arrow rain | chapter 2 |
| **Ashwatthama** | The Wounded Veteran · charcoal, crimson, electric blue · lightning | sword (bow stance via projectiles) | 1000 · medium | Astra Burst (unstable projectile) | Stance Shift (blade ⇄ bow) | stance-dependent (rising cut / short volley) | Unstable Astra: three telegraphed stages | finish the campaign, or clear Arcade |

Starting roster: Arjuna, Bhima, Abhimanyu, Parashurama. Unlock conditions are always shown in the interface.

## 6. Arenas

One procedural stage (`src/render/stage.ts`) with a palette per chapter and mode (sky, horizon glow, grid colours). Parallax arenas are a later phase.

## 7. Mythology and respect rules

- The roster is drawn from epic warriors (Mahabharata figures and, by the user's explicit decision, Parashurama) and they are playable as themselves. Figures worshipped today as major deities (Shiva, Vishnu, Durga, Kali, Hanuman, Rama and others) are never playable, never shown being struck and never antagonists; they may be named in Tradition text or as patrons only.
- No sacred figure is the butt of a joke; no revered figure is a villain. Ashwatthama is a complex antagonist with motives, never a monster. Women characters, where they appear in dialogue, have agency; no exploitative depictions of humiliation or violence. No gore, no sexualised costume, no "exotic" decoration: distinct armour, weapons, silhouettes and palettes instead.
- The campaign is an original fiction (the Hollow Astra) inspired by epic themes; the game states that it is a fictional adaptation and does not claim to retell any tradition or regional version.
- `docs/LORE.md` and the gallery give, per hero, two clearly labelled parts: **Tradition** (what the sources say, with references) and **In this game** (our fiction).
- No real anime names or characters.

## 8. Definition of done (ASTRA)

- `npm run test`, `npm run lint`, `npm run build` pass.
- Every mode is playable start to finish through the menus by keyboard, mouse and gamepad; locked content shows its unlock condition; saves survive a reload.
- Every hero has all 12 move slots, animations for every move, an ultimate with super freeze, a profile (title, identity, bio, loadout, move descriptions with counterplay, campaign role, unlock) and lore.
- The campaign's eight chapters run end to end with at least one choice that changes a fight, dialogue, reward or order.
- AI at three difficulties is beatable on easy and puts up a fight on hard; the AI-versus-AI balance run shows no pairing worse than about 60/40 at hard.
- Holds 60 fps on a normal laptop in Chrome.
