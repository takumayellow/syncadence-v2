"""譜面の中身を確かめる。小節ごとにノーツを拍の格子で表示し、品質の指標を出す。

使い方: python tools/inspect_chart.py <曲ID> <難易度> [表示する小節数]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def chart_metrics(song: dict, difficulty: str) -> dict:
    chart = song["charts"][difficulty]
    notes = chart["notes"]
    events = song["events"]
    beats = song["beats"]
    beat_set = {round(b, 3) for b in beats}
    times = sorted({n[0] for n in notes})
    on_beat = sum(1 for t in times if round(t, 3) in beat_set)

    melody = [n for n in notes if n[3] and events[n[3][0]][4] == 0]
    agree = total = 0
    for a, b in zip(melody, melody[1:]):
        pa = max(events[i][1] for i in a[3])
        pb = max(events[i][1] for i in b[3])
        if pa == pb or b[0] - a[0] > 1.0 or b[0] == a[0]:
            continue
        total += 1
        agree += (b[1] - a[1]) * (pb - pa) > 0
    by_lane: dict[int, list[list]] = {}
    for n in notes:
        by_lane.setdefault(n[1], []).append(n)
    overlaps = 0
    min_jack = float("inf")
    for lane_notes in by_lane.values():
        lane_notes.sort(key=lambda n: n[0])
        for a, b in zip(lane_notes, lane_notes[1:]):
            if a[0] + a[2] >= b[0] - 1e-6:
                overlaps += 1
            min_jack = min(min_jack, b[0] - (a[0] + a[2]))
    peak = 0.0
    j = 0
    all_times = [n[0] for n in sorted(notes)]
    for i, t in enumerate(all_times):
        while all_times[j] < t - 1.0:
            j += 1
        peak = max(peak, i - j + 1)
    return {
        "notes": len(notes),
        "holds": sum(1 for n in notes if n[2] > 0),
        "chords": len(notes) - len(times),
        "onBeatRatio": round(on_beat / max(len(times), 1), 3),
        "contourAgreement": round(agree / max(total, 1), 3),
        "laneOverlaps": overlaps,
        "minSameLaneGap": round(min_jack, 3),
        "peakNotesPerSecond": peak,
        "level": chart["level"],
    }


def show_bars(song: dict, difficulty: str, count: int) -> None:
    notes = song["charts"][difficulty]["notes"]
    lanes = song["charts"][difficulty]["lanes"]
    bars = song["bars"]
    for i, start in enumerate(bars[:count]):
        end = bars[i + 1] if i + 1 < len(bars) else song["duration"]
        inside = [n for n in notes if start - 1e-6 <= n[0] < end - 1e-6]
        cells = []
        for n in inside:
            pos = (n[0] - start) / (end - start)
            pitch = max(song["events"][k][1] for k in n[3]) if n[3] else -1
            lane_mark = "".join("#" if L == n[1] else "." for L in range(lanes))
            hold = f" hold{n[2]:.2f}" if n[2] else ""
            cells.append(f"{pos:4.2f} {lane_mark} p{pitch}{hold}")
        print(f"bar {i + 1:3d} @{start:7.2f}s | " + " ; ".join(cells))


def main(argv: list[str]) -> int:
    song = json.loads((ROOT / "public" / "songs" / f"{argv[0]}.json").read_text(encoding="utf-8"))
    difficulty = argv[1]
    print(json.dumps(chart_metrics(song, difficulty)))
    show_bars(song, difficulty, int(argv[2]) if len(argv) > 2 else 12)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
