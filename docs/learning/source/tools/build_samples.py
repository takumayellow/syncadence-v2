"""Upright Piano KW (FreePats, CC0) のサンプルをブラウザ用の mp3 に変換する。

使い方: python tools/build_samples.py

- SFZ の region 定義（鍵盤範囲・基準音・ベロシティ層）を読み、public/samples/kw/manifest.json に書く。
- 各 flac をモノラル 44.1 kHz の mp3 にし、最大 MAX_SECONDS 秒で切って末尾をフェードアウトする。
- mp3 のエンコーダ遅延はブラウザ側で立ち上がりを検出して打ち消すので、ここでは無音を削らない。
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "sources" / "samples-cache"
OUT = ROOT / "public" / "samples" / "kw"
REPO_RAW = "https://raw.githubusercontent.com/freepats/upright-piano-KW/master/"
SFZ_NAME = "UprightPianoKW-20220221.sfz"
SAFE_SAMPLE = re.compile(r"^samples/([A-G]#?[0-8]v[HL])\.flac$")
OPCODE = re.compile(r"(\w+)=(\S+)")

MAX_SECONDS = 7.0
FADE_SECONDS = 1.0
BITRATE = "80k"


def fetch(name: str) -> Path:
    target = CACHE / name
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(REPO_RAW + urllib.parse.quote(name), timeout=60) as response:
            target.write_bytes(response.read())
    return target


def parse_sfz(text: str) -> list[dict]:
    regions: list[dict] = []
    layer = None
    current: dict | None = None
    for raw in text.splitlines():
        line = raw.split("//", 1)[0].strip()
        if not line:
            continue
        if line == "<group>":
            current = None
            continue
        if line == "<region>":
            current = {"layer": layer}
            regions.append(current)
            continue
        for key, value in OPCODE.findall(line):
            if key == "hivel" and value == "80":
                layer = "L"
            elif key == "lovel" and value == "81":
                layer = "H"
            elif current is not None and key in ("lokey", "hikey", "pitch_keycenter"):
                current[key] = int(value)
            elif current is not None and key == "key":
                current.update(lokey=int(value), hikey=int(value), pitch_keycenter=int(value))
            elif current is not None and key == "sample":
                current["sample"] = value
    return regions


def transcode(src: Path, dst: Path) -> None:
    fade_start = MAX_SECONDS - FADE_SECONDS
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
            "-ac", "1", "-ar", "44100",
            "-af", f"atrim=0:{MAX_SECONDS},afade=t=out:st={fade_start}:d={FADE_SECONDS}",
            "-c:a", "libmp3lame", "-b:a", BITRATE, str(dst),
        ],
        check=True,
    )


def main() -> int:
    if shutil.which("ffmpeg") is None:
        print("ffmpeg が見つかりません", file=sys.stderr)
        return 1
    sfz = fetch(SFZ_NAME).read_text(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_regions = []
    for region in parse_sfz(sfz):
        match = SAFE_SAMPLE.match(region["sample"])
        if not match or region["layer"] is None:
            raise ValueError(f"unexpected region: {region}")
        stem = match.group(1).replace("#", "s")
        dst = OUT / f"{stem}.mp3"
        if not dst.exists():
            transcode(fetch(region["sample"]), dst)
        manifest_regions.append({
            "file": dst.name,
            "key": region["pitch_keycenter"],
            "lo": region["lokey"],
            "hi": region["hikey"],
            "layer": region["layer"],
        })
    for name in ("LICENSE", "README.md"):
        shutil.copyfile(fetch(name), OUT / name)
    manifest = {
        "name": "Upright Piano KW (2022-02-21)",
        "license": "CC0-1.0",
        "source": "https://github.com/freepats/upright-piano-KW",
        "velocitySplit": 81,
        "regions": sorted(manifest_regions, key=lambda r: (r["layer"], r["lo"])),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    total = sum(p.stat().st_size for p in OUT.glob("*.mp3"))
    print(f"{len(manifest_regions)} regions, {total / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
