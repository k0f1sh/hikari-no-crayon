import type { TurtleCommand } from "./turtleParse";

export interface Point {
  x: number;
  y: number;
  angle?: number;
}

export interface TracePoint extends Point {
  draw: boolean;
}

interface TurtleState {
  x: number;
  y: number;
  angle: number;
  penDown: boolean;
}

interface TurtleProcedure {
  params: string[];
  body: TurtleCommand[];
}

type EvalScope = Record<string, number>;

const MAX_DEPTH = 5000;

function parseExprTokens(expr: string): string[] {
  const compact = expr.replace(/\s+/g, "");
  if (!compact) {
    throw new Error("しきが からです");
  }
  const tokens = compact.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/]/g);
  if (!tokens || tokens.join("") !== compact) {
    throw new Error(`しきが よみとれません: ${expr}`);
  }
  return tokens;
}

function evaluateExpression(expr: string, scope: EvalScope): number {
  const tokens = parseExprTokens(expr);
  let index = 0;

  const readExpression = (): number => {
    let value = readTerm();
    while (index < tokens.length) {
      const op = tokens[index];
      if (op !== "+" && op !== "-") {
        break;
      }
      index += 1;
      const rhs = readTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };

  const readTerm = (): number => {
    let value = readFactor();
    while (index < tokens.length) {
      const op = tokens[index];
      if (op !== "*" && op !== "/") {
        break;
      }
      index += 1;
      const rhs = readFactor();
      if (op === "*") {
        value *= rhs;
      } else {
        if (rhs === 0) {
          throw new Error("0 では われません");
        }
        value /= rhs;
      }
    }
    return value;
  };

  const readFactor = (): number => {
    const token = tokens[index];
    if (token === undefined) {
      throw new Error("しきの おわりが ふせいです");
    }

    if (token === "+" || token === "-") {
      index += 1;
      const value = readFactor();
      return token === "-" ? -value : value;
    }

    if (token === "(") {
      index += 1;
      const value = readExpression();
      if (tokens[index] !== ")") {
        throw new Error(") がたりません");
      }
      index += 1;
      return value;
    }

    index += 1;
    if (/^\d/.test(token)) {
      return Number(token);
    }
    const variable = scope[token];
    if (variable === undefined) {
      throw new Error(`へんすうが みつかりません: ${token}`);
    }
    return variable;
  };

  const value = readExpression();
  if (index < tokens.length) {
    throw new Error(`しきが よみとれません: ${expr}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`しきの けっかが ふせいです: ${expr}`);
  }
  return value;
}

export function* iterateTurtleProgram(
  program: TurtleCommand[],
  options: { startX: number; startY: number; startAngle?: number; stepSize?: number },
): Generator<TracePoint, void, void> {
  const stepSize = options.stepSize ?? 2;
  const state: TurtleState = {
    x: options.startX,
    y: options.startY,
    angle: options.startAngle ?? 0,
    penDown: true,
  };
  const procedures = new Map<string, TurtleProcedure>();

  const evaluate = (expr: string, scope: EvalScope): number => evaluateExpression(expr, scope);

  function* moveTo(distance: number): Generator<TracePoint, void, void> {
    const rad = (state.angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const totalDist = Math.abs(distance);

    if (state.penDown && totalDist > 0) {
      const steps = Math.max(1, Math.ceil(totalDist / stepSize));
      const stepDist = distance / steps;
      for (let i = 0; i < steps; i++) {
        state.x += dx * stepDist;
        state.y += dy * stepDist;
        yield { x: state.x, y: state.y, angle: state.angle, draw: true };
      }
      return;
    }

    state.x += dx * distance;
    state.y += dy * distance;
    yield { x: state.x, y: state.y, angle: state.angle, draw: false };
  }

  function* execute(commands: TurtleCommand[], depth: number, scope: EvalScope): Generator<TracePoint, void, void> {
    if (depth > MAX_DEPTH) {
      throw new Error(`さいきが ふかすぎます（さいだい${MAX_DEPTH}だん）`);
    }

    for (const cmd of commands) {
      switch (cmd.type) {
        case "fd":
          yield* moveTo(evaluate(cmd.distanceExpr, scope));
          break;
        case "bk":
          yield* moveTo(-evaluate(cmd.distanceExpr, scope));
          break;
        case "rt":
          state.angle += evaluate(cmd.angleExpr, scope);
          break;
        case "lt":
          state.angle -= evaluate(cmd.angleExpr, scope);
          break;
        case "pu":
          state.penDown = false;
          break;
        case "pd":
          state.penDown = true;
          yield { x: state.x, y: state.y, angle: state.angle, draw: false };
          break;
        case "repeat": {
          const count = evaluate(cmd.countExpr, scope);
          if (!Number.isInteger(count) || count < 0) {
            throw new Error("repeat のかいすうは 0いじょうの せいすうにしてください");
          }
          for (let i = 0; i < count; i++) {
            yield* execute(cmd.body, depth + 1, scope);
          }
          break;
        }
        case "if": {
          const condition = evaluate(cmd.conditionExpr, scope);
          if (condition !== 0) {
            yield* execute(cmd.thenBody, depth + 1, scope);
          } else {
            yield* execute(cmd.elseBody, depth + 1, scope);
          }
          break;
        }
        case "to":
          procedures.set(cmd.name, { params: cmd.params, body: cmd.body });
          break;
        case "call": {
          const proc = procedures.get(cmd.name);
          if (!proc) {
            throw new Error(`ぷろしーじゃが みつかりません: ${cmd.name}`);
          }
          if (proc.params.length !== cmd.args.length) {
            throw new Error(
              `${cmd.name} のひきすうは ${proc.params.length}こ ひつようです（いま ${cmd.args.length}こ）`,
            );
          }
          const childScope: EvalScope = { ...scope };
          for (let i = 0; i < proc.params.length; i++) {
            childScope[proc.params[i]] = evaluate(cmd.args[i], scope);
          }
          yield* execute(proc.body, depth + 1, childScope);
          break;
        }
      }
    }
  }

  yield { x: state.x, y: state.y, angle: state.angle, draw: false };
  yield* execute(program, 0, {});
}

export function executeTurtleProgram(
  program: TurtleCommand[],
  options: { startX: number; startY: number; startAngle?: number; stepSize?: number },
): Point[][] {
  const segments: Point[][] = [];
  let currentSegment: Point[] = [];
  let lastPoint: Point | null = null;

  for (const point of iterateTurtleProgram(program, options)) {
    const cursor: Point = { x: point.x, y: point.y, angle: point.angle };
    if (point.draw) {
      if (currentSegment.length === 0 && lastPoint) {
        currentSegment.push(lastPoint);
      } else if (currentSegment.length === 0) {
        currentSegment.push(cursor);
      }
      currentSegment.push(cursor);
    } else if (currentSegment.length > 0) {
      segments.push(currentSegment);
      currentSegment = [];
    }
    lastPoint = cursor;
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}
