import { describe, expect, it } from 'vitest';
import { createPose } from './anim';
import { createFighterView } from './fighterView';
import { pose } from './pose';
import { RIG, STAND_Y, computeRig, createRigState, solveTwoBone } from './rig';
import { REI_LOOK, THOR_LOOK, VIRA_LOOK } from './sampleLooks';
import type { FighterLook, JointName } from './types';

const H = Math.PI / 2;
const look: FighterLook = { ...REI_LOOK, height: 1, weapon: { ...REI_LOOK.weapon, type: 'hammer' } };

function straightPose(): ReturnType<typeof createPose> {
  const p = createPose();
  p.root.y = STAND_Y;
  p.angles.spine = H;
  p.angles.head = H;
  p.angles.upperArmF = -H;
  p.angles.lowerArmF = -H;
  p.angles.upperArmB = -H;
  p.angles.lowerArmB = -H;
  p.angles.upperLegF = -H;
  p.angles.lowerLegF = -H;
  p.angles.upperLegB = -H;
  p.angles.lowerLegB = -H;
  return p;
}

describe('forward kinematics', () => {
  it('places joints for a straight standing pose', () => {
    const r = computeRig(straightPose(), look, createRigState());
    expect(r.hip.y).toBeCloseTo(STAND_Y);
    expect(r.neck.x).toBeCloseTo(0);
    expect(r.neck.y).toBeCloseTo(STAND_Y + RIG.spine);
    expect(r.head.y + RIG.headRy).toBeCloseTo(190, 0);
    expect(r.shoulderF.x).toBeCloseTo(RIG.shoulderFAcross);
    expect(r.handF.x).toBeCloseTo(RIG.shoulderFAcross);
    expect(r.handF.y).toBeCloseTo(STAND_Y + RIG.shoulderAlong - RIG.upperArm - RIG.lowerArm);
    // Feet: sole on the ground.
    expect(r.ankleF.y).toBeCloseTo(RIG.ankle);
    expect(r.ankleF.x).toBeCloseTo(RIG.hipX);
    expect(r.ankleB.x).toBeCloseTo(-RIG.hipX);
  });

  it('applies lean to the upper body only and scales by height', () => {
    const p = straightPose();
    p.lean = -H; // torso forward, horizontal
    p.angles.upperArmF = 0; // arm forward -> with lean points down
    p.angles.lowerArmF = 0;
    const big = { ...look, height: 2 };
    const r = computeRig(p, big, createRigState());
    expect(r.neck.x).toBeCloseTo(RIG.spine * 2);
    expect(r.neck.y).toBeCloseTo(STAND_Y * 2);
    expect(r.handF.x - r.shoulderF.x).toBeCloseTo(0);
    expect(r.shoulderF.y - r.handF.y).toBeCloseTo((RIG.upperArm + RIG.lowerArm) * 2);
    expect(r.ankleF.y).toBeCloseTo(RIG.ankle * 2);
  });

  it('puts the weapon along forearm + weapon angle with the grip at the hand', () => {
    const p = straightPose();
    p.angles.lowerArmF = 0;
    p.weapon = H; // forearm forward, weapon straight up
    const r = computeRig(p, look, createRigState());
    expect(r.weaponDir).toBeCloseTo(H);
    expect(r.weaponTip.x).toBeCloseTo(r.handF.x);
    expect(r.weaponTip.y).toBeGreaterThan(r.handF.y);
    expect(r.weaponTip.y - r.weaponBase.y).toBeCloseTo(look.weapon.length);
  });
});

describe('IK helpers', () => {
  it('solveTwoBone reaches a reachable target with the requested bend side', () => {
    const [a1, a2] = solveTwoBone(0, 0, 30, -60, 40, 40, 1);
    const jx = Math.cos(a1) * 40;
    const jy = Math.sin(a1) * 40;
    expect(jx + Math.cos(a2) * 40).toBeCloseTo(30);
    expect(jy + Math.sin(a2) * 40).toBeCloseTo(-60);
    // bend +1: joint on the CCW side of the line toward the target (here: forward/right).
    const cross = 30 * jy - -60 * jx;
    expect(cross).toBeGreaterThan(0);
    expect(jx).toBeGreaterThan(15);
  });

  it('pose() plants feet at IK targets for every fighter scale', () => {
    const p = pose({ y: 80, footF: [20, 0], footB: [-25, 0] });
    for (const l of [look, VIRA_LOOK, THOR_LOOK]) {
      const r = computeRig(p, l, createRigState());
      expect(r.ankleF.x).toBeCloseTo(20 * l.height);
      expect(r.ankleF.y).toBeCloseTo(RIG.ankle * l.height);
      expect(r.ankleB.x).toBeCloseTo(-25 * l.height);
      expect(r.kneeF.x).toBeGreaterThan(r.hipF.x); // knees bend forward
    }
  });

  it('pose() hand IK accounts for lean and weaponDir is absolute', () => {
    const p = pose({ lean: -20, handF: [40, 120], weaponDir: 30 });
    const r = computeRig(p, look, createRigState());
    expect(r.handF.x).toBeCloseTo(40);
    expect(r.handF.y).toBeCloseTo(120);
    expect(r.weaponDir).toBeCloseTo((30 * Math.PI) / 180);
  });
});

describe('mirroring', () => {
  const joints: JointName[] = ['hip', 'head', 'chest', 'handF', 'handB', 'elbowF', 'kneeF', 'footB', 'weaponTip'];

  it('facing -1 mirrors every joint about the fighter x', () => {
    const p = pose({ lean: -15, handF: [50, 130], weaponDir: 20, footF: [30, 0], footB: [-20, 0] });
    const right = createFighterView(VIRA_LOOK);
    const left = createFighterView(VIRA_LOOK);
    right.update({ pose: p, x: 500, y: 40, facing: 1, trail: false });
    left.update({ pose: p, x: 500, y: 40, facing: -1, trail: false });
    for (const j of joints) {
      const a = right.getJointWorld(j);
      const b = left.getJointWorld(j);
      expect(b.x - 500).toBeCloseTo(-(a.x - 500));
      expect(b.y).toBeCloseTo(a.y);
    }
    // Forward means +x when facing right.
    expect(right.getJointWorld('weaponTip').x).toBeGreaterThan(500);
    expect(left.getJointWorld('weaponTip').x).toBeLessThan(500);
  });

  it('world y is height above ground', () => {
    const v = createFighterView(look);
    v.update({ pose: straightPose(), x: 100, y: 50, facing: 1, trail: true });
    expect(v.getJointWorld('hip').y).toBeCloseTo(50 + STAND_Y);
    const out = { x: 0, y: 0 };
    expect(v.getJointWorld('footF', out)).toBe(out);
    expect(out.y).toBeCloseTo(50 + RIG.ankle);
  });
});
