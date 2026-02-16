import type { PenTool } from "../types";
import { BloodPen } from "./pens/BloodPen";
import { BubblePen } from "./pens/BubblePen";
import { AmedropPen } from "./pens/AmedropPen";
import { DegiPen } from "./pens/DegiPen";
import { FractalBloomPen } from "./pens/FractalBloomPen";
import { FurPen } from "./pens/FurPen";
import { HanePen } from "./pens/HanePen";
import { HoshiPen } from "./pens/HoshiPen";
import { LifeGamePen } from "./pens/LifeGamePen";
import { NamiPen } from "./pens/NamiPen";
import { NormalPen } from "./pens/NormalPen";
import { OrbitPen } from "./pens/OrbitPen";
import { ShinmyakuPen } from "./pens/ShinmyakuPen";
import { SnowPen } from "./pens/SnowPen";
import { SprayPen } from "./pens/SprayPen";

export interface PenCatalogEntry {
  value: string;
  icon: string;
  name: string;
  create: () => PenTool;
}

export const PEN_CATALOG: PenCatalogEntry[] = [
  { value: "normal_pen", icon: "光", name: "ひかりのくれよん", create: () => new NormalPen() },
  { value: "blood_pen", icon: "血", name: "けっかんぺんしる", create: () => new BloodPen() },
  { value: "fur_pen", icon: "毛", name: "ふぁーえんぴつ", create: () => new FurPen() },
  { value: "snow_pen", icon: "雪", name: "ゆきぱすてる", create: () => new SnowPen() },
  // 設定によっては激しく点滅してあぶないので廃止
  { value: "hoshi_pen", icon: "星", name: "ほしわいやー", create: () => new HoshiPen() },
  { value: "life_pen", icon: "生", name: "らいふげーむぺん", create: () => new LifeGamePen() },
  { value: "hane_pen", icon: "羽", name: "はねぺん", create: () => new HanePen() },
  { value: "nami_pen", icon: "波", name: "なみふで", create: () => new NamiPen() },
  { value: "spray_pen", icon: "霧", name: "すぷれーかん", create: () => new SprayPen() },
  { value: "bubble_pen", icon: "泡", name: "あわすぷれー", create: () => new BubblePen() },
  { value: "orbit_pen", icon: "彗", name: "おーびっとぺん", create: () => new OrbitPen() },
  { value: "fractal_bloom_pen", icon: "渦", name: "ふらくたるぶるーむ", create: () => new FractalBloomPen() },
  { value: "degi_pen", icon: "電", name: "でじたるぺん", create: () => new DegiPen() },
  { value: "shinmyaku_pen", icon: "脈", name: "しんみゃくぺん", create: () => new ShinmyakuPen() },
  { value: "amedrop_pen", icon: "雨", name: "あめどろっぷ", create: () => new AmedropPen() },
];
