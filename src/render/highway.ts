import type { Judgement } from "../game/judge";
import type { GameSession } from "../game/session";

export interface Flash {
  readonly lane: number;
  readonly judgement: Judgement;
  readonly deltaMs: number | null;
  readonly atMs: number;
}

export interface Frame {
  readonly session: GameSession;
  readonly lanes: number;
  readonly songTime: number;
  readonly rate: number;
  readonly approachSeconds: number;
  readonly bars: readonly number[];
  readonly beats: readonly number[];
  readonly pressed: readonly boolean[];
  readonly flashes: readonly Flash[];
  readonly nowMs: number;
  readonly keyLabels: readonly string[];
  readonly progress: number;
}

const JUDGE_LINE = 0.84;
const NOTE_HEIGHT = 16;
const FLASH_MS = 280;
const JUDGEMENT_TEXT: Record<Judgement, string> = { perfect: "PERFECT", great: "GREAT", good: "GOOD", miss: "MISS" };
const JUDGEMENT_COLOR: Record<Judgement, string> = {
  perfect: "#ffe27a",
  great: "#7ee0ff",
  good: "#9dffa8",
  miss: "#ff7a8a",
};

/** 内側のレーンと外側のレーンで色を分け、左右対称にする。 */
function laneColor(lane: number, lanes: number): string {
  const fromEdge = Math.min(lane, lanes - 1 - lane);
  return ["#e8ecff", "#6fb6ff", "#ff9bd2"][fromEdge % 3]!;
}

interface Layout {
  readonly left: number;
  readonly laneWidth: number;
  readonly width: number;
  readonly judgeY: number;
}

function layout(width: number, height: number, lanes: number): Layout {
  const laneWidth = Math.min(96, (width * 0.92) / lanes);
  const total = laneWidth * lanes;
  return { left: (width - total) / 2, laneWidth, width: total, judgeY: height * JUDGE_LINE };
}

export function laneAt(x: number, width: number, height: number, lanes: number): number | null {
  const l = layout(width, height, lanes);
  // タッチでは端のレーンを画面の端まで広げる
  const lane = Math.floor((x - l.left) / l.laneWidth);
  return Math.min(lanes - 1, Math.max(0, lane));
}

export function drawFrame(g: CanvasRenderingContext2D, width: number, height: number, f: Frame): void {
  const l = layout(width, height, f.lanes);
  const pxPerSongSecond = l.judgeY / (f.approachSeconds * f.rate);
  const yOf = (t: number) => l.judgeY - (t - f.songTime) * pxPerSongSecond;
  const visibleUntil = f.songTime + f.approachSeconds * f.rate * 1.05;
  const visibleFrom = f.songTime - (height - l.judgeY) / pxPerSongSecond;

  g.clearRect(0, 0, width, height);
  g.fillStyle = "#0b0d1a";
  g.fillRect(0, 0, width, height);
  g.fillStyle = "#121633";
  g.fillRect(l.left, 0, l.width, height);

  for (let lane = 0; lane < f.lanes; lane += 1) {
    const x = l.left + lane * l.laneWidth;
    if (f.pressed[lane]) {
      const beam = g.createLinearGradient(0, l.judgeY, 0, l.judgeY - height * 0.5);
      beam.addColorStop(0, "rgba(140, 180, 255, 0.35)");
      beam.addColorStop(1, "rgba(140, 180, 255, 0)");
      g.fillStyle = beam;
      g.fillRect(x, 0, l.laneWidth, l.judgeY);
    }
    g.fillStyle = "rgba(255,255,255,0.07)";
    g.fillRect(x, 0, 1, height);
  }
  g.fillRect(l.left + l.width, 0, 1, height);

  // 拍と小節の線。ノーツが拍の格子に乗っていることを目で追えるようにする
  g.fillStyle = "rgba(255,255,255,0.08)";
  for (const t of f.beats) {
    if (t < visibleFrom || t > visibleUntil) continue;
    g.fillRect(l.left, Math.round(yOf(t)), l.width, 1);
  }
  g.fillStyle = "rgba(255,255,255,0.28)";
  for (const t of f.bars) {
    if (t < visibleFrom || t > visibleUntil) continue;
    g.fillRect(l.left, Math.round(yOf(t)) - 1, l.width, 2);
  }

  const { session } = f;
  session.notes.forEach((note, i) => {
    const state = session.stateOf(i);
    if (state === "done") return;
    if (note.time > visibleUntil || note.time + note.duration < visibleFrom) return;
    const x = l.left + note.lane * l.laneWidth + 3;
    const w = l.laneWidth - 6;
    const color = laneColor(note.lane, f.lanes);
    const headY = state === "holding" ? l.judgeY : yOf(note.time);
    if (note.duration > 0) {
      const tailY = yOf(note.time + note.duration);
      g.fillStyle = state === "holding" ? "rgba(255, 226, 122, 0.55)" : "rgba(160, 180, 255, 0.35)";
      g.fillRect(x + w * 0.2, tailY, w * 0.6, Math.max(0, headY - tailY));
      g.fillStyle = color;
      g.fillRect(x + w * 0.2, tailY - 3, w * 0.6, 6);
    }
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, headY - NOTE_HEIGHT / 2, w, NOTE_HEIGHT, 5);
    g.fill();
  });

  g.fillStyle = "#ffffff";
  g.fillRect(l.left, l.judgeY - 2, l.width, 4);

  g.font = "600 14px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  f.keyLabels.forEach((label, lane) => {
    g.fillStyle = f.pressed[lane] ? "#ffffff" : "rgba(255,255,255,0.45)";
    g.fillText(label, l.left + (lane + 0.5) * l.laneWidth, l.judgeY + 28);
  });

  for (const flash of f.flashes) {
    const age = f.nowMs - flash.atMs;
    if (age < 0 || age > FLASH_MS) continue;
    const k = age / FLASH_MS;
    const cx = l.left + (flash.lane + 0.5) * l.laneWidth;
    g.strokeStyle = JUDGEMENT_COLOR[flash.judgement];
    g.globalAlpha = 1 - k;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(cx, l.judgeY, l.laneWidth * (0.3 + 0.4 * k), 10 + 16 * k, 0, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }
  const lastFlash = f.flashes.reduce<Flash | null>((a, b) => (!a || b.atMs > a.atMs ? b : a), null);
  if (lastFlash && f.nowMs - lastFlash.atMs < 600) {
    const midX = l.left + l.width / 2;
    g.fillStyle = JUDGEMENT_COLOR[lastFlash.judgement];
    g.font = "800 30px system-ui, sans-serif";
    g.fillText(JUDGEMENT_TEXT[lastFlash.judgement], midX, l.judgeY * 0.55);
    if (lastFlash.deltaMs !== null && lastFlash.judgement !== "perfect") {
      g.font = "600 15px system-ui, sans-serif";
      g.fillText(lastFlash.deltaMs < 0 ? "EARLY" : "LATE", midX, l.judgeY * 0.55 + 28);
    }
  }

  const stats = session.hud();
  if (stats.combo >= 2) {
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = "800 44px system-ui, sans-serif";
    g.fillText(String(stats.combo), l.left + l.width / 2, l.judgeY * 0.38);
    g.font = "600 12px system-ui, sans-serif";
    g.fillText("COMBO", l.left + l.width / 2, l.judgeY * 0.38 + 30);
  }
  g.textAlign = "right";
  g.font = "700 20px ui-monospace, monospace";
  g.fillStyle = "#ffffff";
  g.fillText(String(stats.score).padStart(7, "0"), width - 16, 28);

  g.fillStyle = "rgba(255,255,255,0.15)";
  g.fillRect(0, 0, width, 3);
  g.fillStyle = "#6fb6ff";
  g.fillRect(0, 0, width * Math.min(1, Math.max(0, f.progress)), 3);
}
