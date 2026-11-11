# Handoff

Read this first when picking the project up in a new session. Keep it current: update it after every accepted task and commit it with that task.

## What this is

MYTHIC NEON: a browser two-player fighting game (TypeScript, Vite, Canvas 2D) with neon procedural fighters inspired by world martial arts and mythology. Design in `docs/SPEC.md`, tasks in `docs/PLAN.md`, original brief in `docs/BRIEF.md`.

## How the work is run

The project uses the `/savvy-flow` process: the main session is the orchestrator (plans, designs, reviews, commits); worker agents (`savvy-light`, `savvy-medium`, `savvy-careful`, `savvy-heavy`, `savvy-fable`) implement one task from `docs/PLAN.md` each. Workers do not commit. The orchestrator reviews the diff, reruns test, lint and build, checks visuals in the browser, then commits and updates this file and the status column in `docs/PLAN.md`. Nothing is pushed unless the user asks.

To resume: run `/savvy-flow continue the project from HANDOFF.md`, or just read "Next step" below and carry on.

## Status

Last updated: 2026-11-11

- Phase: setup. Spec, plan and handoff docs written. No code yet.
- Accepted tasks: none.
- In progress: design mockups and spec approval by the user.

## Next step

1. User approves `docs/SPEC.md` and `docs/PLAN.md` (after seeing the screen mockups).
2. Delegate task 1 (scaffold) to `savvy-light`, review, commit.
3. Delegate tasks 2, 3, 4, 5 in parallel.

## Decisions made (do not reopen without the user)

- Browser, TypeScript, Canvas 2D, Vite; no runtime dependencies or asset files.
- Procedural neon skeletal rigs, not sprites.
- First version: 4 fighters (Rei Kurogane, Vira, Sun Wukong, Thor), 3 arenas (Storm Shrine, Lamp Citadel, Bifrost Bridge).
- Mythology: heroes and tricksters playable as themselves; major worshipped gods only as patrons channelled by original champions; lore separates Tradition from In this game.
- Prototype checkpoint after task 7: the user playtests before effects, AI, menus and the other fighters are built.

## How to run

Not yet scaffolded. After task 1: `npm install`, then `npm run dev` and open http://localhost:5173.

## Known issues and notes

- None yet.
