export const DIFFICULTIES = ["easy", "normal", "hard", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "EASY",
  normal: "NORMAL",
  hard: "HARD",
  expert: "EXPERT",
};

/** [開始秒, MIDI 音高, 長さ秒（ペダル込み）, ベロシティ, 手 0=右 1=左] */
export type MusicEvent = readonly [number, number, number, number, number];

/** [時刻秒, レーン, ロングノーツの長さ秒（0 ならタップ）, 鳴らす音の添字] */
export type RawChartNote = readonly [number, number, number, readonly number[]];

export interface ChartData {
  readonly level: number;
  readonly lanes: number;
  readonly notes: readonly RawChartNote[];
}

export interface Credit {
  readonly source: string;
  readonly mutopiaId: number;
  readonly pieceUrl: string;
  readonly maintainer: string;
  readonly edition: string;
  readonly license: string;
}

export interface SongInfo {
  readonly id: string;
  readonly title: string;
  readonly titleEn: string;
  readonly composer: string;
  readonly composerEn: string;
  readonly composerYears: string;
  readonly bpm: number;
  readonly duration: number;
}

export interface SongSummary extends SongInfo {
  readonly levels: Record<Difficulty, number>;
  readonly noteCounts: Record<Difficulty, number>;
}

export interface Song extends SongInfo {
  readonly version: 2;
  readonly credit: Credit;
  readonly bars: readonly number[];
  readonly beats: readonly number[];
  readonly events: readonly MusicEvent[];
  readonly charts: Record<Difficulty, ChartData>;
}
