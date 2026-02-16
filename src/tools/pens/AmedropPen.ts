import { app } from "../../core/state";
import { AmedropEffect } from "../../effects";
import type { Point } from "../../types";
import type { PenTool } from "../../types";

export class AmedropPen implements PenTool {
  previousPoint: Point | null = null;

  draw(x: number, y: number): void {
    const radius = Math.max(4, app.penSize * 3.0);
    const rawDropCount = Number(app.penCustomParams.amedrop_pen?.spawn_count);
    const dropCount = Number.isFinite(rawDropCount)
      ? Math.max(1, Math.min(5, Math.round(rawDropCount)))
      : 1;
    const rawDirection = Number(app.penCustomParams.amedrop_pen?.gravity_direction);
    const rawLifetime = Number(app.penCustomParams.amedrop_pen?.lifetime);
    const gravityDirection = Number.isFinite(rawDirection)
      ? ((rawDirection % 360) + 360) % 360
      : 90;
    const lifetime = Number.isFinite(rawLifetime)
      ? Math.max(30, Math.min(600, Math.round(rawLifetime)))
      : 180;

    const emitAt = (emitX: number, emitY: number) => {
      for (let i = 0; i < dropCount; i += 1) {
        app.effects.push(
          new AmedropEffect(emitX, emitY, app.penColor, radius, gravityDirection, {
            lifetime,
          }),
        );
      }
    };

    const isManualStroke = app.isDown && !app.isSymmetryMode;
    const isStrokeStart = isManualStroke && !app.didDrawInStroke;

    if (!isManualStroke || isStrokeStart) {
      this.previousPoint = null;
    }

    if (isManualStroke && this.previousPoint) {
      const dx = x - this.previousPoint.x;
      const dy = y - this.previousPoint.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.max(0.35, Math.min(1.5, radius * 0.12));
      const segments = Math.max(1, Math.ceil(distance / step));
      for (let i = 1; i <= segments; i += 1) {
        const t = i / segments;
        emitAt(this.previousPoint.x + dx * t, this.previousPoint.y + dy * t);
      }
    } else {
      emitAt(x, y);
    }

    this.previousPoint = isManualStroke ? { x, y } : null;
  }
}
