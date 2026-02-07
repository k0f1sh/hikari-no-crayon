import { app } from "../../core/state";
import { HoshiEffect } from "../../effects";
import type { PenTool } from "../../types";

export class HoshiPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new HoshiEffect(x, y, app.penColor));
  }
}
