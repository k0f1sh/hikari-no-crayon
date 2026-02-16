import { hsvToRgb } from "../core/color";
import type { PenToolMap } from "../types";
import { PEN_CATALOG } from "./penCatalog";

export function createPenTools(): PenToolMap {
  return PEN_CATALOG.reduce<PenToolMap>((acc, pen) => {
    acc[pen.value] = pen.create();
    return acc;
  }, {});
}

export const defaultPenName = PEN_CATALOG[0]?.value ?? "normal_pen";
export const defaultPenColor = hsvToRgb(200, 200, 200);
