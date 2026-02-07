import { app } from "../../core/state";
import { SnowEffect } from "../../effects";
import type { PenTool } from "../../types";

export class SnowPen implements PenTool {
  draw(x: number, y: number): void {
    for (let n = 0; n < 10; n += 1) {
      const d = (app.count + n * 36) % 360;
      app.effects.push(new SnowEffect(x, y, app.penColor, d));
    }
  }
}
