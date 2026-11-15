import { lerpAngle } from './anim';
import { Chain, type ChainParams } from './chain';
import { BRAID_ANCHOR, TOPKNOT_ANCHOR, drawHead } from './heads';
import {
  Frame,
  TRAIL_FRAMES,
  capsulePath,
  energyLine,
  jointDot,
  makePalette,
  paintPart,
  type Palette,
} from './neon';
import { WEAPON_SPECS, computeRig, createRigState, type RigState } from './rig';
import type { FighterLook, JointName, Point, Pose, RibbonStyle } from './types';
import { drawWeapon } from './weapons';

export interface FighterUpdate {
  pose: Pose;
  /** Stage x in px. */
  x: number;
  /** Height above the ground in px (up positive). */
  y: number;
  facing: 1 | -1;
  /** Record the weapon swoosh this frame (typically the move's active frames). */
  trail: boolean;
  /** Do not draw the weapon (it is flying as a projectile). */
  weaponHidden?: boolean;
}

export interface FighterView {
  readonly look: FighterLook;
  /** Solved skeleton in the fighter's local frame (for debugging and effects). */
  readonly rig: RigState;
  /** Forget ribbon and trail history (round start, teleport). */
  reset(): void;
  /** Call once per sim frame: solves the rig, advances ribbon chains and the trail. */
  update(p: FighterUpdate): void;
  /** Draws the last updated state. `groundY` is the screen y of the ground line. */
  draw(ctx: CanvasRenderingContext2D, groundY: number, alpha?: number): void;
  /**
   * A named point in world space: stage x, height above ground (y up), i.e. the same
   * space as the sim. Screen y = groundY - y.
   */
  getJointWorld(name: JointName, out?: Point): Point;
}

interface RibbonDef {
  params: ChainParams;
  w0: number;
  w1: number;
  /** Anchor in torso coordinates: `along` the spine from the hip, `across` toward the chest. */
  along: number;
  across: number;
}

const RIBBONS: Record<RibbonStyle, RibbonDef> = {
  scarf: {
    params: { nodes: 8, seg: 10, gravity: 0.3, damping: 0.92, drift: 0.5, lift: 0, flutter: 0.6 },
    w0: 8,
    w1: 3,
    along: 55,
    across: -9,
  },
  sash: {
    params: { nodes: 7, seg: 9, gravity: 0.36, damping: 0.92, drift: 0.32, lift: 0, flutter: 0.5 },
    w0: 7,
    w1: 3,
    along: 12,
    across: -13,
  },
  tail: {
    params: { nodes: 9, seg: 10, gravity: 0.32, damping: 0.9, drift: 0.2, lift: 0.62, flutter: 0.35 },
    w0: 5,
    w1: 1.5,
    along: -4,
    across: -13,
  },
  cape: {
    params: { nodes: 7, seg: 12.5, gravity: 0.5, damping: 0.9, drift: 0.28, lift: 0, flutter: 0.6 },
    w0: 20,
    w1: 30,
    along: 47,
    across: -9,
  },
  shawl: {
    params: { nodes: 7, seg: 11, gravity: 0.46, damping: 0.9, drift: 0.3, lift: 0, flutter: 0.55 },
    w0: 15,
    w1: 24,
    along: 52,
    across: -13,
  },
  quiver: {
    params: { nodes: 3, seg: 15, gravity: 0.04, damping: 0.55, drift: 0.05, lift: 0.45, flutter: 0 },
    w0: 11,
    w1: 11,
    along: 36,
    across: -16,
  },
};

/** Ribbons drawn as cloth (secondary glow); the rest are body parts (accent rim). */
const CLOTH_RIBBONS: ReadonlySet<RibbonStyle> = new Set(['scarf', 'sash', 'shawl', 'quiver']);

const BRAID: ChainParams = { nodes: 7, seg: 7, gravity: 0.45, damping: 0.9, drift: 0.12, lift: 0, flutter: 0.2 };
const PONYTAIL: ChainParams = { nodes: 6, seg: 6, gravity: 0.2, damping: 0.88, drift: 0.34, lift: 0.08, flutter: 0.4 };

// Torso outline in torso coordinates [across, along]; across is scaled by bulk.
const TORSO: readonly number[] = [
  -12, 12, -15, 27, -18, 43, -17.5, 50.5, -11, 56, -5, 58.5, 5, 58.5, 12, 56, 18.5, 50, 19.5, 39, 14.5, 25, 11.5, 12,
];
const PELVIS: readonly number[] = [-13, 13, -15, 2, -11, -9, 0, -13, 11, -9, 14, 2, 12, 13];

// Foot in foot coordinates [along the foot, up], origin at the ankle; sole at -6.
const FOOT: readonly number[] = [-4, 2, -5.5, -6, 13, -6, 15, -3.5, 10, -0.5, 2, 4];

const LIMB_JOINTS = [
  'hipF',
  'kneeF',
  'ankleF',
  'hipB',
  'kneeB',
  'ankleB',
  'shoulderF',
  'elbowF',
  'handF',
  'shoulderB',
  'elbowB',
  'handB',
] as const;
type LimbJoint = (typeof LIMB_JOINTS)[number];

// Limb radii [proximal, distal] in reference px at bulk 1.
const R_UPPER_ARM: readonly [number, number] = [7.4, 5.4];
const R_LOWER_ARM: readonly [number, number] = [6, 4];
const R_UPPER_LEG: readonly [number, number] = [10, 7];
const R_LOWER_LEG: readonly [number, number] = [7.4, 4.3];

class FighterViewImpl implements FighterView {
  readonly rig: RigState = createRigState();
  private readonly pal: Palette;
  private readonly ribbon: Chain;
  private readonly ribbonDef: RibbonDef;
  private readonly hair: Chain | null;
  private readonly hairAnchor: readonly [number, number];
  private readonly edgeL: Float64Array;
  private readonly edgeR: Float64Array;
  private x = 0;
  private y = 0;
  private facing: 1 | -1 = 1;
  private hasState = false;
  private weaponHidden = false;

  // Trail ring buffer: grip position and weapon direction in world space.
  private readonly tgx = new Float64Array(TRAIL_FRAMES + 1);
  private readonly tgy = new Float64Array(TRAIL_FRAMES + 1);
  private readonly tang = new Float64Array(TRAIL_FRAMES + 1);
  private readonly tlive = new Uint8Array(TRAIL_FRAMES + 1);
  private thead = 0;
  private tcount = 0;

  // Draw-time scratch: screen-space limb joints, a reusable frame, ground line.
  private readonly sp = Object.fromEntries(LIMB_JOINTS.map((k) => [k, { x: 0, y: 0 }])) as Record<
    LimbJoint,
    Point
  >;
  private readonly fr = new Frame();
  private gy = 0;

  constructor(readonly look: FighterLook) {
    this.pal = makePalette(look);
    this.ribbonDef = RIBBONS[look.ribbon];
    const s = look.height;
    const rp = this.ribbonDef.params;
    this.ribbon = new Chain({ ...rp, seg: rp.seg * s });
    const hp = look.headStyle === 'braid' ? BRAID : look.headStyle === 'topknot' ? PONYTAIL : null;
    this.hair = hp ? new Chain({ ...hp, seg: hp.seg * s }) : null;
    this.hairAnchor = look.headStyle === 'braid' ? BRAID_ANCHOR : TOPKNOT_ANCHOR;
    const n = Math.max(rp.nodes, BRAID.nodes, PONYTAIL.nodes);
    this.edgeL = new Float64Array(n * 2);
    this.edgeR = new Float64Array(n * 2);
  }

  reset(): void {
    this.ribbon.reset();
    this.hair?.reset();
    this.tcount = 0;
    this.tlive.fill(0);
  }

  update(p: FighterUpdate): void {
    computeRig(p.pose, this.look, this.rig);
    this.x = p.x;
    this.y = p.y;
    this.facing = p.facing;
    this.hasState = true;
    this.weaponHidden = p.weaponHidden ?? false;

    const r = this.rig;
    const s = r.scale;
    const ux = Math.cos(r.spineDir);
    const uy = Math.sin(r.spineDir);
    const def = this.ribbonDef;
    const ax = r.hip.x + (ux * def.along + uy * def.across) * s;
    const ay = r.hip.y + (uy * def.along - ux * def.across) * s;
    this.ribbon.step(this.wx(ax), this.wy(ay), p.facing);

    if (this.hair) {
      // Hair anchor in head coordinates [forward, up]; forward axis = (hy, -hx).
      const hx = Math.cos(r.headDir);
      const hy = Math.sin(r.headDir);
      const [f, u] = this.hairAnchor;
      const hs = s * (0.92 + 0.08 * this.look.bulk);
      const bx = r.head.x + (hy * f + hx * u) * hs;
      const by = r.head.y + (-hx * f + hy * u) * hs;
      this.hair.step(this.wx(bx), this.wy(by), p.facing);
    }

    // Trail sample: grip (front hand) and weapon direction, in world space.
    this.thead = (this.thead + 1) % (TRAIL_FRAMES + 1);
    this.tgx[this.thead] = this.wx(r.handF.x);
    this.tgy[this.thead] = this.wy(r.handF.y);
    this.tang[this.thead] = p.facing === 1 ? r.weaponDir : Math.PI - r.weaponDir;
    this.tlive[this.thead] = p.trail && !this.weaponHidden ? 1 : 0;
    this.tcount = Math.min(this.tcount + 1, TRAIL_FRAMES + 1);
  }

  private wx(lx: number): number {
    return this.x + this.facing * lx;
  }

  private wy(ly: number): number {
    return this.y + ly;
  }

  getJointWorld(name: JointName, out: Point = { x: 0, y: 0 }): Point {
    if (name === 'ribbonEnd') {
      const i = this.ribbon.n - 1;
      out.x = this.ribbon.x[i] ?? this.x;
      out.y = this.ribbon.y[i] ?? this.y;
      return out;
    }
    const r = this.rig;
    let p: Point;
    switch (name) {
      case 'footF':
        p = r.ankleF;
        break;
      case 'footB':
        p = r.ankleB;
        break;
      default:
        p = r[name];
    }
    out.x = this.wx(p.x);
    out.y = this.wy(p.y);
    return out;
  }

  /*
   * Drawing works in screen space with no canvas transform for everything except the
   * head and weapon details: rig points are mapped to the screen up front, and shaped
   * parts go through `Frame`. Mirrored or flipped canvas transforms are 2-3x slower.
   */
  draw(ctx: CanvasRenderingContext2D, groundY: number, alpha = 1): void {
    if (!this.hasState || alpha <= 0) return;
    const r = this.rig;
    const s = r.scale;
    const pal = this.pal;
    this.gy = groundY;
    const sp = this.sp;
    for (const k of LIMB_JOINTS) this.toScreen(r[k], sp[k]);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    this.drawShadow(ctx, alpha);
    this.drawRibbon(ctx, alpha);
    if (this.hair) {
      if (this.look.headStyle === 'braid') this.drawBraid(ctx, this.hair, alpha);
      else this.drawPonytail(ctx, this.hair, alpha);
    }

    const bulk = this.look.bulk * s;
    const gripping = r.backGrip > 0.5;

    this.drawLeg(ctx, sp.hipB, sp.kneeB, sp.ankleB, r.ankleB, r.lowerLegB, bulk, true, alpha);
    this.drawArm(ctx, sp.shoulderB, sp.elbowB, gripping ? null : sp.handB, r.shoulderB, r.elbowB, bulk, true, alpha);
    if (!gripping) this.drawHand(ctx, sp.handB, bulk, true, alpha);

    const pelvisDir = (r.spineDir - Math.PI / 2) * 0.35;
    this.frame(r.hip, pelvisDir).poly(ctx, PELVIS, bulk, s);
    paintPart(ctx, pal, false, alpha);
    this.drawLeg(ctx, sp.hipF, sp.kneeF, sp.ankleF, r.ankleF, r.lowerLegF, bulk, false, alpha);
    this.drawTorso(ctx, s, bulk, alpha);

    // Head details use a canvas transform (curves and ellipses in head space).
    ctx.save();
    ctx.translate(this.x, groundY - this.y);
    ctx.scale(this.facing, -1);
    ctx.translate(r.head.x, r.head.y);
    ctx.rotate(r.headDir - Math.PI / 2);
    drawHead(ctx, this.look.headStyle, pal, s * (0.92 + 0.08 * this.look.bulk), alpha);
    ctx.restore();

    if (gripping) this.drawForearm(ctx, sp.elbowB, sp.handB, bulk, alpha);

    this.drawArm(ctx, sp.shoulderF, sp.elbowF, sp.handF, r.shoulderF, r.elbowF, bulk, false, alpha);

    if (!this.weaponHidden) {
      ctx.save();
      ctx.translate(this.x, groundY - this.y);
      ctx.scale(this.facing, -1);
      ctx.translate(r.weaponBase.x, r.weaponBase.y);
      ctx.rotate(r.weaponDir);
      drawWeapon(ctx, this.look.weapon.type, pal, this.look.weapon.length * s, s, alpha);
      ctx.restore();
    }

    this.drawHand(ctx, sp.handF, bulk, false, alpha);
    this.drawTrail(ctx, alpha);
    ctx.restore();
  }

  private toScreen(p: Point, out: Point): void {
    out.x = this.x + this.facing * p.x;
    out.y = this.gy - this.y - p.y;
  }

  /** Screen frame at a rig-local point, +a along local direction `dir`. */
  private frame(o: Point, dir: number): Frame {
    return this.fr.set(this.x, this.gy - this.y, this.facing, o.x, o.y, dir);
  }

  private drawShadow(ctx: CanvasRenderingContext2D, alpha: number): void {
    const s = this.rig.scale;
    const k = 1 / (1 + Math.max(0, this.y) / 110);
    const rx = 58 * s * this.look.bulk ** 0.5 * (0.45 + 0.55 * k);
    const ry = 9 * s * (0.5 + 0.5 * k);
    const a = alpha * (0.35 + 0.65 * k);
    const pal = this.pal;
    // Layered ellipses instead of a scaled radial gradient (much cheaper to fill).
    ctx.globalAlpha = a;
    ctx.fillStyle = pal.shadowCore;
    ctx.beginPath();
    ctx.ellipse(this.x, this.gy, rx * 0.62, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = pal.rimSoft;
    ctx.beginPath();
    ctx.ellipse(this.x, this.gy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.x, this.gy, rx * 0.7, ry * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.rimGlow;
    ctx.beginPath();
    ctx.ellipse(this.x, this.gy, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
  }

  /** Leg from screen points; `ankleL` and `shinDir` (local) orient the foot. */
  private drawLeg(
    ctx: CanvasRenderingContext2D,
    hip: Point,
    knee: Point,
    ankle: Point,
    ankleL: Point,
    shinDir: number,
    bulk: number,
    back: boolean,
    a: number,
  ): void {
    const pal = this.pal;
    const s = this.rig.scale;
    // Foot first so the shin overlaps it.
    this.frame(ankleL, shinDir + Math.PI / 2).poly(ctx, FOOT, s, s);
    paintPart(ctx, pal, back, a);

    capsulePath(ctx, hip.x, hip.y, knee.x, knee.y, R_UPPER_LEG[0] * bulk, R_UPPER_LEG[1] * bulk);
    paintPart(ctx, pal, back, a);
    capsulePath(ctx, knee.x, knee.y, ankle.x, ankle.y, R_LOWER_LEG[0] * bulk, R_LOWER_LEG[1] * bulk);
    paintPart(ctx, pal, back, a);
    // Knee guard, energy line through the whole leg, joint dot.
    ctx.beginPath();
    ctx.arc(knee.x, knee.y, 4.6 * bulk, 0, Math.PI * 2);
    paintPart(ctx, pal, back, a, pal.accent, pal.rimGlow, false);
    energyLine(ctx, pal, hip, knee, ankle, 5.5 * s, back, a);
    jointDot(ctx, pal, knee.x, knee.y, 1.6, back, a);
  }

  /**
   * Upper arm with pauldron, plus the forearm when `hand` is given (the hand itself is
   * drawn separately). Screen points, with the local shoulder/elbow for the pauldron.
   */
  private drawArm(
    ctx: CanvasRenderingContext2D,
    shoulder: Point,
    elbow: Point,
    hand: Point | null,
    shoulderL: Point,
    elbowL: Point,
    bulk: number,
    back: boolean,
    a: number,
  ): void {
    const pal = this.pal;
    capsulePath(ctx, shoulder.x, shoulder.y, elbow.x, elbow.y, R_UPPER_ARM[0] * bulk, R_UPPER_ARM[1] * bulk);
    paintPart(ctx, pal, back, a);
    if (hand) {
      capsulePath(ctx, elbow.x, elbow.y, hand.x, hand.y, R_LOWER_ARM[0] * bulk, R_LOWER_ARM[1] * bulk);
      paintPart(ctx, pal, back, a);
    }
    energyLine(ctx, pal, shoulder, elbow, hand, 5.5 * this.rig.scale, back, a);
    if (hand) jointDot(ctx, pal, elbow.x, elbow.y, 1.5, back, a);

    // Pauldron: a layered plate capping the shoulder, oriented with the upper arm.
    const f = this.frame(shoulderL, Math.atan2(elbowL.y - shoulderL.y, elbowL.x - shoulderL.x));
    const b = bulk;
    ctx.beginPath();
    f.m(ctx, -7 * b, -8 * b);
    f.q(ctx, 4 * b, -12 * b, 13 * b, -7.5 * b);
    f.l(ctx, 11 * b, 0);
    f.l(ctx, 13 * b, 7.5 * b);
    f.q(ctx, 4 * b, 12 * b, -7 * b, 8 * b);
    f.q(ctx, -11 * b, 0, -7 * b, -8 * b);
    ctx.closePath();
    paintPart(ctx, pal, back, a);
    ctx.strokeStyle = pal.energy;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = back ? a * 0.55 : a;
    ctx.beginPath();
    f.m(ctx, 4 * b, -9.5 * b);
    f.q(ctx, 8 * b, 0, 4 * b, 9.5 * b);
    ctx.stroke();
    ctx.globalAlpha = a;
  }

  /** Back forearm and hand wrapped onto the weapon, drawn in front of the torso. */
  private drawForearm(ctx: CanvasRenderingContext2D, elbow: Point, hand: Point, bulk: number, a: number): void {
    const pal = this.pal;
    capsulePath(ctx, elbow.x, elbow.y, hand.x, hand.y, R_LOWER_ARM[0] * bulk, R_LOWER_ARM[1] * bulk);
    paintPart(ctx, pal, false, a);
    energyLine(ctx, pal, elbow, hand, null, 5 * this.rig.scale, false, a);
    jointDot(ctx, pal, elbow.x, elbow.y, 1.5, false, a);
    this.drawHand(ctx, hand, bulk, false, a);
  }

  private drawHand(ctx: CanvasRenderingContext2D, hand: Point, bulk: number, back: boolean, a: number): void {
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 4.6 * bulk, 0, Math.PI * 2);
    paintPart(ctx, this.pal, back, a);
  }

  private drawTorso(ctx: CanvasRenderingContext2D, s: number, bulk: number, a: number): void {
    const r = this.rig;
    const pal = this.pal;
    // Torso frame: a = across (toward the chest), b = along the spine from the hip.
    const f = this.frame(r.hip, r.spineDir - Math.PI / 2);
    f.poly(ctx, TORSO, bulk, s);
    paintPart(ctx, pal, false, a);

    // Armour seams: collar, sternum line and ab plate.
    ctx.globalAlpha = a;
    ctx.strokeStyle = pal.energy;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    f.m(ctx, -9 * bulk, 50 * s);
    f.q(ctx, 3 * bulk, 45 * s, 13 * bulk, 49 * s);
    f.m(ctx, 6 * bulk, 46 * s);
    f.l(ctx, 4 * bulk, 18 * s);
    f.m(ctx, -10 * bulk, 22 * s);
    f.l(ctx, 10.5 * bulk, 22 * s);
    ctx.stroke();
    // Chest core.
    ctx.beginPath();
    f.m(ctx, 8.5 * bulk, 40 * s);
    f.l(ctx, 11.5 * bulk, 36 * s);
    f.l(ctx, 8.5 * bulk, 32 * s);
    f.l(ctx, 5.5 * bulk, 36 * s);
    ctx.closePath();
    ctx.strokeStyle = pal.secGlow;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = pal.secondary;
    ctx.fill();
    // Where a cloth ribbon is tied on: neck wrap for a scarf, belt knot for a sash.
    const rib = this.look.ribbon;
    if (rib === 'scarf' || rib === 'sash') {
      const yy = rib === 'scarf' ? 56 * s : 12 * s;
      const ba = (rib === 'scarf' ? -10 : -14) * bulk;
      const fa = (rib === 'scarf' ? 10 : 13) * bulk;
      capsulePath(ctx, f.x(ba, yy - s), f.y(ba, yy - s), f.x(fa, yy + s), f.y(fa, yy + s), 4.2 * s, 3.4 * s);
      paintPart(ctx, pal, false, a, pal.secondary, pal.secGlow);
      ctx.fillStyle = pal.ribbonFill;
      ctx.fill();
    }
  }

  /** Tapered band along a chain (world space), emitted in screen space. */
  private bandPath(ctx: CanvasRenderingContext2D, c: Chain, w0: number, w1: number): void {
    const n = c.n;
    const L = this.edgeL;
    const R = this.edgeR;
    const G = this.gy;
    for (let i = 0; i < n; i++) {
      const i0 = i > 0 ? i - 1 : 0;
      const i1 = i < n - 1 ? i + 1 : n - 1;
      let tx = (c.x[i1] ?? 0) - (c.x[i0] ?? 0);
      let ty = (c.y[i1] ?? 0) - (c.y[i0] ?? 0);
      const d = Math.hypot(tx, ty) || 1;
      tx /= d;
      ty /= d;
      const w = (w0 + (w1 - w0) * (i / (n - 1))) * 0.5;
      L[i * 2] = (c.x[i] ?? 0) - ty * w;
      L[i * 2 + 1] = G - ((c.y[i] ?? 0) + tx * w);
      R[i * 2] = (c.x[i] ?? 0) + ty * w;
      R[i * 2 + 1] = G - ((c.y[i] ?? 0) - tx * w);
    }
    ctx.beginPath();
    ctx.moveTo(L[0] ?? 0, L[1] ?? 0);
    // Smooth each edge through segment midpoints.
    for (let i = 1; i < n - 1; i++) {
      const mx = ((L[i * 2] ?? 0) + (L[i * 2 + 2] ?? 0)) / 2;
      const my = ((L[i * 2 + 1] ?? 0) + (L[i * 2 + 3] ?? 0)) / 2;
      ctx.quadraticCurveTo(L[i * 2] ?? 0, L[i * 2 + 1] ?? 0, mx, my);
    }
    ctx.lineTo(L[(n - 1) * 2] ?? 0, L[(n - 1) * 2 + 1] ?? 0);
    ctx.lineTo(R[(n - 1) * 2] ?? 0, R[(n - 1) * 2 + 1] ?? 0);
    for (let i = n - 2; i > 0; i--) {
      const mx = ((R[i * 2] ?? 0) + (R[i * 2 - 2] ?? 0)) / 2;
      const my = ((R[i * 2 + 1] ?? 0) + (R[i * 2 - 1] ?? 0)) / 2;
      ctx.quadraticCurveTo(R[i * 2] ?? 0, R[i * 2 + 1] ?? 0, mx, my);
    }
    ctx.lineTo(R[0] ?? 0, R[1] ?? 0);
    ctx.closePath();
  }

  private drawRibbon(ctx: CanvasRenderingContext2D, a: number): void {
    const c = this.ribbon;
    const s = this.rig.scale;
    const def = this.ribbonDef;
    const pal = this.pal;
    const G = this.gy;
    // Cloth bands (scarf, sash) glow in the secondary colour; tail and cape are body
    // parts with the accent rim.
    const cloth = CLOTH_RIBBONS.has(this.look.ribbon);
    this.bandPath(ctx, c, def.w0 * s, def.w1 * s);
    ctx.globalAlpha = a;
    ctx.fillStyle = pal.body;
    ctx.fill();
    ctx.fillStyle = cloth ? pal.ribbonFill : pal.rimSoft;
    ctx.fill();
    ctx.strokeStyle = cloth ? pal.secGlow : pal.rimGlow;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = cloth ? pal.secondary : pal.accent;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Core line down the band.
    ctx.beginPath();
    ctx.moveTo(c.x[0] ?? 0, G - (c.y[0] ?? 0));
    for (let i = 1; i < c.n; i++) ctx.lineTo(c.x[i] ?? 0, G - (c.y[i] ?? 0));
    ctx.strokeStyle = cloth ? pal.secondary : pal.energy;
    ctx.lineWidth = cloth ? 1 : 1.2;
    ctx.stroke();
  }

  private drawPonytail(ctx: CanvasRenderingContext2D, c: Chain, a: number): void {
    const s = this.rig.scale;
    this.bandPath(ctx, c, 7 * s, 1.2 * s);
    paintPart(ctx, this.pal, false, a);
  }

  private drawBraid(ctx: CanvasRenderingContext2D, c: Chain, a: number): void {
    const s = this.rig.scale;
    const pal = this.pal;
    const G = this.gy;
    for (let i = c.n - 1; i >= 1; i--) {
      const x0 = c.x[i - 1] ?? 0;
      const y0 = G - (c.y[i - 1] ?? 0);
      const x1 = c.x[i] ?? 0;
      const y1 = G - (c.y[i] ?? 0);
      const rr = (3.6 - (i / c.n) * 1.4) * s;
      ctx.beginPath();
      ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, rr * 1.25, rr, Math.atan2(y1 - y0, x1 - x0), 0, Math.PI * 2);
      paintPart(ctx, pal, true, a);
    }
    // Tassel bead.
    const i = c.n - 1;
    ctx.beginPath();
    ctx.arc(c.x[i] ?? 0, G - (c.y[i] ?? 0), 2.4 * s, 0, Math.PI * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = pal.secondary;
    ctx.fill();
  }

  private drawTrail(ctx: CanvasRenderingContext2D, a: number): void {
    if (this.tcount < 2) return;
    const spec = WEAPON_SPECS[this.look.weapon.type];
    const L = this.look.weapon.length * this.rig.scale;
    const r0 = (spec.trailInner - spec.grip) * L;
    const r1 = (1 - spec.grip) * L;
    const pal = this.pal;
    const G = this.gy;
    const N = TRAIL_FRAMES + 1;
    const SUB = 4;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    for (let k = 0; k < this.tcount - 1 && k < TRAIL_FRAMES; k++) {
      const iA = (this.thead - k + N) % N; // newer
      const iB = (this.thead - k - 1 + N) % N; // older
      if (!this.tlive[iA] || !this.tlive[iB]) continue;
      const gxA = this.tgx[iA] ?? 0;
      const gyA = this.tgy[iA] ?? 0;
      const gxB = this.tgx[iB] ?? 0;
      const gyB = this.tgy[iB] ?? 0;
      const angA = this.tang[iA] ?? 0;
      const angB = this.tang[iB] ?? 0;
      // Outer edge newer -> older, inner edge back (world y up, flipped to screen).
      ctx.beginPath();
      for (let j = 0; j <= SUB; j++) {
        const u = j / SUB;
        const ang = lerpAngle(angA, angB, u);
        ctx.lineTo(gxA + (gxB - gxA) * u + Math.cos(ang) * r1, G - (gyA + (gyB - gyA) * u + Math.sin(ang) * r1));
      }
      for (let j = SUB; j >= 0; j--) {
        const u = j / SUB;
        const ang = lerpAngle(angA, angB, u);
        ctx.lineTo(gxA + (gxB - gxA) * u + Math.cos(ang) * r0, G - (gyA + (gyB - gyA) * u + Math.sin(ang) * r0));
      }
      ctx.closePath();
      ctx.fillStyle = pal.trailFill[k] ?? pal.rimSoft;
      ctx.fill();
      // Bright tip arc.
      ctx.beginPath();
      for (let j = 0; j <= SUB; j++) {
        const u = j / SUB;
        const ang = lerpAngle(angA, angB, u);
        ctx.lineTo(gxA + (gxB - gxA) * u + Math.cos(ang) * r1, G - (gyA + (gyB - gyA) * u + Math.sin(ang) * r1));
      }
      ctx.strokeStyle = pal.trailLine[k] ?? pal.accent;
      ctx.lineWidth = 2.5 * (1 - k / TRAIL_FRAMES) + 0.5;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function createFighterView(look: FighterLook): FighterView {
  return new FighterViewImpl(look);
}
