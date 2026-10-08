# 既存のリズムゲームを遊んで比べる

v2 の設計の参考に、既存のゲームを実際に遊んで手触りを確かめるための手順。調査の結果は `research/01-oss-rhythm-games.md` にある。手早く試すなら Bemuse（ブラウザ）、作り込みを見るなら ITGmania と osu!lazer を勧める。

## 1. Bemuse（ブラウザ, インストール不要）

BMS（キー音付きの譜面）をブラウザで遊べる。v2 と同じくブラウザで動くので、ブラウザでどこまで遅れなく遊べるかの基準になる。

1. https://bemuse.ninja を開いてください。
2. タイトル画面の「Enter Game」を押してください。
3. 曲を選び、難易度を選んで始めてください。
4. 鍵盤の割り当ては曲選択画面のツールバーの「Options」で変えられます。既定はキーボード用の KB モードです。

既定のキー（`bemuse/src/app/entities/Options.ts`）:

| モード | キー |
|---|---|
| 7 鍵（KB） | S D F Space J K L |
| 5 鍵の譜面 | D F Space J K（KB モードは常にスクラッチ無しの扱いで, 5 鍵の譜面は 1 列ずらして 7 鍵の 2〜6 番に置かれる。`packages/bemuse-notechart/src/index.ts` の `_preTransform` と `Options.ts` の `scratchPosition`） |
| BM（スクラッチ付き） | スクラッチ Shift（もう 1 つは A）, 鍵盤 Z S X D C F V |

遅れの調整: Options の Advanced にある Latency の欄で、音と入力のずれを ms で入れられます。隣の「Calibrate」を押すと調整用の画面が別窓で開きます。

## 2. ITGmania（Windows / macOS / Linux）

StepMania 5 系のエンジン。入力が起きた時刻で判定する作り（`research/01-oss-rhythm-games.md` の 3 節）なので、判定の正確さの基準になる。v1.3.0 が最新版である（https://github.com/itgmania/itgmania/releases/tag/v1.3.0 ）。

1. 上のリリースページから OS に合うものを入れ、`Program\ITGmania.exe`（Windows の場合）を起動してください。
2. 同梱の曲は `Songs\StepMania 5` にある 3 曲です。

| 曲 | 作曲 / 譜面 |
|---|---|
| Goin' Under | NegaRen / Fraxtil |
| MechaTribe Assault | Kommisar / Wyde, Jason Felds, Vin.il |
| Springtime | Kommisar / Kommisar, Vin.il |

ITGmania リポジトリの README（Licensing Terms）では、StepMania 5 フォルダの曲は「CC-NC license」とされている。版の指定は無く、リンク先は https://creativecommons.org/ のトップページである。同じ README は、'Club Fantastic' のフォルダの曲は CC ではないとしている（https://github.com/itgmania/itgmania/blob/release/README.md ）。

既定のキー（`src/GameManager.cpp` の `g_AutoKeyMappings_Dance`）:

| 用途 | キー |
|---|---|
| 1P の矢印 | ←↓↑→（カーソルキー） |
| 2P の矢印 | テンキー 4 / 2 / 8 / 6（7 と 9 が左上・右上） |
| メニュー | Delete / Page Down / Home / End |

設定:

- Scroll Lock でオプションのメニューが開きます。
- 「Calibrate Audio Sync」で音のずれを調整できます。
- キーを変えるときは「Config Key/Joy Mappings」を開き、枠を選んで Enter を押してからキーを押してください。最後に「Save To Disk」で保存します。「Clear To Default」で既定に戻ります。（`Docs/Userdocs/beginner.txt`）

曲を足すとき:

- `Songs\<グループ名>\<曲名>\` の形で置いてください（`Songs/instructions.txt`）。別のフォルダを読ませるには `AdditionalSongFoldersWritable` / `AdditionalSongFoldersReadOnly` を使います（`Docs/Userdocs/sm5_migration.md`）。
- 譜面は https://search.stepmaniaonline.net/ や https://zenius-i-vanisher.com/v5.2/simfiles.php で探せます。パックごとのライセンスは確認していないので、遊ぶ範囲にとどめてください。

## 3. osu!lazer（Windows / macOS / Linux）

osu!mania が縦スクロールの鍵盤型。時計の補間とオフセットの層の作り（`research/01-oss-rhythm-games.md` の 2 節）を体感できる。

1. https://github.com/ppy/osu/releases から入れてください。Windows は `install.exe` を実行します（2026.1005.0-lazer で確かめた）。
2. 初回の設定画面の「Obtaining Beatmaps」で「Get recommended beatmaps」を押すと、osu!mania の 3 譜面を含むおすすめの譜面が裏で入ります（`BundledBeatmapDownloader.cs`）。
3. 画面上部のツールバーでモードを osu!mania に切り替え、曲を選んで始めてください。osu! の通常譜面も、既定（Show converted beatmaps が ON）で mania 用に変換されて選べます。
4. それ以上の譜面をゲーム内の一覧から探すには、osu! のアカウントでのサインインが要ります（`osu.Game/Overlays/OnlineOverlay.cs`）。

既定のキー: 4 鍵は D F J K（`VariantMappingGenerator.cs`）。

遅れの調整: Settings の Audio にある Offset Adjustment の「Audio offset」で変えられます。何曲か遊ぶと、直近のプレイから補正値の提案が出ます。Windows では、この値とは別に 15 ms の補正が最初から入っています。

## 4. ほかの候補（任意）

| ゲーム | 版 | 入手先 | 備考 |
|---|---|---|---|
| Etterna | v0.75.1 | https://github.com/etternagame/etterna/releases/tag/v0.75.1 | StepMania 系の鍵盤型 |
| Phira | v0.8.2（2026-07-30） | https://github.com/TeamFlos/phira/releases/tag/v0.8.2 | Phigros 系。Windows 版は zip（`Phira-windows-x86_64-v0.8.2.zip`, 約 43.8 MB）を展開して `phira-main.exe` を起動する。インストーラーは無い |

## 5. 遊ぶときに見るポイント

v2 の設計に持ち帰るため、次の点に注意して遊んでください。

| 観点 | 見ること |
|---|---|
| オフセット | 調整の画面はあるか。音と映像を別々に合わせられるか。調整の前後でどれくらい変わるか |
| 判定の表示 | PERFECT / GREAT などの判定が、打った直後のどこにどう出るか。連続で打っているときに読めるか |
| 早い・遅いの表示 | FAST / SLOW や ms の数値など、ずれの向きが分かる表示があるか。結果画面にずれの分布が出るか |
| スクロール速度 | 速度を変えられるか。速くしたときと遅くしたときで打ちやすさがどう変わるか |
| 譜面と旋律 | ノーツが旋律を追っているか、伴奏やドラムを拾っているか。難易度を下げたときに何が残るか（拍頭か、旋律か） |
| レーンと音高 | 音が上がるときにノーツが右へ動くなど、音高とレーンが対応しているか |
| キー音 | 押したときに音が鳴るか。外したときにその音が抜けるか（Bemuse は BMS なのでキー音がある） |

気付いたことは、ゲーム名・曲名・難易度と一緒にメモしておいてください。
