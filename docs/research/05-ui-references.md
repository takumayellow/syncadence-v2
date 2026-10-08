# 05. 選曲画面とプレイ画面の作り

v2 の画面を作り直すときに参考にした既存のゲームの作りを、ソースコードで確かめた記録。プレイ画面はプロセカ（プロジェクトセカイ）型の奥から手前へ流れるレーンに、選曲画面は osu!lazer・Bemuse・Rhythm Plus・Quaver の選曲画面に合わせた。数値と挙動は 2026-10-08 時点の各リポジトリの既定ブランチで確認した。

プロセカ本体のソースは公開されていないので、プロセカの譜面を遊べるように作られた Sonolus の pjsekai エンジン（MIT）を見た。取り入れたのは配置の比率と動きだけで、画像・フォント・効果音は使っていない。

## 1. プレイ画面: プロセカ（Sonolus pjsekai エンジン）

### 1.1 座標の決め方

レーンは 12 単位の幅で、6 本のレーンがそれぞれ 2 単位を占める。レーンの縦の座標 y は 0 が消失点、1 が判定線で、横の座標は `x = l × y` で決まる（`perspectiveLayout`）。つまりレーンの幅は y に比例して広がる。レーンの奥の端は y = 47/850、手前の端は y = 1176/850 で、手前の端は画面の下より外にある。

画面への写し方は `Initialization.ts` の `preprocess` にある。既定ではステージの縦横比を 16:9 に固定する（`lockStageAspectRatio` の既定が 1）。これを画面の比率に直すと次のようになる（16:9 の画面での値）。

| 項目 | 値 |
|---|---|
| レーンの奥の端 | 画面のいちばん上 |
| 判定線 | 上から 79.1% |
| 判定線でのレーン全体の幅 | 画面の幅の 78.7%。16:9 より横長の画面では、高さの 1.40 倍で止まる |
| ノーツの厚み（判定線の位置） | 画面の高さの 7.4%（画像の余白を含む） |
| 判定線の帯 | ノーツと同じ厚み（`1 ± note.h`） |

### 1.2 ノーツの近づき方

ノーツの y は `1.06 ^ (45 × (p − 1))` で動く（`shared/src/engine/data/note.ts` の `approach`）。p は出てから判定線に着くまでの時間の比で、p = 0 のとき 0.073、p = 1 のとき 1 になる。指数で近づくので、奥ではゆっくり、手前ほど速く見える。

v1 から引き継いだ v2 の透視（`src/render/perspective.ts`）と、レーンの幅の倍率で比べた。u は判定線に着くまでの残り時間の比である。

| u | プロセカ | v2 |
|---|---|---|
| 0 | 1.000 | 1.000 |
| 0.25 | 0.519 | 0.520 |
| 0.5 | 0.270 | 0.280 |
| 0.75 | 0.140 | 0.136 |
| 1 | 0.073 | 0.040 |

奥の端を除けば差は 0.02 以下で、v1 の流れ方はもともとプロセカとほぼ同じだった。

ノーツが出てから判定線に着くまでの時間は、ノーツの速さの設定（1〜12、既定 6）から `lerp(0.35, 4, unlerp(12, 1, 速さ) ^ 1.31)` 秒で決まる。既定の 6 では 2.0 秒になる。

### 1.3 表示の置き場所

| 表示 | 置き場所（16:9） | 動き |
|---|---|---|
| コンボ | レーンの右の外。左から 85.5%、上から 41%、数字の高さは画面の 14%。「COMBO」の文字は数字の上 | 増えるたびに 0.6 倍から元の大きさへ 0.15 秒で戻る |
| 判定 | 中央、上から 61.5%（判定線より画面の 17.6% 上）。高さは画面の 4.75% | 0 から元の大きさへ 0.075 秒で開く |
| スコア | 左上の横長の枠（画面の高さの 37.5% × 7.5%）。値は枠の右寄せ | |
| ライフ | 右上、一時停止の左 | |
| 一時停止 | 右上の角の正方形 | |

画面の端からの余白は高さの 2.5%（`gap = 0.05`、画面の高さが 2 単位）。

### 1.4 タッチの当たり判定

- 横は判定線の位置のレーン幅で決め、ノーツごとに左右へ 0.75 単位（レーン 0.375 本分）広げる（`TapNote.ts` の `leniency`）。
- 縦は上から 42.8% の所から画面の下まで（`lane.ts` の `hitbox`）。

v2 は横を同じく判定線の位置のレーン幅で決め、端のレーンは画面の端まで広げている。縦は画面全体で受け付ける。Rhythm Plus も縦を区切らず、横の位置だけでレーンを決めている（2 節）。

### 1.5 v2 に取り入れたもの

| 項目 | 前の v2 | 今の v2 |
|---|---|---|
| 判定線 | 画面の下から 64〜130 px | 上から 79% |
| 横長の画面でのレーンの幅 | レーン 1 本を高さの 0.3 倍にし、画面の幅の 94% まで | 画面の幅の 79% と高さの 1.4 倍の小さいほう。レーン数によらない |
| 縦長の画面でのレーンの幅 | 画面の幅の 94% | 変えない（プロセカは縦長に対応していない。指で叩けるよう広く取る） |
| ノーツの厚み | 10〜24 px | 画面の高さの 4%（最小 10 px）。レーン幅の 3 割まで |
| 判定線 | 細い線 | 細い線の後ろに、ノーツと同じ厚みの帯 |
| コンボ | レーンの中央の奥 | レーンの右の外。4 桁が入らない縦長の画面では、レーンの中央の奥に薄く出す。増えるたびに弾む |
| 判定 | 判定線の少し上 | 判定線より画面の 17.5% 上。0 から開く |
| スコア | 右上の数字 | 左上の枠に、ランク・点数・ランクの境目の目盛りを付けたゲージ |
| 一時停止と曲名 | 左上 | 右上 |

出典:
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/LICENSE.txt
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/shared/src/engine/data/utils.ts （`perspectiveLayout`）
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/shared/src/engine/data/lane.ts
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/shared/src/engine/data/note.ts
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/shared/src/engine/configuration/options.ts （`noteSpeed`, `lockStageAspectRatio`）
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/shared/src/engine/configuration/ui.ts （判定とコンボの動き）
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/play/src/engine/playData/archetypes/Initialization.ts （画面への写し方、表示の置き場所）
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/play/src/engine/playData/archetypes/Stage.ts （レーンと判定線の描き方）
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/play/src/engine/playData/lane.ts （タッチの当たり判定）
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/play/src/engine/playData/note.ts （ノーツが流れる時間）
- https://github.com/NonSpicyBurrito/sonolus-pjsekai-engine/blob/main/play/src/engine/playData/archetypes/notes/flatNotes/tapNotes/TapNote.ts

## 2. 選曲画面

| ゲーム | 曲と難易度の動かし方 | 決定 | 狭い画面 | その他 |
|---|---|---|---|---|
| osu!lazer | ↑↓ で譜面、←→ で曲のまとまり | Enter。F2 でランダム | — | 選ぶと曲の途中（譜面の指定が無ければ 40% の所）から試聴を繰り返す。並べ替えは作曲者・作譜者・BPM・追加日・難しさ・最後に遊んだ日・長さ・出典・曲名 |
| Bemuse | 曲の一覧と、選んだ曲の詳細の 2 枚 | 選んである難易度をもう一度押すと始まる | 幅 1000 px 以下で一覧と詳細を横に滑らせて切り替える | 試聴あり |
| Rhythm Plus | 一覧 | — | 幅 800 px 以下で一覧を横へずらして隠す | 曲名・作曲者・日付で並べ替え |
| Quaver | 一覧 | 下の帯に ランダム・試聴・開始 | — | 並べ替えは 13 通り |

v2 では次のようにした。

- 広い画面は Bemuse と同じ 2 枚（左に曲の一覧、右に選んだ曲の詳細）。詳細には難易度 4 つのレベル・ノーツ数・ランク、自己ベスト、PLAY を置く。
- 幅 820 px 以下では一覧を 1 列にし、選んだ曲の曲名と難易度と PLAY を画面の下の帯に固定する。親指の届く所で難易度を選んで始められる。
- キーは osu!lazer に合わせて ↑↓ で曲、←→ で難易度、Enter で開始。
- 選んである曲をもう一度押すと始まる（Bemuse と同じ）。
- 設定と遊び方は右から出す引き出しにまとめた。
- 最後に選んだ曲と難易度を覚えておき、次に開いたときに同じ所から始める。
- 試聴とランダムはまだ無い（`docs/design.md` の 9 節）。

出典:
- https://github.com/ppy/osu/blob/master/osu.Game/Input/Bindings/GlobalActionContainer.cs （キー）
- https://github.com/ppy/osu/blob/master/osu.Game/Graphics/Carousel/Carousel.cs （選曲の移動）
- https://github.com/ppy/osu/blob/master/osu.Game/Beatmaps/WorkingBeatmap.cs （試聴の位置）
- https://github.com/ppy/osu/blob/master/osu.Game/Screens/Select/Filter/SortMode.cs （並べ替え）
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/app/ui/MusicSelectScene.tsx （もう一度押すと始まる）
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/app/ui/MusicSelectScene.scss （狭い画面）
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/app/ui/MusicList.tsx
- https://github.com/bemusic/bemuse/blob/master/bemuse/src/app/ui/MusicInfo.tsx
- https://github.com/henryzt/Rhythm-Plus-Music-Game/blob/master/src/routes/SongSelect.vue
- https://github.com/henryzt/Rhythm-Plus-Music-Game/blob/master/src/javascript/gameInstance.js （タッチ）
- https://github.com/Quaver/Quaver/blob/develop/Quaver.Shared/Screens/Selection/UI/FilterPanel/Dropdowns/FilterDropdownSorting.cs
