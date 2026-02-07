import { app } from "../../core/state";
import { d2r } from "../../core/math";
import { drawLineColor } from "../../core/draw";
import type { PenTool } from "../../types";

export class FurPen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < 120; n += 1) {
      const ox = x + Math.floor(Math.random() * 20) - 10;
      const oy = y + Math.floor(Math.random() * 20) - 10;
      const toX = x + Math.cos(d2r(n * 3)) * app.penSize * Math.random();
      const toY = y + Math.sin(d2r(n * 3)) * app.penSize * Math.random();
      drawLineColor({ x: ox, y: oy }, { x: toX, y: toY }, app.penColor, 80, 0.1);
    }
  }
}
