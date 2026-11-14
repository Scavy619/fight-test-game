# Continuing on another computer

The project is self-contained in this folder (git history included). What is not in the folder is the Claude Code setup the workflow uses.

## 1. Requirements on the new PC

- Node 24 or newer (`node --version`), npm 11.
- Git.
- Claude Code (desktop app or CLI), signed in.

## 2. Get the project

It is on GitHub: https://github.com/Scavy619/fight-test-game (public).

```
git clone https://github.com/Scavy619/fight-test-game.git
cd fight-test-game
npm install
npm run test
npm run dev
```

Open http://localhost:5173. `npm run test` should report 260 passing tests (as of task 7).

## 3. Get the same Claude Code interface (savvy-flow, progress bar, agents panel)

The work is run with the `/savvy-flow` skill, five worker agents and the `savvy-progress` mod. They live in the user's Claude config folder, not in the project. One command sets all of it up:

```
node claude-setup/install.mjs
```

It clones https://github.com/johnnyvizz/claude-kit into your home folder, copies the skill and agents into `~/.claude`, and adds `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-kit/plugins/savvy-progress" }` to `~/.claude/settings.json` (existing files are backed up as `.bak`). Then start a new Claude Code session.

Notes: the mod uses an early-access Claude Code API (it was tested by its author on 2.1.286 and works on the original PC); if the bar does not appear, update Claude Code. Do not also install the `savvy-flow` plugin from the marketplace; that would duplicate the skill and agents. Without any of this the project can still be continued in a plain session by following `HANDOFF.md`.

## 4. Resume

Open the project folder in Claude Code and run:

```
/savvy-flow continue the project from HANDOFF.md
```

`HANDOFF.md` has the status, the next step and the decisions already made. `docs/PLAN.md` has every task's brief and status.
