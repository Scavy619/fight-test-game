# Handoff

Read this first when picking the project up in a new session. Keep it current: update it after every accepted task and commit it with that task.

## What this is

MYTHIC NEON: a browser two-player fighting game (TypeScript, Vite, Canvas 2D) with neon procedural fighters inspired by world martial arts and mythology. Design in `docs/SPEC.md`, tasks in `docs/PLAN.md`, original brief in `docs/BRIEF.md`.

## How the work is run

The project uses the `/savvy-flow` process: the main session is the orchestrator (plans, designs, reviews, commits); worker agents (`savvy-light`, `savvy-medium`, `savvy-careful`, `savvy-heavy`, `savvy-fable`) implement one task from `docs/PLAN.md` each. Workers do not commit. The orchestrator reviews the diff, reruns test, lint and build, checks visuals in the browser, then commits and updates this file and the status column in `docs/PLAN.md`. Nothing is pushed unless the user asks.

To resume: run `/savvy-flow continue the project from HANDOFF.md`, or just read "Next step" below and carry on.

## Status

Last updated: 2026-11-14

- Phase: prototype complete, 7 of 14 tasks accepted and committed. `npm run dev` opens Rei (P1) versus Vira (P2), a full two-player best-of-three match. 260 tests pass.
- Accepted: 1 scaffold, 2 engine, 3 combat sim, 4 rig and rendering, 5 lore, 6 fight scene and HUD, 7 fighters Rei and Vira.
- WAITING FOR THE USER: the prototype playtest checkpoint. Do not start tasks 8 to 14 until the user has played and given feedback (or says to continue).
- Tasks 8 to 14 not started.

## Next step

1. Get the user's playtest feedback (feel of movement and attacks, speed, controls on one keyboard, look). Turn concrete complaints into a defect list.
2. Apply feedback, then delegate tasks 8 to 12 in parallel (effects, AI, menus, arenas, audio; briefs in `docs/PLAN.md`), each reviewed and committed separately.
3. Task 13 (Sun Wukong and Thor), then task 14 (balance and polish).

## How to check visuals when the app window is minimized

Browser screenshots time out and `requestAnimationFrame` does not fire while the Claude window is minimized. Workaround used so far: in the page, replace `requestAnimationFrame` with a stub that stores the callback, toggle a fake `document.hidden` plus `visibilitychange` so the loop re-registers through the stub, then call the stored callback with timestamps 16.667 ms apart to step frames; send scripted `KeyboardEvent`s (`code` values) for input; copy the canvas to a JPEG data URL and POST it to a tiny local Node server that writes it to the scratchpad, then read the file.

## savvy-progress panel (set up, needs a new session to show)

The user asked for the savvy-flow progress bar and agents panel. The repo github.com/johnnyvizz/claude-kit is cloned at `C:\Users\<you>\claude-kit` and the mod is loaded through `C:\Users\<you>\.claude\settings.json`: `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-kit/plugins/savvy-progress" }`. It takes effect only in a session started after 2026-11-14. In a new session, check whether `mcp__savvy-progress__progress` is among the tools (possibly deferred) and whether `/agents-info` opens the panel; if so, the savvy-flow skill reports progress to it automatically.

If it does not load: the mod was tested on Claude Code 2.1.286 and the CLI here was 2.1.239 (update Claude Code first); `~` may not expand on Windows (try the absolute path with forward slashes); or use `/plugin marketplace add johnnyvizz/claude-kit` then `/plugin install savvy-progress@claude-kit`. Do not install the `savvy-flow` plugin too; the skill and agents are already installed by hand. To remove the mod, delete the `env` entry from settings.json.

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
- Fight scene notes: after resuming from pause a held attack key reaches the sim as a fresh press (fix in task 10 with the menus: ignore inputs until released); a heavy press backs out of the match-end screen only when `onExit` is set (task 10 sets it); a real time-out, a double KO and gamepads are unit-tested but not yet seen in the browser.
- Fighter notes: `Hitbox` can override `launches` and `knockback` per box (used for launching last hits). Rei's specials do not cancel into his ultimate (keeps combos at 10 hits or fewer); the 10-hit limit is checked by random play only, and a jump-in route may reach 12. Open polish items for tasks 8 and 14: Rei's shadow step reads as a dash (he stays visible; hide the fighter during the pass-through frames and add bursts), ultimate weapon trails cover the wind-ups, Vira's lunge is hard to punish on block, Vira's light and crouchLight look alike, projectiles still use the generic orb.
