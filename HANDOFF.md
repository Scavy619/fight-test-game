# Handoff

Read this first when picking the project up in a new session. Keep it current: update it after every accepted task and commit it with that task.

## What this is

MYTHIC NEON: a browser two-player fighting game (TypeScript, Vite, Canvas 2D) with neon procedural fighters inspired by world martial arts and mythology. Design in `docs/SPEC.md`, tasks in `docs/PLAN.md`, original brief in `docs/BRIEF.md`.

## How the work is run

The project uses the `/savvy-flow` process: the main session is the orchestrator (plans, designs, reviews, commits); worker agents (`savvy-light`, `savvy-medium`, `savvy-careful`, `savvy-heavy`, `savvy-fable`) implement one task from `docs/PLAN.md` each. Workers do not commit. The orchestrator reviews the diff, reruns test, lint and build, checks visuals in the browser, then commits and updates this file and the status column in `docs/PLAN.md`. Nothing is pushed unless the user asks.

To resume: run `/savvy-flow continue the project from HANDOFF.md`, or just read "Next step" below and carry on.

## Status

Last updated: 2026-11-11

- Phase: foundation. Scaffold is in (Vite 8, TypeScript 6.0, Vitest 5, ESLint 10); the page shows a placeholder title.
- Accepted tasks: 1 (scaffold), 2 (engine: loop, input, menu input, scene manager; `?debug=input` shows live inputs), 3 (combat sim: 104 tests), 5 (lore: `docs/LORE.md`, `src/content/lore.ts`).
- In progress: task 4 (rig and rendering), delegated. If a session ends mid-way, check `git status`: uncommitted work in `src/engine`, `src/sim`, `src/render`, `docs/LORE.md` is unreviewed worker output. Review it against the briefs in `docs/PLAN.md` before committing.

## Next step

1. Review and commit tasks 2 to 5 (one commit each).
2. Delegate task 6 (fight scene and HUD), then task 7 (Rei and Vira).
3. Stop for the user's playtest of the prototype.

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
