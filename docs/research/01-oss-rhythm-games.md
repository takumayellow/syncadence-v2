# 01. 既存・OSS のリズムゲームの調査

時計と同期、入力時刻の取り方、判定幅、譜面形式の 4 点を、ソースコードか公式資料で確かめた。数値と挙動は 2026-10-08 時点の各リポジトリの既定ブランチで確認したもので、出典は各節の末尾に置いた。

## 1. 対象

| ゲーム | 動作環境 | ライセンス | 種類 |
|---|---|---|---|
| osu!(lazer) | デスクトップ / モバイル | MIT | osu!mania が縦スクロール鍵盤型 |
| Etterna | デスクトップ | MIT | StepMania 系の鍵盤型 |
| ITGmania | デスクトップ | GPL-3.0 | StepMania 5 系。ITG 向け |
| StepMania 5 | デスクトップ | ソースは MIT | 上 2 つの元 |
| Quaver | デスクトップ | MPL-2.0 | 縦スクロール鍵盤型 |
| beatoraja | デスクトップ | GPL-3.0 | BMS プレイヤー |
| Phira | デスクトップ / モバイル | GPL-3.0 | Phigros 系 |
| Bemuse | ブラウザ | AGPL-3.0 | BMS プレイヤー |
| Rhythm Plus | ブラウザ | GPL-3.0 | 縦スクロール鍵盤型 |
| sim-phi | ブラウザ | GPL-3.0 | Phigros の譜面シミュレータ |
| taiko-web（フォーク Better-taiko-web） | ブラウザ | 表示なし | 太鼓型 |
| Sonolus の pjsekai / Next SEKAI エンジン | Sonolus 上 | MIT | プロセカ型 |
| Friday Night Funkin' | デスクトップ / ブラウザ | ソースは Apache-2.0（アセットは別） | 4 方向キー |

taiko-web の元のリポジトリ `bui/taiko-web` は、バンダイナムコの要請（2019-01-22, 2020-04-06）を受けて作者が取り下げた。その後の親リポジトリ `caralr/taiko-web` とすべてのフォークは、2023-02-21 の DMCA 通知の対象になっている。ここではフォークの 269Seahorse/Better-taiko-web を見た。

出典:
- https://github.com/ppy/osu/blob/master/LICENCE
- https://github.com/stepmania/stepmania/blob/5_1-new/README.md （"All of our source code is under the MIT license"）
- https://github.com/bemusic/bemuse/blob/master/LICENSE
- https://github.com/henryzt/Rhythm-Plus-Music-Game/blob/master/LICENSE
- https://github.com/exch-bms2/beatoraja/blob/master/LICENSE
- https://github.com/lchzh3473/sim-phi/blob/main/LICENSE.txt
- https://github.com/TeamFlos/phira/blob/main/LICENSE
- https://github.com/FunkinCrew/Funkin/blob/main/LICENSE.md
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/LICENSE.txt
- https://github.com/Next-SEKAI/sonolus-next-sekai-engine/blob/master/LICENSE.txt
- https://github.com/github/dmca/blob/master/2023/02/2023-02-21-bandai.md
- Etterna / ITGmania / Quaver は GitHub API のライセンス判定（spdx）で確認

## 2. 時計と同期

| ゲーム | 曲の時刻の作り方 | オフセット |
|---|---|---|
| osu!lazer | 音源の時計を `InterpolatingFramedClock` で補間し, その上にオフセット用の時計を 3 段重ねる | プラットフォーム → ユーザー全体 → 譜面ごと, の 3 層 |
| Quaver | 毎フレーム経過時間で進め, 音源より遅れたか, 音源より 16 × 再生速度 ms を超えて先行したら音源に戻す（`SmoothAudioTimingGameplay` が ON のとき） | 全体の音 `GlobalAudioOffset`（−500〜500 ms, 既定 0）と映像 `VisualOffset`（既定 0）, 譜面ごとの `LocalOffset` と `OnlineOffset`。再生の開始は出力デバイスの遅れ（`AudioManager.OutputLatency`）の分だけ早める（`ConfigureAudioStart`） |
| Bemuse | `performance` の時刻と `AudioContext.currentTime` の差を毎フレーム記録し, 直近 60 個の平均で補正する | 音と入力 `system.offset.audio-input` と音と映像 `system.offset.audio-visual` の 2 つ（既定 0）。Options の Advanced に Latency の欄（`audio-input` だけを設定し, 0 以上の ms を受け付ける）と Calibrate ボタン（`?mode=sync` を別窓で開く）がある |
| taiko-web 系 | 不明（未確認） | 音の遅れ `latency.audio` と映像の遅れ `latency.video` を別々に持つ（既定 0 ms） |
| ITGmania | エンジンの音楽時刻 | 「Calibrate Audio Sync」画面がオプションにある |

細部:

- osu!lazer の `FramedBeatmapClock` は、`DecouplingFramedClock` → `InterpolatingFramedClock` → プラットフォーム補正 → ユーザー全体の補正 → 譜面ごとの補正、の順に時計を入れ子にしている。プラットフォーム補正は Windows で 15 ms（`WINDOWS_BASE_AUDIO_OFFSET`）、実験的な WASAPI を使うと −25 ms を足して −10 ms、他の OS では 0。合計は `TotalAppliedOffset` として外から読める。
- Quaver の再同期は、ゲーム時刻が音源時刻より遅れたとき、または `音源時刻 + 16 × 再生速度` ms より先に進んだときに起きる。前回の同期から 1000 ms 経ったときも同期する。OFF のときは毎フレーム `Time = Math.Max(Time, Track.Time)`。オフセットは `HitObjectManagerKeys.cs` で `CurrentAudioOffset = Timing.Time + GlobalAudioOffset × Rate − LocalOffset − OnlineOffset`、`CurrentVisualAudioOffset = CurrentAudioOffset + VisualOffset × Rate` として効かせる。
- Bemuse の `clock.js` は冒頭で「Android では `currentTime` が粗い」ことを理由に挙げている。ゲームの開始は次の 1 秒の境目に合わせ、最初の 1 秒は時刻を止まった状態から加速させて通常の速度につなぐ（`game-timer.js`）。

v2 にとっての要点は、音源の時計を直接使わず、補間・平滑化した時計で描画すること（osu!lazer, Quaver, Bemuse に共通）と、音と映像のオフセットを分けること（Quaver, taiko-web 系, Bemuse）の 2 つである。

出典:
- https://github.com/ppy/osu/blob/master/osu.Game/Beatmaps/FramedBeatmapClock.cs
- https://github.com/Quaver/Quaver/blob/develop/Quaver.Shared/Screens/Gameplay/GameplayAudioTiming.cs
- https://github.com/Quaver/Quaver/blob/develop/Quaver.Shared/Screens/Gameplay/Rulesets/Keys/HitObjects/HitObjectManagerKeys.cs
- https://github.com/Quaver/Quaver/blob/develop/Quaver.Shared/Config/ConfigManager.cs
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/game/clock.js
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/game/game-timer.js
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/app/entities/Options.ts
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/app/ui/OptionsAdvanced.tsx
- https://github.com/269Seahorse/Better-taiko-web/blob/master/public/src/js/settings.js
- https://github.com/269Seahorse/Better-taiko-web/blob/master/public/src/js/controller.js
- https://github.com/itgmania/itgmania/blob/release/Docs/Userdocs/beginner.txt （オプション一覧）

## 3. 入力の時刻をどこで取るか

| ゲーム | 判定に使う時刻 |
|---|---|
| ITGmania | 入力が起きた時刻。`Player::Step(..., const RageTimer& tm, ...)` が入力時刻を受け取り, `tm.Ago()` だけ現在の音楽時刻から引いて判定する |
| Bemuse | フレーム更新時のゲーム時刻（`judgeTime(this._gameTime, note.time, ...)`） |
| Rhythm Plus | `Date.now()` と, ノーツ生成時の `Date.now()` の差 |

ITGmania の該当部分（`src/Player.cpp`）:

```cpp
const float fTimeSinceStep = tm.Ago();
fMusicSeconds = fCurrentMusicSeconds - fTimeSinceStep * ...m_fMusicRate;
fNoteOffset = (fStepSeconds - fMusicSeconds) / ...m_fMusicRate;
```

フレーム時刻で判定すると、入力からフレーム処理までの待ち（60 fps なら最大約 16.7 ms）が判定に乗る。ITGmania はこれを入力時刻で取り除いている。

ブラウザの 4 作（Bemuse, Rhythm Plus, Better-taiko-web, sim-phi）のソースを `outputLatency`, `getOutputTimestamp`, `baseLatency`, `timeStamp` で検索した。判定や同期にこれらを使っているものは無かった（`timeStamp` の一致はログや Firestore の型だけ）。出力遅延は手動のオフセットで吸収し、入力時刻はフレーム時刻か `Date.now()` で取っている。

出典:
- https://github.com/itgmania/itgmania/blob/release/src/Player.cpp
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/game/state/player-state.ts
- https://github.com/henryzt/Rhythm-Plus-Music-Game/blob/master/src/javascript/note.js

## 4. 判定幅

値はいずれも片側（±）である。

| ゲーム / 設定 | 1 段目 | 2 段目 | 3 段目 | 4 段目 | 5 段目 | ミス |
|---|---|---|---|---|---|---|
| osu!mania OD0 | 22.5 | 64.5 | 97.5 | 127.5 | 151.5 | 188.5 |
| osu!mania OD5 | 19.5 | 49.5 | 82.5 | 112.5 | 136.5 | 173.5 |
| osu!mania OD10 | 13.5 | 34.5 | 67.5 | 97.5 | 121.5 | 158.5 |
| Etterna Judge 4 | 22.5 | 45 | 90 | 135 | 180 | — |
| StepMania 系エンジンの既定（ITGmania の `TimingWindowSecondsInit`） | 22.5 | 45 | 90 | 135 | 180 | — |
| ITG（Simply Love の ITG モード） | 21.5 | 43 | 102 | 135 | 180 | — |
| Quaver Standard | 18 | 43 | 76 | 106 | 127 | 164 |
| Bemuse（通常） | 20 | 50 | 100 | 200 | — | — |
| pjsekai エンジン（通常タップ） | 約 41.7 | 約 83.3 | 125 | — | — | — |

単位は ms。

補足:

- osu!mania は `Math.Floor(DifficultyRange(OD, min, mid, max)) + 0.5` で計算する。`DifficultyRange` は OD0 / OD5 / OD10 を結ぶ 2 区間の線形補間で、元の範囲は Perfect (22.4, 19.4, 13.9) など。判定は `Math.Abs(timeOffset) <= WindowFor(result)`。Classic mod で ScoreV2 を使わないときは別の式になる。
- Etterna の Judge 1〜4 は倍率 1.0 で、Judge 5 以降は 0.84, 0.66, 0.50, 0.33, 0.20 倍に狭まる。
- Simply Love の ITG モードは各幅に `TimingWindowAdd = 0.0015`（1.5 ms）を足す。FA+ モードは 13.5 / 21.5 / 43 / 102 / 135 ms。
- Bemuse は譜面のレベルが 5 以下（difficulty が 5 以上 = INSANE 以上の譜面を除く）とチュートリアルで広い表を使う（例: レベル 1〜2 の ABSOLUTE_BEGINNER の 1 段目は 24 ms, `judgments.ts` の `getJudgeForNotechart`）。
- pjsekai エンジンは 60 fps のフレーム数で書かれている（2.5 / 5 / 7.5 フレーム）。クリティカルのタップは 3.3 / 4.5 / 7.5 フレーム。Next SEKAI エンジンは perfect / great / good / bad の 4 段で、通常タップは 2.5 / 5 / 6.5 / 7.5 フレーム。

最上位の幅は概ね ±18〜23 ms、最も広い幅（ミス手前）は ±125〜200 ms に集まっている。ブラウザで出力遅延の推定と入力時刻を正しく扱えないと、最上位の幅は取れない。

出典:
- https://github.com/ppy/osu/blob/master/osu.Game.Rulesets.Mania/Scoring/ManiaHitWindows.cs
- https://github.com/ppy/osu/blob/master/osu.Game/Rulesets/Scoring/HitWindows.cs
- https://github.com/etternagame/etterna/blob/master/src/Etterna/Actor/Gameplay/Player.cpp
- https://github.com/etternagame/etterna/blob/master/src/Etterna/Singletons/GameState.h
- https://github.com/itgmania/itgmania/blob/release/src/Player.cpp
- https://github.com/Simply-Love/Simply-Love-SM5/blob/itgmania-release/Scripts/SL_Init.lua
- https://github.com/Quaver/Quaver.API/blob/master/Quaver.API/Maps/Processors/Scoring/JudgementWindows.cs
- https://github.com/Quaver/Quaver/blob/develop/Quaver.Shared/Database/Judgements/JudgementWindowsDatabaseCache.cs
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/game/judgments.ts
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/shared/src/engine/data/windows.ts
- https://github.com/Next-SEKAI/sonolus-next-sekai-engine/blob/master/sekai/lib/buckets.py

## 5. 譜面形式

| 形式 | 時間の表し方 | 備考 |
|---|---|---|
| .osu（osu!） | ノーツは音源先頭からの ms（整数）。テンポは `TimingPoints` に `time, beatLength, meter, ..., uninherited` で持つ | osu!mania のレーンは `floor(x × 列数 / 512)` |
| .sm / .ssc（StepMania 系） | 小節単位。1 小節を 4/8/12/16/24/32/48/64/192 行のいずれかで書き, 小節はカンマで区切る | 1 小節は 4 拍。BPM 変化は別に持つ |
| BMS | `#xxxCH:data`。xxx が小節番号, CH がチャンネル。data の 2 文字ずつが小節を等分した位置になる（`00` は休符） | 各ノーツに音（キー音）を割り当てる |

.osu はノーツを絶対時刻で持ち、拍の情報は TimingPoints から引く。.sm と BMS は小節と細分でノーツの位置を持つので、譜面そのものが拍の格子に乗る。BMS はノーツごとに音を持つので、押した音が曲の一部として鳴る。v1 の `chart.json` は .osu に近い絶対時刻だけの形式で、TimingPoints に当たる情報も持っていなかった（`00-v1-diagnosis.md`）。

出典:
- https://osu.ppy.sh/wiki/en/Client/File_formats/osu_%28file_format%29
- https://github.com/stepmania/stepmania/wiki/sm
- https://hitkey.nekokan.dyndns.info/cmds.htm

## 6. v2 への含意

- 時計: 音の時計を補間・平滑化して描画に使う。大きくずれたときだけ戻す（osu!lazer, Quaver, Bemuse）。
- 入力: ITGmania のように入力が起きた時刻で判定する。ブラウザではイベントの `timeStamp` がこれに当たる（`03-web-audio-timing.md`）。
- オフセット: 音と映像を分ける（taiko-web 系）。osu!lazer のように層を分けて、端末ごとの値と曲ごとの値を混ぜない。
- 判定幅: 最上位 ±20 ms 前後、最も広い幅 ±130〜200 ms を目安にし、易しい難易度は Bemuse のように広げる。
- 譜面形式: 小節と細分で位置を持つ（.sm / BMS 型）。ノーツごとに音を持たせればキー音にできる。
