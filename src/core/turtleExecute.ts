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

interface TurtleProcedure {
  params: string[];
  body: TurtleCommand[];
}

type EvalScope = Record<string, number>;

const MAX_POINTS = 500_000;
const MAX_DEPTH = 40;

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

  const procedures = new Map<string, TurtleProcedure>();
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

  const evaluate = (expr: string, scope: EvalScope): number => evaluateExpression(expr, scope);

  const execute = (commands: TurtleCommand[], depth: number, scope: EvalScope) => {
    if (depth > MAX_DEPTH) {
      throw new Error("さいきが ふかすぎます（さいだい40だん）");
    }

    for (const cmd of commands) {
      switch (cmd.type) {
        case "fd":
          moveTo(evaluate(cmd.distanceExpr, scope));
          break;
        case "bk":
          moveTo(-evaluate(cmd.distanceExpr, scope));
          break;
        case "rt":
          state.angle += evaluate(cmd.angleExpr, scope);
          break;
        case "lt":
          state.angle -= evaluate(cmd.angleExpr, scope);
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
        case "repeat": {
          const count = evaluate(cmd.countExpr, scope);
          if (!Number.isInteger(count) || count < 0) {
            throw new Error("repeat のかいすうは 0いじょうの せいすうにしてください");
          }
          for (let i = 0; i < count; i++) {
            execute(cmd.body, depth + 1, scope);
          }
          break;
        }
        case "if": {
          const condition = evaluate(cmd.conditionExpr, scope);
          if (condition !== 0) {
            execute(cmd.thenBody, depth + 1, scope);
          } else {
            execute(cmd.elseBody, depth + 1, scope);
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
          execute(proc.body, depth + 1, childScope);
          break;
        }
      }
    }
  };

  execute(program, 0, {});

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}
