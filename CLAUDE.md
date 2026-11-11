# Mythic Neon

Browser fighting game. TypeScript strict, Vite, Canvas 2D, Vitest, ESLint. No runtime dependencies, no asset files.

## Commands

- `npm run dev` (port 5173), `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck`
- All of test, lint and build must pass before a task is reported done.

## Read first

- `HANDOFF.md`: current status and what to do next. Start here in a new session.
- `docs/SPEC.md`: the design. `docs/PLAN.md`: tasks and status. `filemap.md`: where things live.

## Rules that are easy to get wrong

- `src/sim/` is pure and deterministic: no DOM, no `Math.random`, no `Date`/`performance`, no imports from outside `src/sim/`. Visuals and sound react to sim events; they never change sim state.
- Sim `y` is height above ground (up is positive). Only the renderer converts to screen coordinates.
- Move data and poses are authored facing right and mirrored by `facing`.
- Hitboxes come from move frame data, never from the rig.
- Content is data: a new fighter or arena is one file in `src/content/` plus a registry entry. No fighter-specific branches in sim or render code.
- No `shadowBlur` on per-frame paths; glow is a wide low-alpha stroke under a thin bright one.
- Mythology rules in SPEC section 7 apply to all names, text and visuals.
- Update `filemap.md` when adding or moving files. Do not commit; the orchestrator commits after review.
