// Small canvas text helpers shared by the menu scenes.

/** Splits `text` into lines no wider than `maxWidth` in the context's current font. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws wrapped text; returns the y just below the last line. `maxLines` clips with an ellipsis. */
export function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Infinity,
): number {
  let lines = wrapText(ctx, text, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${(lines[maxLines - 1] ?? '').replace(/[ ,.;:]+$/, '')}…`;
  }
  lines.forEach((l, k) => ctx.fillText(l, x, y + k * lineHeight));
  return y + lines.length * lineHeight;
}
