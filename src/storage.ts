import { DIFFICULTIES, type Difficulty } from "./song/types";

export interface Settings {
  /** ノーツが判定線まで流れてくる時間（秒）。小さいほど速い */
  readonly approachSeconds: number;
  /** 入力の補正（ミリ秒）。正なら、遅めに押しても合うように判定をずらす */
  readonly inputOffsetMs: number;
  /** 表示の補正（ミリ秒）。正なら、ノーツを遅らせて描く */
  readonly visualOffsetMs: number;
  /** 叩いたときに音を鳴らす（叩かなかった音は鳴らない） */
  readonly keysound: boolean;
  readonly volume: number;
  readonly rate: number;
  readonly autoplay: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  approachSeconds: 1.6,
  inputOffsetMs: 0,
  visualOffsetMs: 0,
  keysound: false,
  volume: 0.8,
  rate: 1,
  autoplay: false,
};

const SETTINGS_KEY = "syncadence.v2.settings";
const BEST_KEY = "syncadence.v2.best";
const LAST_KEY = "syncadence.v2.last";

function clamp(value: unknown, lo: number, hi: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : fallback;
}

export function sanitizeSettings(raw: unknown): Settings {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_SETTINGS;
  return {
    approachSeconds: clamp(obj.approachSeconds, 0.6, 4, d.approachSeconds),
    inputOffsetMs: clamp(obj.inputOffsetMs, -300, 300, d.inputOffsetMs),
    visualOffsetMs: clamp(obj.visualOffsetMs, -300, 300, d.visualOffsetMs),
    keysound: typeof obj.keysound === "boolean" ? obj.keysound : d.keysound,
    volume: clamp(obj.volume, 0, 1, d.volume),
    rate: clamp(obj.rate, 0.5, 1, d.rate),
    autoplay: typeof obj.autoplay === "boolean" ? obj.autoplay : d.autoplay,
  };
}

function read(key: string): unknown {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できない環境（プライベートモード等）では、その回のプレイだけ設定が効く
  }
}

export function loadSettings(): Settings {
  return sanitizeSettings(read(SETTINGS_KEY));
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

export type BestScores = Readonly<Record<string, number>>;

export function bestKey(songId: string, difficulty: Difficulty): string {
  return `${songId}:${difficulty}`;
}

export function loadBest(): BestScores {
  const raw = read(BEST_KEY);
  if (typeof raw !== "object" || raw === null) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
    ),
  );
}

/** 自己ベストを更新したら新しい表を返す。 */
export function recordBest(best: BestScores, key: string, score: number): BestScores {
  if ((best[key] ?? -1) >= score) return best;
  const next = { ...best, [key]: score };
  write(BEST_KEY, next);
  return next;
}

/** 選曲画面で最後に選んでいた曲と難易度。 */
export interface LastSelection {
  readonly songId: string | null;
  readonly difficulty: Difficulty;
}

export const DEFAULT_SELECTION: LastSelection = { songId: null, difficulty: "normal" };

export function sanitizeSelection(raw: unknown): LastSelection {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const songId = typeof obj.songId === "string" && /^[a-z0-9-]{1,64}$/.test(obj.songId) ? obj.songId : null;
  const difficulty = DIFFICULTIES.find((d) => d === obj.difficulty) ?? DEFAULT_SELECTION.difficulty;
  return { songId, difficulty };
}

export function loadSelection(): LastSelection {
  return sanitizeSelection(read(LAST_KEY));
}

export function saveSelection(selection: LastSelection): void {
  write(LAST_KEY, selection);
}
