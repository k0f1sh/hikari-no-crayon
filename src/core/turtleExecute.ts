import type { TurtleCommand } from "./turtleParse";

export interface Point {
  x: number;
  y: number;
  angle?: number;
}

interface TurtleState {
  x: number;
  y: number;
  angle: number;
  penDown: boolean;
}

const MAX_POINTS = 500_000;
const MAX_DEPTH = 20;

export function executeTurtleProgram(
  program: TurtleCommand[],
  options: { startX: number; startY: number; startAngle?: number; stepSize?: number },
): Point[][] {
  const stepSize = options.stepSize ?? 2;
  const state: TurtleState = {
    x: options.startX,
    y: options.startY,
    angle: options.startAngle ?? 0,
    penDown: true,
  };

  const segments: Point[][] = [];
  let currentSegment: Point[] = [{ x: state.x, y: state.y, angle: state.angle }];
  let totalPoints = 1;

  const checkPointLimit = () => {
    if (totalPoints >= MAX_POINTS) {
      throw new Error(`てんすうが おおすぎます（さいだい${MAX_POINTS}てん）`);
    }
  };

  const moveTo = (distance: number) => {
    const rad = (state.angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const totalDist = Math.abs(distance);
    const sign = distance >= 0 ? 1 : -1;

    if (state.penDown && totalDist > 0) {
      const steps = Math.max(1, Math.ceil(totalDist / stepSize));
      const stepDist = distance / steps;
      for (let i = 0; i < steps; i++) {
        checkPointLimit();
        state.x += dx * stepDist;
        state.y += dy * stepDist;
        currentSegment.push({ x: state.x, y: state.y, angle: state.angle });
        totalPoints += 1;
      }
    } else {
      state.x += dx * distance;
      state.y += dy * distance;
    }
  };

  const execute = (commands: TurtleCommand[], depth: number) => {
    if (depth > MAX_DEPTH) {
      throw new Error("くりかえしが ふかすぎます（さいだい20だん）");
    }

    for (const cmd of commands) {
      switch (cmd.type) {
        case "fd":
          moveTo(cmd.distance);
          break;
        case "bk":
          moveTo(-cmd.distance);
          break;
        case "rt":
          state.angle += cmd.angle;
          break;
        case "lt":
          state.angle -= cmd.angle;
          break;
        case "pu":
          state.penDown = false;
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
          break;
        case "pd":
          state.penDown = true;
          currentSegment = [{ x: state.x, y: state.y, angle: state.angle }];
          totalPoints += 1;
          break;
        case "repeat":
          for (let i = 0; i < cmd.count; i++) {
            execute(cmd.body, depth + 1);
          }
          break;
      }
    }
  };

  execute(program, 0);

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}
