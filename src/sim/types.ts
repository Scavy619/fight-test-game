// Public data types of the combat simulation. Everything here is plain data:
// definitions (FighterDef, MoveDef) are immutable content, MatchState is
// JSON-serialisable (no functions, classes, Infinity or undefined-only fields).
//
// Units: pixels, pixels per frame, frames at 60 Hz. Sim `y` is height above
// ground (up is positive). Move data is authored facing right.

/**
 * `grab` is a dedicated grab button (light + heavy together also grabs); `power` is held to
 * charge the power strike and released to throw it (holding heavy also charges).
 */
export interface InputFrame {
  left: boolean; right: boolean; up: boolean; down: boolean;
  light: boolean; heavy: boolean; special: boolean; block: boolean; dodge: boolean;
  grab: boolean; power: boolean;
}

export const EMPTY_INPUT: InputFrame = {
  left: false, right: false, up: false, down: false,
  light: false, heavy: false, special: false, block: false, dodge: false,
  grab: false, power: false,
};

export type PlayerIndex = 0 | 1;
export type Facing = 1 | -1;
export type Element = 'wind' | 'fire' | 'earth' | 'lightning' | 'shadow';

/**
 * `throw` is the grab: started by light + heavy together on the ground; its move must set `throw: true`.
 * `power` is the charged strike: hold heavy through the `charge` state and release (or reach the
 * maximum charge); normally armoured during its startup and unblockable.
 */
export const MOVE_SLOTS = [
  'light', 'heavy', 'crouchLight', 'crouchHeavy', 'airLight', 'airHeavy',
  'specialN', 'specialF', 'specialD', 'ultimate', 'throw', 'power',
] as const;
export type MoveSlot = (typeof MOVE_SLOTS)[number];

export type AttackLevel = 'mid' | 'low' | 'overhead';
/** Drives hitstop and default chip. */
export type Strength = 'light' | 'heavy' | 'special' | 'ultimate';

export interface Vec2 { x: number; y: number }

/**
 * Inclusive range of 1-based move frames. Frame 1 is the first frame of the
 * move; frames 1..startup are startup, startup+1..startup+active are active,
 * the rest is recovery.
 */
export interface FrameRange { from: number; to: number }

/**
 * Hitbox, authored facing right, relative to the fighter origin (feet centre).
 * (x, y) is the box's lower-left corner when facing right: the box spans
 * x..x+w forward of the origin and y..y+h above the origin (y may be negative
 * for boxes below the feet of an airborne fighter). When facing left the box
 * is mirrored around the origin. See `hitboxToWorld` in geometry.ts.
 * `from`/`to` are move frames (default: the move's active frames).
 * `group`: each group can hit once per move instance (default 0), which is how
 * multi-hit moves are authored.
 * `launches` / `knockback` override the move's values for hits by this box
 * (e.g. the launching last hit of a multi-hit move).
 */
export interface Hitbox {
  x: number; y: number; w: number; h: number;
  from?: number; to?: number;
  group?: number;
  launches?: boolean;
  knockback?: Vec2;
}

/** Self velocity (facing right, px/frame) applied on move frames from..to. */
export interface VelocityStep { from: number; to: number; vx: number; vy?: number }

/**
 * Projectile motion behaviours. 'linear' flies straight; 'returning' flies out `range` px,
 * reverses, and disappears once it passes its owner (a thrown axe; hits once each way with `hits: 2`).
 */
export type ProjectileBehavior = 'linear' | 'returning';

export interface ProjectileDef {
  /** Move frame on which the projectile spawns. */
  frame: number;
  /** Spawn position of the projectile's centre relative to the fighter origin, facing right. */
  x: number; y: number;
  /** Velocity facing right, px/frame. */
  vx: number; vy: number;
  /** Box size, centred on the projectile position. */
  w: number; h: number;
  damage: number;
  /** Frames before it disappears. */
  lifetime: number;
  hitstun: number; blockstun: number;
  knockback: Vec2;
  level: AttackLevel;
  /** Chip fraction on block (default from strength). */
  chip?: number;
  /** Number of hits before it disappears (default 1). Clashes also use up hits. */
  hits?: number;
  launches?: boolean;
  /** Meter for the owner on hit (default: the move's meterGain). */
  meterGain?: number;
  /** Default: the move's strength. */
  strength?: Strength;
  /** Default: the move's element, else the fighter's. */
  element?: Element;
  /** Renderer animation id (default: the move's anim). */
  anim?: string;
  /** Default 'linear'. */
  behavior?: ProjectileBehavior;
  /** 'returning': px travelled before turning back (default 320). */
  range?: number;
}

export interface MoveFx { frame: number; tag: string }

export type ZoneKind = 'slow' | 'strike' | 'decoy' | 'mark';

/**
 * A floor zone spawned by a move: a slow field, a telegraphed delayed strike (lane), a decoy
 * that absorbs one hit, or a pure visual mark. `x` is relative to the caster (facing-mirrored)
 * or 'opponent' for the opponent's position; `offsets` spawn several zones around it.
 */
export interface ZoneDef {
  kind: ZoneKind;
  /** Move frame on which the zone(s) appear. */
  frame: number;
  x: number | 'opponent';
  offsets?: readonly number[];
  w: number;
  /** Height above ground the zone covers (default 200). */
  h?: number;
  /** Lifetime in frames. */
  frames: number;
  /** strike: zone age at which it hits (must be <= frames). */
  strikeAt?: number;
  damage?: number;
  hitstun?: number;
  knockback?: Vec2;
  level?: AttackLevel;
  strength?: Strength;
  launches?: boolean;
  /** slow: walk and back speed multiplier for opponents inside (default 0.5). */
  slowFactor?: number;
  /** Shown as text by the renderer (never colour alone), e.g. "ARROWS FALL" or "SNARE". */
  label: string;
}

export type ShieldKind = 'absorb' | 'halve';

/** A temporary guard granted by a move: absorbs or halves the next hit unless the hit's strength breaks it. */
export interface ShieldGrant {
  shield: ShieldKind;
  frames: number;
  /** Hit strengths that break the shield instead (default: special and ultimate). */
  breaksOn?: readonly Strength[];
  /** Shown as text over the fighter, e.g. "RADIANT ARMOR". */
  label: string;
}

export interface MoveDef {
  /** Animation id used by the renderer; the sim only passes it on. */
  anim: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  level: AttackLevel;
  hitstun: number;
  blockstun: number;
  /** Pushback speed (x, px/frame, decays with friction) and launch speed (y) for air knockdown arcs. */
  knockback: Vec2;
  hitboxes: readonly Hitbox[];
  strength: Strength;
  /** Default: the fighter's element. */
  element?: Element;
  velocity?: readonly VelocityStep[];
  invulnerable?: FrameRange;
  /** Move frames during which the fighter's body does not push (passes through). */
  passThrough?: FrameRange;
  projectile?: ProjectileDef;
  /** Hit sends the defender into an air knockdown arc. */
  launches?: boolean;
  /** Unblockable; only connects with grounded, non-stunned, non-dodging, vulnerable opponents. */
  throw?: boolean;
  /** Cannot be blocked (still whiffs on invulnerable or dodging opponents). */
  unblockable?: boolean;
  /** Move frames on which hits deal damage but do not interrupt the move (super armour). */
  armor?: FrameRange;
  /** Grants a shield on the move's first frame. */
  grants?: ShieldGrant;
  /** Hits are not blocked by a guard raised fewer than this many frames ago. */
  piercesLateGuard?: number;
  /** Spawns zone(s) on `zone.frame`. */
  zone?: ZoneDef;
  /** Further zones spawned by the same move (e.g. a slow net plus arrow lanes). */
  extraZones?: readonly ZoneDef[];
  /** Switches the fighter's stance on the move's first frame (index, or the next one). */
  switchStance?: number | 'next';
  /** Render hint: hide the weapon while this move's projectile is live (a thrown axe). */
  hideWeapon?: boolean;
  /** Chip fraction of damage dealt on block (default from strength: specials and ultimates chip). */
  chip?: number;
  meterGain: number;
  /** Slots this move may cancel into after it connected (hit or block), while moveFrame <= until. */
  cancels?: { into: readonly MoveSlot[]; until: number };
  fx?: readonly MoveFx[];
}

export interface FighterStats {
  health: number;
  walkSpeed: number;
  backSpeed: number;
  jumpVelocity: number;
  jumpForwardSpeed: number;
  gravity: number;
  /** Body (push and hurt) width. */
  width: number;
  height: number;
  crouchHeight: number;
}

export interface FighterDef {
  id: string;
  name: string;
  element: Element;
  stats: FighterStats;
  moves: Readonly<Record<MoveSlot, MoveDef>>;
  /**
   * Optional stances: `moves[k]` overrides slots while `FighterState.stance === k`.
   * Stance 0 is the default and usually has no overrides. Switched by a move's `switchStance`.
   */
  stances?: { names: readonly string[]; moves: readonly Partial<Record<MoveSlot, MoveDef>>[] };
}

/**
 * SPEC fighter states plus 'land' (short landing recovery after an air attack;
 * renderers may show it with the crouch or prejump pose).
 */
export type FighterStateName =
  | 'idle' | 'walk' | 'crouch' | 'prejump' | 'air' | 'land' | 'attack' | 'charge'
  | 'block' | 'blockstun' | 'hitstun' | 'knockdown' | 'getup' | 'dodge' | 'ko' | 'win';

export type BufferedButton = 'light' | 'heavy' | 'special' | 'dodge' | 'grab';

export interface InputState {
  /** Buttons held on the latest step (raw input, used for edge detection). */
  held: InputFrame;
  /** Frames left in the press buffer per button (0 = not buffered). */
  buffer: Record<BufferedButton, number>;
}

export interface FighterState {
  x: number;
  /** Height above ground. */
  y: number;
  vx: number;
  vy: number;
  facing: Facing;
  state: FighterStateName;
  /** Frames in the current state, 1 on the step the state was entered. */
  stateFrame: number;
  /** Crouching posture: crouch, crouching block/blockstun/hitstun, crouch attacks. */
  crouching: boolean;
  move: MoveSlot | null;
  /** 1-based frame of the current move (0 when no move). */
  moveFrame: number;
  /** The current move hit or was blocked (enables cancels). */
  moveConnected: boolean;
  /** Hitbox groups of the current move that already connected. */
  hitGroups: number[];
  /** The move this one was cancelled from (null when started from neutral); limits self-chains. */
  chainedFrom: MoveSlot | null;
  /** Consecutive steps heavy has been held (charging the power strike). */
  heavyHeld: number;
  /** Active shield from a `grants` move, or null. */
  shield: { kind: ShieldKind; framesLeft: number; breaksOn: Strength[]; label: string } | null;
  /** Current stance index (0 = default). */
  stance: number;
  /** Frames left of a slow field's effect and its speed factor. */
  slow: { frames: number; factor: number };
  /** Duration of the current hitstun or blockstun. */
  stunFrames: number;
  /** In an air knockdown arc: lands in knockdown. */
  knockdownOnLand: boolean;
  /** Ground pushback speed (signed, px/frame), decays with friction. */
  pushback: number;
  /** Pushback that cannot be spent against a wall moves the opponent instead (melee only). */
  pushbackTransfers: boolean;
  /** Jump direction fixed at takeoff, relative to facing: 1 forward, -1 back. */
  jumpDir: -1 | 0 | 1;
  /** One air attack per jump. */
  airAttackUsed: boolean;
  dodgeForward: boolean;
  dodgeCooldown: number;
  /** Cannot be hit this frame. */
  invulnerable: boolean;
  health: number;
  meter: number;
  /** Hits in the combo this fighter is currently dealing. */
  combo: number;
  /** Damage dealt by the current combo. */
  comboDamage: number;
  input: InputState;
}

export interface Projectile {
  id: number;
  owner: PlayerIndex;
  /** Move slot that spawned it (its ProjectileDef is defs[owner].moves[slot].projectile). */
  slot: MoveSlot;
  /** Centre position. */
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  facing: Facing;
  /** Frames alive. */
  age: number;
  lifetime: number;
  hitsLeft: number;
  /** Frames before it can hit or clash again (multi-hit projectiles). */
  rehit: number;
  element: Element;
  strength: Strength;
  behavior: ProjectileBehavior;
  anim: string;
  /** Owner's stance when spawned (its ProjectileDef lives in that stance's move). */
  stance: number;
  /** 'returning': spawn x and whether it has turned back. */
  startX: number;
  returning: boolean;
}

/** A live zone (see ZoneDef). `x` is the centre, `y` the bottom (0 = ground). */
export interface Zone {
  id: number;
  owner: PlayerIndex;
  slot: MoveSlot;
  kind: ZoneKind;
  x: number;
  w: number;
  h: number;
  age: number;
  frames: number;
  strikeAt: number | null;
  /** strike: hit already delivered. */
  struck: boolean;
  damage: number;
  hitstun: number;
  knockback: Vec2;
  level: AttackLevel;
  strength: Strength;
  launches: boolean;
  slowFactor: number;
  element: Element;
  label: string;
}

export type MatchPhase = 'intro' | 'fight' | 'ko' | 'timeout' | 'outro' | 'matchEnd';
export type RoundEndReason = 'ko' | 'doubleKo' | 'timeout';

export interface RoundResult {
  round: number;
  /** null: draw (double KO or equal health at time-out); the round is replayed. */
  winner: PlayerIndex | null;
  reason: RoundEndReason;
}

export interface SuperFreeze { frames: number; caster: PlayerIndex }

export interface MatchState {
  /** Steps since the match was created. */
  frame: number;
  phase: MatchPhase;
  /** Non-frozen steps spent in the current phase. */
  phaseFrame: number;
  /** 1-based count of rounds played, including replayed draws. */
  round: number;
  roundsToWin: number;
  roundFrames: number;
  wins: [number, number];
  /** Frames left on the round clock. */
  timer: number;
  fighters: [FighterState, FighterState];
  projectiles: Projectile[];
  nextProjectileId: number;
  zones: Zone[];
  nextZoneId: number;
  /** Frames of hitstop left (whole sim frozen). */
  hitstop: number;
  superFreeze: SuperFreeze | null;
  winner: PlayerIndex | null;
  lastRoundResult: RoundResult | null;
  /** Multiplier on the damage (and chip) each side deals; 1 is normal. Used as a difficulty handicap. */
  damageScale: [number, number];
}

export interface MatchConfig {
  fighters: [FighterDef, FighterDef];
  /** Default 2. */
  roundsToWin?: number;
  /** Default 60. */
  roundSeconds?: number;
  /** Damage multiplier per side (default [1, 1]). */
  damageScale?: [number, number];
}

export interface Match {
  defs: [FighterDef, FighterDef];
  state: MatchState;
}

interface Located { x: number; y: number }

export type SimEvent =
  | ({ type: 'moveStart'; fighter: PlayerIndex; slot: MoveSlot; anim: string; element: Element; strength: Strength } & Located)
  | ({
      type: 'hit'; fighter: PlayerIndex; target: PlayerIndex; slot: MoveSlot;
      element: Element; strength: Strength; damage: number; combo: number;
      launches: boolean; projectile: number | null;
      /** The defender's armour absorbed the hit (damage dealt, move not interrupted). */
      armored: boolean;
    } & Located)
  | ({
      type: 'block'; fighter: PlayerIndex; target: PlayerIndex; slot: MoveSlot;
      element: Element; strength: Strength; chip: number; crouching: boolean; projectile: number | null;
    } & Located)
  | ({ type: 'whiff'; fighter: PlayerIndex; slot: MoveSlot; element: Element; strength: Strength } & Located)
  | ({ type: 'jump'; fighter: PlayerIndex; dir: -1 | 0 | 1 } & Located)
  | ({ type: 'land'; fighter: PlayerIndex; hard: boolean } & Located)
  | ({ type: 'dodge'; fighter: PlayerIndex; forward: boolean } & Located)
  | ({ type: 'projectileSpawn'; fighter: PlayerIndex; id: number; slot: MoveSlot; anim: string; element: Element; strength: Strength } & Located)
  | ({ type: 'projectileHit'; fighter: PlayerIndex; target: PlayerIndex; id: number; blocked: boolean; element: Element; strength: Strength } & Located)
  | ({ type: 'projectileClash'; ids: [number, number]; fighters: [PlayerIndex, PlayerIndex]; elements: [Element, Element] } & Located)
  | ({ type: 'superFreeze'; fighter: PlayerIndex; frames: number; element: Element } & Located)
  | ({ type: 'ko'; fighter: PlayerIndex; by: PlayerIndex; element: Element; strength: Strength } & Located)
  | ({ type: 'finisher'; fighter: PlayerIndex; target: PlayerIndex; element: Element } & Located)
  | ({ type: 'fx'; fighter: PlayerIndex; tag: string; slot: MoveSlot } & Located)
  | ({ type: 'zoneSpawn'; fighter: PlayerIndex; id: number; kind: ZoneKind; slot: MoveSlot; label: string; w: number } & Located)
  | ({ type: 'zoneStrike'; fighter: PlayerIndex; id: number; slot: MoveSlot; element: Element; strength: Strength } & Located)
  | ({ type: 'zoneEnd'; fighter: PlayerIndex; id: number; kind: ZoneKind } & Located)
  | ({ type: 'decoyBroken'; fighter: PlayerIndex; by: PlayerIndex; id: number } & Located)
  | ({ type: 'shieldGain'; fighter: PlayerIndex; kind: ShieldKind; frames: number; label: string } & Located)
  | ({ type: 'shieldAbsorb'; fighter: PlayerIndex; by: PlayerIndex; kind: ShieldKind; label: string } & Located)
  | ({ type: 'shieldBreak'; fighter: PlayerIndex; by: PlayerIndex; label: string } & Located)
  | ({ type: 'stanceChange'; fighter: PlayerIndex; stance: number; name: string } & Located)
  | ({ type: 'slowed'; fighter: PlayerIndex; by: PlayerIndex; factor: number } & Located)
  | { type: 'roundIntro'; round: number }
  | { type: 'roundStart'; round: number }
  | { type: 'roundEnd'; round: number; winner: PlayerIndex | null; reason: RoundEndReason }
  | { type: 'matchEnd'; winner: PlayerIndex };

export type SimEventType = SimEvent['type'];
