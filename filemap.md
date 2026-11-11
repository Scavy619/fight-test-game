# File map

`path — what lives here / when to touch it`

- `HANDOFF.md` — session handoff: status, next step, decisions. Update after every accepted task.
- `CLAUDE.md` — short rules and commands loaded into every session.
- `docs/SPEC.md` — game design and architecture. Change only with the user's agreement.
- `docs/PLAN.md` — task list, briefs, status.
- `docs/BRIEF.md` — the user's original project brief (full lists of styles, weapons, gods).
- `docs/LORE.md` — (task 5) mythology research, game fiction, future roster backlog.
- `package.json` — npm scripts and pinned devDependencies.
- `tsconfig.json` — strict TypeScript settings (typecheck only, no emit).
- `vite.config.ts` — Vite dev server (port 5173, strictPort) and Vitest config.
- `eslint.config.js` — ESLint flat config, including the `src/sim` purity rules.
- `index.html` — page shell with the single `#game` canvas.
- `.claude/launch.json` — preview config running `npm run dev` on 5173.
- `src/main.ts` — entry point: canvas setup and current placeholder draw.
- `src/engine/canvas.ts` — 1280x720 logical canvas, letterbox scaling, DPR and resize handling.
- `src/sim/types.ts` — `InputFrame` and `EMPTY_INPUT`.
- `src/sim/` — (task 3) pure combat simulation and its tests.
- `src/engine/` — (task 2) loop, input, scene manager.
- `src/render/` — (task 4) rig, animations, drawing, HUD, effects, arenas.
- `src/content/` — (tasks 5, 7, 11, 13) fighters, arenas, lore data, registries.
- `src/ai/` — (task 9) AI controller.
- `src/audio/` — (task 12) synthesized sound.
- `src/scenes/` — (tasks 6, 10) title, select, fight, results, lore.
- `scripts/` — (task 14) balance runner.
