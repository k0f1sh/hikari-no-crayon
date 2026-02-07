import type { Point } from "../types";

const SVG_NS = "http://www.w3.org/2000/svg";

function createPathElement(pathData: string): SVGPathElement {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", pathData);
  return path;
}

function withMountedPath<T>(pathData: string, run: (path: SVGPathElement) => T): T {
  const svg = document.createElementNS(SVG_NS, "svg");
  const path = createPathElement(pathData);
  svg.setAttribute("width", "1");
  svg.setAttribute("height", "1");
  svg.style.position = "fixed";
  svg.style.left = "-9999px";
  svg.style.top = "-9999px";
  svg.style.width = "1px";
  svg.style.height = "1px";
  svg.style.opacity = "0";
  svg.style.pointerEvents = "none";
  svg.appendChild(path);
  document.body.appendChild(svg);
  try {
    return run(path);
  } finally {
    svg.remove();
  }
}

function decodeHtmlEntities(value: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function extractPathDataFromPathTag(input: string): string | null {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(input, "image/svg+xml");
    const path = xml.querySelector("path");
    const d = path?.getAttribute("d")?.trim();
    if (d) {
      return d;
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeSvgPathData(input: string): string {
  const raw = input.trim();
  if (!raw) {
    return "";
  }

  if (!/[<>]/.test(raw) && !/\bd\s*=/.test(raw)) {
    return raw;
  }

  const fromTag = extractPathDataFromPathTag(raw);
  if (fromTag) {
    return fromTag;
  }

  const dMatch = raw.match(/\bd\s*=\s*(['"])([\s\S]*?)\1/i);
  if (dMatch?.[2]) {
    return decodeHtmlEntities(dMatch[2].trim());
  }

  return raw;
}

export function extractSvgPathDataList(input: string): string[] {
  const raw = input.trim();
  if (!raw) {
    return [];
  }

  if (!/[<>]/.test(raw) && !/\bd\s*=/.test(raw)) {
    return [raw];
  }

  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(raw, "image/svg+xml");
    const fromSvg = Array.from(xml.querySelectorAll("path[d]"))
      .map((path) => path.getAttribute("d")?.trim() ?? "")
      .filter((d) => d.length > 0);
    if (fromSvg.length > 0) {
      return fromSvg;
    }
  } catch {
    // Fallback to regex extraction below.
  }

  const matches = Array.from(raw.matchAll(/\bd\s*=\s*(['"])([\s\S]*?)\1/gi));
  const fromRegex = matches
    .map((match) => decodeHtmlEntities((match[2] ?? "").trim()))
    .filter((d) => d.length > 0);
  if (fromRegex.length > 0) {
    return fromRegex;
  }

  const single = normalizeSvgPathData(raw);
  return single ? [single] : [];
}

export function sampleSvgPathPoints(pathData: string, step: number): Point[] {
  const normalized = pathData.trim();
  if (!normalized) {
    throw new Error("SVG path が空です。");
  }

  return withMountedPath(normalized, (path) => {
    const totalLength = path.getTotalLength();
    if (!Number.isFinite(totalLength) || totalLength <= 0) {
      throw new Error("SVG path の長さを取得できませんでした。");
    }

    const safeStep = Math.max(0.5, step);
    const points: Point[] = [];

    for (let length = 0; length < totalLength; length += safeStep) {
      const point = path.getPointAtLength(length);
      points.push({ x: point.x, y: point.y });
    }

    const endPoint = path.getPointAtLength(totalLength);
    points.push({ x: endPoint.x, y: endPoint.y });
    return points;
  });
}

export function fitPointsToCanvas(points: Point[], width: number, height: number, padding: number): Point[] {
  if (points.length === 0) {
    return points;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  const pathWidth = Math.max(1, maxX - minX);
  const pathHeight = Math.max(1, maxY - minY);
  const drawableWidth = Math.max(1, width - padding * 2);
  const drawableHeight = Math.max(1, height - padding * 2);
  const scale = Math.max(0.01, Math.min(drawableWidth / pathWidth, drawableHeight / pathHeight));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const targetX = width / 2;
  const targetY = height / 2;

  return points.map((point) => ({
    x: (point.x - centerX) * scale + targetX,
    y: (point.y - centerY) * scale + targetY,
  }));
}
