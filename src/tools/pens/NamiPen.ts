import { app } from "../../core/state";
import { NamiEffect } from "../../effects";
import type { PenTool } from "../../types";

export class NamiPen implements PenTool {
  draw(x: number, y: number): void {
    app.effects.push(new NamiEffect(x, y));
  }
}
