"""Mutopia Project から MIDI と LilyPond ソースを取得し、パブリックドメインであることを確かめる。

使い方: python tools/fetch_sources.py [--force]

- 取得先は https://www.mutopiaproject.org/ftp/ に固定する。
- .ly のヘッダに `license = "Public Domain"` か `copyright = "Public Domain"` が無い曲は失敗させる。
- 取得物は sources/mutopia/<id>/ に保存し、meta.json に出どころとハッシュを書く。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "tools" / "songs.json"
OUT_DIR = ROOT / "sources" / "mutopia"
BASE_URL = "https://www.mutopiaproject.org/ftp/"

SAFE_PATH = re.compile(r"^[A-Za-z0-9_\-]+(/[A-Za-z0-9_\-]+)*$")
SAFE_ID = re.compile(r"^[a-z0-9\-]+$")
PD_HEADER = re.compile(r'^\s*(license|copyright)\s*=\s*"Public Domain"', re.MULTILINE)
HEADER_FIELD = r'^\s*{name}\s*=\s*"([^"]*)"'


def load_catalog() -> list[dict]:
    songs = json.loads(CATALOG.read_text(encoding="utf-8"))
    for song in songs:
        if not SAFE_ID.match(song["id"]):
            raise ValueError(f"invalid song id: {song['id']!r}")
        if not SAFE_PATH.match(song["path"]):
            raise ValueError(f"invalid mutopia path: {song['path']!r}")
    return songs


def download(url: str) -> bytes:
    if not url.startswith(BASE_URL):
        raise ValueError(f"refusing to fetch outside Mutopia: {url}")
    request = urllib.request.Request(url, headers={"User-Agent": "syncadence-v2 source fetcher"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def header_field(ly_text: str, name: str) -> str | None:
    match = re.search(HEADER_FIELD.format(name=name), ly_text, re.MULTILINE)
    return match.group(1) if match else None


def fetch_song(song: dict, force: bool) -> dict:
    stem = song["path"].rsplit("/", 1)[-1]
    song_dir = OUT_DIR / song["id"]
    song_dir.mkdir(parents=True, exist_ok=True)
    files = {}
    for ext in ("ly", "mid"):
        target = song_dir / f"{stem}.{ext}"
        if force or not target.exists():
            target.write_bytes(download(f"{BASE_URL}{song['path']}/{stem}.{ext}"))
        files[ext] = target

    ly_text = files["ly"].read_text(encoding="utf-8", errors="replace")
    if not PD_HEADER.search(ly_text):
        raise RuntimeError(f"{song['id']}: .ly header does not declare Public Domain")

    meta = {
        "id": song["id"],
        "mutopiaId": song["mutopiaId"],
        "pieceUrl": f"https://www.mutopiaproject.org/cgibin/piece-info.cgi?id={song['mutopiaId']}",
        "license": "Public Domain",
        "maintainer": header_field(ly_text, "maintainer"),
        "edition": header_field(ly_text, "source"),
        "files": {
            ext: {
                "name": path.name,
                "url": f"{BASE_URL}{song['path']}/{path.name}",
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            for ext, path in files.items()
        },
        "verifiedOn": date.today().isoformat(),
    }
    (song_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return meta


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="既存ファイルがあっても取り直す")
    args = parser.parse_args()
    for song in load_catalog():
        meta = fetch_song(song, args.force)
        print(f"{song['id']}: {meta['license']} (maintainer: {meta['maintainer']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
