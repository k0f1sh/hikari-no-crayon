import { app } from "../../core/state";
import { ShinmyakuEffect } from "../../effects";
import type { PenTool } from "../../types";

export class ShinmyakuPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new ShinmyakuEffect(x, y, app.penColor));
  }
}
