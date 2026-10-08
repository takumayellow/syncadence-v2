"""sources/mutopia の楽譜から、ゲームが読む曲データ public/songs/<id>.json と一覧 index.json を作る。

使い方: python tools/build_songs.py [曲ID ...]

曲データには、鳴らす音（events）と難易度別の譜面（charts）が同じ時間軸で入る。
ブラウザは events をピアノ音源で鳴らし、charts をノーツとして流すので、両者は作りの上で一致する。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from chart import DIFFICULTIES, build_candidates, build_chart, event_order
from score import Score, load_score

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "tools" / "songs.json"
SOURCES = ROOT / "sources" / "mutopia"
OUT = ROOT / "public" / "songs"
FORMAT_VERSION = 2


def ms(seconds: float) -> float:
    return round(seconds, 3)


def song_payload(entry: dict, score: Score) -> dict:
    meta = json.loads((SOURCES / entry["id"] / "meta.json").read_text(encoding="utf-8"))
    events = event_order(score)
    candidates = build_candidates(score)
    charts = {}
    for diff in DIFFICULTIES:
        chart = build_chart(score, diff, candidates)
        charts[diff.name] = {
            "level": chart.level,
            "lanes": diff.lanes,
            "notes": [[ms(n.time), n.lane, ms(n.duration), list(n.links)] for n in chart.notes],
        }
    first_tempo = 60 / (score.tempo.seconds_per_tick(0) * score.tpb)
    duration = max(score.seconds(score.sounding_end(n)) for n in events)
    return {
        "version": FORMAT_VERSION,
        "id": entry["id"],
        "title": entry["title"],
        "titleEn": entry["titleEn"],
        "composer": entry["composer"],
        "composerEn": entry["composerEn"],
        "composerYears": entry["composerYears"],
        "credit": {
            "source": "Mutopia Project",
            "mutopiaId": meta["mutopiaId"],
            "pieceUrl": meta["pieceUrl"],
            "maintainer": meta["maintainer"],
            "edition": meta["edition"],
            "license": meta["license"],
        },
        "bpm": round(first_tempo),
        "duration": ms(duration),
        "bars": [ms(score.seconds(t)) for t in score.bar_lines()],
        "beats": [ms(score.seconds(t)) for t in score.beat_lines()],
        "events": [
            [ms(score.seconds(n.start)), n.pitch, ms(score.seconds(score.sounding_end(n)) - score.seconds(n.start)),
             n.velocity, 0 if n.hand == "R" else 1]
            for n in events
        ],
        "charts": charts,
    }


def main(argv: list[str]) -> int:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    wanted = set(argv)
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for entry in catalog:
        song_dir = SOURCES / entry["id"]
        meta = json.loads((song_dir / "meta.json").read_text(encoding="utf-8"))
        target = OUT / f"{entry['id']}.json"
        if not wanted or entry["id"] in wanted:
            score = load_score(song_dir / meta["files"]["mid"]["name"], song_dir / meta["files"]["ly"]["name"])
            payload = song_payload(entry, score)
            target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        payload = json.loads(target.read_text(encoding="utf-8"))
        levels = {name: c["level"] for name, c in payload["charts"].items()}
        counts = {name: len(c["notes"]) for name, c in payload["charts"].items()}
        index.append({
            key: payload[key]
            for key in ("id", "title", "titleEn", "composer", "composerEn", "composerYears", "bpm", "duration")
        } | {"levels": levels, "noteCounts": counts})
        print(f"{entry['id']:22s} {payload['duration']:6.1f}s  " + "  ".join(f"{k}:Lv{levels[k]}/{counts[k]}" for k in levels))
    (OUT / "index.json").write_text(json.dumps({"version": FORMAT_VERSION, "songs": index}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
