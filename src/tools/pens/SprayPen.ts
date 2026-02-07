import { app } from "../../core/state";
import { normalRand } from "../../core/math";
import { drawPoint } from "../../core/draw";
import type { PenTool } from "../../types";

export class SprayPen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < app.penSize * 20; n += 1) {
      const rx = normalRand(x, app.penSize / 2);
      const ry = normalRand(y, app.penSize / 2);
      drawPoint(rx, ry, app.penColor, 0.6);
    }
  }
}
