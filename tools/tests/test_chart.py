import json
from functools import lru_cache
from pathlib import Path

import pytest

from chart import DIFFICULTIES, _free_lane, build_candidates, build_chart, event_order
from score import load_score

ROOT = Path(__file__).resolve().parents[2]
SONGS = [entry["id"] for entry in json.loads((ROOT / "tools" / "songs.json").read_text(encoding="utf-8"))]


@lru_cache(maxsize=None)
def built(song_id: str):
    folder = ROOT / "sources" / "mutopia" / song_id
    meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    score = load_score(folder / meta["files"]["mid"]["name"], folder / meta["files"]["ly"]["name"])
    candidates = build_candidates(score)
    return score, {d.name: build_chart(score, d, candidates) for d in DIFFICULTIES}


@pytest.mark.parametrize("song_id", SONGS)
def test_notes_sit_on_the_music(song_id):
    score, charts = built(song_id)
    events = event_order(score)
    for chart in charts.values():
        for note in chart.notes:
            assert note.links, "ノーツは必ず鳴らす音を持つ"
            starts = {round(score.seconds(events[i].start), 6) for i in note.links}
            assert starts == {round(note.time, 6)}


@pytest.mark.parametrize("song_id", SONGS)
def test_lanes_in_range_and_never_overlap(song_id):
    _, charts = built(song_id)
    for chart in charts.values():
        lanes = chart.difficulty.lanes
        last_end = {}
        for note in sorted(chart.notes, key=lambda n: n.time):
            assert 0 <= note.lane < lanes
            assert note.time > last_end.get(note.lane, float("-inf")) + 1e-6
            last_end[note.lane] = note.time + note.duration


@pytest.mark.parametrize("song_id", SONGS)
def test_min_gap_between_distinct_times(song_id):
    _, charts = built(song_id)
    for chart in charts.values():
        times = sorted({round(n.time, 6) for n in chart.notes})
        gaps = [b - a for a, b in zip(times, times[1:])]
        assert min(gaps) >= chart.difficulty.min_gap - 1e-6


@pytest.mark.parametrize("song_id", SONGS)
def test_easy_stays_on_the_beat_grid(song_id):
    """やさしい譜面は拍か半拍の位置にほぼ収まる（シンコペーションの旋律だけが例外）。"""
    score, charts = built(song_id)
    events = event_order(score)
    notes = charts["easy"].notes
    on_grid = sum(1 for n in notes if score.metric_level(events[n.links[0]].start) <= 2)
    assert on_grid / len(notes) >= 0.9


@pytest.mark.parametrize("song_id", SONGS)
def test_density_grows_with_difficulty(song_id):
    _, charts = built(song_id)
    counts = [len(charts[d.name].notes) for d in DIFFICULTIES]
    assert counts == sorted(counts)
    assert counts[-1] > counts[0]


@pytest.mark.parametrize("song_id", SONGS)
def test_melody_motion_follows_lanes(song_id):
    _, charts = built(song_id)
    for name in ("easy", "normal"):
        melody = [n for n in charts[name].notes if n.role == "melody"]
        agree = total = 0
        for a, b in zip(melody, melody[1:]):
            if a.pitch == b.pitch or b.time - a.time > 1.0:
                continue
            total += 1
            agree += (b.lane - a.lane) * (b.pitch - a.pitch) > 0
        assert total == 0 or agree / total >= 0.75, f"{name}: {agree}/{total}"


def test_free_lane_never_stacks_notes():
    inf = float("-inf")
    # 間隔の余裕があるレーンを近い順に選ぶ
    assert _free_lane(1, [5.0, inf, inf, inf], [inf] * 4, 1.0, prefer=1) == 1
    # 余裕は無いが重ならないレーンで妥協する
    assert _free_lane(1, [5.0, 5.0, 5.0, 5.0], [inf, 0.9, inf, inf], 1.0, prefer=1) == 1
    # どのレーンも直前のノーツが続いていれば置かない
    assert _free_lane(1, [5.0] * 4, [2.0] * 4, 1.0, prefer=1) is None
    assert _free_lane(0, [inf, 5.0], [inf, 5.0], 1.0, prefer=1, exclude={0}) is None
