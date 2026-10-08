import { MAX_SCORE, type Judgement } from "../game/judge";
import { RANKS, rankOf } from "../game/rank";
import type { GameSession } from "../game/session";
import { depthAtY, depthOf, laneAtX, laneEdge, makeTrack, spreadAt, yAt, type Track } from "./perspective";

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

const FLASH_MS = 320;
const JUDGEMENT_SHOW_MS = 600;
const JUDGEMENT_FADE_MS = 200;
/** 判定の文字が 0 から元の大きさまで開く時間。 */
const JUDGEMENT_OPEN_MS = 75;
/** コンボが増えたとき、0.6 倍から元の大きさへ戻る時間。 */
const COMBO_POP_MS = 150;

// 表示の置き場所と大きさ。画面の高さ H（スコアの枠は幅と高さの小さいほう）に対する比で、
// プロセカの比率に合わせた（docs/research/05-ui-references.md の 1.3 節と 1.5 節）。
/** ノーツの厚みは H の 4%、ただし 10 px 以上、判定線でのレーン幅の 3 割まで。 */
const NOTE_THICKNESS = 0.04;
const NOTE_THICKNESS_MIN_PX = 10;
const NOTE_THICKNESS_PER_LANE = 0.3;
/** コンボの数字の中心の高さと、数字の大きさ。 */
const COMBO_Y = 0.41;
const COMBO_SIZE = 0.14;
/** 判定の文字は判定線より H の 17.5% 上。大きさは H の 5.5%、判定線のレーン全体の幅の 1 割まで。 */
const JUDGEMENT_ABOVE = 0.175;
const JUDGEMENT_SIZE = 0.055;
const JUDGEMENT_SIZE_PER_WIDTH = 0.1;
/** 左上のスコアの枠の幅と高さ、画面の端からの余白。 */
const SCORE_BOX_WIDTH = 0.375;
const SCORE_BOX_HEIGHT = 0.075;
const SCORE_BOX_MARGIN = 0.025;

const JUDGEMENT_TEXT: Record<Judgement, string> = { perfect: "PERFECT", great: "GREAT", good: "GOOD", miss: "MISS" };
const JUDGEMENT_COLOR: Record<Judgement, string> = {
  perfect: "#ffe175",
  great: "#63ff9d",
  good: "#75e3ff",
  miss: "#ff7676",
};
// 隣り合うレーンを水色と桃色で塗り分ける（v1 と同じ配色）
const LANE_RGB = ["87, 240, 218", "255, 123, 168"] as const;
const LONG_RGB = "255, 225, 117";
const JUDGE_LINE = "#fff5a8";
const FONT = 'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif';

const laneRgb = (lane: number) => LANE_RGB[lane % 2]!;

/** 画面上の x がどのレーンか（タッチ用）。 */
export function laneAt(x: number, width: number, height: number, lanes: number): number {
  return laneAtX(makeTrack(width, height, lanes), x);
}

/** レーン lane の、深さ d1（奥）から d2（手前）までの台形をパスにする。inset はレーン幅に対する内側への余白。 */
function lanePath(g: CanvasRenderingContext2D, t: Track, lane: number, d1: number, d2: number, inset = 0): void {
  const pad = (d: number) => (spreadAt(t, d) / t.lanes) * inset;
  const y1 = yAt(t, d1);
  const y2 = yAt(t, d2);
  g.beginPath();
  g.moveTo(laneEdge(t, lane, d1) + pad(d1), y1);
  g.lineTo(laneEdge(t, lane + 1, d1) - pad(d1), y1);
  g.lineTo(laneEdge(t, lane + 1, d2) - pad(d2), y2);
  g.lineTo(laneEdge(t, lane, d2) + pad(d2), y2);
  g.closePath();
}

function drawTrack(g: CanvasRenderingContext2D, t: Track, f: Frame, bottomDepth: number): void {
  const fill = g.createLinearGradient(0, t.farY, 0, t.height);
  fill.addColorStop(0, "rgba(161, 224, 255, 0.14)");
  fill.addColorStop(0.35, "rgba(32, 39, 94, 0.32)");
  fill.addColorStop(1, "rgba(10, 14, 30, 0.55)");
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(laneEdge(t, 0, 0), t.farY);
  g.lineTo(laneEdge(t, t.lanes, 0), t.farY);
  g.lineTo(laneEdge(t, t.lanes, bottomDepth), t.height);
  g.lineTo(laneEdge(t, 0, bottomDepth), t.height);
  g.closePath();
  g.fill();

  for (let lane = 0; lane < t.lanes; lane += 1) {
    g.fillStyle = `rgba(${laneRgb(lane)}, 0.07)`;
    lanePath(g, t, lane, 0, bottomDepth);
    g.fill();
    if (f.pressed[lane]) {
      // 押している間、判定線から奥へ光の柱を立てる
      const beam = g.createLinearGradient(0, t.judgeY, 0, yAt(t, 0.35));
      beam.addColorStop(0, `rgba(${laneRgb(lane)}, 0.45)`);
      beam.addColorStop(1, `rgba(${laneRgb(lane)}, 0)`);
      g.fillStyle = beam;
      lanePath(g, t, lane, 0.35, 1);
      g.fill();
    }
  }

  for (let b = 0; b <= t.lanes; b += 1) {
    const outer = b === 0 || b === t.lanes;
    g.strokeStyle = outer ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.5)";
    g.lineWidth = outer ? 1.6 : 1;
    g.beginPath();
    g.moveTo(laneEdge(t, b, 0), t.farY);
    g.lineTo(laneEdge(t, b, bottomDepth), t.height);
    g.stroke();
  }
}

/** 拍と小節の線。ノーツが拍の格子に乗っていることを目で追えるようにする。 */
function drawGrid(g: CanvasRenderingContext2D, t: Track, f: Frame, times: readonly number[], alpha: number, width: number): void {
  const span = f.approachSeconds * f.rate;
  g.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  for (const time of times) {
    const u = (time - f.songTime) / span;
    if (u < -0.3 || u > 1) continue;
    const d = depthOf(u);
    const y = yAt(t, d);
    if (y > t.height) continue;
    g.fillRect(laneEdge(t, 0, d), y - width / 2, spreadAt(t, d), width);
  }
}

/** 判定線でのノーツの厚み。判定線の帯も同じ厚みにする。 */
function noteThickness(t: Track): number {
  return Math.min((t.nearWidth / t.lanes) * NOTE_THICKNESS_PER_LANE, Math.max(NOTE_THICKNESS_MIN_PX, t.height * NOTE_THICKNESS));
}

function drawNotes(g: CanvasRenderingContext2D, t: Track, f: Frame): void {
  const span = f.approachSeconds * f.rate;
  const thickness = noteThickness(t);
  const dy = t.judgeY - t.farY;
  /** 深さ d の位置に、厚みのあるノーツを置いたときの奥側と手前側の深さ。 */
  const capOf = (d: number): [number, number] => {
    const half = (Math.max(3, thickness * (0.25 + 0.75 * d)) / 2) / dy;
    return [d - half, d + half];
  };
  const { session } = f;
  const tooFar = f.songTime + span;
  // 奥のノーツから描き、手前のノーツが上に重なるようにする
  for (let i = session.notes.length - 1; i >= 0; i -= 1) {
    const note = session.notes[i]!;
    if (note.time > tooFar) continue;
    const state = session.stateOf(i);
    if (state === "done") continue;
    const headU = state === "holding" ? 0 : (note.time - f.songTime) / span;
    if (headU < -0.3 && note.duration === 0) continue;
    const headD = depthOf(headU);
    if (yAt(t, capOf(headD)[0]) > t.height) continue;
    const rgb = laneRgb(note.lane);

    if (note.duration > 0) {
      const tailD = depthOf(Math.min(1, (note.time + note.duration - f.songTime) / span));
      if (tailD > headD) continue;
      const holding = state === "holding";
      g.fillStyle = `rgba(${LONG_RGB}, ${holding ? 0.62 : 0.4})`;
      lanePath(g, t, note.lane, tailD, headD, 0.14);
      g.fill();
      const [a, b] = capOf(tailD);
      g.fillStyle = `rgb(${LONG_RGB})`;
      lanePath(g, t, note.lane, a, b, 0.06);
      g.fill();
    }
    const [top, bottom] = capOf(headD);
    g.fillStyle = note.duration > 0 ? `rgb(${LONG_RGB})` : `rgb(${rgb})`;
    g.strokeStyle = "rgba(255, 255, 255, 0.92)";
    g.lineWidth = Math.max(1, 2.2 * headD);
    g.lineJoin = "round";
    lanePath(g, t, note.lane, top, bottom, 0.04);
    g.fill();
    g.stroke();
  }
}

function drawJudgeLine(g: CanvasRenderingContext2D, t: Track, f: Frame): void {
  const overhang = (t.nearWidth / t.lanes) * 0.12;
  const band = noteThickness(t);
  const [d1, d2] = [depthAtY(t, t.judgeY - band / 2), depthAtY(t, t.judgeY + band / 2)];
  g.fillStyle = "rgba(255, 245, 168, 0.16)";
  g.beginPath();
  g.moveTo(laneEdge(t, 0, d1), yAt(t, d1));
  g.lineTo(laneEdge(t, t.lanes, d1), yAt(t, d1));
  g.lineTo(laneEdge(t, t.lanes, d2), yAt(t, d2));
  g.lineTo(laneEdge(t, 0, d2), yAt(t, d2));
  g.closePath();
  g.fill();
  g.save();
  g.shadowColor = "rgba(255, 245, 168, 0.95)";
  g.shadowBlur = 18;
  g.fillStyle = JUDGE_LINE;
  g.fillRect(laneEdge(t, 0, 1) - overhang, t.judgeY - 2.5, t.nearWidth + overhang * 2, 5);
  g.restore();

  const nearLane = t.nearWidth / t.lanes;
  const labelY = Math.min(t.height - 14, t.judgeY + Math.max(26, (t.height - t.judgeY) * 0.42));
  const labelD = depthAtY(t, labelY);
  g.font = `700 ${Math.round(Math.min(18, Math.max(12, nearLane * 0.14)))}px ${FONT}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  f.keyLabels.forEach((label, lane) => {
    g.fillStyle = f.pressed[lane] ? "#ffffff" : "rgba(255, 255, 255, 0.42)";
    g.fillText(label, (laneEdge(t, lane, labelD) + laneEdge(t, lane + 1, labelD)) / 2, labelY);
  });
}

function drawFlashes(g: CanvasRenderingContext2D, t: Track, f: Frame): void {
  for (const flash of f.flashes) {
    const age = f.nowMs - flash.atMs;
    if (age < 0 || age > FLASH_MS || flash.judgement === "miss") continue;
    const k = age / FLASH_MS;
    const color = JUDGEMENT_COLOR[flash.judgement];
    // 叩いたレーンが判定線から奥へ短く光り、判定線の上に光の輪が広がる
    const glow = g.createLinearGradient(0, t.judgeY, 0, yAt(t, 0.55));
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.globalAlpha = 0.55 * (1 - k);
    g.fillStyle = glow;
    lanePath(g, t, flash.lane, 0.55, 1);
    g.fill();
    const cx = (laneEdge(t, flash.lane, 1) + laneEdge(t, flash.lane + 1, 1)) / 2;
    const laneW = t.nearWidth / t.lanes;
    g.globalAlpha = 1 - k;
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(cx, t.judgeY, laneW * (0.35 + 0.35 * k), laneW * (0.1 + 0.12 * k), 0, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }
}

const hudUnit = (t: Track) => Math.min(1.25, Math.max(0.7, t.nearWidth / 520));

/** いちばん新しい判定。miss を除くときはコンボが増えた時刻を知るのに使う。 */
function latestFlash(f: Frame, hitsOnly: boolean): Flash | null {
  let latest: Flash | null = null;
  for (const flash of f.flashes) {
    if (hitsOnly && flash.judgement === "miss") continue;
    if (!latest || flash.atMs > latest.atMs) latest = flash;
  }
  return latest;
}

/**
 * コンボ数。横長の画面ではレーンの右の空いた所に大きく出す（プロセカと同じ置き方）。
 * 縦長で右に入らないときはレーンの中央の奥に薄く出す。どちらもノーツより先に描き、流れてくるノーツを隠さない。
 */
function drawCombo(g: CanvasRenderingContext2D, t: Track, f: Frame): void {
  const { combo } = f.session.hud();
  if (combo < 2) return;
  const hit = latestFlash(f, true);
  const age = hit ? f.nowMs - hit.atMs : COMBO_POP_MS;
  const pop = 0.6 + 0.4 * Math.min(1, Math.max(0, age / COMBO_POP_MS));
  const text = String(combo);
  const y = t.height * COMBO_Y;
  const rightEdge = laneEdge(t, t.lanes, depthAtY(t, y));
  const room = t.width - rightEdge;
  const size = Math.round(t.height * COMBO_SIZE);
  g.font = `italic 800 ${size}px ${FONT}`;
  // 4 桁が入るかで決め、コンボが増えても途中で置き場所が変わらないようにする
  const outside = g.measureText("0000").width < room * 0.85;

  g.save();
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (outside) {
    const x = (rightEdge + t.width) / 2;
    g.fillStyle = "rgba(255, 255, 255, 0.85)";
    g.font = `800 ${Math.round(size * 0.25)}px ${FONT}`;
    g.fillText("COMBO", x, y - size * 0.62);
    g.translate(x, y);
    g.scale(pop, pop);
    g.shadowColor = "rgba(255, 123, 168, 0.7)";
    g.shadowBlur = 14;
    g.fillStyle = "#ffffff";
    g.font = `italic 800 ${size}px ${FONT}`;
    g.fillText(text, 0, 0);
  } else {
    const unit = hudUnit(t);
    const cy = t.farY + (t.judgeY - t.farY) * 0.36;
    g.fillStyle = "rgba(255, 255, 255, 0.4)";
    g.font = `700 ${Math.round(12 * unit)}px ${FONT}`;
    g.fillText("COMBO", t.centerX, cy - 34 * unit);
    g.translate(t.centerX, cy);
    g.scale(pop, pop);
    g.fillStyle = "rgba(255, 255, 255, 0.55)";
    g.font = `italic 800 ${Math.round(52 * unit)}px ${FONT}`;
    g.fillText(text, 0, 0);
  }
  g.restore();
}

/** 判定の文字。判定線の少し上の中央で、出た瞬間に 0 から開き、最後に薄れて消える。 */
function drawJudgement(g: CanvasRenderingContext2D, t: Track, f: Frame): void {
  const last = latestFlash(f, false);
  if (!last) return;
  const age = f.nowMs - last.atMs;
  if (age < 0 || age >= JUDGEMENT_SHOW_MS) return;
  const open = Math.min(1, age / JUDGEMENT_OPEN_MS);
  const fade = Math.min(1, (JUDGEMENT_SHOW_MS - age) / JUDGEMENT_FADE_MS);
  const size = Math.round(Math.max(20, Math.min(t.height * JUDGEMENT_SIZE, t.nearWidth * JUDGEMENT_SIZE_PER_WIDTH)));
  const y = t.judgeY - t.height * JUDGEMENT_ABOVE;
  g.save();
  g.globalAlpha = fade;
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (last.deltaMs !== null && last.judgement !== "perfect" && last.judgement !== "miss") {
    g.fillStyle = last.deltaMs < 0 ? "#75e3ff" : "#ff9a7a";
    g.font = `700 ${Math.round(size * 0.4)}px ${FONT}`;
    g.fillText(last.deltaMs < 0 ? "FAST" : "SLOW", t.centerX, y + size * 0.85);
  }
  g.translate(t.centerX, y);
  g.scale(open, open);
  g.shadowColor = "rgba(255, 255, 255, 0.6)";
  g.shadowBlur = 16;
  g.fillStyle = JUDGEMENT_COLOR[last.judgement];
  g.font = `italic 800 ${size}px ${FONT}`;
  g.fillText(JUDGEMENT_TEXT[last.judgement], 0, 0);
  g.restore();
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * 左上のスコア。プロセカと同じく横長の枠に、今のランクと点数、ランクの境目に目盛りを付けたゲージを入れる。
 * 大きさは画面の短いほうの辺に合わせる。
 */
function drawScore(g: CanvasRenderingContext2D, t: Track, f: Frame): void {
  const { score } = f.session.hud();
  const base = Math.min(t.width, t.height);
  const gap = Math.max(8, base * SCORE_BOX_MARGIN);
  const w = base * SCORE_BOX_WIDTH;
  const h = base * SCORE_BOX_HEIGHT;
  const x = gap;
  const y = gap + 3;
  g.save();
  roundRect(g, x, y, w, h, h * 0.22);
  g.fillStyle = "rgba(10, 16, 36, 0.6)";
  g.fill();
  g.strokeStyle = "rgba(255, 255, 255, 0.28)";
  g.lineWidth = 1;
  g.stroke();

  const pad = h * 0.16;
  const gaugeH = Math.max(2, h * 0.12);
  const gaugeY = y + h - pad - gaugeH;
  const gaugeW = w - pad * 2;
  const ratio = Math.min(1, Math.max(0, score / MAX_SCORE));
  g.fillStyle = "rgba(255, 255, 255, 0.14)";
  g.fillRect(x + pad, gaugeY, gaugeW, gaugeH);
  const fill = g.createLinearGradient(x + pad, 0, x + pad + gaugeW, 0);
  fill.addColorStop(0, "#57f0da");
  fill.addColorStop(1, "#ff7ba8");
  g.fillStyle = fill;
  g.fillRect(x + pad, gaugeY, gaugeW * ratio, gaugeH);
  g.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (const { min } of RANKS) {
    if (min > 0) g.fillRect(x + pad + gaugeW * (min / MAX_SCORE), gaugeY - 1, 1, gaugeH + 2);
  }

  const textY = (y + pad + gaugeY) / 2;
  const textSize = Math.round(h * 0.5);
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillStyle = JUDGEMENT_COLOR.perfect;
  g.font = `italic 800 ${textSize}px ${FONT}`;
  g.fillText(rankOf(score), x + pad, textY);
  g.textAlign = "right";
  g.fillStyle = "#ffffff";
  g.font = `700 ${textSize}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
  g.fillText(String(score).padStart(7, "0"), x + w - pad, textY);
  g.restore();
}

/** 画面のいちばん上の、曲の進み具合の線。 */
function drawProgress(g: CanvasRenderingContext2D, t: Track, f: Frame): void {
  g.fillStyle = "rgba(255, 255, 255, 0.15)";
  g.fillRect(0, 0, t.width, 3);
  g.fillStyle = JUDGE_LINE;
  g.fillRect(0, 0, t.width * Math.min(1, Math.max(0, f.progress)), 3);
}

export function drawFrame(g: CanvasRenderingContext2D, width: number, height: number, f: Frame): void {
  const t = makeTrack(width, height, f.lanes);
  const bottomDepth = depthAtY(t, height);
  g.clearRect(0, 0, width, height);
  drawTrack(g, t, f, bottomDepth);
  drawGrid(g, t, f, f.beats, 0.1, 1);
  drawGrid(g, t, f, f.bars, 0.32, 2);
  drawCombo(g, t, f);
  drawNotes(g, t, f);
  drawJudgeLine(g, t, f);
  drawFlashes(g, t, f);
  drawJudgement(g, t, f);
  drawScore(g, t, f);
  drawProgress(g, t, f);
}
