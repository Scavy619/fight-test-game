// On-screen controls: a dim strip above the meters during the fight, and a full panel
// for the pause overlay and the mode select. One place for the key names so the text
// stays in step with `src/engine/input.ts` and `src/engine/mouse.ts`.
import { HUD_FONT, P_COLORS } from './hud';

export const CYAN = '#2FF3E0';
const TEXT = '#C8D2F0';
const DIM = '#5A6684';

export interface ControlsOptions {
  /** Solo: P1 also has the mouse and P2 is the computer. */
  solo: boolean;
}

export const P1_LINES: readonly string[] = [
  'A D move · W jump · S crouch',
  'F light · G heavy · H special · R block · T dodge · Q grab · E power',
];
export const P2_LINES: readonly string[] = [
  'Arrows move · up jump · down crouch',
  'K light · L heavy · ; special · I block · O dodge · U grab · P power',
];
export const MOUSE_LINES: readonly string[] = [
  'Point to walk · high to jump · below the floor to crouch',
  'Left light · Right heavy · Middle special · click the buttons below for the rest',
];
export const PAD_LINES: readonly string[] = [
  'Stick or d-pad move · X light · Y heavy · B special',
  'RB block · A dodge · LB grab · LT power · Start pauses',
];
export const ULTIMATE_LINE = 'Heavy + special with a full meter: ULTIMATE';
export const GRAB_LINE = 'Q / U, or light + heavy together, up close: GRAB (cannot be blocked)';
export const POWER_LINE = 'Hold E / P (or hold heavy), release: POWER STRIKE (armoured, cannot be blocked)';
export const BLOCK_LINE = 'Hold back (away from the opponent) when attacked to BLOCK · hold down + back against sweeps';
export const GENERAL_LINES: readonly string[] = [
  ULTIMATE_LINE,
  POWER_LINE,
  GRAB_LINE,
  BLOCK_LINE,
  'Chains on hit: light → light → heavy → special → ultimate · Esc pauses',
];

/** Strip y positions (logical px): two lines above the meters at 676. */
const STRIP_Y: readonly [number, number] = [631, 650];
/** Solo: one line of text just under the floor, leaving room for the action bar at 648. */
const SOLO_STRIP_Y = 614;

function line(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, align: CanvasTextAlign, color: string, font: string): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

/** Compact controls above each player's meter. */
export function drawControlsStrip(ctx: CanvasRenderingContext2D, o: ControlsOptions): void {
  const font = `600 13px ${HUD_FONT}`;
  const head = `800 13px ${HUD_FONT}`;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.85;
  if (o.solo) {
    // One line each side; the action bar sits below.
    line(ctx, `${P1_LINES[0]} · ${P1_LINES[1]}`, 40, SOLO_STRIP_Y, 'left', TEXT, font);
    line(ctx, 'MOUSE', 1240, SOLO_STRIP_Y, 'right', CYAN, head);
    line(ctx, `${MOUSE_LINES[0]} · left light · right heavy · middle special`, 1182, SOLO_STRIP_Y, 'right', TEXT, font);
    ctx.restore();
    return;
  }
  line(ctx, `${P1_LINES[0]} · ${P1_LINES[1]}`, 40, STRIP_Y[0], 'left', TEXT, font);
  line(ctx, `${ULTIMATE_LINE} · hold back when attacked to block`, 40, STRIP_Y[1], 'left', DIM, font);
  line(ctx, `${P2_LINES[0]} · ${P2_LINES[1]}`, 1240, STRIP_Y[0], 'right', TEXT, font);
  line(ctx, 'Esc pauses for the full list', 1240, STRIP_Y[1], 'right', DIM, font);
  ctx.restore();
}

/**
 * Full controls panel centred on `cx`, starting at `top`. Three columns in versus
 * (P1, general, P2), three in solo (P1 keyboard, mouse, general). Returns the bottom y.
 */
export function drawControlsPanel(ctx: CanvasRenderingContext2D, cx: number, top: number, o: ControlsOptions): number {
  const head = `800 15px ${HUD_FONT}`;
  const body = `600 14px ${HUD_FONT}`;
  const colX = [cx - 420, cx, cx + 420] as const;
  const columns: { title: string; color: string; lines: readonly string[] }[] = o.solo
    ? [
        { title: 'KEYBOARD', color: P_COLORS[0], lines: P1_LINES },
        { title: 'MOUSE', color: CYAN, lines: MOUSE_LINES },
        { title: 'GAMEPAD (any)', color: P_COLORS[1], lines: PAD_LINES },
      ]
    : [
        { title: 'P1 KEYBOARD', color: P_COLORS[0], lines: P1_LINES },
        { title: 'GAMEPADS (pad 1 = P1, pad 2 = P2)', color: CYAN, lines: PAD_LINES },
        { title: 'P2 KEYBOARD', color: P_COLORS[1], lines: P2_LINES },
      ];
  ctx.save();
  ctx.textBaseline = 'middle';
  let bottom = top;
  columns.forEach((c, k) => {
    const x = colX[k] ?? cx;
    line(ctx, c.title, x, top, 'center', c.color, head);
    c.lines.forEach((s, j) => line(ctx, s, x, top + 24 + j * 20, 'center', TEXT, body));
    bottom = Math.max(bottom, top + 24 + c.lines.length * 20);
  });
  const gy = bottom + 18;
  GENERAL_LINES.forEach((s, j) => line(ctx, s, cx, gy + j * 20, 'center', j === 0 ? '#FFFFFF' : DIM, body));
  ctx.restore();
  return gy + GENERAL_LINES.length * 20;
}
