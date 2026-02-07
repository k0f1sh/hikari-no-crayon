import { app } from "./state";
import type { Point } from "../types";

export function d2r(d: number): number {
  return (d * Math.PI) / 180;
}

export function movePos(pos: Point, spd: number, d: number): Point {
  return {
    x: pos.x + Math.cos(d2r(d)) * spd,
    y: pos.y + Math.sin(d2r(d)) * spd,
  };
}

export function polarToDescartes(r: number, theta: number): Point {
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta),
  };
}

export function collatz(n: number): number[] {
  const result: number[] = [];
  while (true) {
    if (n === 0 || n === 1) {
      result.push(n);
      break;
    }

    result.push(n);
    n = n % 2 === 0 ? n / 2 : n * 3 + 1;
  }

  return result;
}

export function naruto(n: number, a: number): Point[] {
  const result: Point[] = [];
  let theta = (app.count % 60) * 6;
  const inc = n / 40;

  for (let i = 1; i < n; i += inc) {
    theta += 1;
    result.push(polarToDescartes(i, theta * a));
  }

  return result;
}

export function normalRand(m: number, s: number): number {
  const a = 1 - Math.random();
  const b = 1 - Math.random();
  const c = Math.sqrt(-2 * Math.log(a));
  if (0.5 - Math.random() > 0) {
    return c * Math.sin(Math.PI * 2 * b) * s + m;
  }
  return c * Math.cos(Math.PI * 2 * b) * s + m;
}

export function sample<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}
