# Handoff

Read this first when picking the project up in a new session. Keep it current: update it after every accepted task and commit it with that task.

## What this is

MYTHIC NEON: a browser two-player fighting game (TypeScript, Vite, Canvas 2D) with neon procedural fighters inspired by world martial arts and mythology. Design in `docs/SPEC.md`, tasks in `docs/PLAN.md`, original brief in `docs/BRIEF.md`.

## How the work is run

The project uses the `/savvy-flow` process: the main session is the orchestrator (plans, designs, reviews, commits); worker agents (`savvy-light`, `savvy-medium`, `savvy-careful`, `savvy-heavy`, `savvy-fable`) implement one task from `docs/PLAN.md` each. Workers do not commit. The orchestrator reviews the diff, reruns test, lint and build, checks visuals in the browser, then commits and updates this file and the status column in `docs/PLAN.md`. Nothing is pushed unless the user asks.

To resume: run `/savvy-flow continue the project from HANDOFF.md`, or just read "Next step" below and carry on.

## Status

Last updated: 2026-11-14

- Phase: foundation complete, 5 of 14 tasks accepted and committed.
- Accepted: 1 scaffold, 2 engine (`?debug=input` shows live inputs), 3 combat sim (104 tests), 4 rig and neon rendering (44 tests; look reviewed in `/gallery.html`), 5 lore.
- In progress: task 6 (fight scene and HUD, `savvy-medium`). Uncommitted files in `src/scenes`, `src/render/hud.ts`, `src/main.ts` are unreviewed worker output.
- Tasks 7 to 14 not started.

## Next step

1. Review task 6: run test, lint, build; play a full best-of-three match in the browser with both key sets; commit.
2. Delegate task 7 (Rei and Vira, `savvy-careful`), review, commit.
3. Stop for the user's playtest of the two-player prototype.
4. Then tasks 8 to 12 in parallel, 13, 14 (see `docs/PLAN.md`).

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
