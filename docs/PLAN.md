# Task plan

Status values: `todo`, `in progress`, `accepted`. Update this file when a task is accepted. Tiers are savvy-flow worker tiers. Every task must leave `npm run test`, `npm run lint` and `npm run build` passing and must update `filemap.md` for files it adds or moves. Read `docs/SPEC.md` first; section numbers below refer to it.

| # | Task | Tier | After | Status |
|---|---|---|---|---|
| 1 | Scaffold | Light | – | accepted |
| 2 | Engine | Medium | 1 | accepted |
| 3 | Combat simulation | Careful | 1 | in progress |
| 4 | Rig and neon rendering | Careful | 1 | in progress |
| 5 | Research and lore | Medium | 1 | in progress |
| 6 | Fight scene and HUD | Medium | 2, 3, 4 | todo |
| 7 | Fighters Rei and Vira | Careful | 6 | todo |
| – | Checkpoint: user playtests the prototype | – | 7 | todo |
| 8 | Effects and cinematics | Medium | 7 | todo |
| 9 | AI opponent | Medium | 7 | todo |
| 10 | Menus and lore screen | Medium | 5, 7 | todo |
| 11 | Arenas | Medium | 7 | todo |
| 12 | Audio | Medium | 7 | todo |
| 13 | Fighters Sun Wukong and Thor | Careful | 8 | todo |
| 14 | Balance and polish | Careful | 9–13 | todo |

Tasks 2–5 can run in parallel; so can 8–12.

## Briefs

**1. Scaffold.** Create the Vite + TypeScript (strict) project with Vitest and ESLint flat config, npm scripts `dev`, `build`, `test` (vitest run), `lint`, `typecheck`. Create the folders in SPEC 3 with an `index.ts` or placeholder each. `index.html` with a single full-window canvas; `src/main.ts` sets up the 1280x720 logical canvas with letterbox scaling and draws a placeholder title. Create `src/sim/types.ts` with `InputFrame` (SPEC 3.2) and one trivial passing test. Add `.claude/launch.json` running `npm run dev` on port 5173. Verify: all scripts pass, dev server shows the placeholder.

**2. Engine.** In `src/engine/`: fixed 60 Hz accumulator loop (max 5 catch-up steps, pauses when the tab is hidden) calling `update()` per step and `render()` per animation frame; keyboard and gamepad input producing one `InputFrame` per player per step with the bindings in SPEC 3.2 (bindings as data); a menu-input helper with edge detection; a scene manager (`enter`, `exit`, `update`, `render`, push/pop for pause). Unit-test the loop's step accounting and the key-to-InputFrame mapping. Verify: tests, plus a debug scene showing both players' live inputs.

**3. Combat simulation.** In `src/sim/`: everything in SPEC 3.3, as pure functions over a plain serialisable state: `createMatch(config)`, `step(state, inputs) → events`. Define `FighterDef`, `MoveDef`, `Projectile`, `SimEvent` types. Include `src/sim/testFighter.ts`, a complete generic fighter using all 10 slots, used by the tests. No DOM, no randomness, no imports outside `sim`. Unit tests: movement and bounds, body push, each state transition, hit versus block by level, chip not killing, throw rules, dodge invulnerability and cooldown, cancels and combo scaling, hitstop, meter rules, ultimate conditions and super freeze, projectiles and clash, round and match flow including time-out and draw replay, determinism (same inputs give identical state). Verify: tests.

**4. Rig and neon rendering.** In `src/render/`: skeleton, `Pose`, `Animation` and interpolation per SPEC 3.4; `drawFighter(ctx, look, pose, x, groundY, facing, time)` in the style of SPEC 4 (tapered capsule limbs, torso polygon, head silhouettes, ribbon chain, rim-light glow without heavy `shadowBlur`); weapons `katana, spear, staff, hammer` with additive trails; `FighterLook` type; base animations for every non-attack state plus generic light and heavy attacks in `src/render/anims/base.ts`. Provide a gallery scene (`?gallery` in the URL) showing a figure with each weapon cycling through every base animation. Unit-test interpolation and mirroring. Verify: tests and the gallery; the orchestrator reviews the look.

**5. Research and lore.** Write `docs/LORE.md`: for each of the 4 fighters and 3 arenas, a **Tradition** part (accurate summary of the source mythology and the real martial art, with source links) and an **In this game** part (our fiction, 2 to 4 sentences); a short world premise; and a backlog table mapping the remaining gods, heroes, styles and weapons from the brief (kept in `docs/BRIEF.md`) to possible future fighters, following SPEC 7. Mirror the fighter and arena text into `src/content/lore.ts` as typed data. Verify: lint and typecheck; facts checked against sources.

**6. Fight scene and HUD.** `src/scenes/fight.ts`: runs a sim match with two human inputs, draws a plain placeholder arena, both fighters via the rig (state to animation mapping, attack animations by move `anim` id), projectiles, and the HUD of SPEC 4 in `src/render/hud.ts` (health with damage ghost, names, round pips, timer, meter, combo counter, announcer text). Visual hitstop, screen shake and hit flash from sim events. Uses the sim's test fighter for both sides until task 7. Verify: two players can play full best-of-three matches.

**7. Fighters Rei and Vira.** `src/content/fighters/rei.ts` and `vira.ts` plus `src/content/fighters/index.ts` registry: stats, look, all 10 moves with frame data, and attack animations per SPEC 5. Fight scene uses them. Add a content test that validates every registered fighter (all slots present, animations exist, frame data sane, hitboxes live within active frames). Verify: tests; both feel distinct in play; no infinite combos.

**8. Effects and cinematics.** `src/render/fx/`: pooled particle system; per-element hit sparks and trails (wind, fire, earth, lightning, shadow); projectile visuals; super-freeze treatment (arena dimmed, speed lines, caster name banner); finisher cinematic (slow motion, zoom, big text); KO slow-down. All driven by sim events, no sim changes.

**9. AI opponent.** `src/ai/`: controller that reads sim state and returns an `InputFrame`. Behaviours: spacing, approach and retreat, poke at the right range, block or dodge on reaction, punish recovery, anti-air, combos through cancels, specials by range, ultimate when full. Difficulty sets reaction delay, mistake rate and aggression. Seeded RNG. Test: deterministic for a seed; hard beats easy in most of 20 simulated matches.

**10. Menus and lore screen.** Scenes: title, mode select (versus, practice with difficulty), character select (both players pick; in practice P1 picks both), arena select, results with rematch, pause overlay, controls help, lore screen reading `src/content/lore.ts` with Tradition and In this game labelled. Animated fighter previews on the select screen. Styled per SPEC 4.

**11. Arenas.** `src/content/arenas/` and `src/render/arena.ts`: the three arenas of SPEC 6 as layered procedural parallax scenes with ambient particles, plus registry. Subtle camera sway following the fighters' midpoint. Must not cost more than about 3 ms per frame.

**12. Audio.** `src/audio/`: Web Audio synthesis only. Hit, block, whiff, jump, land, dodge, per-element special sounds, super-freeze sting, KO, announcer stings, menu blips, and one looping generative music bed per arena. Starts on first user gesture; mute toggle `M`; master volume persisted in `localStorage`.

**13. Fighters Sun Wukong and Thor.** As task 7, per SPEC 5, including any sim support their moves need (returning projectile, delayed clone attack, command throw) added with tests.

**14. Balance and polish.** `scripts/balance.ts`: headless AI-versus-AI across all pairings (hard versus hard, 50 matches each), printing win rates. Tune stats and frame data until no pairing is beyond about 60/40. Fix the defect list the orchestrator supplies from the final review.
