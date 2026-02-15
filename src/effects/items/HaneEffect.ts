import { app } from "../../core/state";
import type { Color } from "../../types";
import { NarutoLineEffect } from "./NarutoLineEffect";

export class HaneEffect extends NarutoLineEffect {
  constructor(x: number, y: number, color: Color) {
    const reverseRotation = app.penCustomParams.hane_pen?.reverse_rotation === true;
    const rotationSpeed = Number(app.penCustomParams.hane_pen?.rotation_speed);
    super(x, y, color, 100000, {
      direction: reverseRotation ? -1 : 1,
      speed: Number.isFinite(rotationSpeed) ? rotationSpeed : 1,
    });
  }
}
