import { app } from "../../core/state";
import { drawCircle } from "../../core/draw";
import type { PenTool } from "../../types";

export class NormalPen implements PenTool {
  draw(x: number, y: number): void {
    drawCircle(x, y, app.penSize, app.penColor, 0.1, 1.0);
  }
}
