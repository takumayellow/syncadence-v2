"""MIDI（Mutopia の LilyPond 出力）を、譜面生成に使う楽譜データに変換する。

扱うもの:
- テンポマップ（tick → 秒）
- 拍子と小節線。LilyPond の MIDI は弱起（\\partial）の分を詰めて出力するので、
  .ly の先頭の \\partial から弱起の長さを読み、小節の起点をずらす。
- 各音の拍節上の強さ（小節頭 / 拍頭 / 半拍 / 1/4 拍 / それ以外）
- 右手・左手の区別（トラックごとの平均音高で決める）
- ダンパーペダル（CC64）による音の延長。音響用の長さにだけ使い、譜面のロングノーツ判定には使わない。
"""

from __future__ import annotations

import bisect
import re
from dataclasses import dataclass
from pathlib import Path

import mido

PEDAL_CC = 64
PEDAL_DOWN = 64
PARTIAL = re.compile(r"\\partial\s+(\d+)(\.*)(?:\s*\*\s*(\d+)(?:/(\d+))?)?")


@dataclass(frozen=True)
class Note:
    start: int  # tick
    end: int  # tick（鍵盤を離す位置）
    pitch: int
    velocity: int
    hand: str  # "R" or "L"


@dataclass(frozen=True)
class TimeSignature:
    tick: int
    numerator: int
    denominator: int


def is_compound(ts: TimeSignature) -> bool:
    return ts.denominator == 8 and ts.numerator in (6, 9, 12)


class TempoMap:
    """tick と秒の相互変換。テンポ変更は区分線形で扱う。"""

    def __init__(self, ticks_per_beat: int, changes: list[tuple[int, int]]):
        self.tpb = ticks_per_beat
        points = sorted(changes) or [(0, 500_000)]
        if points[0][0] != 0:
            points.insert(0, (0, 500_000))
        self._ticks: list[int] = []
        self._tempos: list[int] = []
        self._seconds: list[float] = []
        elapsed = 0.0
        for i, (tick, tempo) in enumerate(points):
            if i > 0:
                prev_tick, prev_tempo = points[i - 1]
                elapsed += (tick - prev_tick) * prev_tempo / 1e6 / self.tpb
            if self._ticks and self._ticks[-1] == tick:
                self._tempos[-1] = tempo
                continue
            self._ticks.append(tick)
            self._tempos.append(tempo)
            self._seconds.append(elapsed)

    def seconds(self, tick: float) -> float:
        i = bisect.bisect_right(self._ticks, tick) - 1
        i = max(i, 0)
        return self._seconds[i] + (tick - self._ticks[i]) * self._tempos[i] / 1e6 / self.tpb

    def seconds_per_tick(self, tick: float) -> float:
        i = max(bisect.bisect_right(self._ticks, tick) - 1, 0)
        return self._tempos[i] / 1e6 / self.tpb


@dataclass
class Score:
    tpb: int
    notes: list[Note]
    tempo: TempoMap
    time_signatures: list[TimeSignature]
    pedal: list[tuple[int, int]]  # (down, up) の tick 区間
    pickup: int  # 弱起の長さ（tick）
    end_tick: int

    def seconds(self, tick: float) -> float:
        return self.tempo.seconds(tick)

    def signature_at(self, tick: int) -> TimeSignature:
        ticks = [ts.tick for ts in self.time_signatures]
        return self.time_signatures[max(bisect.bisect_right(ticks, tick) - 1, 0)]

    def beat_ticks(self, ts: TimeSignature) -> int:
        """1拍の長さ。8分の6・9・12拍子は付点4分を1拍とする。"""
        unit = self.tpb * 4 // ts.denominator
        return unit * 3 if is_compound(ts) else unit

    def bar_ticks(self, ts: TimeSignature) -> int:
        return self.tpb * 4 * ts.numerator // ts.denominator

    def _origin(self, ts: TimeSignature) -> int:
        """その拍子区間で小節頭とみなす基準 tick。最初の区間だけ弱起の分ずらす。"""
        if ts is self.time_signatures[0]:
            return ts.tick + self.pickup
        return ts.tick

    def metric_level(self, tick: int) -> int:
        """0=小節頭, 1=拍頭, 2=半拍（複合拍子は 1/3 拍）, 3=さらに半分, 4=それ以外。"""
        ts = self.signature_at(tick)
        beat = self.beat_ticks(ts)
        sub = beat // 3 if is_compound(ts) else beat // 2
        grids = (self.bar_ticks(ts), beat, sub, sub // 2)
        pos = tick - self._origin(ts)
        for level, grid in enumerate(grids):
            if grid > 0 and pos % grid == 0:
                return level
        return len(grids)

    def bar_lines(self) -> list[int]:
        bars: list[int] = []
        for i, ts in enumerate(self.time_signatures):
            stop = self.time_signatures[i + 1].tick if i + 1 < len(self.time_signatures) else self.end_tick
            bar = self.bar_ticks(ts)
            tick = self._origin(ts)
            if tick - bar >= ts.tick and i > 0:
                tick -= bar
            while tick < stop:
                if tick >= ts.tick:
                    bars.append(tick)
                tick += bar
        return bars

    def beat_lines(self) -> list[int]:
        beats: list[int] = []
        bars = self.bar_lines()
        for i, start in enumerate(bars):
            stop = bars[i + 1] if i + 1 < len(bars) else self.end_tick
            beat = self.beat_ticks(self.signature_at(start))
            beats.extend(range(start, stop, beat))
        return beats

    def sounding_end(self, note: Note) -> int:
        """ペダルを踏んでいる間に離した音は、ペダルを上げるまで鳴らす。"""
        for down, up in self.pedal:
            if down <= note.end < up:
                return max(note.end, up)
        return note.end


def read_pickup(ly_text: str, tpb: int) -> int:
    match = PARTIAL.search(ly_text)
    if not match:
        return 0
    denominator = int(match.group(1))
    ticks = tpb * 4 / denominator
    dot = ticks / 2
    for _ in match.group(2):
        ticks += dot
        dot /= 2
    if match.group(3):
        ticks *= int(match.group(3)) / int(match.group(4) or 1)
    return int(round(ticks))


def load_score(midi_path: Path, ly_path: Path | None = None) -> Score:
    midi = mido.MidiFile(midi_path)
    tpb = midi.ticks_per_beat
    tempos: list[tuple[int, int]] = []
    signatures: list[TimeSignature] = []
    pedal_events: list[tuple[int, bool]] = []
    track_notes: dict[int, list[tuple[int, int, int, int]]] = {}
    end_tick = 0

    for index, track in enumerate(midi.tracks):
        tick = 0
        open_notes: dict[tuple[int, int], list[tuple[int, int]]] = {}
        for msg in track:
            tick += msg.time
            if msg.type == "set_tempo":
                tempos.append((tick, msg.tempo))
            elif msg.type == "time_signature":
                if not signatures or signatures[-1].tick != tick:
                    signatures.append(TimeSignature(tick, msg.numerator, msg.denominator))
            elif msg.type == "control_change" and msg.control == PEDAL_CC:
                pedal_events.append((tick, msg.value >= PEDAL_DOWN))
            elif msg.type == "note_on" and msg.velocity > 0:
                open_notes.setdefault((msg.channel, msg.note), []).append((tick, msg.velocity))
            elif msg.type in ("note_off", "note_on"):
                stack = open_notes.get((msg.channel, msg.note))
                if stack:
                    start, velocity = stack.pop(0)
                    track_notes.setdefault(index, []).append((start, tick, msg.note, velocity))
        end_tick = max(end_tick, tick)

    if not signatures:
        signatures = [TimeSignature(0, 4, 4)]
    signatures.sort(key=lambda ts: ts.tick)

    means = {i: sum(n[2] for n in ns) / len(ns) for i, ns in track_notes.items() if ns}
    ranked = sorted(means, key=means.get, reverse=True)
    right = set(ranked[: max(1, len(ranked) // 2)])
    notes = sorted(
        (
            Note(start, max(end, start + 1), pitch, velocity, "R" if index in right else "L")
            for index, ns in track_notes.items()
            for start, end, pitch, velocity in ns
        ),
        key=lambda n: (n.start, -n.pitch),
    )

    pedal: list[tuple[int, int]] = []
    down_at: int | None = None
    for tick, is_down in sorted(pedal_events):
        if is_down and down_at is None:
            down_at = tick
        elif not is_down and down_at is not None:
            pedal.append((down_at, tick))
            down_at = None
    if down_at is not None:
        pedal.append((down_at, end_tick))

    pickup = 0
    if ly_path is not None and ly_path.exists():
        pickup = read_pickup(ly_path.read_text(encoding="utf-8", errors="replace"), tpb)

    last_note = max((n.end for n in notes), default=0)
    return Score(tpb, notes, TempoMap(tpb, tempos), signatures, pedal, pickup, max(end_tick, last_note))
