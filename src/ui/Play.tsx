import { useCallback, useEffect, useRef, useState } from "react";
import { audioKit } from "../audio/context";
import { PlayEngine } from "../game/engine";
import { isStartKey, laneOfKey } from "../game/keys";
import type { SessionStats } from "../game/session";
import { drawFrame, laneAt } from "../render/highway";
import { loadSong } from "../song/load";
import { DIFFICULTY_LABELS, type Difficulty, type Song } from "../song/types";
import type { Settings } from "../storage";

interface Props {
  readonly songId: string;
  readonly difficulty: Difficulty;
  readonly settings: Settings;
  readonly onFinish: (song: Song, difficulty: Difficulty, stats: SessionStats) => void;
  readonly onRetry: () => void;
  readonly onQuit: () => void;
}

type Phase =
  | { readonly kind: "loading"; readonly done: number; readonly total: number }
  | { readonly kind: "ready" | "playing" | "paused" }
  | { readonly kind: "error"; readonly message: string };

export function Play({ songId, difficulty, settings, onFinish, onRetry, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [engine, setEngine] = useState<PlayEngine | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading", done: 0, total: 0 });
  // 設定やコールバックが変わっても、プレイの途中で作り直さない
  const settingsRef = useRef(settings);
  const callbacks = useRef({ onFinish, onRetry, onQuit });
  callbacks.current = { onFinish, onRetry, onQuit };

  const resume = useCallback(() => {
    if (engine) void engine.resume().then(() => setPhase({ kind: "playing" }));
  }, [engine]);
  const pause = useCallback(() => {
    if (engine?.state !== "playing") return;
    engine.pause();
    setPhase({ kind: "paused" });
  }, [engine]);

  useEffect(() => {
    let cancelled = false;
    let created: PlayEngine | null = null;
    (async () => {
      const loaded = await loadSong(songId);
      if (cancelled) return;
      setSong(loaded);
      const { ctx, sampler } = audioKit();
      await sampler.load(
        loaded.events.map((e) => [e[1], e[3]] as const),
        (done, total) => !cancelled && setPhase({ kind: "loading", done, total }),
      );
      if (cancelled) return;
      created = new PlayEngine({ ctx, sampler, song: loaded, difficulty, settings: settingsRef.current });
      setEngine(created);
      setPhase({ kind: "ready" });
    })().catch((e: unknown) => {
      if (!cancelled) setPhase({ kind: "error", message: e instanceof Error ? e.message : "読み込みに失敗しました" });
    });
    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [songId, difficulty]);

  // 描画と進行のループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!engine || !song || !canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    let raf = 0;
    let finished = false;
    const touchOnly = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (engine.tick(now) && !finished) {
        finished = true;
        cancelAnimationFrame(raf);
        callbacks.current.onFinish(song, difficulty, engine.stats());
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const frame = engine.frame(now);
      // タッチだけの端末ではキーの名前は役に立たないので出さない
      drawFrame(g, width, height, touchOnly ? { ...frame, keyLabels: [] } : frame);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine, song, difficulty]);

  // キーボード・タッチ・タブ切り替え
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;
    const begin = () => {
      void engine.start().then(() => setPhase({ kind: "playing" }));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const lane = laneOfKey(e.code, engine.lanes);
      if (e.repeat) {
        if (lane !== null) e.preventDefault();
        return;
      }
      if (engine.state === "ready") {
        if (!isStartKey(e)) return;
        e.preventDefault();
        begin();
        return;
      }
      if (e.code === "Escape") {
        e.preventDefault();
        if (engine.state === "playing") pause();
        else if (engine.state === "paused") resume();
        return;
      }
      if (engine.state === "paused") {
        if (e.code === "Enter" || e.code === "Space") resume();
        else if (e.code === "KeyR") callbacks.current.onRetry();
        else if (e.code === "KeyQ") callbacks.current.onQuit();
        return;
      }
      if (lane !== null) {
        e.preventDefault();
        engine.press(lane, e.timeStamp);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const lane = laneOfKey(e.code, engine.lanes);
      if (lane !== null) engine.release(lane, e.timeStamp);
    };

    const pointerLanes = new Map<number, number>();
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (engine.state === "ready") {
        begin();
        return;
      }
      const lane = laneAt(e.offsetX, canvas.clientWidth, canvas.clientHeight, engine.lanes);
      pointerLanes.set(e.pointerId, lane);
      engine.press(lane, e.timeStamp);
    };
    const onPointerUp = (e: PointerEvent) => {
      const lane = pointerLanes.get(e.pointerId);
      if (lane === undefined) return;
      pointerLanes.delete(e.pointerId);
      engine.release(lane, e.timeStamp);
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
    };
  }, [engine, pause, resume]);

  const chart = song?.charts[difficulty];

  return (
    <main className="play">
      <div className="stage">
        <canvas ref={canvasRef} className="highway" />
        <header className="play-hud">
          {phase.kind === "playing" ? (
            <button className="hud-button" onClick={pause} aria-label="一時停止">
              <span aria-hidden="true">❚❚</span>
            </button>
          ) : (
            <button className="hud-button" onClick={onQuit} aria-label="選曲に戻る">
              <span aria-hidden="true">←</span>
            </button>
          )}
          <div className="play-title">
            <strong>{song?.title ?? "…"}</strong>
            <span>
              <span className={`diff-text diff-${difficulty}`}>
                {DIFFICULTY_LABELS[difficulty]} {chart ? `Lv${chart.level}` : ""}
              </span>
              {settings.rate !== 1 ? ` · テンポ ${Math.round(settings.rate * 100)}%` : ""}
              {settings.autoplay ? " · オートプレイ" : ""}
              {settings.keysound && !settings.autoplay ? " · キー音" : ""}
            </span>
          </div>
        </header>
        {phase.kind === "loading" && (
          <div className="overlay">
            <p className="cue-sub">読み込み中… {phase.total > 0 ? `${phase.done}/${phase.total}` : ""}</p>
          </div>
        )}
        {phase.kind === "error" && (
          <div className="overlay">
            <p className="error">{phase.message}</p>
            <button onClick={onQuit}>選曲に戻る</button>
          </div>
        )}
        {phase.kind === "ready" && song && (
          <div className="overlay ready">
            <p className="cue">READY</p>
            <p className="ready-title">{song.title}</p>
            <p className="ready-sub">
              {song.titleEn} — {song.composerEn}
            </p>
            <p className="ready-go">
              <span className="only-keys">何かキーを押すとスタート</span>
              <span className="only-touch">画面をタップしてスタート</span>
            </p>
            <p className="ready-credit">
              楽譜: Mutopia Project{" "}
              <a href={song.credit.pieceUrl} target="_blank" rel="noreferrer">
                #{song.credit.mutopiaId}
              </a>{" "}
              （{song.credit.maintainer} 浄書, {song.credit.license}）
            </p>
          </div>
        )}
        {phase.kind === "paused" && (
          <div className="overlay paused">
            <p className="cue">PAUSE</p>
            <div className="buttons">
              <button onClick={resume}>続ける<kbd className="only-keys">Esc</kbd></button>
              <button className="secondary" onClick={onRetry}>
                やり直す<kbd className="only-keys">R</kbd>
              </button>
              <button className="secondary" onClick={onQuit}>
                選曲に戻る<kbd className="only-keys">Q</kbd>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
