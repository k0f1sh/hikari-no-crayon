import type { Color } from "../../types";
import { NarutoLineEffect } from "./NarutoLineEffect";

export class HoshiEffect extends NarutoLineEffect {
  constructor(x: number, y: number, color: Color) {
    super(x, y, color, 10);
  }
}
