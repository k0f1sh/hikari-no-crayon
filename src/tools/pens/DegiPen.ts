import { app } from "../../core/state";
import { DegiEffect } from "../../effects";
import type { PenTool } from "../../types";

export class DegiPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new DegiEffect(x, y, app.penColor));
  }
}
