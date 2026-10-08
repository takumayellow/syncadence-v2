import { useCallback, useEffect, useState } from "react";
import type { SessionStats } from "../game/session";
import { loadIndex } from "../song/load";
import type { Difficulty, Song, SongSummary } from "../song/types";
import { bestKey, loadBest, loadSettings, recordBest, saveSettings, type BestScores, type Settings } from "../storage";
import { Calibrate } from "./Calibrate";
import { Play } from "./Play";
import { Result } from "./Result";
import { SongSelect } from "./SongSelect";

type Screen =
  | { readonly kind: "select" }
  | { readonly kind: "play"; readonly songId: string; readonly difficulty: Difficulty; readonly attempt: number }
  | { readonly kind: "result"; readonly song: Song; readonly difficulty: Difficulty; readonly stats: SessionStats; readonly best: number | null; readonly autoplay: boolean }
  | { readonly kind: "calibrate" };

export function App() {
  const [songs, setSongs] = useState<readonly SongSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [best, setBest] = useState<BestScores>(loadBest);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [screen, setScreen] = useState<Screen>({ kind: "select" });

  useEffect(() => {
    loadIndex()
      .then(setSongs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "曲一覧を読み込めませんでした"));
  }, []);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const play = useCallback((songId: string, diff: Difficulty) => {
    setDifficulty(diff);
    setScreen((prev) => ({ kind: "play", songId, difficulty: diff, attempt: prev.kind === "play" ? prev.attempt + 1 : 0 }));
  }, []);

  const finish = useCallback(
    (song: Song, diff: Difficulty, stats: SessionStats) => {
      const key = bestKey(song.id, diff);
      const previous = best[key] ?? null;
      if (!settings.autoplay) setBest((b) => recordBest(b, key, stats.score));
      setScreen({ kind: "result", song, difficulty: diff, stats, best: previous, autoplay: settings.autoplay });
    },
    [best, settings.autoplay],
  );

  const toSelect = useCallback(() => setScreen({ kind: "select" }), []);

  switch (screen.kind) {
    case "play":
      return (
        <Play
          key={`${screen.songId}:${screen.difficulty}:${screen.attempt}`}
          songId={screen.songId}
          difficulty={screen.difficulty}
          settings={settings}
          onFinish={finish}
          onRetry={() => play(screen.songId, screen.difficulty)}
          onQuit={toSelect}
        />
      );
    case "result":
      return (
        <Result
          song={screen.song}
          difficulty={screen.difficulty}
          stats={screen.stats}
          previousBest={screen.best}
          autoplay={screen.autoplay}
          settings={settings}
          onSettings={updateSettings}
          onRetry={() => play(screen.song.id, screen.difficulty)}
          onBack={toSelect}
        />
      );
    case "calibrate":
      return <Calibrate settings={settings} onSettings={updateSettings} onBack={toSelect} />;
    default:
      return (
        <SongSelect
          songs={songs}
          error={error}
          difficulty={difficulty}
          best={best}
          settings={settings}
          onDifficulty={setDifficulty}
          onSettings={updateSettings}
          onPlay={play}
          onCalibrate={() => setScreen({ kind: "calibrate" })}
        />
      );
  }
}
