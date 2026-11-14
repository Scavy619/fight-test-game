// Public data types of the combat simulation. Everything here is plain data:
// definitions (FighterDef, MoveDef) are immutable content, MatchState is
// JSON-serialisable (no functions, classes, Infinity or undefined-only fields).
//
// Units: pixels, pixels per frame, frames at 60 Hz. Sim `y` is height above
// ground (up is positive). Move data is authored facing right.

export interface InputFrame {
  left: boolean; right: boolean; up: boolean; down: boolean;
  light: boolean; heavy: boolean; special: boolean; block: boolean; dodge: boolean;
}

export const EMPTY_INPUT: InputFrame = {
  left: false, right: false, up: false, down: false,
  light: false, heavy: false, special: false, block: false, dodge: false,
};

export type PlayerIndex = 0 | 1;
export type Facing = 1 | -1;
export type Element = 'wind' | 'fire' | 'earth' | 'lightning' | 'shadow';

export const MOVE_SLOTS = [
  'light', 'heavy', 'crouchLight', 'crouchHeavy', 'airLight', 'airHeavy',
  'specialN', 'specialF', 'specialD', 'ultimate',
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
 * Projectile motion behaviours. Only 'linear' exists now; later fighters may
 * add e.g. 'returning' or 'delayed' here (extension point).
 */
export type ProjectileBehavior = 'linear';

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
}

export interface MoveFx { frame: number; tag: string }

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
}

/**
 * SPEC fighter states plus 'land' (short landing recovery after an air attack;
 * renderers may show it with the crouch or prejump pose).
 */
export type FighterStateName =
  | 'idle' | 'walk' | 'crouch' | 'prejump' | 'air' | 'land' | 'attack'
  | 'block' | 'blockstun' | 'hitstun' | 'knockdown' | 'getup' | 'dodge' | 'ko' | 'win';

export type BufferedButton = 'light' | 'heavy' | 'special' | 'dodge';

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
  /** Frames of hitstop left (whole sim frozen). */
  hitstop: number;
  superFreeze: SuperFreeze | null;
  winner: PlayerIndex | null;
  lastRoundResult: RoundResult | null;
}

export interface MatchConfig {
  fighters: [FighterDef, FighterDef];
  /** Default 2. */
  roundsToWin?: number;
  /** Default 60. */
  roundSeconds?: number;
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
  | { type: 'roundIntro'; round: number }
  | { type: 'roundStart'; round: number }
  | { type: 'roundEnd'; round: number; winner: PlayerIndex | null; reason: RoundEndReason }
  | { type: 'matchEnd'; winner: PlayerIndex };

export type SimEventType = SimEvent['type'];
