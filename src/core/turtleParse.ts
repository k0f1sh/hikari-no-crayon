export type TurtleCommand =
  | { type: "fd"; distance: number }
  | { type: "bk"; distance: number }
  | { type: "rt"; angle: number }
  | { type: "lt"; angle: number }
  | { type: "pu" }
  | { type: "pd" }
  | { type: "repeat"; count: number; body: TurtleCommand[] };

function tokenize(source: string): string[] {
  const tokens: string[] = [];
  const raw = source.replace(/\[/g, " [ ").replace(/\]/g, " ] ");
  for (const token of raw.split(/\s+/)) {
    if (token.length > 0) {
      tokens.push(token);
    }
  }
  return tokens;
}

const COMMAND_ALIASES: Record<string, string> = {
  forward: "fd",
  back: "bk",
  right: "rt",
  left: "lt",
  penup: "pu",
  pendown: "pd",
};

function normalizeCommand(token: string): string {
  const lower = token.toLowerCase();
  return COMMAND_ALIASES[lower] ?? lower;
}

function parseNumber(token: string | undefined, label: string): number {
  if (token === undefined) {
    throw new Error(`「${label}」のあとに すうじが ひつようです`);
  }
  const num = Number(token);
  if (!Number.isFinite(num)) {
    throw new Error(`「${token}」は すうじではありません`);
  }
  return num;
}

function parseCommands(tokens: string[], pos: { index: number }, depth: number): TurtleCommand[] {
  if (depth > 20) {
    throw new Error("くりかえしが ふかすぎます（さいだい20だん）");
  }

  const commands: TurtleCommand[] = [];

  while (pos.index < tokens.length) {
    const token = tokens[pos.index];
    if (token === "]") {
      return commands;
    }

    pos.index += 1;
    const cmd = normalizeCommand(token);

    switch (cmd) {
      case "fd": {
        const distance = parseNumber(tokens[pos.index], "fd");
        pos.index += 1;
        commands.push({ type: "fd", distance });
        break;
      }
      case "bk": {
        const distance = parseNumber(tokens[pos.index], "bk");
        pos.index += 1;
        commands.push({ type: "bk", distance });
        break;
      }
      case "rt": {
        const angle = parseNumber(tokens[pos.index], "rt");
        pos.index += 1;
        commands.push({ type: "rt", angle });
        break;
      }
      case "lt": {
        const angle = parseNumber(tokens[pos.index], "lt");
        pos.index += 1;
        commands.push({ type: "lt", angle });
        break;
      }
      case "pu": {
        commands.push({ type: "pu" });
        break;
      }
      case "pd": {
        commands.push({ type: "pd" });
        break;
      }
      case "repeat": {
        const count = parseNumber(tokens[pos.index], "repeat");
        pos.index += 1;
        if (count < 0 || !Number.isInteger(count)) {
          throw new Error("repeat のかいすうは 0いじょうの せいすうにしてください");
        }
        if (tokens[pos.index] !== "[") {
          throw new Error("repeat のあとに [ が ひつようです");
        }
        pos.index += 1;
        const body = parseCommands(tokens, pos, depth + 1);
        if (tokens[pos.index] !== "]") {
          throw new Error("] がたりません");
        }
        pos.index += 1;
        commands.push({ type: "repeat", count, body });
        break;
      }
      default:
        throw new Error(`しらないこまんどです: 「${token}」`);
    }
  }

  return commands;
}

export function parseTurtleProgram(source: string): TurtleCommand[] {
  const tokens = tokenize(source);
  if (tokens.length === 0) {
    throw new Error("こーどをにゅうりょくしてください");
  }
  const pos = { index: 0 };
  const commands = parseCommands(tokens, pos, 0);
  if (pos.index < tokens.length) {
    throw new Error(`よぶんな ] があります`);
  }
  return commands;
}
