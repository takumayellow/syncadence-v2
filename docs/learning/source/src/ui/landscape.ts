import { useEffect } from "react";

/** 指で触る端末。マウスとキーボードで遊ぶ端末では、全画面にも横向きの案内にもしない */
export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

/** 指で触る端末を縦に持っている状態。プレイ画面は横長なので、横に持ち直してもらう */
export const PORTRAIT_TOUCH_QUERY = `${TOUCH_QUERY} and (orientation: portrait)`;

interface FullscreenState {
  readonly fullscreenEnabled: boolean;
  readonly fullscreenElement: Element | null;
}

/**
 * このタップで全画面に入るか。
 *
 * ノーツを叩くタップ（レーンを描いたキャンバスの上）では入らない。
 * 全画面に切り替わると画面の大きさが変わり、叩いている最中にレーンの位置がずれるため。
 */
export function wantsFullscreen(doc: FullscreenState, target: EventTarget | null): boolean {
  if (!doc.fullscreenEnabled || doc.fullscreenElement) return false;
  return (target as Element | null)?.tagName !== "CANVAS";
}

type LockableOrientation = ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> };

/** 横向きに固定する。固定できない端末（iPhone など）では何もしない */
async function lockLandscape(): Promise<void> {
  try {
    await (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape");
  } catch {
    // 固定できなくても、縦に持てば案内が出る
  }
}

/**
 * 指で触る端末では、タップしたときに全画面へ入り、横向きに固定する。
 *
 * 全画面はタップの中でしか頼めない（ブラウザの決まり）ので、画面を開いただけでは入らない。
 * 戻る操作などで全画面が外れても、次のタップでまた入る。
 */
export function useLandscapeFullscreen(): void {
  useEffect(() => {
    if (!window.matchMedia?.(TOUCH_QUERY).matches) return;
    let pending = false;
    const onPointerUp = (e: PointerEvent) => {
      if (pending || e.pointerType === "mouse" || !wantsFullscreen(document, e.target)) return;
      pending = true;
      document.documentElement
        .requestFullscreen({ navigationUI: "hide" })
        .then(lockLandscape)
        .catch(() => {
          // 全画面に入れない端末では、そのまま遊ぶ
        })
        .finally(() => {
          pending = false;
        });
    };
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, []);
}
