# Handoff

Read this first when picking the project up in a new session. Keep it current: update it after every accepted task and commit it with that task.

## What this is

MYTHIC NEON: a browser two-player fighting game (TypeScript, Vite, Canvas 2D) with neon procedural fighters inspired by world martial arts and mythology. Design in `docs/SPEC.md`, tasks in `docs/PLAN.md`, original brief in `docs/BRIEF.md`.

## How the work is run

The project uses the `/savvy-flow` process: the main session is the orchestrator (plans, designs, reviews, commits); worker agents (`savvy-light`, `savvy-medium`, `savvy-careful`, `savvy-heavy`, `savvy-fable`) implement one task from `docs/PLAN.md` each. Workers do not commit. The orchestrator reviews the diff, reruns test, lint and build, checks visuals in the browser, then commits and updates this file and the status column in `docs/PLAN.md`. Nothing is pushed unless the user asks.

To resume: run `/savvy-flow continue the project from HANDOFF.md`, or just read "Next step" below and carry on.

## Status

Last updated: 2026-11-11 (session paused when the usage limit was reached)

- Phase: foundation, 4 of 14 tasks accepted and committed.
- Accepted: 1 scaffold, 2 engine (loop, input, menu input, scene manager; `?debug=input` shows live inputs), 3 combat sim (104 tests), 5 lore (`docs/LORE.md`, `src/content/lore.ts`).
- Task 4 (rig and neon rendering, `savvy-careful`) was still running when the session paused. Its output is UNREVIEWED and UNCOMMITTED: `src/render/**`, `gallery.html`, `src/gallery.ts`. It may be incomplete.
- Tasks 6 to 14 not started.

## Next step

1. Task 4: run `npx vitest run src/render`, `npm run lint`, `npm run build`; open `npm run dev` at `/gallery.html` and judge the look against SPEC 3.4 and 4 and the task 4 brief in `docs/PLAN.md`. If the worker was cut off, send the defects or the remaining work to a `savvy-careful` worker. Then commit, add its files to `filemap.md`, mark it accepted in `docs/PLAN.md`.
2. Delegate task 6 (fight scene and HUD, `savvy-medium`), review, commit.
3. Delegate task 7 (Rei and Vira, `savvy-careful`), review, commit.
4. Stop for the user's playtest of the two-player prototype.
5. Then tasks 8 to 12 in parallel, 13, 14 (see `docs/PLAN.md`).

## savvy-progress panel (optional, not finished)

The user asked for the savvy-flow progress bar and agents panel. The repo is cloned at `C:Usersittuclaude-kit` (github.com/johnnyvizz/claude-kit). The mod `plugins/savvy-progress` was scanned: no network, file or shell calls; it only registers two progress tools, a `/agents-info` command, UI panes, and appends one progress-reporting line to `savvy-*` worker briefs. NOT yet done: adding it to `C:Usersittu.claudesettings.json` as `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-kit/plugins/savvy-progress" }` (the user approved this), then starting a new session. Unknowns: whether `~` expands on Windows, and the mod was tested on Claude Code 2.1.286 while the CLI here is 2.1.239. Alternative: `/plugin marketplace add johnnyvizz/claude-kit` then `/plugin install savvy-progress@claude-kit`. Do not install the `savvy-flow` plugin too; the skill and agents are already installed by hand.

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
