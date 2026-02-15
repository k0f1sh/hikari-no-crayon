import { app, requireMainContext } from "../../core/state";
import { colorToString } from "../../core/color";
import type { Color, Effect } from "../../types";

export class LifeGameEffect implements Effect {
  originX: number;
  originY: number;
  color: Color;
  cellSize: number;
  gridSize: number;
  alpha: number;
  delFlg: boolean;
  age: number;
  generation: number;
  maxGenerations: number;
  liveCells: Uint8Array;
  nextCells: Uint8Array;
  cellAges: Uint16Array;

  constructor(x: number, y: number, color: Color) {
    this.color = color;
    this.cellSize = Math.max(2, Math.floor(app.penSize / 24) + 1);
    this.gridSize = Math.max(16, Math.min(128, Math.floor(app.penSize * 2)));
    this.alpha = 0.75;
    this.delFlg = false;
    this.age = 0;
    this.generation = 0;
    this.maxGenerations = Math.max(36, Math.min(140, this.gridSize * 2.5));

    const area = this.gridSize * this.gridSize;
    this.liveCells = new Uint8Array(area);
    this.nextCells = new Uint8Array(area);
    this.cellAges = new Uint16Array(area);
    const half = (this.gridSize * this.cellSize) / 2;
    const snapToGrid = app.penCustomParams.life_pen?.snap_to_grid === true;
    this.originX = snapToGrid ? Math.floor((x - half) / this.cellSize) * this.cellSize : x - half;
    this.originY = snapToGrid ? Math.floor((y - half) / this.cellSize) * this.cellSize : y - half;
    this.seedCells();
  }

  seedCells(): void {
    const center = (this.gridSize - 1) / 2;
    const seedWindow = Math.min(20, this.gridSize);
    const halfWindow = seedWindow / 2;
    const minSeed = center - halfWindow;
    const maxSeed = center + halfWindow;
    const maxDistance = Math.max(1, halfWindow);

    for (let gy = 0; gy < this.gridSize; gy += 1) {
      for (let gx = 0; gx < this.gridSize; gx += 1) {
        if (gx < minSeed || gx > maxSeed || gy < minSeed || gy > maxSeed) {
          continue;
        }

        const dx = gx - center;
        const dy = gy - center;
        const distance = Math.sqrt(dx * dx + dy * dy) / maxDistance;
        const centerBias = Math.max(0, 1 - distance);
        const chance = 0.18 + centerBias * 0.3;
        const idx = gy * this.gridSize + gx;
        this.liveCells[idx] = Math.random() < chance ? 1 : 0;
      }
    }
  }

  countNeighbors(gx: number, gy: number): number {
    let count = 0;

    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (ox === 0 && oy === 0) {
          continue;
        }

        const nx = gx + ox;
        const ny = gy + oy;
        if (nx < 0 || ny < 0 || nx >= this.gridSize || ny >= this.gridSize) {
          continue;
        }

        count += this.liveCells[ny * this.gridSize + nx];
      }
    }

    return count;
  }

  step(): number {
    let aliveCount = 0;

    for (let gy = 0; gy < this.gridSize; gy += 1) {
      for (let gx = 0; gx < this.gridSize; gx += 1) {
        const idx = gy * this.gridSize + gx;
        const alive = this.liveCells[idx] === 1;
        const neighbors = this.countNeighbors(gx, gy);
        const nextAlive = alive ? neighbors === 2 || neighbors === 3 : neighbors === 3;

        this.nextCells[idx] = nextAlive ? 1 : 0;
        if (nextAlive) {
          this.cellAges[idx] = alive ? this.cellAges[idx] + 1 : 1;
          aliveCount += 1;
        } else {
          this.cellAges[idx] = 0;
        }
      }
    }

    const current = this.liveCells;
    this.liveCells = this.nextCells;
    this.nextCells = current;
    this.generation += 1;

    return aliveCount;
  }

  move(): void {
    this.age += 1;
    const aliveCount = this.step();
    this.alpha *= 0.994;

    if (aliveCount === 0 || this.generation >= this.maxGenerations || this.alpha < 0.05) {
      this.delete();
    }
  }

  render(): void {
    const c = requireMainContext();

    for (let gy = 0; gy < this.gridSize; gy += 1) {
      for (let gx = 0; gx < this.gridSize; gx += 1) {
        const idx = gy * this.gridSize + gx;
        if (this.liveCells[idx] !== 1) {
          continue;
        }

        const ageAlpha = Math.min(1, 0.45 + this.cellAges[idx] * 0.08);
        c.fillStyle = colorToString(this.color, this.alpha * ageAlpha);
        c.fillRect(
          this.originX + gx * this.cellSize,
          this.originY + gy * this.cellSize,
          Math.max(1, this.cellSize - 1),
          Math.max(1, this.cellSize - 1),
        );
      }
    }
  }

  delete(): void {
    this.delFlg = true;
  }
}
