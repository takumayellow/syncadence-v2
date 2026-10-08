# 03. ブラウザでの音と入力のタイミング

ブラウザのリズムゲームで、音・描画・入力の 3 つを同じ時間軸に載せる方法をまとめる。仕様と MDN、ブラウザのバグ報告を出典にした。末尾の 7 節が v2 の設計案である。

## 1. ブラウザにある時計

| 時計 | 時間軸 | 性質 |
|---|---|---|
| `AudioContext.currentTime` | 音声コンテキストの時刻（秒） | 実行中は 1 render quantum（既定 128 フレーム）ずつ等間隔に進む。スケジュール時刻はすべてこの時刻を基準にする |
| `performance.now()` | time origin からの経過（ms） | 高分解能時刻 |
| `Event.timeStamp` | `performance.now()` と同じ | 入力イベントが起きた時刻。`KeyboardEvent`, `PointerEvent` も `Event` を継承して持つ |
| `requestAnimationFrame` の引数 | `performance.now()` と同じ | 前フレームの描画が終わった時刻。`performance.now()` の値とは一致しない |

`Event.timeStamp` は DOM 仕様で「relative high resolution coarse time」とされ、粗くされている。HR-Time 仕様は、時刻を 100 µs 以上（cross-origin isolated なら 5 µs 以上）に粗くするよう求めている。MDN の記載ではブラウザごとに Chrome 0.1 ms、Safari 1 ms、Firefox 1 ms（Firefox の resistFingerprinting 有効時は 16.667 ms）。判定幅（最上位 ±20 ms 前後, `01-oss-rhythm-games.md`）に対して、通常は問題にならない粗さである。

出典:
- https://webaudio.github.io/web-audio-api/ （currentTime と render quantum）
- https://dom.spec.whatwg.org/ （Event の timeStamp）
- https://www.w3.org/TR/hr-time-3/
- https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp
- https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
- https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

## 2. 音を鳴らす

`AudioBufferSourceNode.start(when)` の `when` は `currentTime` と同じ座標の秒数で、0 か省略なら即時、負の値は RangeError になる。Web Audio の時計で少し先まで予約しておけば、JavaScript のタイマーの揺れに左右されずに音を並べられる（Chris Wilson「A tale of two clocks」）。

楽譜から音を合成する v2 では、ノーツ（キー音）と伴奏の各音を `start(T0 + 楽譜上の時刻)` で予約する。`T0` は曲の 0 秒に当たるコンテキスト時刻である。1 曲分を一度に予約するとノード数が増えるので、数秒先までを順に予約する。

出典:
- https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start
- https://web.dev/articles/audio-scheduling

## 3. 出力の遅れと `getOutputTimestamp()`

`currentTime` は音声グラフが処理している時刻であり、スピーカーから音が出る時刻ではない。差を埋める API は 3 つある。

| API | 内容（仕様） | 対応（MDN の互換表） |
|---|---|---|
| `getOutputTimestamp()` | `contextTime`: 出力デバイスがいま鳴らしているサンプルの時刻（`currentTime` と同じ座標）。`performanceTime`: そのサンプルが鳴った時刻の推定（`performance.now()` と同じ時間軸） | Chrome 57, Firefox 70, Safari 14.1 |
| `outputLatency` | UA が音声サブシステムにバッファを渡してから, 出力デバイスが先頭サンプルを処理するまでの推定秒数。実行中に変わり得る | Chrome 102, Firefox 70, Safari 18.4 |
| `baseLatency` | AudioContext が destination から音声サブシステムへ渡すまでの処理遅延（グラフ自体の遅延は含まない） | Chrome 58, Firefox 70, Safari 14.1 |

`getOutputTimestamp()` があれば、任意の `performance.now()` 時刻 P を曲の時刻に直せる。

```
songTime(P) = ts.contextTime + (P − ts.performanceTime) / 1000 − T0
```

既知の問題:

- WebKit Bug 264247「getOutputTimestamp() seems to use wrong time scale」。値がサンプルレートで余計に割られていた。2024-02-23 に修正（275237@main, コミット 33172dfe163a。`AudioDestinationResampler.cpp` の `Seconds { sampleTime / sampleRate() }` を `Seconds { sampleTime }` に変えた）。この修正は Safari Technology Preview 191 と Safari 18 のブランチ（safari-7619-branch）に入っており、Safari 17.4〜17.6 のブランチ（safari-7618.1.15.14 / 7618.2.12.13 / 7618.3.11）には無い。Safari 17 までは不具合が残る。
- Apple Developer Forums には、iOS 15.1 で `contextTime` が `currentTime` のおよそ 1/10000 になる報告がある（`currentTime` 28.865 に対し `contextTime` 0.001）。
- WebKit Bug 232728: Safari 15 で Bluetooth 接続時やサンプルレート変更時に `currentTime` が実時間より速く進んだ（`performanceTime` は正常）。修正済み。
- `outputLatency` の値は、Chrome の Intent to Ship によればプラットフォームのコールバックのバッファサイズで、プラットフォーム依存である。Firefox の実装者 Paul Adenot（Mozilla）の 2019-07-23 の記事によれば、Windows 10 の機種（Dell XPS15）で WASAPI の `IAudioClient::GetStreamLatency` が常に 0 を返し、対処するまで `outputLatency` は不正確になる。同記事は、Firefox は音声コールバックの中で直接処理するので `baseLatency` が常に 0 だとも書いている。Bluetooth などの遅れを正しく含む保証は無い。

このため、`getOutputTimestamp()` の値は検査してから使い、怪しければ `currentTime − baseLatency − outputLatency` に落とす。最後はユーザーの較正（5 節）で残りを吸収する。

出典:
- https://webaudio.github.io/web-audio-api/
- https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/AudioContext.json
- https://bugs.webkit.org/show_bug.cgi?id=264247
- https://github.com/WebKit/WebKit/commit/33172dfe163a
- https://webkit.org/blog/15243/release-notes-for-safari-technology-preview-191/
- https://developer.apple.com/forums/thread/696356
- https://bugs.webkit.org/show_bug.cgi?id=232728
- https://groups.google.com/a/chromium.org/g/blink-dev/c/dTQniJNVVMY
- https://blog.paul.cx/post/audio-video-synchronization-with-the-web-audio-api/

## 4. 入力の判定

`keydown` や `pointerdown` のハンドラが動くのは、イベントが起きてから少し後である。ハンドラ内で `currentTime` や `performance.now()` を読むと、その待ちが判定に乗る。`event.timeStamp` は `performance.now()` と同じ時間軸なので、3 節の式にそのまま入れられる。

```
判定のずれ = songTime(event.timeStamp) − ノーツの時刻
```

これは ITGmania が入力時刻（`RageTimer`）で判定しているのと同じ考え方である。調べたブラウザのリズムゲーム 4 作は、どれも `event.timeStamp` を使わず、フレーム時刻か `Date.now()` で判定していた（`01-oss-rhythm-games.md` の 3 節）。

## 5. 描画とオフセット

- 描画は `requestAnimationFrame` の中で、その時点の曲時刻からノーツの位置を計算する。前フレームからの差分で位置を進めると、誤差が積もる。
- 曲時刻は 3 節の写像に平滑化を掛けてから使う。既存のゲームでも、osu!lazer は `InterpolatingFramedClock` で補間し、Quaver は音源より遅れたか 16 ms（× 再生速度）を超えて先行したときだけ音源に戻し、Bemuse は直近 60 フレームの平均で補正している（`01-oss-rhythm-games.md` の 2 節）。
- オフセットは音と映像で分ける（taiko-web 系の `latency.audio` / `latency.video`, Bemuse の `audio-input` / `audio-visual`, Quaver の `GlobalAudioOffset` / `VisualOffset`）。音のオフセットは判定に、映像のオフセットは描画位置にだけ効かせる。
- 較正は、一定間隔のクリック音に合わせて何度かタップしてもらい、ずれの中央値を音のオフセットにする。中央値なら打ち損じの外れ値に強い。

v1 は PR #37 でタップ較正を入れた。Issue #35 の追記によると、音の 150 ms 後に打つ人を模擬した試験で、調整前は MISS 39、測定値は −162 ms、調整後は PERFECT 39 / MISS 0 だった。端末の出力遅延は Bluetooth で 100〜300 ms あると書かれている。

## 6. iOS とブラウザの制限

- 自動再生の制限: Chrome では、ユーザー操作の前に作った AudioContext は "suspended" で始まり、操作の後に `resume()` が要る。仕様上も、UA は "running" への最初の遷移を拒んでよく、sticky activation があるときに許可する。
- 状態: `AudioContextState` は "suspended" / "running" / "closed" / "interrupted"。"interrupted" は Safari 9 と Chrome 136 が対応し、Firefox は未対応（MDN の互換表）。電話の着信などで止まったら、再開の操作を求めて `resume()` する。
- マナースイッチ: iOS の既定（ambient）では、マナーモード中に Web Audio が鳴らない（WebKit Bug 237322）。同バグに WebKit の開発者が 2024-09-25 に「Since iOS 17, you can set the audio session type to "playback"」とコメントしている。`navigator.audioSession` は Safari 16.4 から対応し、Chrome は未対応、Firefox はプレビュー版のみ。Audio Session 仕様（Editor's Draft）は "playback" を動画・音楽向けの型と定義しているが、マナースイッチには触れていない。

出典:
- https://developer.chrome.com/blog/autoplay
- https://webaudio.github.io/web-audio-api/
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BaseAudioContext.json
- https://bugs.webkit.org/show_bug.cgi?id=237322
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json
- https://w3c.github.io/audio-session/

## 7. v2 の設計案

数値の閾値（0.5 s, 1 s, 30〜50 ms）は出典のある値ではなく、初期値として置いたものである。実機で調整する。

1. 開始ボタンの操作の中で AudioContext を作るか `resume()` する。iOS では先に `navigator.audioSession.type = 'playback'` を設定する（対応していれば）。
2. `T0 = currentTime + 準備時間` を決め、楽譜の音を数秒先まで `start(T0 + t)` で予約し続ける。
3. 毎フレーム `getOutputTimestamp()` を読み、`|contextTime − currentTime| > 0.5 s` の値は捨てる（3 節の WebKit の不具合への備え）。使えないときは `currentTime − baseLatency − outputLatency` と、そのときの `performance.now()` を組にする。
4. 組から求めた「`performance.now()` → 曲時刻」の差を約 1 秒かけて平滑化する。誤差が 30〜50 ms を超えたときだけ即座に合わせ直す。
5. 判定は `songTime(event.timeStamp) − 音のオフセット` で行う。
6. 描画は rAF の中で `songTime(rAF の時刻) − 映像のオフセット` からノーツ位置を計算する。
7. タップ較正で音のオフセットを、目視の較正で映像のオフセットを決め、端末ごとに保存する。曲ごとのオフセットは持たない（楽譜から音を作るので、曲ごとのずれは生じない）。
