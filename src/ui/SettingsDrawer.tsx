import { useEffect, useRef } from "react";
import type { Settings } from "../storage";
import { SettingsPanel } from "./SettingsPanel";

interface Props {
  readonly settings: Settings;
  readonly onSettings: (s: Settings) => void;
  readonly onCalibrate: () => void;
  readonly onClose: () => void;
}

/** 選曲画面の右から出す設定と遊び方。Esc か外側のクリックで閉じる。 */
export function SettingsDrawer({ settings, onSettings, onCalibrate, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <h2 id="drawer-title">設定</h2>
          <button ref={closeRef} className="ghost" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </header>
        <SettingsPanel settings={settings} onSettings={onSettings} onCalibrate={onCalibrate} />
        <section className="panel help">
          <h2>遊び方</h2>
          <p>
            EASY・NORMAL は <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd>、HARD・EXPERT は <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd>{" "}
            <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd>。スマートフォンでは判定線の近くのレーンをタップします。
          </p>
          <p>
            ノーツは主旋律の音に置いてあり、高い音ほど右のレーンに来ます。横線は小節線（太）と拍（細）です。プレイ中は <kbd>Esc</kbd>{" "}
            か右上の ❚❚ で一時停止します。
          </p>
          <p>
            選曲画面では <kbd>↑</kbd> <kbd>↓</kbd> で曲、<kbd>←</kbd> <kbd>→</kbd> で難易度を選び、<kbd>Enter</kbd> で始めます。
          </p>
        </section>
      </aside>
    </div>
  );
}
