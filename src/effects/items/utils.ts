import { app } from "../../core/state";
import type { Point } from "../../types";

export function isOutOfBounds(pos: Point, alpha: number): boolean {
  return (
    pos.x < 0 - app.margin ||
    pos.y < 0 - app.margin ||
    pos.x > app.width + app.margin ||
    pos.y > app.height + app.margin ||
    alpha <= 0
  );
}

export function tail<T>(items: T[], count: number): T[] {
  return items.length <= count ? items : items.slice(items.length - count);
}
