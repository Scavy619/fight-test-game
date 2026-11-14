// Public render API: rig types, animation sampling, pose authoring, fighter drawing.
export * from './types';
export { samplePose, blendPose, copyPose, createPose, animDuration, lerpAngle, wrapAngle, applyEase } from './anim';
export { pose, key, anim, type PoseSpec } from './pose';
export { RIG, STAND_Y, WEAPON_SPECS, computeRig, createRigState, solveTwoBone, type RigState } from './rig';
export { createFighterView, type FighterView, type FighterUpdate } from './fighterView';
export { baseAnims, BASE_ANIM_IDS, BASE_POSES, GUARD_POSE } from './anims/base';
export { SAMPLE_LOOKS, REI_LOOK, VIRA_LOOK, WUKONG_LOOK, THOR_LOOK } from './sampleLooks';
export { rgba, mixHex, hexToRgb } from './color';
