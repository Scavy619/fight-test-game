// Content entry types: what a fighter file in src/content provides.
import type { VisualSpec } from '../render/moveVisuals';
import type { AnimationSet, FighterLook } from '../render/types';
import type { FighterDef } from '../sim/types';

export interface FighterEntry {
  /** Sim data: stats and move frame data. */
  def: FighterDef;
  /** Rig look: colours, proportions, head, ribbon, weapon. */
  look: FighterLook;
  /** Fighter-specific animations; the consumer merges them over `baseAnims`. */
  anims: AnimationSet;
  /** Move visuals keyed by `MoveDef.fx` tag; spawned by the fight scene on `fx` events. */
  visuals?: Readonly<Record<string, VisualSpec>>;
}
