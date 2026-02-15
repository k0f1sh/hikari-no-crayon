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
  fur_pen: [],
  snow_pen: [],
  collatz_pen: [],
  hoshi_pen: [],
  life_pen: [
    {
      key: "snap_to_grid",
      label: "ますめをそろえる",
      type: "boolean",
      defaultValue: false,
    },
  ],
  hane_pen: [],
  nami_pen: [],
  spray_pen: [],
  bubble_pen: [],
  orbit_pen: [],
  fractal_bloom_pen: [],
  degi_pen: [],
  shinmyaku_pen: [],
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
