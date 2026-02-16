import { app } from "../../core/state";
import { d2r } from "../../core/math";
import { drawCircle, drawLineColor } from "../../core/draw";
import type { Color, Effect, Point } from "../../types";
import { isOutOfBounds } from "./utils";

interface AmedropEffectOptions {
  lifetime?: number;
}

export class AmedropEffect implements Effect {
  pos: Point;
  prevPos: Point;
  color: Color;
  alpha: number;
  delFlg: boolean;
  size: number;
  velocityX: number;
  velocityY: number;
  gravityX: number;
  gravityY: number;
  tangentX: number;
  tangentY: number;
  gravityAccel: number;
  drag: number;
  fallDistance: number;
  bounceDistance: number;
  bounceCount: number;
  maxBounces: number;
  age: number;
  maxAge: number;

  constructor(
    x: number,
    y: number,
    color: Color,
    radius: number,
    gravityDirectionDeg: number,
    options: AmedropEffectOptions = {},
  ) {
    const spawnAngle = Math.random() * Math.PI * 2;
    // 円周寄りに偏ると軌跡に穴が空きやすいので、円内一様分布で発生させる
    const spawnRadius = radius * Math.sqrt(Math.random());
    const spawnX = x + Math.cos(spawnAngle) * spawnRadius;
    const spawnY = y + Math.sin(spawnAngle) * spawnRadius;

    const gravityRadians = d2r(gravityDirectionDeg);
    const gravityX = Math.cos(gravityRadians);
    const gravityY = Math.sin(gravityRadians);
    const tangentX = -gravityY;
    const tangentY = gravityX;

    const baseAlong = 0.5 + Math.random() * 1.2;
    const sideJitter = (Math.random() - 0.5) * 1.2;

    this.pos = { x: spawnX, y: spawnY };
    this.prevPos = { x: spawnX, y: spawnY };
    this.color = color;
    this.alpha = 0.38;
    this.delFlg = false;
    this.size = Math.max(1.6, app.penSize / 24 + Math.random() * 1.8);
    this.velocityX = gravityX * baseAlong + tangentX * sideJitter;
    this.velocityY = gravityY * baseAlong + tangentY * sideJitter;
    this.gravityX = gravityX;
    this.gravityY = gravityY;
    this.tangentX = tangentX;
    this.tangentY = tangentY;
    this.gravityAccel = 0.08 + app.penSize / 520;
    this.drag = 0.987;
    this.fallDistance = 0;
    this.bounceDistance = Math.max(20, radius * (0.9 + Math.random() * 1.4));
    this.bounceCount = 0;
    // 一時的にバウンス挙動を無効化
    this.maxBounces = 0;
    this.age = 0;
    const configuredLifetime = Number(options.lifetime);
    this.maxAge = Number.isFinite(configuredLifetime)
      ? Math.max(30, Math.min(600, Math.round(configuredLifetime)))
      : Math.max(90, Math.min(320, Math.round(app.penSize * 2.8)));
  }

  move(): void {
    this.age += 1;
    this.prevPos = { x: this.pos.x, y: this.pos.y };

    this.velocityX += this.gravityX * this.gravityAccel;
    this.velocityY += this.gravityY * this.gravityAccel;
    this.velocityX *= this.drag;
    this.velocityY *= this.drag;

    this.pos.x += this.velocityX;
    this.pos.y += this.velocityY;

    const moveX = this.pos.x - this.prevPos.x;
    const moveY = this.pos.y - this.prevPos.y;
    const projected = moveX * this.gravityX + moveY * this.gravityY;
    if (projected > 0) {
      this.fallDistance += projected;
    }

    if (this.bounceCount < this.maxBounces && this.fallDistance >= this.bounceDistance) {
      this.bounce();
    }

    this.alpha -= this.bounceCount > 0 ? 0.0072 : 0.0034;
    if (this.age >= this.maxAge || isOutOfBounds(this.pos, this.alpha)) {
      this.delete();
    }
  }

  bounce(): void {
    const along = this.velocityX * this.gravityX + this.velocityY * this.gravityY;
    const side = this.velocityX * this.tangentX + this.velocityY * this.tangentY;
    const reboundAlong = -Math.max(0.72, Math.abs(along) * 0.55);
    const dampedSide = side * (0.62 + Math.random() * 0.12);

    this.velocityX = this.gravityX * reboundAlong + this.tangentX * dampedSide + (Math.random() - 0.5) * 0.1;
    this.velocityY = this.gravityY * reboundAlong + this.tangentY * dampedSide + (Math.random() - 0.5) * 0.1;
    this.fallDistance = 0;
    this.bounceDistance *= 1.55 + Math.random() * 0.35;
    this.size *= 0.93;
    this.alpha *= 0.9;
    this.bounceCount += 1;
  }

  render(): void {
    drawLineColor(
      this.prevPos,
      this.pos,
      this.color,
      Math.min(0.4, this.alpha * 0.7),
      Math.max(0.35, this.size * 0.35),
    );
    drawCircle(this.pos.x, this.pos.y, this.size, this.color, 0.14, 1.0);
  }

  delete(): void {
    this.delFlg = true;
  }
}
