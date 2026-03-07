type SymmetryTransform = {
  cos: number;
  sin: number;
};

const transformCache = new Map<number, SymmetryTransform[]>();

export function getSymmetryTransforms(count: number): SymmetryTransform[] {
  const safeCount = Math.max(1, Math.floor(count));
  const cached = transformCache.get(safeCount);
  if (cached) {
    return cached;
  }

  const transforms: SymmetryTransform[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    const angle = (Math.PI * 2 * i) / safeCount;
    transforms.push({ cos: Math.cos(angle), sin: Math.sin(angle) });
  }
  transformCache.set(safeCount, transforms);
  return transforms;
}

export function forEachSymmetryPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  count: number,
  type: "rotate" | "mirror",
  draw: (px: number, py: number) => void,
): void {
  const dx = x - centerX;
  const dy = y - centerY;
  const transforms = getSymmetryTransforms(count);

  for (const { cos, sin } of transforms) {
    draw(centerX + dx * cos - dy * sin, centerY + dx * sin + dy * cos);

    if (type === "mirror") {
      draw(centerX + dx * cos + dy * sin, centerY + dx * sin - dy * cos);
    }
  }
}
