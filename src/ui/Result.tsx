import { useEffect } from "react";
import { JUDGEMENTS } from "../game/judge";
import type { SessionStats } from "../game/session";
import { summarizeDeltas } from "../game/stats";
import { DIFFICULTY_LABELS, type Difficulty, type Song } from "../song/types";
import type { Settings } from "../storage";
import { rankOf, signedMs } from "./format";

interface Props {
  readonly song: Song;
  readonly difficulty: Difficulty;
  readonly stats: SessionStats;
  readonly previousBest: number | null;
  readonly autoplay: boolean;
  readonly settings: Settings;
  readonly onSettings: (s: Settings) => void;
  readonly onRetry: () => void;
  readonly onBack: () => void;
}

const LABEL = { perfect: "PERFECT", great: "GREAT", good: "GOOD", miss: "MISS" } as const;
const SUGGEST_MS = 12;

export function Result({ song, difficulty, stats, previousBest, autoplay, settings, onSettings, onRetry, onBack }: Props) {
  const timing = summarizeDeltas(stats.deltas);
  const newBest = !autoplay && (previousBest === null || stats.score > previousBest);
  const suggestion = timing && timing.median !== 0 && Math.abs(timing.median) >= SUGGEST_MS && stats.deltas.length >= 20 ? Math.round(timing.median) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") onRetry();
      else if (e.code === "Escape" || e.code === "KeyQ") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRetry, onBack]);

  return (
    <main className="page result">
      <p className="muted">
        {DIFFICULTY_LABELS[difficulty]} Lv{song.charts[difficulty].level}
        {autoplay ? " · オートプレイ" : ""}
      </p>
      <h1>{song.title}</h1>
      <div className="score-line">
        <span className="rank">{rankOf(stats.score)}</span>
        <span className="score">{stats.score.toLocaleString("ja-JP")}</span>
        {newBest && <span className="badge">自己ベスト</span>}
      </div>
      <dl className="counts">
        {JUDGEMENTS.map((j) => (
          <div key={j} className={`count count-${j}`}>
            <dt>{LABEL[j]}</dt>
            <dd>{stats.counts[j]}</dd>
          </div>
        ))}
        <div className="count">
          <dt>MAX COMBO</dt>
          <dd>
            {stats.maxCombo} / {stats.total}
          </dd>
        </div>
      </dl>
      {timing && (
        <section className="panel timing">
          <h2>タイミング</h2>
          <p>
            押したタイミングの中央値は <strong>{signedMs(timing.median)}</strong>（正なら遅め）。早め {timing.early} 回、遅め {timing.late} 回。
          </p>
          {suggestion !== null && (
            <p>
              <button
                className="secondary"
                onClick={() => onSettings({ ...settings, inputOffsetMs: Math.max(-300, Math.min(300, settings.inputOffsetMs + suggestion)) })}
              >
                入力の補正を {signedMs(settings.inputOffsetMs)} → {signedMs(settings.inputOffsetMs + suggestion)} にする
              </button>
            </p>
          )}
        </section>
      )}
      <div className="buttons">
        <button onClick={onRetry}>もう一度（R）</button>
        <button className="secondary" onClick={onBack}>
          選曲に戻る（Esc）
        </button>
      </div>
    </main>
  );
}
