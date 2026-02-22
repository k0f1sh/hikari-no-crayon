import { app } from "../../core/state";
import { d2r, movePos } from "../../core/math";
import { drawLineColor } from "../../core/draw";
import type { Effect, Point } from "../../types";
import { isOutOfBounds } from "./utils";

export class NamiEffect implements Effect {
  pos: Point;
  size: number;
  alpha: number;
  delFlg: boolean;
  c: number;
  od: number;
  alphaDecay: number;
  waveAmplitudeDeg: number;
  wavePeriodFrames: number;
  moveSpeedRatio: number;
  tailDirectionOffsetDeg: number;
  centerLengthRatio: number;
  sideLengthRatio: number;
  sideCount: number;
  sideSpreadMaxDeg: number;
  lineWidth: number;
  maxLifetimeFrames: number;

  private static getNumberParam(key: string, fallback: number): number {
    const value = app.penCustomParams.nami_pen?.[key];
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.size = app.penSize;
    this.alpha = NamiEffect.getNumberParam("initial_alpha", 0.6);
    this.delFlg = false;
    this.c = 0;
    const spawnPhaseModDeg = Math.max(1, NamiEffect.getNumberParam("spawn_phase_mod_deg", 360));
    const spawnPhaseScale = NamiEffect.getNumberParam("spawn_phase_scale", 1);
    this.od = (app.count % spawnPhaseModDeg) * spawnPhaseScale;
    this.alphaDecay = NamiEffect.getNumberParam("alpha_decay", 0.01);
    this.waveAmplitudeDeg = NamiEffect.getNumberParam("wave_amplitude_deg", 93);
    this.wavePeriodFrames = Math.max(1, NamiEffect.getNumberParam("wave_period_frames", 60));
    this.moveSpeedRatio = NamiEffect.getNumberParam("move_speed_ratio", 0.1);
    this.tailDirectionOffsetDeg = NamiEffect.getNumberParam("tail_direction_offset_deg", 180);
    this.centerLengthRatio = NamiEffect.getNumberParam("center_length_ratio", 0.5);
    this.sideLengthRatio = NamiEffect.getNumberParam("side_length_ratio", 1);
    this.sideCount = Math.max(0, Math.floor(NamiEffect.getNumberParam("side_count", 2)));
    this.sideSpreadMaxDeg = Math.max(0, NamiEffect.getNumberParam("side_spread_max_deg", 20));
    this.lineWidth = NamiEffect.getNumberParam("line_width", 0.2);
    this.maxLifetimeFrames = Math.max(1, Math.floor(NamiEffect.getNumberParam("max_lifetime_frames", 3600)));
  }

  private getWaveDirection(): number {
    const phase = (app.count % this.wavePeriodFrames) / this.wavePeriodFrames;
    return Math.sin(phase * Math.PI * 2) * this.waveAmplitudeDeg + this.od;
  }

  move(): void {
    this.c += 1;
    this.alpha -= this.alphaDecay;
    const d = this.getWaveDirection();
    this.pos = movePos(this.pos, app.penSize * this.moveSpeedRatio, d);

    if (isOutOfBounds(this.pos, this.alpha) || this.c > this.maxLifetimeFrames) {
      this.delete();
    }
  }

  render(): void {
    const d = this.getWaveDirection();
    const pos1 = this.pos;
    const tailBaseDirection = (d + this.tailDirectionOffsetDeg) % 360;
    const centerPos = movePos(this.pos, this.size * this.centerLengthRatio, tailBaseDirection);
    drawLineColor(pos1, centerPos, app.penColor, this.alpha, this.lineWidth);

    for (let i = 0; i < this.sideCount; i += 1) {
      const sign = i % 2 === 0 ? -1 : 1;
      const spread = Math.floor(Math.random() * this.sideSpreadMaxDeg);
      const sidePos = movePos(
        this.pos,
        this.size * this.sideLengthRatio,
        tailBaseDirection + sign * spread,
      );
      drawLineColor(pos1, sidePos, app.penColor, this.alpha, this.lineWidth);
    }
  }

  delete(): void {
    this.delFlg = true;
  }
}
