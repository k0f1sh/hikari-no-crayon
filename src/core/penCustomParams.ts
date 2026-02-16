export type PenCustomParamValue = boolean | number;
export type PenCustomParamsState = Record<string, Record<string, PenCustomParamValue>>;

export interface PenCustomBooleanParamDefinition {
  key: string;
  label: string;
  type: "boolean";
  defaultValue: boolean;
}

export interface PenCustomNumberParamDefinition {
  key: string;
  label: string;
  type: "number";
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export type PenCustomParamDefinition = PenCustomBooleanParamDefinition | PenCustomNumberParamDefinition;

export const penCustomParamCatalog: Record<string, PenCustomParamDefinition[]> = {
  normal_pen: [],
  blood_pen: [],
  fur_pen: [
    {
      key: "line_count",
      label: "けのほんすう",
      type: "number",
      defaultValue: 120,
      min: 20,
      max: 320,
      step: 5,
    },
    {
      key: "scatter_radius",
      label: "ちりばり",
      type: "number",
      defaultValue: 10,
      min: 2,
      max: 60,
      step: 1,
    },
    {
      key: "line_width",
      label: "けのふとさ",
      type: "number",
      defaultValue: 0.1,
      min: 0.05,
      max: 2,
      step: 0.05,
    },
  ],
  snow_pen: [],
  collatz_pen: [],
  hoshi_pen: [
    {
      key: "reverse_rotation",
      label: "ぎゃくかいてん",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "rotation_speed",
      label: "かいてんそくど",
      type: "number",
      defaultValue: 1,
      min: 0.2,
      max: 4,
      step: 0.1,
    },
    {
      key: "line_width",
      label: "せんのふとさ",
      type: "number",
      defaultValue: 1,
      min: 0.2,
      max: 6,
      step: 0.1,
    },
  ],
  life_pen: [
    {
      key: "snap_to_grid",
      label: "ますめをそろえる",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "circle_cells",
      label: "まるでかく",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "max_generations",
      label: "せだいすう",
      type: "number",
      defaultValue: 80,
      min: 8,
      max: 500,
      step: 1,
    },
  ],
  hane_pen: [
    {
      key: "reverse_rotation",
      label: "ぎゃくかいてん",
      type: "boolean",
      defaultValue: false,
    },
    {
      key: "rotation_speed",
      label: "かいてんそくど",
      type: "number",
      defaultValue: 1,
      min: 0.2,
      max: 4,
      step: 0.1,
    },
  ],
  nami_pen: [],
  spray_pen: [],
  bubble_pen: [],
  orbit_pen: [],
  fractal_bloom_pen: [],
  degi_pen: [],
  shinmyaku_pen: [],
  amedrop_pen: [
    {
      key: "gravity_direction",
      label: "じゅうりょくほうこう",
      type: "number",
      defaultValue: 90,
      min: 0,
      max: 359,
      step: 1,
    },
    {
      key: "spawn_count",
      label: "しずくのかず",
      type: "number",
      defaultValue: 1,
      min: 1,
      max: 5,
      step: 1,
    },
    {
      key: "lifetime",
      label: "きえるまで",
      type: "number",
      defaultValue: 180,
      min: 30,
      max: 600,
      step: 1,
    },
  ],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getDefaultPenCustomParams(): PenCustomParamsState {
  const result: PenCustomParamsState = {};

  Object.entries(penCustomParamCatalog).forEach(([penName, definitions]) => {
    result[penName] = {};
    definitions.forEach((definition) => {
      result[penName][definition.key] = definition.defaultValue;
    });
  });

  return result;
}

export function normalizePenCustomParams(input: unknown): PenCustomParamsState {
  const normalized = getDefaultPenCustomParams();

  if (!input || typeof input !== "object") {
    return normalized;
  }

  const source = input as Record<string, unknown>;
  Object.entries(penCustomParamCatalog).forEach(([penName, definitions]) => {
    const rawPenSettings = source[penName];
    if (!rawPenSettings || typeof rawPenSettings !== "object") {
      return;
    }

    const rawPenMap = rawPenSettings as Record<string, unknown>;
    definitions.forEach((definition) => {
      const rawValue = rawPenMap[definition.key];
      if (definition.type === "boolean") {
        normalized[penName][definition.key] = rawValue === true;
        return;
      }

      const numberValue = Number(rawValue);
      normalized[penName][definition.key] = Number.isFinite(numberValue)
        ? clamp(numberValue, definition.min, definition.max)
        : definition.defaultValue;
    });
  });

  return normalized;
}
