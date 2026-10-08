"""楽譜（score.Score）から難易度別の譜面を作る。

方針（docs/design.md の「譜面生成」）:
1. 主旋律を取り出す。右手の各発音時刻の最高音のうち、それより高い音が鳴り続けていないもの。
   右手が休みの小節は左手の最低音の列で代わりにする。
2. 小節ごとに、難易度の上限（密度・拍の細かさ）に収まる最も細かい拍節レベルまで旋律の音を採る。
   拍の頭から順に採るので、間引いても拍の格子からはみ出さない。
3. 長い音はロングノーツにする。
4. 上位難易度では、強拍の左手（ベース）を同時押し・単独ノーツとして足す。
5. レーンは近傍の音域に対する相対音高で決め、上がる旋律は右へ、下がる旋律は左へ動かす。
"""

from __future__ import annotations

from dataclasses import dataclass, field

from score import Note, Score

GRACE_MAX_SECONDS = 0.07
CONTOUR_WINDOW_SECONDS = 3.0
MIN_CONTOUR_SPAN = 7  # 半音。狭い音域の旋律でもレーンが詰まりすぎないようにする
HOLD_RELEASE_GAP = 0.12


@dataclass(frozen=True)
class Difficulty:
    name: str
    lanes: int
    max_level: int  # 採る拍節レベルの上限（0=小節頭 … 4=全部）
    nps_cap: float  # 小節内の平均密度の上限（notes / 秒）
    min_gap: float  # 連続するノーツの最小間隔（秒）
    jack_gap: float  # 同じレーンを続けて叩く最小間隔（秒）
    fill_gap_beats: float  # これより長い空白は、採らなかった旋律音で埋める
    hold_seconds: float  # これ以上続く音をロングノーツにする
    hold_beats: float
    bass_level: int  # この拍節レベル以下の左手の音を足す（-1 なら足さない）


DIFFICULTIES = (
    Difficulty("easy", 4, 1, 1.8, 0.36, 0.45, 2.0, 0.9, 2.0, -1),
    Difficulty("normal", 4, 2, 3.0, 0.21, 0.26, 1.5, 0.7, 1.5, -1),
    Difficulty("hard", 6, 3, 4.8, 0.14, 0.17, 1.0, 0.6, 1.0, 0),
    Difficulty("expert", 6, 4, 7.5, 0.095, 0.12, 1.0, 0.5, 1.0, 1),
)


@dataclass(frozen=True)
class Candidate:
    tick: int
    time: float
    level: int
    pitch: int
    end_time: float
    role: str  # "melody" / "bass"
    links: tuple[int, ...]  # 鳴らす音（music event の添字）
    chord_size: int
    beat_seconds: float  # その位置での1拍の長さ

    @property
    def duration(self) -> float:
        return self.end_time - self.time


@dataclass(frozen=True)
class ChartNote:
    time: float
    lane: int
    duration: float  # 0 ならタップ
    links: tuple[int, ...]
    pitch: int
    role: str


@dataclass
class Chart:
    difficulty: Difficulty
    notes: list[ChartNote] = field(default_factory=list)
    level: int = 1


def event_order(score: Score) -> list[Note]:
    """music event の並び。譜面の links はこの添字を指す。"""
    return sorted(score.notes, key=lambda n: (n.start, n.pitch))


def build_candidates(score: Score) -> list[Candidate]:
    events = event_order(score)
    index_of = {id(n): i for i, n in enumerate(events)}
    by_tick: dict[tuple[int, str], list[Note]] = {}
    for note in events:
        by_tick.setdefault((note.start, note.hand), []).append(note)

    right = sorted((n for n in events if n.hand == "R"), key=lambda n: n.start)
    candidates: list[Candidate] = []
    for (tick, hand), group in sorted(by_tick.items()):
        links = tuple(index_of[id(n)] for n in group)
        if hand == "R":
            top = max(group, key=lambda n: n.pitch)
            if _is_inner_voice(top, right):
                continue
            chosen, role = top, "melody"
        else:
            chosen, role = min(group, key=lambda n: n.pitch), "bass"
        start = score.seconds(tick)
        end = score.seconds(chosen.end)
        if role == "melody" and end - start < GRACE_MAX_SECONDS and score.metric_level(tick) >= 4:
            continue
        candidates.append(Candidate(
            tick, start, score.metric_level(tick), chosen.pitch, end, role, links, len(group),
            _beat_seconds(score, tick),
        ))
    return candidates


def _is_inner_voice(top: Note, right: list[Note]) -> bool:
    """同じ手で、より高い音が前から鳴り続けていれば内声とみなす。"""
    for other in right:
        if other.start >= top.start:
            break
        if other.end > top.start and other.pitch > top.pitch:
            return True
    return False


def _bars_with_ends(score: Score) -> list[tuple[float, float, int, int]]:
    ticks = score.bar_lines()
    if not ticks or ticks[0] > 0:
        ticks = [0] + ticks
    rows = []
    for i, start in enumerate(ticks):
        stop = ticks[i + 1] if i + 1 < len(ticks) else score.end_tick
        if stop > start:
            rows.append((score.seconds(start), score.seconds(stop), start, stop))
    return rows


def select_line(score: Score, candidates: list[Candidate], diff: Difficulty) -> list[Candidate]:
    """小節ごとに、上限に収まる最も細かい拍節レベルまで旋律を採る。"""
    melody = [c for c in candidates if c.role == "melody"]
    bass = [c for c in candidates if c.role == "bass"]
    chosen: list[Candidate] = []
    for start, end, tick_start, tick_stop in _bars_with_ends(score):
        line = [c for c in melody if tick_start <= c.tick < tick_stop]
        if not line:
            line = [c for c in bass if tick_start <= c.tick < tick_stop]
        seconds = max(end - start, 1e-6)
        for level in range(diff.max_level, -1, -1):
            subset = [c for c in line if c.level <= level]
            if len(subset) / seconds <= diff.nps_cap or level == 0:
                chosen.extend(subset)
                break
    chosen = _enforce_gap(sorted(chosen, key=lambda c: c.time), diff.min_gap)
    return _fill_gaps(score, chosen, melody, diff)


def _enforce_gap(line: list[Candidate], min_gap: float) -> list[Candidate]:
    kept: list[Candidate] = []
    for cand in line:
        if kept and cand.time - kept[-1].time < min_gap - 1e-9:
            if cand.level < kept[-1].level:
                kept[-1] = cand
            continue
        kept.append(cand)
    return kept


def _beat_seconds(score: Score, tick: int) -> float:
    ts = score.signature_at(tick)
    return score.beat_ticks(ts) * score.tempo.seconds_per_tick(tick)


def _fill_gaps(score: Score, line: list[Candidate], pool: list[Candidate], diff: Difficulty) -> list[Candidate]:
    """長い空白に、採らなかった旋律音のうち拍節の強いものを足す（ロングノーツで埋まる空白は除く）。"""
    result = list(line)
    chosen_ticks = {c.tick for c in result}
    changed = True
    while changed:
        changed = False
        for i in range(len(result) + 1):
            left = result[i - 1] if i > 0 else None
            right = result[i] if i < len(result) else None
            lo = left.time if left else float("-inf")
            hi = right.time if right else float("inf")
            if left and left.end_time >= hi - HOLD_RELEASE_GAP:
                continue
            anchor = left or right
            if anchor is None:
                continue
            if hi - lo < max(diff.fill_gap_beats * anchor.beat_seconds, 2.5 / diff.nps_cap):
                continue
            inside = [
                c for c in pool
                if lo + diff.min_gap <= c.time <= hi - diff.min_gap and c.tick not in chosen_ticks
            ]
            if not inside:
                continue
            best = min(inside, key=lambda c: (c.level, -c.duration, c.time))
            result.insert(i, best)
            chosen_ticks.add(best.tick)
            changed = True
            break
    return result


def add_bass(candidates: list[Candidate], line: list[Candidate], diff: Difficulty) -> list[tuple[Candidate, Candidate | None]]:
    """旋律の各ノーツに、同時に鳴る強拍のベースを相方として付ける。旋律が無い強拍にはベース単独を足す。"""
    if diff.bass_level < 0:
        return [(c, None) for c in line]
    bass_by_tick = {c.tick: c for c in candidates if c.role == "bass" and c.level <= diff.bass_level}
    pairs: list[tuple[Candidate, Candidate | None]] = []
    used: set[int] = set()
    for cand in line:
        partner = bass_by_tick.get(cand.tick) if cand.role == "melody" else None
        if partner:
            used.add(partner.tick)
        pairs.append((cand, partner))
    times = [c.time for c in line]
    for tick, bass in bass_by_tick.items():
        if tick in used:
            continue
        if all(abs(bass.time - t) >= diff.min_gap for t in times):
            pairs.append((bass, None))
    return sorted(pairs, key=lambda p: p[0].time)


def assign_lanes(pairs: list[tuple[Candidate, Candidate | None]], diff: Difficulty) -> list[ChartNote]:
    lanes = diff.lanes
    melody_points = [(c.time, c.pitch) for c, _ in pairs if c.role == "melody"]
    lane_free_at = [float("-inf")] * lanes
    lane_end = [float("-inf")] * lanes  # 各レーンの直前のノーツの終わり（重なり判定用）
    notes: list[ChartNote] = []
    prev: tuple[float, int, int] | None = None  # (time, pitch, lane) of last melody-role note

    for cand, partner in pairs:
        duration = _hold_duration(cand, pairs, diff)
        if cand.role == "bass":
            lane = _free_lane(_bass_lane(cand.pitch, lanes), lane_free_at, lane_end, cand.time, prefer=-1)
            if lane is None:
                continue
            notes.append(ChartNote(cand.time, lane, duration, cand.links, cand.pitch, "bass"))
            lane_free_at[lane] = cand.time + max(duration, 0) + diff.jack_gap
            lane_end[lane] = cand.time + duration
            continue

        raw = _contour_lane(cand, melody_points, lanes)
        lane = _apply_motion(raw, cand, prev, lanes, diff)
        direction = 0 if prev is None else (1 if cand.pitch > prev[1] else -1 if cand.pitch < prev[1] else 0)
        lane = _free_lane(lane, lane_free_at, lane_end, cand.time, prefer=direction or 1)
        if lane is None:
            continue
        if partner is not None:
            partner_lane = _free_lane(_bass_lane(partner.pitch, lanes), lane_free_at, lane_end, cand.time, prefer=-1, exclude={lane})
            if partner_lane is not None and partner_lane >= lane and lane > 0:
                partner_lane = _free_lane(lane - 1, lane_free_at, lane_end, cand.time, prefer=-1, exclude={lane})
            if partner_lane is not None:
                notes.append(ChartNote(cand.time, partner_lane, 0.0, partner.links, partner.pitch, "bass"))
                lane_free_at[partner_lane] = cand.time + diff.jack_gap
                lane_end[partner_lane] = cand.time
        notes.append(ChartNote(cand.time, lane, duration, cand.links, cand.pitch, "melody"))
        lane_free_at[lane] = cand.time + duration + (HOLD_RELEASE_GAP if duration else diff.jack_gap)
        lane_end[lane] = cand.time + duration
        prev = (cand.time, cand.pitch, lane)
    return notes


def _hold_duration(cand: Candidate, pairs: list[tuple[Candidate, Candidate | None]], diff: Difficulty) -> float:
    beats = cand.duration / cand.beat_seconds
    if cand.duration < diff.hold_seconds or beats < diff.hold_beats:
        return 0.0
    later = [c.time for c, _ in pairs if c.time > cand.time]
    end = min(cand.end_time, later[0]) if later else cand.end_time
    duration = end - cand.time - HOLD_RELEASE_GAP / 2
    return round(duration, 3) if duration >= diff.hold_seconds else 0.0


def _contour_lane(cand: Candidate, points: list[tuple[float, int]], lanes: int) -> int:
    near = [p for t, p in points if abs(t - cand.time) <= CONTOUR_WINDOW_SECONDS]
    lo, hi = min(near), max(near)
    if hi - lo < MIN_CONTOUR_SPAN:
        mid = (hi + lo) / 2
        lo, hi = mid - MIN_CONTOUR_SPAN / 2, mid + MIN_CONTOUR_SPAN / 2
    ratio = (cand.pitch - lo) / (hi - lo)
    return min(lanes - 1, max(0, int(ratio * lanes)))


def _apply_motion(raw: int, cand: Candidate, prev: tuple[float, int, int] | None, lanes: int, diff: Difficulty) -> int:
    """直前の旋律音との上下関係をレーンの左右に反映する。"""
    if prev is None:
        return raw
    prev_time, prev_pitch, prev_lane = prev
    gap = cand.time - prev_time
    step = cand.pitch - prev_pitch
    if step == 0:
        if gap >= diff.jack_gap:
            return prev_lane
        return prev_lane + 1 if prev_lane + 1 < lanes else prev_lane - 1
    if step > 0 and raw <= prev_lane:
        return min(prev_lane + 1, lanes - 1) if prev_lane + 1 < lanes else raw
    if step < 0 and raw >= prev_lane:
        return max(prev_lane - 1, 0) if prev_lane > 0 else raw
    if abs(step) <= 2:
        return prev_lane + (1 if step > 0 else -1)
    return raw


def _bass_lane(pitch: int, lanes: int) -> int:
    return 0 if pitch < 48 or lanes <= 4 else 1


def _free_lane(
    lane: int, free_at: list[float], ends: list[float], time: float, prefer: int, exclude: set[int] | None = None
) -> int | None:
    """lane から近い順に空いたレーンを探す。間隔の余裕が無ければ重ならないだけのレーンで妥協し、それも無ければ None。"""
    exclude = exclude or set()
    lanes = len(free_at)
    order = [lane]
    for d in range(1, lanes):
        for cand in (lane + d * prefer, lane - d * prefer):
            if 0 <= cand < lanes and cand not in order:
                order.append(cand)
    for cand in order:
        if cand not in exclude and free_at[cand] <= time + 1e-9:
            return cand
    for cand in order:
        if cand not in exclude and ends[cand] < time - 1e-6:
            return cand
    return None


def chart_level(notes: list[ChartNote]) -> int:
    """2 秒窓の密度の 90 パーセンタイルから、目安のレベル（1〜）を出す。"""
    if not notes:
        return 1
    times = sorted(n.time for n in notes)
    densities = []
    j = 0
    for i, t in enumerate(times):
        while times[j] < t - 2.0:
            j += 1
        densities.append((i - j + 1) / 2.0)
    densities.sort()
    p90 = densities[int(len(densities) * 0.9) - 1 if len(densities) > 1 else 0]
    return max(1, round(1 + p90 * 3.2))


def build_chart(score: Score, diff: Difficulty, candidates: list[Candidate] | None = None) -> Chart:
    candidates = candidates if candidates is not None else build_candidates(score)
    line = select_line(score, candidates, diff)
    pairs = add_bass(candidates, line, diff)
    notes = assign_lanes(pairs, diff)
    notes.sort(key=lambda n: (n.time, n.lane))
    return Chart(diff, notes, chart_level(notes))

