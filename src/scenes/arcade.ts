// Arcade: pick a hero, then fight a ladder of opponents ending with your rival, with a card
// between fights, a continue card after a loss and an ending card specific to your hero.
// Clearing Arcade is saved and unlocks heroes (see content/unlocks.ts).
import { DIFFICULTY_DAMAGE, createAi } from '../ai';
import { ARCADE_ENDINGS, buildLadder, type ArcadeStep } from '../content/arcade';
import { HEROES, HERO_ORDER, isHeroId, type HeroId } from '../content/heroes';
import { ROSTER } from '../content/roster';
import { grantUnlocks } from '../content/unlocks';
import type { GameContext } from '../engine';
import { P_COLORS } from '../render/hud';
import { createCard } from './card';
import { createCharSelect } from './charSelect';
import { withControlsGate } from './controlsScreen';
import { createFightScene } from './fight';
import { createSoloHuman } from './soloControls';

const DIFFICULTY_LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' } as const;

/** The opponents the ladder draws from: every written hero (unlock state does not matter for opponents). */
export function arcadeLadder(player: HeroId): ArcadeStep[] {
  return buildLadder(player, HERO_ORDER);
}

export function startArcade(game: GameContext, back: () => void): void {
  game.scenes.set(
    createCharSelect(game, {
      heading: 'ARCADE: CHOOSE YOUR HERO',
      accent: P_COLORS[0],
      onBack: back,
      onPick: (player) => withControlsGate(game, true, () => intro(game, player, arcadeLadder(player), 0, back)),
    }),
  );
}

function nameOf(id: string): string {
  return ROSTER.find((r) => r.id === id)?.name ?? id;
}

function intro(game: GameContext, player: HeroId, ladder: ArcadeStep[], i: number, back: () => void): void {
  const step = ladder[i];
  if (!step) return ending(game, player, ladder, back);
  const opp = step.opponent;
  game.scenes.set(
    createCard(game, {
      heading: step.rival ? 'FINAL FIGHT: YOUR RIVAL' : `FIGHT ${i + 1} OF ${ladder.length}`,
      subheading: `${nameOf(player)} versus ${nameOf(opp)} · ${DIFFICULTY_LABEL[step.difficulty]}`,
      progress: { total: ladder.length, done: i },
      portraits: [
        { heroId: player, caption: nameOf(player).toUpperCase() },
        { heroId: opp, caption: nameOf(opp).toUpperCase() },
      ],
      lines: [isHeroId(opp) ? HEROES[opp].profile.identity : ''],
      items: [
        { id: 'start', label: 'START FIGHT' },
        { id: 'menu', label: 'MAIN MENU' },
      ],
      onPick: (id) => (id === 'start' ? fight(game, player, ladder, i, back) : back()),
      onBack: back,
    }),
  );
}

function fight(game: GameContext, player: HeroId, ladder: ArcadeStep[], i: number, back: () => void): void {
  const step = ladder[i];
  if (!step || !isHeroId(step.opponent)) return;
  const p1 = HEROES[player];
  const p2 = HEROES[step.opponent];
  const human = createSoloHuman(game, p1.look.accent);
  const seed = (Math.random() * 0xffffffff) >>> 0;
  game.scenes.set(
    createFightScene(game, {
      fighters: [p1, p2],
      controllers: [human.controller, createAi(step.difficulty, seed)],
      damageScale: [1, DIFFICULTY_DAMAGE[step.difficulty]],
      solo: true,
      overlay: human.overlay,
      noRematch: true,
      endPrompt: null,
      onExit: back,
      onMatchEnd: (winner) => {
        if (winner === 0) intro(game, player, ladder, i + 1, back);
        else lost(game, player, ladder, i, back);
      },
    }),
  );
}

function lost(game: GameContext, player: HeroId, ladder: ArcadeStep[], i: number, back: () => void): void {
  const step = ladder[i];
  game.scenes.set(
    createCard(game, {
      heading: 'DEFEATED',
      subheading: step ? `${nameOf(step.opponent)} won this time` : '',
      progress: { total: ladder.length, done: i },
      lines: ['Every hero here can be beaten with spacing and patience. Try again, or pick an easier opponent order by starting over.'],
      items: [
        { id: 'retry', label: 'TRY AGAIN' },
        { id: 'restart', label: 'START THE LADDER OVER' },
        { id: 'menu', label: 'MAIN MENU' },
      ],
      onPick: (id) => {
        if (id === 'retry') fight(game, player, ladder, i, back);
        else if (id === 'restart') intro(game, player, ladder, 0, back);
        else back();
      },
      onBack: back,
    }),
  );
}

function ending(game: GameContext, player: HeroId, ladder: ArcadeStep[], back: () => void): void {
  game.save.update((d) => {
    d.arcade[player] = true;
  });
  const fresh = grantUnlocks(game.save, { kind: 'arcade' });
  const end = ARCADE_ENDINGS[player];
  const lines = [...(end?.text ?? ['You cleared Arcade.'])];
  if (fresh.length > 0) lines.push(`UNLOCKED: ${fresh.map(nameOf).join(', ')}`);
  game.scenes.set(
    createCard(game, {
      heading: end?.title ?? 'ARCADE CLEARED',
      subheading: `${nameOf(player)} cleared Arcade`,
      progress: { total: ladder.length, done: ladder.length },
      portraits: [{ heroId: player }],
      lines,
      items: [
        { id: 'again', label: 'PLAY AGAIN' },
        { id: 'other', label: 'CHOOSE ANOTHER HERO' },
        { id: 'menu', label: 'MAIN MENU' },
      ],
      onPick: (id) => {
        if (id === 'again') intro(game, player, arcadeLadder(player), 0, back);
        else if (id === 'other') startArcade(game, back);
        else back();
      },
      onBack: back,
    }),
  );
}
