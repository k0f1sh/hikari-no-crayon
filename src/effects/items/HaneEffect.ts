import type { Color } from "../../types";
import { NarutoLineEffect } from "./NarutoLineEffect";

export class HaneEffect extends NarutoLineEffect {
  constructor(x: number, y: number, color: Color) {
    super(x, y, color, 100000);
  }
}
