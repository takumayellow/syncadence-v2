import { useEffect, useRef, useState } from "react";
import { audioKit } from "../audio/context";
import { SongClock } from "../audio/clock";
import { eventTimeMs } from "../game/engine";
import { isStartKey } from "../game/keys";
import { calibrate } from "../game/stats";
import type { Settings } from "../storage";
import { signedMs } from "./format";

interface Props {
  readonly settings: Settings;
  readonly onSettings: (s: Settings) => void;
  readonly onBack: () => void;
}

const INTERVAL_MS = 600;
const CLICKS = 20;
const WARMUP = 4; // 最初の数拍は耳慣らしとして数えない

type Phase = { readonly kind: "idle" } | { readonly kind: "running"; readonly taps: number } | { readonly kind: "done"; readonly offset: number | null };

function click(ctx: AudioContext, when: number, accent: boolean): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1760 : 1320;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.5, when + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + 0.08);
}

/** メトロノームに合わせて叩き、音が聞こえてから押すまでのずれを測る。 */
export function Calibrate({ settings, onSettings, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const run = useRef<{ clock: SongClock; taps: number[]; timer: number } | null>(null);

  useEffect(() => () => window.clearTimeout(run.current?.timer), []);

  const start = async () => {
    const { ctx } = audioKit();
    await ctx.resume();
    const begin = ctx.currentTime + 0.6;
    for (let i = 0; i < CLICKS; i += 1) click(ctx, begin + (i * INTERVAL_MS) / 1000, i % 4 === 0);
    const clock = new SongClock(ctx, begin, 1);
    const timer = window.setTimeout(() => finish(), 600 + CLICKS * INTERVAL_MS + 400);
    run.current = { clock, taps: [], timer };
    setPhase({ kind: "running", taps: 0 });
  };

  const finish = () => {
    const current = run.current;
    if (!current) return;
    const clicks = Array.from({ length: CLICKS - WARMUP }, (_, i) => (i + WARMUP) * INTERVAL_MS);
    const offset = calibrate(current.taps, clicks, INTERVAL_MS);
    run.current = null;
    setPhase({ kind: "done", offset });
  };

  const tap = (timeStamp: number) => {
    const current = run.current;
    if (!current) return;
    const now = performance.now();
    current.clock.update(now);
    current.taps.push(current.clock.songTimeAt(eventTimeMs(timeStamp, now)) * 1000);
    setPhase({ kind: "running", taps: current.taps.length });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Escape") {
        onBack();
        return;
      }
      if (run.current && isStartKey(e)) {
        e.preventDefault();
        tap(e.timeStamp);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <main className="page calibrate">
      <h1>タイミングを測る</h1>
      <p>
        クリック音が {CLICKS} 回鳴ります。音に合わせて、好きなキーかこの下の枠を叩いてください。最初の {WARMUP}{" "}
        回は耳慣らしで、数えません。ずれの中央値を「入力の補正」に使います。
      </p>
      <p className="muted">
        ブラウザが報告する出力の遅れ（Bluetooth イヤホンなど）は自動で差し引いているので、ここで測るのはその残りと、押す癖の分です。
      </p>
      <div
        className={`tap-pad ${phase.kind === "running" ? "active" : ""}`}
        onPointerDown={(e) => {
          e.preventDefault();
          tap(e.timeStamp);
        }}
      >
        {phase.kind === "running" ? `${phase.taps} 回` : "ここを叩く"}
      </div>
      {phase.kind === "done" &&
        (phase.offset === null ? (
          <p className="error">叩いた回数が足りないか、ずれが大きすぎて測れませんでした。もう一度どうぞ。</p>
        ) : (
          <div className="panel">
            <p>
              ずれの中央値: <strong>{signedMs(phase.offset)}</strong>（正なら遅め）
            </p>
            <button
              onClick={() => {
                onSettings({ ...settings, inputOffsetMs: Math.max(-300, Math.min(300, Math.round(phase.offset ?? 0))) });
                onBack();
              }}
            >
              入力の補正を {signedMs(phase.offset)} にして戻る
            </button>
          </div>
        ))}
      <div className="buttons">
        {phase.kind !== "running" && <button onClick={() => void start()}>{phase.kind === "done" ? "もう一度測る" : "始める"}</button>}
        <button className="secondary" onClick={onBack}>
          戻る（Esc）
        </button>
      </div>
      <p className="muted">現在の入力の補正: {signedMs(settings.inputOffsetMs)}</p>
    </main>
  );
}
