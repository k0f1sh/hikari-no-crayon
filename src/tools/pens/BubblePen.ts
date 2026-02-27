import { app } from "../../core/state";
import { BubbleBurstEffect } from "../../effects";
import type { PenTool } from "../../types";

export class BubblePen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new BubbleBurstEffect(x, y, app.penColor, app.penSize));
  }
}
