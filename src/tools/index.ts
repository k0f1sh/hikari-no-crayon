import { hsvToRgb } from "../core/color";
import type { PenToolMap } from "../types";
import { BloodPen } from "./pens/BloodPen";
import { BubblePen } from "./pens/BubblePen";
import { CollatzPen } from "./pens/CollatzPen";
import { DegiPen } from "./pens/DegiPen";
import { FurPen } from "./pens/FurPen";
import { HanePen } from "./pens/HanePen";
import { HoshiPen } from "./pens/HoshiPen";
import { NamiPen } from "./pens/NamiPen";
import { NormalPen } from "./pens/NormalPen";
import { OrbitPen } from "./pens/OrbitPen";
import { SnowPen } from "./pens/SnowPen";
import { SprayPen } from "./pens/SprayPen";

export function createPenTools(): PenToolMap {
  return {
    normal_pen: new NormalPen(),
    blood_pen: new BloodPen(),
    fur_pen: new FurPen(),
    snow_pen: new SnowPen(),
    collatz_pen: new CollatzPen(),
    hoshi_pen: new HoshiPen(),
    hane_pen: new HanePen(),
    nami_pen: new NamiPen(),
    spray_pen: new SprayPen(),
    bubble_pen: new BubblePen(),
    orbit_pen: new OrbitPen(),
    degi_pen: new DegiPen(),
  };
}

export const defaultPenName = "normal_pen";
export const defaultPenColor = hsvToRgb(200, 200, 200);
