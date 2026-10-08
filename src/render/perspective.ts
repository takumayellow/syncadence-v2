/**
 * 奥から手前へ流れる、遠近の付いたレーンの座標。
 *
 * レーンは消失点へ向かって細くなる台形で、幅と高さはどちらも「深さ」に比例して変わる（深さ 0 が奥の端、1 が判定線）。
 * 時刻から深さへは透視投影で写すので、ノーツは奥ではゆっくり、手前に来るほど速く動いて見える。
 */

/** 透視の強さ。大きいほど奥で詰まり、手前で速くなる。 */
const PERSPECTIVE = 2;
/** 奥の端のレーン全体の幅（判定線での幅に対する比）。 */
const FAR_RATIO = 0.04;

export interface Track {
  readonly width: number;
  readonly height: number;
  readonly lanes: number;
  readonly centerX: number;
  /** 奥の端の y */
  readonly farY: number;
  /** 判定線の y */
  readonly judgeY: number;
  /** 判定線でのレーン全体の幅 */
  readonly nearWidth: number;
}

/** 判定線の高さ（画面の上からの比）。 */
const JUDGE_AT = 0.79;
/** 横長の画面で、判定線でのレーン全体の幅の上限（画面の幅に対する比と、画面の高さに対する比）。 */
const LANDSCAPE_WIDTH = 0.79;
const LANDSCAPE_WIDTH_PER_HEIGHT = 1.4;
/** 縦長の画面では指で叩けるよう、ほぼ画面幅いっぱいに使う。 */
const PORTRAIT_WIDTH = 0.94;

/**
 * 画面の大きさとレーン数から、レーンの置き方を決める。
 * 判定線の高さと幅は、プロセカのプレイ画面の比率に合わせる（docs/research/05-ui-references.md）。
 * 幅はレーン数によらず同じにして、レーンの数だけ 1 本を細くする。
 */
export function makeTrack(width: number, height: number, lanes: number): Track {
  const judgeY = height * JUDGE_AT;
  const farY = Math.max(8, height * 0.04);
  const nearWidth =
    width >= height ? Math.min(width * LANDSCAPE_WIDTH, height * LANDSCAPE_WIDTH_PER_HEIGHT) : width * PORTRAIT_WIDTH;
  return { width, height, lanes, centerX: width / 2, farY, judgeY, nearWidth };
}

/**
 * 判定線から何秒先か（approach で割った 0〜1 の比 u）を深さへ写す。
 * u = 0 が判定線（深さ 1）、u = 1 が奥の端（深さ 0）。u が負（判定線を過ぎた）なら 1 より大きくなる。
 */
export function depthOf(u: number): number {
  const s = (x: number) => 1 / (1 + PERSPECTIVE * x);
  // 判定線を大きく過ぎた先は発散するので、画面の下に十分出る所で止める
  const clamped = Math.max(u, -0.3);
  return (s(clamped) - s(1)) / (1 - s(1));
}

export function yAt(track: Track, depth: number): number {
  return track.farY + (track.judgeY - track.farY) * depth;
}

/** y から深さを逆算する。 */
export function depthAtY(track: Track, y: number): number {
  return (y - track.farY) / (track.judgeY - track.farY);
}

/** 深さ depth でのレーン全体の幅。 */
export function spreadAt(track: Track, depth: number): number {
  return track.nearWidth * (FAR_RATIO + (1 - FAR_RATIO) * depth);
}

/** 深さ depth でのレーン lane の左右の端（lane = lanes なら右端の外側の線）。 */
export function laneEdge(track: Track, lane: number, depth: number): number {
  const spread = spreadAt(track, depth);
  return track.centerX - spread / 2 + (spread / track.lanes) * lane;
}

/**
 * 画面上の x がどのレーンか。判定線の位置のレーン幅で決め、端のレーンは画面の端まで広げる。
 * 指は判定線の近くを叩くので、高さによって当たり判定が狭まらないようにする。
 */
export function laneAtX(track: Track, x: number): number {
  const left = laneEdge(track, 0, 1);
  const lane = Math.floor((x - left) / (track.nearWidth / track.lanes));
  return Math.min(track.lanes - 1, Math.max(0, lane));
}
