import { app } from "../../core/state";
import { BloodEffect } from "../../effects";
import type { PenTool } from "../../types";

export class BloodPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new BloodEffect(x, y, app.penColor));
  }
}
