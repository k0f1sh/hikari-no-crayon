import { app } from "../../core/state";
import { normalRand } from "../../core/math";
import { drawCircle } from "../../core/draw";
import type { PenTool } from "../../types";

export class BubblePen implements PenTool {
  draw(x: number, y: number): void {
    const safePenSize = Math.max(1.1, app.penSize);
    const bubbleCount = Math.max(3, Math.ceil(safePenSize));
    const scatter = Math.max(0.8, safePenSize / 2);
    const maxRadius = Math.max(0.9, safePenSize / 10);
    for (let n = 0; n < bubbleCount; n += 1) {
      const rx = normalRand(x, scatter);
      const ry = normalRand(y, scatter);
      const radius = Math.max(0.35, Math.random() * maxRadius);
      drawCircle(rx, ry, radius, app.penColor, 1, 0.1);
    }
  }
}
