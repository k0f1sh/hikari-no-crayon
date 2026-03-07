import type { Effect } from "../types";

export function stepEffectsInPlace(effects: Effect[], maxEffects = Number.POSITIVE_INFINITY): void {
  const initialLength = effects.length;
  let writeIndex = 0;

  for (let readIndex = 0; readIndex < initialLength; readIndex += 1) {
    const effect = effects[readIndex];
    effect.move();
    effect.render();

    if (!effect.delFlg) {
      effects[writeIndex] = effect;
      writeIndex += 1;
    }
  }

  const appendedCount = effects.length - initialLength;
  if (appendedCount > 0 && writeIndex !== initialLength) {
    for (let i = 0; i < appendedCount; i += 1) {
      effects[writeIndex + i] = effects[initialLength + i];
    }
  }

  effects.length = writeIndex + appendedCount;

  if (effects.length > maxEffects) {
    effects.splice(0, effects.length - maxEffects);
  }
}
