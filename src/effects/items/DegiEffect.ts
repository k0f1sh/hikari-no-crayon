import { app } from "../../core/state";
import { movePos, sample } from "../../core/math";
import { drawLines } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds, tail } from "./utils";

export class DegiEffect implements Effect {
  static readonly TURN_GRID = 28;

  pos: Point;
  spd: number;
  d: number;
  alpha: number;
  delFlg: boolean;
  color: Color;
  posHistory: Point[];
  decAlphaP: number;
  historyNum: number;
  lastTurnNodeKey: string | null;

  constructor(x: number, y: number, color: Color) {
    this.pos = { x, y };
    this.spd = app.penSize / 10;
    this.d = sample([0, 90, 180, 270]);
    this.alpha = 0.3;
    this.delFlg = false;
    this.color = color;
    this.posHistory = [];
    this.decAlphaP = 0.001;
    this.historyNum = 3;
    this.lastTurnNodeKey = null;
  }

  wrappedModDistance(value: number, mod: number): number {
    const r = ((value % mod) + mod) % mod;
    return Math.min(r, mod - r);
  }

  getTurnNodeKey(): string | null {
    const tolerance = Math.max(0.8, this.spd * 0.52);
    const gx = DegiEffect.TURN_GRID;
    const nearX = this.wrappedModDistance(this.pos.x, gx) <= tolerance;
    const nearY = this.wrappedModDistance(this.pos.y, gx) <= tolerance;

    if (!nearX || !nearY) {
      return null;
    }

    const nodeX = Math.round(this.pos.x / gx);
    const nodeY = Math.round(this.pos.y / gx);
    return `${nodeX},${nodeY}`;
  }

  move(): void {
    this.decAlphaP += 0.0004;
    this.alpha = Math.max(0, this.alpha - this.decAlphaP);

    this.posHistory.push(this.pos);
    this.posHistory = tail(this.posHistory, this.historyNum);

    if (Math.floor(Math.random() * 20) === 0) {
      const effect = new DegiEffect(this.pos.x, this.pos.y, app.penColor);
      effect.alpha = this.alpha;
      effect.d = sample([0, 90, 180, 270]);
      app.effects.push(effect);
    }

    this.pos = movePos(this.pos, this.spd, this.d);

    const nodeKey = this.getTurnNodeKey();
    if (!nodeKey) {
      this.lastTurnNodeKey = null;
    } else if (nodeKey !== this.lastTurnNodeKey) {
      const [nxText, nyText] = nodeKey.split(",");
      const nx = Number(nxText);
      const ny = Number(nyText);
      const turn = (nx + ny) % 2 === 0 ? 90 : -90;
      this.d += turn;
      this.lastTurnNodeKey = nodeKey;
    }

    if (isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  render(): void {
    drawLines(this.posHistory, this.color, this.alpha, 1);
  }

  delete(): void {
    this.delFlg = true;
  }
}
