import type { Song, SongSummary } from "./types";
import { parseIndex, parseSong, SONG_ID } from "./validate";

const BASE = import.meta.env.BASE_URL;

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) throw new Error(`${path} を読み込めませんでした（HTTP ${response.status}）`);
  return response.json();
}

export async function loadIndex(): Promise<SongSummary[]> {
  return parseIndex(await fetchJson("songs/index.json"));
}

export async function loadSong(id: string): Promise<Song> {
  if (!SONG_ID.test(id)) throw new Error("曲 ID の形式が不正です");
  return parseSong(await fetchJson(`songs/${id}.json`), id);
}
