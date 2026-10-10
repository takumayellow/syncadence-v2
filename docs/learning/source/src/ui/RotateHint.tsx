/** 指で触る端末を縦に持っている間だけ、ゲームの上に重ねて出す。出し分けは CSS（rotate.css）が行う */
export function RotateHint() {
  return (
    <div className="rotate-hint">
      <div className="rotate-hint-icon" aria-hidden="true">
        📱
      </div>
      <p>画面を横向きにしてください</p>
    </div>
  );
}
