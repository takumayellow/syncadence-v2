import { DIFFICULTIES, DIFFICULTY_LABELS, type Difficulty, type SongSummary } from "../song/types";
import { bestKey, type BestScores, type Settings } from "../storage";
import { SettingsPanel } from "./SettingsPanel";
import { formatTime } from "./format";

interface Props {
  readonly songs: readonly SongSummary[] | null;
  readonly error: string | null;
  readonly difficulty: Difficulty;
  readonly best: BestScores;
  readonly settings: Settings;
  readonly onDifficulty: (d: Difficulty) => void;
  readonly onSettings: (s: Settings) => void;
  readonly onPlay: (songId: string, d: Difficulty) => void;
  readonly onCalibrate: () => void;
}

export function SongSelect({ songs, error, difficulty, best, settings, onDifficulty, onSettings, onPlay, onCalibrate }: Props) {
  return (
    <main className="page select">
      <header className="masthead">
        <h1>Syncadence</h1>
        <p>ピアノの名曲を、楽譜から作った譜面で叩く。鳴る音もノーツも同じ楽譜から作るので、ずれません。</p>
      </header>

      <div className="select-body">
        <section className="songs" aria-label="曲">
          <div className="tabs" role="tablist" aria-label="難易度">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={d === difficulty}
                className={`tab tab-${d}`}
                onClick={() => onDifficulty(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          {!songs && !error && <p className="muted">読み込み中…</p>}
          <ul className="song-list">
            {songs?.map((song) => {
              const score = best[bestKey(song.id, difficulty)];
              return (
                <li key={song.id}>
                  <button className="song" onClick={() => onPlay(song.id, difficulty)}>
                    <span className={`level level-${difficulty}`}>
                      <small>Lv</small>
                      {song.levels[difficulty]}
                    </span>
                    <span className="song-text">
                      <span className="song-title">{song.title}</span>
                      <span className="song-sub">
                        {song.composer}（{song.composerYears}） · {formatTime(song.duration)} · {song.noteCounts[difficulty]} notes
                      </span>
                    </span>
                    <span className="best">{score !== undefined ? score.toLocaleString("ja-JP") : "—"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="side">
          <SettingsPanel settings={settings} onSettings={onSettings} onCalibrate={onCalibrate} />
          <section className="panel help">
            <h2>遊び方</h2>
            <p>
              EASY・NORMAL は <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd>、HARD・EXPERT は <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd>{" "}
              <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd>。スマートフォンではレーンをタップします。
            </p>
            <p>
              ノーツは主旋律の音に置いてあり、高い音ほど右のレーンに来ます。横線は小節線（太）と拍（細）です。<kbd>Esc</kbd> で一時停止。
            </p>
          </section>
        </aside>
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
    </main>
  );
}
