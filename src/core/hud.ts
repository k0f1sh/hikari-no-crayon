import { app, requireHudContext } from "./state";

type TurtleCursorState = {
  x: number;
  y: number;
  angle: number;
  walkPhase: number;
  isMoving: boolean;
};

let turtleCursorState: TurtleCursorState | null = null;

export function setHudTurtleCursor(state: TurtleCursorState | null): void {
  turtleCursorState = state;
}

function clearHud(): void {
  const hud = requireHudContext();
  hud.clearRect(0, 0, app.width, app.height);
}

function drawSymmetryAxes(): void {
  const hud = requireHudContext();
  const centerX = app.width * app.symmetryOriginX;
  const centerY = app.height * app.symmetryOriginY;
  const radius = Math.sqrt(centerX * centerX + centerY * centerY);
  const count = Math.max(1, app.symmetryCount);

  hud.save();
  hud.strokeStyle = "rgba(118, 246, 208, 0.45)";
  hud.lineWidth = 1;
  hud.setLineDash([8, 8]);

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    hud.beginPath();
    hud.moveTo(centerX - dx, centerY - dy);
    hud.lineTo(centerX + dx, centerY + dy);
    hud.stroke();

    if (app.symmetryType === "mirror") {
      const mAngle = angle + Math.PI / 2;
      const mdx = Math.cos(mAngle) * radius;
      const mdy = Math.sin(mAngle) * radius;
      hud.beginPath();
      hud.moveTo(centerX - mdx, centerY - mdy);
      hud.lineTo(centerX + mdx, centerY + mdy);
      hud.stroke();
    }
  }

  hud.setLineDash([]);
  hud.fillStyle = "rgba(86, 177, 255, 0.85)";
  hud.beginPath();
  hud.arc(centerX, centerY, 3, 0, Math.PI * 2);
  hud.fill();
  hud.restore();
}

function drawTurtleCursor(): void {
  if (!turtleCursorState) {
    return;
  }
  const hud = requireHudContext();
  const { x, y, angle, walkPhase, isMoving } = turtleCursorState;

  hud.save();
  hud.translate(x, y);
  hud.rotate((angle * Math.PI) / 180);

  const s = 18;
  const legSwing = isMoving ? Math.sin(walkPhase) * s * 0.1 : 0;
  const legLift = isMoving ? Math.cos(walkPhase) * s * 0.05 : 0;

  const legPositions = [
    { lx: -s * 0.68, ly: -s * 0.42, phase: 1 },
    { lx: s * 0.68, ly: -s * 0.42, phase: -1 },
    { lx: -s * 0.68, ly: s * 0.42, phase: -1 },
    { lx: s * 0.68, ly: s * 0.42, phase: 1 },
  ];
  hud.fillStyle = "rgba(130, 220, 145, 0.92)";
  hud.strokeStyle = "rgba(40, 120, 60, 0.9)";
  hud.lineWidth = 1.2;
  for (const leg of legPositions) {
    hud.beginPath();
    hud.ellipse(
      leg.lx + legSwing * leg.phase,
      leg.ly + legLift * leg.phase,
      s * 0.24,
      s * 0.3,
      0,
      0,
      Math.PI * 2,
    );
    hud.fill();
    hud.stroke();
  }

  hud.beginPath();
  hud.ellipse(0, 0, s * 0.7, s * 0.85, 0, 0, Math.PI * 2);
  hud.fillStyle = "rgba(80, 180, 100, 0.7)";
  hud.fill();
  hud.strokeStyle = "rgba(220, 255, 220, 0.9)";
  hud.lineWidth = 1.5;
  hud.stroke();

  hud.beginPath();
  hud.moveTo(-s * 0.35, s * 0.3);
  hud.lineTo(0, -s * 0.5);
  hud.lineTo(s * 0.35, s * 0.3);
  hud.strokeStyle = "rgba(40, 120, 60, 0.5)";
  hud.lineWidth = 1;
  hud.stroke();

  hud.beginPath();
  hud.arc(0, -s * 1.1, s * 0.35, 0, Math.PI * 2);
  hud.fillStyle = "rgba(100, 200, 120, 0.8)";
  hud.fill();
  hud.strokeStyle = "rgba(220, 255, 220, 0.9)";
  hud.lineWidth = 1.5;
  hud.stroke();

  hud.fillStyle = "rgba(20, 20, 20, 0.9)";
  hud.beginPath();
  hud.arc(-s * 0.12, -s * 1.2, 1.5, 0, Math.PI * 2);
  hud.fill();
  hud.beginPath();
  hud.arc(s * 0.12, -s * 1.2, 1.5, 0, Math.PI * 2);
  hud.fill();

  hud.restore();
}

export function renderHud(): void {
  clearHud();

  if (app.isSymmetryMode && app.isSymmetryHudVisible) {
    drawSymmetryAxes();
  }

  drawTurtleCursor();
}
