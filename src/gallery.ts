/**
 * Dev-only rig gallery (/gallery.html): the four sample fighters play the same base
 * animation side by side. Left/Right change animation, T trails, F facing, M drift,
 * Space pause. Auto-advances after ~2.5 s without key input.
 */
import { setupCanvas } from './engine/canvas';
import { animDuration, createPose, samplePose } from './render/anim';
import { BASE_ANIM_IDS, baseAnims } from './render/anims/base';
import { createFighterView } from './render/fighterView';
import { SAMPLE_LOOKS } from './render/sampleLooks';
import { drawStage } from './render/stage';

const GROUND_Y = 600;
const STEP = 1000 / 60;
const AUTO_ADVANCE_MS = 2500;
const HOLD_AFTER_END = 36;
// Trails show on attack animations only (in game they follow the move's active frames).
const ATTACKS = new Set([
  'light', 'heavy', 'crouchLight', 'crouchHeavy', 'airLight', 'airHeavy',
  'specialN', 'specialF', 'specialD', 'ultimate', 'win',
]);

const canvas = document.getElementById('gallery');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #gallery canvas');
const { ctx, width, height } = setupCanvas(canvas);

const fighters = SAMPLE_LOOKS.map((s, i) => ({
  name: s.name,
  view: createFighterView(s.look),
  baseX: 200 + i * 293,
}));
const pose = createPose();

let animIndex = 0;
let frame = 0;
let trails = true;
let facing: 1 | -1 = 1;
let drift = false;
let paused = false;
let simTime = 0;
let lastInput = performance.now();

// Optional `?anim=heavy&frame=10` opens one animation, paused at a frame (for review).
const params = new URLSearchParams(window.location.search);
const startAnim = BASE_ANIM_IDS.indexOf(params.get('anim') ?? '');
if (startAnim >= 0) animIndex = startAnim;
const startFrame = params.get('frame');
if (startFrame !== null) paused = true;
if (params.get('facing') === '-1') facing = -1;
if (params.get('drift') === '1') drift = true;
const zoom = Math.max(1, Number(params.get('zoom') ?? 1) || 1);
const focus = Number(params.get('focus') ?? 0) || 0;

function animId(): string {
  return BASE_ANIM_IDS[animIndex] ?? 'idle';
}

function setAnim(delta: number): void {
  const n = BASE_ANIM_IDS.length;
  animIndex = (((animIndex + delta) % n) + n) % n;
  frame = 0;
}

window.addEventListener('keydown', (e) => {
  lastInput = performance.now();
  switch (e.key) {
    case 'ArrowRight':
      setAnim(1);
      break;
    case 'ArrowLeft':
      setAnim(-1);
      break;
    case 't':
    case 'T':
      trails = !trails;
      break;
    case 'f':
    case 'F':
      facing = facing === 1 ? -1 : 1;
      break;
    case 'm':
    case 'M':
      drift = !drift;
      break;
    case ' ':
      paused = !paused;
      break;
    default:
      return;
  }
  e.preventDefault();
});

function step(): void {
  const anim = baseAnims[animId()];
  if (!anim) return;
  frame++;
  simTime++;
  const dur = animDuration(anim);
  if (!anim.loop && frame > dur + HOLD_AFTER_END) frame = 0;
  samplePose(anim, frame, pose);
  const dx = drift ? Math.sin(simTime * 0.022) * 110 : 0;
  const id = animId();
  const trail = trails && ATTACKS.has(id);
  // Air animations are shown off the ground so the shadow and tuck read correctly.
  const y = id.startsWith('air') ? 70 : 0;
  for (const f of fighters) {
    f.view.update({ pose, x: f.baseX + dx, y, facing, trail });
  }
}


function drawHud(): void {
  const anim = baseAnims[animId()];
  const dur = anim ? animDuration(anim) : 0;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#E8F0FF';
  ctx.font = "italic 800 40px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(animId().toUpperCase(), 40, 32);
  ctx.font = "italic 800 16px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = 'rgba(232,240,255,0.6)';
  const shown = anim?.loop ? frame % Math.max(1, dur) : Math.min(frame, dur);
  ctx.fillText(
    `${animIndex + 1}/${BASE_ANIM_IDS.length}   FRAME ${Math.floor(shown)}/${dur}${anim?.loop ? '  LOOP' : ''}`,
    42,
    80,
  );
  ctx.textAlign = 'right';
  ctx.fillText(
    `LEFT/RIGHT ANIM   T TRAILS ${trails ? 'ON' : 'OFF'}   F FACING   M DRIFT ${drift ? 'ON' : 'OFF'}   SPACE PAUSE`,
    width - 40,
    36,
  );
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,240,255,0.45)';
  for (const f of fighters) ctx.fillText(f.name.toUpperCase(), f.baseX, GROUND_Y + 70);
}

let last = performance.now();
let acc = 0;
function tick(now: number): void {
  acc += Math.min(250, now - last);
  last = now;
  if (!paused && now - lastInput > AUTO_ADVANCE_MS) {
    lastInput = now;
    setAnim(1);
  }
  while (acc >= STEP) {
    acc -= STEP;
    if (!paused) step();
  }
  ctx.save();
  if (zoom > 1) {
    // Review aid: magnify around one fighter (`?zoom=2.5&focus=1`).
    const fx = fighters[focus]?.baseX ?? width / 2;
    ctx.translate(width / 2, 380);
    ctx.scale(zoom, zoom);
    ctx.translate(-fx, -(GROUND_Y - 100));
  }
  drawStage(ctx, width, height, GROUND_Y, { lineColor: '#3DA9FF', lineAlpha: 1 });
  for (const f of fighters) f.view.draw(ctx, GROUND_Y);
  ctx.restore();
  drawHud();
  requestAnimationFrame(tick);
}

if (startFrame !== null) {
  // Settle the ribbons on the first pose, then play up to the requested frame.
  const target = Math.max(1, Number(startFrame));
  for (let i = 0; i < 60; i++) {
    frame = -1;
    step();
  }
  while (frame < target) step();
} else {
  step();
}
requestAnimationFrame(tick);
