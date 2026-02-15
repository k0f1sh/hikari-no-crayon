import { app } from "../../core/state";
import { LifeGameEffect } from "../../effects";
import type { PenTool } from "../../types";

export class LifeGamePen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new LifeGameEffect(x, y, app.penColor));
  }
}
