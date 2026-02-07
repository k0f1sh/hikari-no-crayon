import { app } from "../../core/state";
import { drawDarkCircle } from "../../core/draw";
import type { PenTool } from "../../types";

export class YamiPen implements PenTool {
  draw(x: number, y: number): void {
    drawDarkCircle(x, y, app.penSize);
  }
}
