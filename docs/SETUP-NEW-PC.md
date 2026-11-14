# Continuing on another computer

The project is self-contained in this folder (git history included). What is not in the folder is the Claude Code setup the workflow uses.

## 1. Requirements on the new PC

- Node 24 or newer (`node --version`), npm 11.
- Git.
- Claude Code (desktop app or CLI), signed in.

## 2. Put the project in place

Copy the project folder anywhere, for example `Desktop\mythic-neon`. Then, in that folder:

```
npm install
npm run test
npm run dev
```

Open http://localhost:5173. `npm run test` should report 260 passing tests (as of task 7).

`node_modules` and `dist` are not part of the transfer; `npm install` recreates them.

## 3. Install the savvy-flow setup (optional but recommended)

The work is run with the `/savvy-flow` skill and five worker agents. They live in the user's Claude config folder, not in the project. Copy from the old PC (or from the `claude-setup` folder of the transfer zip) into the same places on the new PC:

- `agents\savvy-light.md`, `savvy-medium.md`, `savvy-careful.md`, `savvy-heavy.md`, `savvy-fable.md` → `C:\Users\<you>\.claude\agents\`
- `skills\savvy-flow\SKILL.md` → `C:\Users\<you>\.claude\skills\savvy-flow\`

Source of both: https://github.com/johnnyvizz/claude-kit (plugin `savvy-flow`). Installing that plugin from the marketplace is an alternative to copying the files: `/plugin marketplace add johnnyvizz/claude-kit`, then `/plugin install savvy-flow@claude-kit`. Do one or the other, not both.

Without them the project can still be continued in a plain session by following `HANDOFF.md`; you just do not get the tiered workers.

## 4. Progress bar and agents panel (optional)

The `savvy-progress` mod draws the progress bar above the prompt and the agents panel (`/agents-info`). On the old PC it is loaded by hand and works:

1. `git clone https://github.com/johnnyvizz/claude-kit.git` into your home folder (`C:\Users\<you>\claude-kit`).
2. In `C:\Users\<you>\.claude\settings.json` add:
   `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-kit/plugins/savvy-progress" }`
3. Start a new Claude Code session.

## 5. Resume

Open the project folder in Claude Code and run:

```
/savvy-flow continue the project from HANDOFF.md
```

`HANDOFF.md` has the status, the next step and the decisions already made. `docs/PLAN.md` has every task's brief and status.
