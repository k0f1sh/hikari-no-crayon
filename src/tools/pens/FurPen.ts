import { app } from "../../core/state";
import { d2r } from "../../core/math";
import { drawLineColor } from "../../core/draw";
import type { PenTool } from "../../types";

export class FurPen implements PenTool {
  draw(x: number, y: number): void {
    const rawLineCount = Number(app.penCustomParams.fur_pen?.line_count);
    const rawScatterRadius = Number(app.penCustomParams.fur_pen?.scatter_radius);
    const rawLineWidth = Number(app.penCustomParams.fur_pen?.line_width);

    const lineCount = Number.isFinite(rawLineCount) ? Math.max(20, Math.min(320, Math.round(rawLineCount))) : 120;
    const scatterRadius = Number.isFinite(rawScatterRadius)
      ? Math.max(2, Math.min(60, rawScatterRadius))
      : 10;
    const opacity = 80;
    const angleStep = 3;
    const lineWidth = Number.isFinite(rawLineWidth) ? Math.max(0.05, Math.min(2, rawLineWidth)) : 0.1;
    const scatterDiameter = scatterRadius * 2;

    for (let n = 0; n < lineCount; n += 1) {
      const ox = x + Math.floor(Math.random() * scatterDiameter) - scatterRadius;
      const oy = y + Math.floor(Math.random() * scatterDiameter) - scatterRadius;
      const toX = x + Math.cos(d2r(n * angleStep)) * app.penSize * Math.random();
      const toY = y + Math.sin(d2r(n * angleStep)) * app.penSize * Math.random();
      drawLineColor({ x: ox, y: oy }, { x: toX, y: toY }, app.penColor, opacity, lineWidth);
    }
  }
}
