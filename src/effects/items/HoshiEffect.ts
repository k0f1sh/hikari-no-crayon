import { app } from "../../core/state";
import type { Color } from "../../types";
import { NarutoLineEffect } from "./NarutoLineEffect";

export class HoshiEffect extends NarutoLineEffect {
  constructor(x: number, y: number, color: Color) {
    const reverseRotation = app.penCustomParams.hoshi_pen?.reverse_rotation === true;
    const rotationSpeed = Number(app.penCustomParams.hoshi_pen?.rotation_speed);
    const lineWidth = Number(app.penCustomParams.hoshi_pen?.line_width);
    super(x, y, color, 10, {
      direction: reverseRotation ? -1 : 1,
      speed: Number.isFinite(rotationSpeed) ? rotationSpeed : 1,
      lineWidth: Number.isFinite(lineWidth) ? lineWidth : 1,
    });
  }
}
