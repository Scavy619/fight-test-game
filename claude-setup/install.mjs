#!/usr/bin/env node
// Sets up the Claude Code workflow this project uses on a new computer:
//  - the /savvy-flow skill and its five worker agents (copied into ~/.claude)
//  - the savvy-progress mod (progress bar and agents panel), loaded through settings.json
// Source of all of it: https://github.com/johnnyvizz/claude-kit (MIT). Nothing is bundled here.
// Run:  node claude-setup/install.mjs      (safe to run again; existing files are backed up)
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const home = homedir();
const kit = join(home, 'claude-kit');
const claude = join(home, '.claude');
const PLUGIN_DIR = '~/claude-kit/plugins/savvy-progress';
const log = (msg) => console.log(msg);

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function copyWithBackup(from, to) {
  if (existsSync(to)) {
    if (readFileSync(to, 'utf8') === readFileSync(from, 'utf8')) return log(`  same     ${to}`);
    copyFileSync(to, `${to}.bak`);
    log(`  backup   ${to}.bak`);
  }
  copyFileSync(from, to);
  log(`  copied   ${to}`);
}

// 1. claude-kit
if (existsSync(join(kit, '.git'))) {
  log(`Updating ${kit}`);
  git(['pull', '--ff-only'], kit);
} else {
  log(`Cloning claude-kit into ${kit}`);
  git(['clone', 'https://github.com/johnnyvizz/claude-kit.git', kit]);
}

// 2. skill and agents
const flow = join(kit, 'plugins', 'savvy-flow');
mkdirSync(join(claude, 'agents'), { recursive: true });
mkdirSync(join(claude, 'skills', 'savvy-flow'), { recursive: true });
log('Installing the savvy-flow skill and agents');
for (const f of readdirSync(join(flow, 'agents')).filter((n) => n.endsWith('.md'))) {
  copyWithBackup(join(flow, 'agents', f), join(claude, 'agents', f));
}
copyWithBackup(join(flow, 'skills', 'savvy-flow', 'SKILL.md'), join(claude, 'skills', 'savvy-flow', 'SKILL.md'));

// 3. savvy-progress mod through settings.json
const settingsPath = join(claude, 'settings.json');
let settings = {};
if (existsSync(settingsPath)) {
  settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  copyFileSync(settingsPath, `${settingsPath}.bak`);
}
const current = settings.env?.CLAUDE_CODE_PLUGIN_DIRS ?? '';
if (current.includes('savvy-progress')) {
  log('settings.json already loads savvy-progress');
} else if (current !== '') {
  log(`settings.json already sets CLAUDE_CODE_PLUGIN_DIRS to "${current}".`);
  log(`Add "${PLUGIN_DIR}" to it by hand (see the claude-kit README for the separator).`);
} else {
  settings.env = { ...(settings.env ?? {}), CLAUDE_CODE_PLUGIN_DIRS: PLUGIN_DIR };
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  log(`Added CLAUDE_CODE_PLUGIN_DIRS to ${settingsPath} (backup: settings.json.bak)`);
}

log('\nDone. Start a NEW Claude Code session in the project folder, then run:');
log('  /savvy-flow continue the project from HANDOFF.md');
log('The progress bar appears once the flow reports progress; /agents-info opens the agents panel.');
