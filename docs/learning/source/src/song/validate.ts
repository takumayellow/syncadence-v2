import { DIFFICULTIES, type Song, type SongSummary } from "./types";

export const SONG_ID = /^[a-z0-9-]{1,64}$/;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number" && Number.isFinite(v));
}

function requireString(obj: Json, key: string): void {
  if (typeof obj[key] !== "string") throw new Error(`曲データの ${key} が文字列ではありません`);
}

function requireNumber(obj: Json, key: string): void {
  const value = obj[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`曲データの ${key} が数値ではありません`);
}

const PIECE_URL = /^https:\/\/www\.mutopiaproject\.org\//;

function checkCredit(credit: unknown): void {
  if (!isObject(credit)) throw new Error("曲データのクレジットがありません");
  for (const key of ["source", "pieceUrl", "maintainer", "edition", "license"]) requireString(credit, key);
  requireNumber(credit, "mutopiaId");
  if (!PIECE_URL.test(credit.pieceUrl as string)) throw new Error("クレジットのリンクが不正です");
}

function checkInfo(obj: Json): void {
  for (const key of ["id", "title", "titleEn", "composer", "composerEn", "composerYears"]) requireString(obj, key);
  for (const key of ["bpm", "duration"]) requireNumber(obj, key);
  if (!SONG_ID.test(obj.id as string)) throw new Error("曲 ID の形式が不正です");
}

export function parseIndex(data: unknown): SongSummary[] {
  if (!isObject(data) || data.version !== 2 || !Array.isArray(data.songs)) throw new Error("曲一覧の形式が不正です");
  return data.songs.map((entry) => {
    if (!isObject(entry)) throw new Error("曲一覧の項目が不正です");
    checkInfo(entry);
    for (const key of ["levels", "noteCounts"]) {
      const table = entry[key];
      if (!isObject(table) || !DIFFICULTIES.every((d) => typeof table[d] === "number")) {
        throw new Error(`曲一覧の ${key} が不正です`);
      }
    }
    return entry as unknown as SongSummary;
  });
}

export function parseSong(data: unknown, expectedId: string): Song {
  if (!isObject(data) || data.version !== 2) throw new Error("曲データの形式が不正です");
  checkInfo(data);
  if (data.id !== expectedId) throw new Error("曲 ID が一致しません");
  checkCredit(data.credit);
  if (!isNumberArray(data.bars) || !isNumberArray(data.beats)) throw new Error("小節線・拍の形式が不正です");
  const events = data.events;
  if (!Array.isArray(events) || !events.every((e) => isNumberArray(e) && e.length === 5)) {
    throw new Error("音のデータの形式が不正です");
  }
  const charts = data.charts;
  if (!isObject(charts)) throw new Error("譜面がありません");
  for (const name of DIFFICULTIES) {
    const chart = charts[name];
    if (!isObject(chart) || typeof chart.lanes !== "number" || typeof chart.level !== "number" || !Array.isArray(chart.notes)) {
      throw new Error(`${name} の譜面が不正です`);
    }
    const lanes = chart.lanes;
    for (const note of chart.notes) {
      const ok =
        Array.isArray(note) &&
        note.length === 4 &&
        isNumberArray(note.slice(0, 3)) &&
        Number.isInteger(note[1]) &&
        note[1] >= 0 &&
        note[1] < lanes &&
        isNumberArray(note[3]) &&
        (note[3] as number[]).every((i) => Number.isInteger(i) && i >= 0 && i < events.length);
      if (!ok) throw new Error(`${name} の譜面のノーツが不正です`);
    }
  }
  return data as unknown as Song;
}
