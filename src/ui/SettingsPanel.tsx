import type { Settings } from "../storage";

interface Props {
  readonly settings: Settings;
  readonly onSettings: (s: Settings) => void;
  readonly onCalibrate: () => void;
}

const RATES = [0.5, 0.6, 0.7, 0.8, 0.9, 1];

export function SettingsPanel({ settings, onSettings, onCalibrate }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onSettings({ ...settings, [key]: value });

  return (
    <section className="panel settings">
      <h2>設定</h2>
      <label className="field">
        <span>ノーツの速さ</span>
        <input
          type="range"
          min={0.6}
          max={4}
          step={0.1}
          value={4.6 - settings.approachSeconds}
          onChange={(e) => set("approachSeconds", Math.round((4.6 - Number(e.target.value)) * 10) / 10)}
        />
        <output>{settings.approachSeconds.toFixed(1)} 秒で到達</output>
      </label>
      <label className="field">
        <span>テンポ</span>
        <select value={settings.rate} onChange={(e) => set("rate", Number(e.target.value))}>
          {RATES.map((r) => (
            <option key={r} value={r}>
              {Math.round(r * 100)}%
            </option>
          ))}
        </select>
        <output>音の高さは変わりません</output>
      </label>
      <label className="field">
        <span>音量</span>
        <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => set("volume", Number(e.target.value))} />
        <output>{Math.round(settings.volume * 100)}%</output>
      </label>
      <label className="field">
        <span>入力の補正</span>
        <input
          type="number"
          min={-300}
          max={300}
          step={1}
          value={settings.inputOffsetMs}
          onChange={(e) => set("inputOffsetMs", Math.max(-300, Math.min(300, Math.round(Number(e.target.value) || 0))))}
        />
        <output>ms（遅めに押す人は正）</output>
      </label>
      <label className="field">
        <span>表示の補正</span>
        <input
          type="number"
          min={-300}
          max={300}
          step={1}
          value={settings.visualOffsetMs}
          onChange={(e) => set("visualOffsetMs", Math.max(-300, Math.min(300, Math.round(Number(e.target.value) || 0))))}
        />
        <output>ms（正でノーツが遅れて届く）</output>
      </label>
      <label className="check">
        <input type="checkbox" checked={settings.keysound} onChange={(e) => set("keysound", e.target.checked)} />
        <span>キー音（叩いた音だけが鳴る）</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={settings.autoplay} onChange={(e) => set("autoplay", e.target.checked)} />
        <span>オートプレイ（見本。スコアは残りません）</span>
      </label>
      <button className="secondary" onClick={onCalibrate}>
        タイミングを測る
      </button>
    </section>
  );
}
