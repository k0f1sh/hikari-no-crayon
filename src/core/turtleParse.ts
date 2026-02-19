export type TurtleCommand =
  | { type: "fd"; distanceExpr: string }
  | { type: "bk"; distanceExpr: string }
  | { type: "rt"; angleExpr: string }
  | { type: "lt"; angleExpr: string }
  | { type: "pu" }
  | { type: "pd" }
  | { type: "repeat"; countExpr: string; body: TurtleCommand[] }
  | { type: "if"; conditionExpr: string; thenBody: TurtleCommand[]; elseBody: TurtleCommand[] }
  | { type: "to"; name: string; params: string[]; body: TurtleCommand[] }
  | { type: "call"; name: string; args: string[] };

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

function readToken(tokens: string[], pos: { index: number }, label: string): string {
  const token = tokens[pos.index];
  if (token === undefined || token === "[" || token === "]") {
    throw new Error(`「${label}」のあとに ひつような もじが ありません`);
  }
  pos.index += 1;
  return token;
}

function readBracketList(tokens: string[], pos: { index: number }, label: string): string[] {
  if (tokens[pos.index] !== "[") {
    throw new Error(`${label} のあとに [ が ひつようです`);
  }
  pos.index += 1;
  const list: string[] = [];
  while (pos.index < tokens.length && tokens[pos.index] !== "]") {
    list.push(tokens[pos.index]);
    pos.index += 1;
  }
  if (tokens[pos.index] !== "]") {
    throw new Error("] がたりません");
  }
  pos.index += 1;
  return list;
}

function assertIdentifier(token: string, label: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
    throw new Error(`${label} は えいすうじと _ で かいてください`);
  }
}

function parseCommands(tokens: string[], pos: { index: number }, depth: number): TurtleCommand[] {
  if (depth > 20) {
    throw new Error("こまんどの ねすとが ふかすぎます（さいだい20だん）");
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
      case "fd":
        commands.push({ type: "fd", distanceExpr: readToken(tokens, pos, "fd") });
        break;
      case "bk":
        commands.push({ type: "bk", distanceExpr: readToken(tokens, pos, "bk") });
        break;
      case "rt":
        commands.push({ type: "rt", angleExpr: readToken(tokens, pos, "rt") });
        break;
      case "lt":
        commands.push({ type: "lt", angleExpr: readToken(tokens, pos, "lt") });
        break;
      case "pu":
        commands.push({ type: "pu" });
        break;
      case "pd":
        commands.push({ type: "pd" });
        break;
      case "repeat": {
        const countExpr = readToken(tokens, pos, "repeat");
        if (tokens[pos.index] !== "[") {
          throw new Error("repeat のあとに [ が ひつようです");
        }
        pos.index += 1;
        const body = parseCommands(tokens, pos, depth + 1);
        if (tokens[pos.index] !== "]") {
          throw new Error("] がたりません");
        }
        pos.index += 1;
        commands.push({ type: "repeat", countExpr, body });
        break;
      }
      case "if": {
        const conditionExpr = readToken(tokens, pos, "if");
        if (tokens[pos.index] !== "[") {
          throw new Error("if のあとに [ が ひつようです");
        }
        pos.index += 1;
        const thenBody = parseCommands(tokens, pos, depth + 1);
        if (tokens[pos.index] !== "]") {
          throw new Error("if の 1つめの ] がたりません");
        }
        pos.index += 1;
        if (tokens[pos.index] !== "[") {
          throw new Error("if の 2つめの [ が ひつようです");
        }
        pos.index += 1;
        const elseBody = parseCommands(tokens, pos, depth + 1);
        if (tokens[pos.index] !== "]") {
          throw new Error("if の 2つめの ] がたりません");
        }
        pos.index += 1;
        commands.push({ type: "if", conditionExpr, thenBody, elseBody });
        break;
      }
      case "to": {
        const name = readToken(tokens, pos, "to");
        assertIdentifier(name, "ぷろしーじゃめい");
        const params = readBracketList(tokens, pos, "to");
        for (const param of params) {
          assertIdentifier(param, "ひきすうめい");
        }
        if (tokens[pos.index] !== "[") {
          throw new Error("to のほんたいのまえに [ が ひつようです");
        }
        pos.index += 1;
        const body = parseCommands(tokens, pos, depth + 1);
        if (tokens[pos.index] !== "]") {
          throw new Error("to のほんたいで ] がたりません");
        }
        pos.index += 1;
        commands.push({ type: "to", name, params, body });
        break;
      }
      case "call": {
        const name = readToken(tokens, pos, "call");
        assertIdentifier(name, "ぷろしーじゃめい");
        const args = readBracketList(tokens, pos, "call");
        commands.push({ type: "call", name, args });
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
    throw new Error("よぶんな ] があります");
  }
  return commands;
}
