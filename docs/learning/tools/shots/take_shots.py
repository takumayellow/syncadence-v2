"""解説に載せるスクリーンショットを撮る。

開発サーバー（npm run dev）を立ててから動かす。

    python docs/learning/tools/shots/take_shots.py http://localhost:5173/

assets/shots/ に select・play・pause・result・approach-fast・approach-slow の 6 枚を webp で書く。
"""

from __future__ import annotations

import io
import json
import random
import sys
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import Page, sync_playwright

OUT = Path(__file__).resolve().parents[2] / "assets" / "shots"
VIEWPORT = {"width": 1280, "height": 800}
# src/game/keys.ts と src/song/types.ts の写し。ゲーム側を変えたらここも合わせる。
LANE_KEYS = {4: ["KeyD", "KeyF", "KeyJ", "KeyK"], 6: ["KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"]}
LANES = {"easy": 4, "normal": 4, "hard": 6, "expert": 6}

# 曲の最初の音を予約した AudioContext の時刻を拾う。曲の 0 秒の時刻はここから逆算できる。
INIT = """
(() => {
  const Orig = window.AudioContext;
  window.__ctxs = [];
  window.AudioContext = class extends Orig {
    constructor(...a) { super(...a); window.__ctxs.push(this); }
  };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when, ...rest) {
    if (window.__firstWhen === undefined) window.__firstWhen = when;
    return start.call(this, when, ...rest);
  };
})();
"""

# 譜面のノーツを、人が叩いたように時刻を揺らして押す。
PLAY_CHART = """
async ({ notes, firstSound, rate, keys, jitter }) => {
  const ctx = window.__ctxs[0];
  const startCtx = window.__firstWhen - firstSound / rate;
  const stamp = ctx.getOutputTimestamp();
  const offset = stamp.performanceTime > 0 && Math.abs(stamp.contextTime - ctx.currentTime) <= 0.5
    ? stamp.contextTime - stamp.performanceTime / 1000
    : ctx.currentTime - (ctx.baseLatency ?? 0) - (ctx.outputLatency ?? 0) - performance.now() / 1000;
  const perfOf = (songTime) => (startCtx + songTime / rate - offset) * 1000;
  const send = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
  notes.forEach(([time, lane, hold], i) => {
    const down = perfOf(time) + jitter[i];
    const up = down + Math.max(hold / rate * 1000, 60);
    setTimeout(() => send("keydown", keys[lane]), down - performance.now());
    setTimeout(() => send("keyup", keys[lane]), up - performance.now());
  });
}
"""


def save(page: Page, name: str) -> None:
    png = page.screenshot()
    Image.open(io.BytesIO(png)).save(OUT / f"{name}.webp", quality=82)
    print("wrote", name)


def open_play(browser, url: str, song: str, difficulty: str, settings: dict) -> Page:
    context = browser.new_context(viewport=VIEWPORT)
    context.add_init_script(INIT)
    stored = {"syncadence.v2.settings": settings, "syncadence.v2.last": {"songId": song, "difficulty": difficulty}}
    context.add_init_script(
        "".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});" for k, v in stored.items())
    )
    page = context.new_page()
    page.goto(url)
    page.wait_for_selector(".play-button")
    return page


def start(page: Page) -> None:
    page.locator(".play-button").click()
    page.wait_for_selector(".overlay.ready", timeout=60000)
    page.keyboard.press("KeyA")
    page.wait_for_selector(".overlay.ready", state="detached")


def shot_select_play_pause(browser, url: str) -> None:
    page = open_play(browser, url, "fur-elise", "hard", {"autoplay": True})
    save(page, "select")
    start(page)
    time.sleep(9)
    save(page, "play")
    page.locator("button[aria-label='一時停止']").click()
    page.wait_for_selector(".overlay.paused")
    time.sleep(0.3)
    save(page, "pause")
    page.context.close()


def shot_approach(browser, url: str) -> None:
    for name, seconds in (("approach-fast", 0.8), ("approach-slow", 3.0)):
        page = open_play(browser, url, "fur-elise", "hard", {"autoplay": True, "approachSeconds": seconds})
        start(page)
        time.sleep(9)
        save(page, name)
        page.context.close()


def shot_result(browser, url: str) -> None:
    song, difficulty = "prelude-op28-4", "easy"
    page = open_play(browser, url, song, difficulty, {"autoplay": False})
    data = page.evaluate(f"fetch('songs/{song}.json').then((r) => r.json())")
    notes = data["charts"][difficulty]["notes"]
    rng = random.Random(7)
    jitter = [rng.gauss(18, 22) for _ in notes]
    start(page)
    page.wait_for_function("window.__firstWhen !== undefined", timeout=10000)
    page.evaluate(
        PLAY_CHART,
        {"notes": notes, "firstSound": data["events"][0][0], "rate": 1, "keys": LANE_KEYS[LANES[difficulty]], "jitter": jitter},
    )
    page.wait_for_selector(".page.result", timeout=int(data["duration"] * 1000) + 60000)
    time.sleep(0.5)
    save(page, "result")
    page.context.close()


def main() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173/"
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        shot_select_play_pause(browser, url)
        shot_approach(browser, url)
        shot_result(browser, url)
        browser.close()


if __name__ == "__main__":
    main()
