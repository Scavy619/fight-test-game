# Handoff

Read this first when picking the project up in a new session. Keep it current: update it after every accepted task and commit it with that task.

## What this is

MYTHIC NEON: a browser two-player fighting game (TypeScript, Vite, Canvas 2D) with neon procedural fighters inspired by world martial arts and mythology. Design in `docs/SPEC.md`, tasks in `docs/PLAN.md`, original brief in `docs/BRIEF.md`.

## How the work is run

The project uses the `/savvy-flow` process: the main session is the orchestrator (plans, designs, reviews, commits); worker agents (`savvy-light`, `savvy-medium`, `savvy-careful`, `savvy-heavy`, `savvy-fable`) implement one task from `docs/PLAN.md` each. Workers do not commit. The orchestrator reviews the diff, reruns test, lint and build, checks visuals in the browser, then commits and updates this file and the status column in `docs/PLAN.md`. Nothing is pushed unless the user asks.

To resume: run `/savvy-flow continue the project from HANDOFF.md`, or just read "Next step" below and carry on.

## Phase 2: ASTRA (started 2026-11-15)

The user approved a new direction: the game becomes **ASTRA**, a single-player mythic-fantasy fighter with eight heroes from their "Astra: Eight Heroes" art brief (Arjuna, Karna, Abhimanyu, Ghatotkacha, Parashurama, Ekalavya, Ashwatthama, Bhima), a campaign, arcade, versus CPU, practice and gallery. Rei and Vira are replaced once Arjuna and Bhima exist. The full plan (data model, sim mechanics, render kit, scenes, campaign, work order A1–A9) is in `docs/PLAN.md` "Phase 2" and `docs/SPEC.md` sections 1, 5 and 7 (the mythology rule was rewritten with the user's consent). Concept boards live outside the repo (`E:\Projects\0 GPT\gpt game test start\output\`) and are reference only: no image assets.

- A1 (foundation) done: ASTRA title and main menu (`src/scenes/mainMenu.ts`, `listMenu.ts`), controls screen shown before the first fight (`controlsScreen.ts`), `SaveStore` (`src/engine/save.ts`, key `astra.save.v1`), hero profile types (`src/content/types.ts`). The old mode select is gone; `?mode=` deep links still work. Story, Arcade, Practice and Gallery appear disabled in the menu with the slice that adds them named.
- A2 (sim mechanics) done: `moveFor`/`moveInStance` and stances, shields (`grants`), late-guard pierce, zones (`src/sim/zones.ts`: slow, strike, decoy, mark; ticked after physics, decoys resolved before hits), `returning` projectiles, slow fields; validator rules; the AI steps out of strike lanes. Events for all of it (zoneSpawn/Strike/End, decoyBroken, shieldGain/Absorb/Break, stanceChange, slowed) are emitted but not yet drawn: A3 adds `zoneView` and `statusLabels`. Tests in `src/sim/mechanics.test.ts`.
- A3 (render kit) done: weapons `bow`, `mace`, `axe`, `sword`; head styles `crown`, `curls`, `hermit`; ribbons `shawl`, `quiver`; `projectileView.ts` (arrow, shockwave, axe, orb; heroes declare `HeroEntry.projectiles`), `zoneView.ts` (strike lanes with countdown, marks, slow fields, decoy outlines, all labelled in text), `statusLabels.ts`, `portrait.ts` (procedural cards from the real rig), stage palettes (`STAGE_PALETTES`, `FightConfig.palette`). The fight scene draws all of it; a fighter's weapon hides while a `hideWeaponWhileProjectile` move's projectile is live. Draft looks for the eight heroes are in `ASTRA_LOOKS` (`/gallery.html?set=astra`); A4+ moves each into its hero file. Not yet seen in a real fight (no hero uses zones or the new projectiles yet): check once Arjuna exists.
- Dev server: started in a terminal tab each session (`npm run dev`); the tab closes when the app restarts.
- Next: A4 Arjuna and Bhima (hero files with profile, anims, lore; remove Rei and Vira; character select; Versus CPU and Two Players on the new roster).

## Status (phase 1, kept for reference)

Last updated: 2026-11-15 (A1)

- Phase: 8 of 14 tasks done. `npm run dev` opens a mode select: two players, or solo against the AI (easy, normal, hard) with keyboard plus mouse for P1. 273 tests pass.
- Accepted: 1 scaffold, 2 engine, 3 combat sim, 4 rig and rendering, 5 lore, 6 fight scene and HUD, 7 fighters Rei and Vira, 9 AI opponent (done 2026-11-14 on the second PC, directly in the main session because the savvy-flow skill only loads in a new session there).
- The playtest checkpoint is passed: the user's first feedback was "add single player, with mouse clicks to attack and the mouse to move when playing the bot", which task 9 plus `src/engine/mouse.ts` and the interim `src/scenes/modeSelect.ts` deliver. Second feedback: "button and mouse instructions on screen and in the pause menu", delivered by `src/render/controlsHelp.ts` (strip above the meters, panel in pause and on the mode select). The user also asked for "power ups and grappling": the grab was then added for every fighter (2026-11-14, SPEC 3.2 and 3.3): an 11th move slot `throw`, started by light + heavy together, unblockable, close, tosses on hit; Rei and Vira have grab data and animations, the test fighter and `baseAnims` a generic one, the AI grabs blocking opponents, and the help text names it (F+G, K+L, left + right mouse). Third feedback round (same day), all in: the grab chord tolerates a 4-frame stagger (`GRAB_CHORD_FRAMES`); "power" became the **power strike** (12th slot `power`: hold heavy after a heavy, `charge` state, release or auto-fire; armoured wind-up, unblockable, launches; Rei 130, Vira 160); chains are easier (light → light once, cancel windows to the end of the move, combo bound raised to 12 hits); and holding back blocks when attacked (proximity guard, `underAttack` in `src/sim/fighter.ts`), which also gives mouse players a block. Fourth round (2026-11-15): the user still found grab and power hard to find and the game too hard on easy, so `InputFrame` gained dedicated `grab` and `power` buttons (`Q`/`E`, `U`/`P`, pad LB/LT), solo play got a clickable action bar (`src/render/actionBar.ts`: BLOCK, DODGE, GRAB, POWER, SPECIAL, ULTIMATE, drawn through `FightConfig.overlay`), and easy/normal AI were softened (easy: 30-frame reaction, 50% mistakes, 12% block). Hard is unchanged and now mixes in the power strike. Fifth round: easy was still too hard, so the sim gained `damageScale` per side (easy computer deals 0.5x, normal 0.8x) and easy/normal reactions slowed again; "hand and body movement" got a first pass (idle breath with weight shift, arm swing and blade/spear pump in the walk cycles of Rei and Vira; task 14 should continue with attack anticipation and follow-through, and hitstun/block poses); and "controller support" was checked and extended: pads already drove P1/P2, now A also confirms in menus, any pad drives the human in solo, the mode select shows whether a pad is detected, and the help lists LB grab / LT power. Gamepads were not tested on real hardware here.
- Tasks 8, 10, 11, 12, 13, 14 not started.

## Next step

1. Ask the user how solo play and the mouse controls feel (walk dead zone, jump zone height, difficulty gap) and adjust `MOUSE_*` constants in `src/engine/mouse.ts` or `DIFFICULTIES` in `src/ai/controller.ts`.
2. Delegate tasks 8, 10, 11, 12 in parallel (effects, menus, arenas, audio; briefs in `docs/PLAN.md`), each reviewed and committed separately. Task 10 replaces the interim mode select, keeps its mouse support (hover, click) and the solo difficulties, and should let the player pick the fighter for solo too.
3. Task 13 (Sun Wukong and Thor), then task 14 (balance and polish; `runAiMatch` in `src/ai/simulate.ts` is the headless runner to build on).

## How to check visuals when the app window is minimized

Browser screenshots time out and `requestAnimationFrame` does not fire while the Claude window is minimized. Workaround used so far: in the page, replace `requestAnimationFrame` with a stub that stores the callback, toggle a fake `document.hidden` plus `visibilitychange` so the loop re-registers through the stub, then call the stored callback with timestamps 16.667 ms apart to step frames; send scripted `KeyboardEvent`s (`code` values) for input; copy the canvas to a JPEG data URL and POST it to a tiny local Node server that writes it to the scratchpad, then read the file.

## savvy-progress panel (working)

The savvy-flow progress bar and agents panel are loaded by hand on the original PC: github.com/johnnyvizz/claude-kit is cloned at `C:\Users\<you>\claude-kit` and `C:\Users\<you>\.claude\settings.json` has `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-kit/plugins/savvy-progress" }`. Confirmed working on 2026-11-14: the tools `mcp__savvy-progress__progress` (orchestrator; may need loading with ToolSearch) and `mcp__savvy-progress__step` (workers) are available, and the flow was reported as 7 of 14 tasks. In a new session, report the plan again with `progress` (task titles must equal the Agent `description` used when delegating; the titles are the Task column of `docs/PLAN.md`). Do not install the `savvy-flow` plugin on top of the hand-installed skill and agents.

## Repository and other computers

- GitHub: https://github.com/Scavy619/fight-test-game (PUBLIC, branch `main`). The user asked for the project to be pushed there on 2026-11-14. Push after each accepted task from now on only if the user confirms that standing wish; so far they asked for this one push.
- The user wants the same interface on another device they call `balajidesk`. It is not reachable from the original PC's session (not a saved SSH connection), so it is set up from the repo: clone, `npm install`, `node claude-setup/install.mjs`, new session. Steps in `docs/SETUP-NEW-PC.md`.
- A transfer zip (project plus setup notes) is attached to the GitHub release `transfer-2026-11-14`.
- Before the first push, the Windows user name was replaced by `<you>` in this file across the whole history (commit hashes changed on 2026-11-14). Keep personal details (user names, email, local paths with a user name) out of committed files: the repo is public.

## Decisions made (do not reopen without the user)

- Browser, TypeScript, Canvas 2D, Vite; no runtime dependencies or asset files.
- Procedural neon skeletal rigs, not sprites.
- First version: 4 fighters (Rei Kurogane, Vira, Sun Wukong, Thor), 3 arenas (Storm Shrine, Lamp Citadel, Bifrost Bridge).
- Mythology: heroes and tricksters playable as themselves; major worshipped gods only as patrons channelled by original champions; lore separates Tradition from In this game.
- Prototype checkpoint after task 7: the user playtests before effects, AI, menus and the other fighters are built.

## How to run

`npm install`, then `npm run dev` and open http://localhost:5173.

## Known issues and notes

- TypeScript is pinned to 6.0.x because typescript-eslint does not support 7 yet.
- The sim lint rule forbids `../` imports, so keep `src/sim/` flat (no subfolders) or adjust the rule in `eslint.config.js`.
- The user has seen the screen mockups (fight screen, character select) and has not asked for changes so far.
- Lore review decisions: Rei's ultimate was renamed from "Storm of Kusanagi" to "Eightfold Storm" (Kusanagi is one of Japan's Imperial Regalia; Rei's katana is his own). Thor and Sun Wukong stay playable as the user chose, though both have living veneration; the lore says so respectfully. Nezha and Loki in the backlog need the user's confirmation before being made playable.
- Sim notes for later tasks: `moveFrame` and `stateFrame` are 1-based; hitboxes are lower-left boxes relative to the feet centre (see `src/sim/geometry.ts`); there is an extra `land` state (4 frames after an air attack lands; draw it with the crouch pose); ultimate startup must exceed the 45-frame super freeze; throws exist only as a `throw: true` move property; `passThrough` frame ranges skip body push (for dashes and teleports); there is no juggle limit, so new fighters' frame data must be checked for infinites (the randomized combo test in `src/sim/data.test.ts` is the pattern).
- Render notes for later tasks: animations are written with `pose()`/`key()`/`anim()` in `src/render/pose.ts` (degrees); weapon trails should be recorded only on a move's active frames (the gallery records whole animations, so its swooshes are oversized); the walk animation slides about 1.6 px per frame and needs matching to each fighter's walk speed; polish candidates for task 14: smoother trail shading, stronger strike silhouettes, wider cape, Wukong's feathers.
- Node: the project runs on Node 22.18 as well (install, test, lint, build all pass); `docs/SETUP-NEW-PC.md` says 24 but nothing enforces it.
- Power strike notes: new fighters need a `power` slot (`unblockable`, `armor` over the startup, no cancels) and a `${id}.power` animation; the shared `charge` animation in `src/render/anims/base.ts` is used for the charging stance unless the fighter overrides it. The AI does not use the power strike yet (task 14 candidate), and the charge has no particle feedback yet (task 8: a growing glow while `state === 'charge'`, and an `armored` hit event flash).
- Grab notes: new fighters need a `throw` slot (`throw: true`, no cancels; `validateFighterDef` checks both) and an animation of the move's length; the weapon-tip content test skips throw moves. Thor's command throw (task 13) can be his `specialD` as planned, on top of the shared grab.
- AI notes: the controller is `src/ai/controller.ts`; it sees the opponent `reaction` frames late (ring buffer), presses buttons for 2 frames, and judges range with `moveReach` (hitbox extent plus the move's own travel). Hard beat easy 14+ of 20 in the test with the seeds used; if a future fighter or balance change makes that test flaky, tune `DIFFICULTIES` rather than the seeds. The AI's P1 "CPU" is not labelled in the HUD yet (task 10 or 14).
- Mouse notes: `MouseInput` is polled in `stepGame`; `takeClick()` is a one-shot "any button went down" for menus, consumed every step by the fight scene so a click cannot linger. The browser pane inside the Claude app throttles `requestAnimationFrame` to about 10 fps, so play checks there are slow; play in a normal browser window.
- Fight scene notes: after resuming from pause a held attack key reaches the sim as a fresh press (fix in task 10 with the menus: ignore inputs until released); a heavy press backs out of the match-end screen only when `onExit` is set (task 10 sets it); a real time-out, a double KO and gamepads are unit-tested but not yet seen in the browser.
- Fighter notes: `Hitbox` can override `launches` and `knockback` per box (used for launching last hits). Rei's specials do not cancel into his ultimate (keeps combos at 10 hits or fewer); the 10-hit limit is checked by random play only, and a jump-in route may reach 12. Open polish items for tasks 8 and 14: Rei's shadow step reads as a dash (he stays visible; hide the fighter during the pass-through frames and add bursts), ultimate weapon trails cover the wind-ups, Vira's lunge is hard to punish on block, Vira's light and crouchLight look alike, projectiles still use the generic orb.
