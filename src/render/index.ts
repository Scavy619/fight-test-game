// Public render API: rig types, animation sampling, pose authoring, fighter drawing.
export * from './types';
export { samplePose, blendPose, copyPose, createPose, animDuration, lerpAngle, wrapAngle, applyEase } from './anim';
export { pose, key, anim, type PoseSpec } from './pose';
export { RIG, STAND_Y, WEAPON_SPECS, computeRig, createRigState, solveTwoBone, type RigState } from './rig';
export { createFighterView, type FighterView, type FighterUpdate } from './fighterView';
export { baseAnims, BASE_ANIM_IDS, BASE_POSES, GUARD_POSE } from './anims/base';
export { SAMPLE_LOOKS, REI_LOOK, VIRA_LOOK, WUKONG_LOOK, THOR_LOOK } from './sampleLooks';
export { rgba, mixHex, hexToRgb } from './color';
export {
  pickAnimation, resolveAnimation, inActiveFrames, FighterAnimator, BLEND_FRAMES, WALK_STRIDE_SPEED,
  type AnimPick,
} from './fighterAnim';
export { drawStage, GROUND_Y, STAGE_BG, type StageOptions } from './stage';
export {
  HudState, drawHud, announcement, announceScale, timerSeconds, HUD_FONT, P_COLORS,
  type HudInfo, type HudSide, type Announcement,
} from './hud';
export { Sparks, SPARK_FRAMES } from './sparks';
export {
  MoveVisuals, placeVisual, DEFAULT_VISUAL_LIFE,
  type VisualSpec, type VisualKind, type ColumnSpec, type BurstSpec, type StreakSpec, type LiveVisual,
} from './moveVisuals';
