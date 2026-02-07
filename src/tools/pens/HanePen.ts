import { app } from "../../core/state";
import { HaneEffect } from "../../effects";
import type { PenTool } from "../../types";

export class HanePen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new HaneEffect(x, y, app.penColor));
  }
}
