/** レーン数ごとのキー割り当て（KeyboardEvent.code）。ホームポジションに指を置いたまま叩ける並び。 */
export const LANE_KEYS: Record<number, readonly string[]> = {
  4: ["KeyD", "KeyF", "KeyJ", "KeyK"],
  6: ["KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"],
};

export function keyLabels(lanes: number): string[] {
  return (LANE_KEYS[lanes] ?? []).map((code) => code.replace("Key", ""));
}

export function laneOfKey(code: string, lanes: number): number | null {
  const index = (LANE_KEYS[lanes] ?? []).indexOf(code);
  return index >= 0 ? index : null;
}

/** 開始の合図に使わないキー。ブラウザやOSの操作（全画面・更新・開発者ツールなど）に任せる。 */
const RESERVED = /^(F\d{1,2}|Tab|Escape|Meta.*|Alt.*|Control.*|Shift.*|OS.*|ContextMenu|PrintScreen|BrowserBack|BrowserForward|BrowserRefresh|AudioVolume.*|MediaPlayPause)$/;

export function isStartKey(event: Pick<KeyboardEvent, "code" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !RESERVED.test(event.code);
}
