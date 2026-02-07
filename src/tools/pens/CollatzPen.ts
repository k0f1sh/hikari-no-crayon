import { app } from "../../core/state";
import { CollatzEffect } from "../../effects";
import type { PenTool } from "../../types";

export class CollatzPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new CollatzEffect(x, y, app.penColor));
  }
}
