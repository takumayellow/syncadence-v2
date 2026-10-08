import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty, type SongSummary } from "../song/types";
import { bestKey, type BestScores, type Settings } from "../storage";
import { SettingsDrawer } from "./SettingsDrawer";
import { formatTime, rankOf } from "./format";
import { composerMark, jacketHue, stepDifficulty, stepIndex } from "./select";

interface Props {
  readonly songs: readonly SongSummary[] | null;
  readonly error: string | null;
  readonly selectedId: string | null;
  readonly difficulty: Difficulty;
  readonly best: BestScores;
  readonly settings: Settings;
  readonly onSelect: (songId: string) => void;
  readonly onDifficulty: (d: Difficulty) => void;
  readonly onSettings: (s: Settings) => void;
  readonly onPlay: (songId: string, d: Difficulty) => void;
  readonly onCalibrate: () => void;
}

/** 入力欄にいるときは、矢印キーや Enter を選曲の操作に使わない。 */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("input, select, textarea") !== null;
}

function Jacket({ song, large = false }: { readonly song: SongSummary; readonly large?: boolean }) {
  const style = { "--hue": jacketHue(song.id) } as CSSProperties;
  return (
    <span className={large ? "jacket jacket-large" : "jacket"} style={style} aria-hidden="true">
      {composerMark(song.composerEn)}
    </span>
  );
}

export function SongSelect(props: Props) {
  const { songs, error, selectedId, difficulty, best, settings, onSelect, onDifficulty, onSettings, onPlay, onCalibrate } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = songs?.find((s) => s.id === selectedId) ?? null;
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (drawerOpen || !songs || songs.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const index = songs.findIndex((s) => s.id === selectedId);
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
        const next = songs[stepIndex(index, e.code === "ArrowUp" ? -1 : 1, songs.length)];
        if (next) onSelect(next.id);
      } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
        onDifficulty(stepDifficulty(difficulty, e.code === "ArrowLeft" ? -1 : 1));
      } else if (e.code === "Enter" && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)) {
        // ボタンにフォーカスがあるときの Enter はそのボタンを押す
        e.preventDefault();
        if (selectedId) onPlay(selectedId, difficulty);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, songs, selectedId, difficulty, onSelect, onDifficulty, onPlay]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const selectedBest = selected ? best[bestKey(selected.id, difficulty)] : undefined;

  return (
    <main className={`select theme-${difficulty}`}>
      <header className="select-top">
        <div className="brand">
          <h1 className="logo">Syncadence</h1>
          <p className="tagline">ピアノの名曲を、楽譜から作った譜面で叩く</p>
        </div>
        <nav className="top-actions" aria-label="メニュー">
          <button className="chip" onClick={onCalibrate}>
            タイミング調整
          </button>
          <button className="chip" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
            <span aria-hidden="true">⚙</span> 設定
          </button>
        </nav>
      </header>

      <div className="select-body">
        <section className="song-column" aria-label="曲">
          {error && <p className="error">{error}</p>}
          {!songs && !error && <p className="muted">読み込み中…</p>}
          <ul className="song-list" ref={listRef}>
            {songs?.map((song) => {
              const isSelected = song.id === selectedId;
              const score = best[bestKey(song.id, difficulty)];
              return (
                <li key={song.id}>
                  <button
                    className="song-row"
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => (isSelected ? onPlay(song.id, difficulty) : onSelect(song.id))}
                  >
                    <Jacket song={song} />
                    <span className="song-text">
                      <span className="song-title">{song.title}</span>
                      <span className="song-sub">
                        {song.composer} · {formatTime(song.duration)}
                      </span>
                    </span>
                    <span className="song-rank">{score !== undefined ? rankOf(score) : ""}</span>
                    <span className={`lv lv-${difficulty}`}>
                      <small>Lv</small>
                      {song.levels[difficulty]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {selected && (
          <aside className="detail" aria-label="選んだ曲">
            <Jacket song={selected} large />
            <div className="detail-head">
              <h2 className="detail-title">{selected.title}</h2>
              <p className="detail-en">{selected.titleEn}</p>
              <p className="detail-meta">
                {selected.composer}（{selected.composerYears}） · BPM {selected.bpm} · {formatTime(selected.duration)}
              </p>
            </div>
            <div className="diff-picker" role="radiogroup" aria-label="難易度">
              {DIFFICULTIES.map((d) => {
                const score = best[bestKey(selected.id, d)];
                return (
                  <button
                    key={d}
                    role="radio"
                    aria-checked={d === difficulty}
                    className={`diff diff-${d}`}
                    onClick={() => onDifficulty(d)}
                  >
                    <span className="diff-name">{DIFFICULTY_LABELS[d]}</span>
                    <span className="diff-level">{selected.levels[d]}</span>
                    <span className="diff-notes">{selected.noteCounts[d]} notes</span>
                    <span className="diff-rank">{score !== undefined ? rankOf(score) : "—"}</span>
                  </button>
                );
              })}
            </div>
            <p className="detail-best">
              自己ベスト <strong>{selectedBest !== undefined ? selectedBest.toLocaleString("ja-JP") : "—"}</strong>
              {settings.autoplay && <span className="badge-auto">オートプレイ</span>}
            </p>
            <button className="play-button" onClick={() => onPlay(selected.id, difficulty)}>
              PLAY <span aria-hidden="true">▶</span>
            </button>
          </aside>
        )}
      </div>

      <footer className="credits">
        <p>
          楽譜: <a href="https://www.mutopiaproject.org/" target="_blank" rel="noreferrer">Mutopia Project</a>{" "}
          のパブリックドメインの楽譜。ピアノの音:{" "}
          <a href="https://github.com/freepats/upright-piano-KW" target="_blank" rel="noreferrer">
            FreePats Upright Piano KW
          </a>{" "}
          (CC0)。各曲の出典はプレイ画面に表示します。
        </p>
      </footer>

      {drawerOpen && <SettingsDrawer settings={settings} onSettings={onSettings} onCalibrate={onCalibrate} onClose={closeDrawer} />}
    </main>
  );
}
