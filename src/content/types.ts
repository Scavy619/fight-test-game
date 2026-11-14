// Content entry types shared by the fighter registry, the select screen, the gallery and the
// practice move list. A hero is ONE file: combat data, look, animations, visuals and profile.
import type { AnimationSet, FighterLook } from '../render/types';
import type { VisualSpec } from '../render/moveVisuals';
import type { FighterDef, MoveSlot } from '../sim/types';

/** A registered fighter: sim definition, look, animations and move visuals. */
export interface FighterEntry {
  def: FighterDef;
  look: FighterLook;
  anims: AnimationSet;
  /** Move visuals keyed by fx tag. */
  visuals?: Readonly<Record<string, VisualSpec>>;
}

/** Plain-language description of one move, shown in the gallery, practice and pause. */
export interface MoveInfo {
  name: string;
  /** What it does, in one or two sentences, including startup, impact and recovery cues. */
  description: string;
  /** How the opponent answers it (never colour-only). */
  counterplay?: string;
  /** Input, in words: "Special", "Special + forward", "Hold heavy". */
  input: string;
}

export type UnlockKind = 'start' | 'chapter' | 'arcade' | 'campaign';

export interface UnlockRule {
  kind: UnlockKind;
  /** For `chapter`: the chapter whose result unlocks the hero. */
  chapter?: number;
  /** Shown in the interface, e.g. "Finish chapter 4" or "Clear Arcade with any hero". */
  text: string;
}

/** Everything the interface says about a hero; combat behaviour lives in `FighterDef`. */
export interface HeroProfile {
  /** Select-screen title, e.g. "The Astra-Bound Archer". */
  title: string;
  /** One-sentence combat identity. */
  identity: string;
  /** Gallery biography, about 80 to 130 words. */
  bio: string;
  weapons: { primary: string; secondary?: string; note?: string };
  /** Visual motif in a few words. */
  motif: string;
  /** Palette names for the gallery, e.g. ["indigo", "bronze", "saffron"]. */
  palette: readonly string[];
  /** Combat rhythm in a few words. */
  rhythm: string;
  poses: { intro: string; victory: string };
  moves: Partial<Record<MoveSlot, MoveInfo>>;
  campaignRole: string;
  relationships: readonly { id: string; text: string }[];
  unlock: UnlockRule;
}

/** How a hero's projectiles are drawn (the sim only knows boxes). */
export interface ProjectileLook {
  kind: 'arrow' | 'orb' | 'shockwave' | 'axe';
  /** Drawn length in px along the flight direction (arrow, axe); default by kind. */
  length?: number;
  /** Override colour (default: the hero's accent). */
  color?: string;
}

/** A hero: a fighter entry plus its profile and projectile looks. */
export interface HeroEntry extends FighterEntry {
  profile: HeroProfile;
  projectiles?: Partial<Record<MoveSlot, ProjectileLook>>;
  /** Moves during whose live projectile the rendered weapon is hidden (a thrown axe). */
  hideWeaponWhileProjectile?: readonly MoveSlot[];
}
