import { app } from "../../core/state";
import { OrbitEffect } from "../../effects";
import type { PenTool } from "../../types";

export class OrbitPen implements PenTool {
  draw(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const safePenSize = Math.max(8, Number.isFinite(app.penSize) ? app.penSize : 30);
    const orbitCount = 1;

    for (let i = 0; i < orbitCount; i += 1) {
      app.effects.push(new OrbitEffect(x, y, app.penColor));
    }
  }
}
