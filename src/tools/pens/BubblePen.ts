import { app } from "../../core/state";
import { normalRand } from "../../core/math";
import { drawCircle } from "../../core/draw";
import type { PenTool } from "../../types";

export class BubblePen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < app.penSize; n += 1) {
      const rx = normalRand(x, app.penSize / 2);
      const ry = normalRand(y, app.penSize / 2);
      drawCircle(rx, ry, Math.random() * (app.penSize / 10), app.penColor, 1, 0.1);
    }
  }
}
