# 知らない書き方を引く — 文法の索引

コードの横の解説では、TypeScript・React・Python の書き方を、そのファイルで初めて出てくる所で説明しています。ここはその一覧です。名前を押すと、説明している行へ飛びます。

並びは `notes/01-overview` の読む順序で最初に出てくる順です。同じ書き方を別のファイルでも説明しているときは、「ほかに」の後ろに並べています。

## TypeScript・JavaScript の書き方

- import と export — [main.tsx L1](../code/src-main.tsx.html#L1)
- const と let — [main.tsx L5](../code/src-main.tsx.html#L5)（ほかに [session.ts L88](../code/src-game-session.ts.html#L88)、[perspective.ts L1](../code/src-render-perspective.ts.html#L1)）
- 非 null 表明 `!` — [main.tsx L5](../code/src-main.tsx.html#L5)
- 例外を投げる throw — [main.tsx L5](../code/src-main.tsx.html#L5)（ほかに [load.ts L5](../code/src-song-load.ts.html#L5)）
- 分割代入 — [App.tsx L28](../code/src-ui-App.tsx.html#L28)
- アロー関数 — [App.tsx L36](../code/src-ui-App.tsx.html#L36)
- instanceof — [App.tsx L36](../code/src-ui-App.tsx.html#L36)
- 条件演算子 `? :` — [App.tsx L36](../code/src-ui-App.tsx.html#L36)（ほかに [Play.tsx L43](../code/src-ui-Play.tsx.html#L43)、[session.ts L51](../code/src-game-session.ts.html#L51)、[perspective.ts L34](../code/src-render-perspective.ts.html#L34)）
- オプショナルチェーン `?.` と `??` — [App.tsx L41](../code/src-ui-App.tsx.html#L41)
- 厳密な比較 `===` と `!==` — [App.tsx L41](../code/src-ui-App.tsx.html#L41)
- スプレッド構文 `...` — [App.tsx L46](../code/src-ui-App.tsx.html#L46)
- オブジェクトの書き方とプロパティの省略記法 — [App.tsx L46](../code/src-ui-App.tsx.html#L46)（ほかに [perspective.ts L34](../code/src-render-perspective.ts.html#L34)）
- switch による場合分け — [App.tsx L75](../code/src-ui-App.tsx.html#L75)
- テンプレート文字列 — [App.tsx L75](../code/src-ui-App.tsx.html#L75)
- ドキュメントコメント `/** */` — [storage.ts L3](../code/src-storage.ts.html#L3)（ほかに [types.ts L10](../code/src-song-types.ts.html#L10)、[engine.ts L17](../code/src-game-engine.ts.html#L17)）
- typeof — [storage.ts L31](../code/src-storage.ts.html#L31)
- try / catch — [storage.ts L49](../code/src-storage.ts.html#L49)
- 角括弧での項目の読み書き `obj[key]` と `{ [key]: 値 }` — [storage.ts L90](../code/src-storage.ts.html#L90)（ほかに [validate.ts L14](../code/src-song-validate.ts.html#L14)）
- 正規表現 — [storage.ts L106](../code/src-storage.ts.html#L106)（ほかに [validate.ts L1](../code/src-song-validate.ts.html#L1)、[keys.ts L16](../code/src-game-keys.ts.html#L16)）
- async / await と Promise — [load.ts L5](../code/src-song-load.ts.html#L5)
- every — [validate.ts L10](../code/src-song-validate.ts.html#L10)
- 何も返さない関数 `: void` — [validate.ts L14](../code/src-song-validate.ts.html#L14)（ほかに [highway.ts L74](../code/src-render-highway.ts.html#L74)）
- for...of による繰り返し — [validate.ts L23](../code/src-song-validate.ts.html#L23)（ほかに [select.ts L3](../code/src-ui-select.ts.html#L3)、[engine.ts L49](../code/src-game-engine.ts.html#L49)）
- slice — [validate.ts L64](../code/src-song-validate.ts.html#L64)
- 省略できる項目 `?:` — [SongSelect.tsx L27](../code/src-ui-SongSelect.tsx.html#L27)（ほかに [clock.ts L3](../code/src-audio-clock.ts.html#L3)）
- 符号なし右シフト `>>>` — [select.ts L3](../code/src-ui-select.ts.html#L3)
- 作ってすぐ呼ぶ async 関数 — [Play.tsx L43](../code/src-ui-Play.tsx.html#L43)
- `&&` の短絡評価 — [Play.tsx L43](../code/src-ui-Play.tsx.html#L43)（ほかに [sampler.ts L44](../code/src-audio-sampler.ts.html#L44)）
- Map と Set — [Play.tsx L143](../code/src-ui-Play.tsx.html#L143)
- class と constructor — [engine.ts L30](../code/src-game-engine.ts.html#L30)
- Array.from — [engine.ts L49](../code/src-game-engine.ts.html#L49)（ほかに [session.ts L51](../code/src-game-session.ts.html#L51)、[Calibrate.tsx L52](../code/src-ui-Calibrate.tsx.html#L52)）
- map・filter・reduce — [engine.ts L49](../code/src-game-engine.ts.html#L49)
- ゲッター get — [engine.ts L70](../code/src-game-engine.ts.html#L70)
- void 演算子 — [engine.ts L91](../code/src-game-engine.ts.html#L91)
- 引数の既定値 — [session.ts L51](../code/src-game-session.ts.html#L51)（ほかに [highway.ts L74](../code/src-render-highway.ts.html#L74)）
- オブジェクトを返すアロー関数と、欄の省略記法 — [session.ts L51](../code/src-game-session.ts.html#L51)
- sort と比較関数 — [session.ts L51](../code/src-game-session.ts.html#L51)（ほかに [stats.ts L1](../code/src-game-stats.ts.html#L1)）
- forEach — [session.ts L51](../code/src-game-session.ts.html#L51)（ほかに [highway.ts L192](../code/src-render-highway.ts.html#L192)）
- `!= null` — [session.ts L63](../code/src-game-session.ts.html#L63)
- 計算された欄の名前 — [session.ts L75](../code/src-game-session.ts.html#L75)
- while — [session.ts L88](../code/src-game-session.ts.html#L88)
- undefined — [session.ts L88](../code/src-game-session.ts.html#L88)
- forEach の中の return、while の中の continue と break — [session.ts L130](../code/src-game-session.ts.html#L130)
- 数の中の区切り `_` — [judge.ts L16](../code/src-game-judge.ts.html#L16)（ほかに [rank.ts L1](../code/src-game-rank.ts.html#L1)）
- `!` で値が「無い」かを調べる — [context.ts L10](../code/src-audio-context.ts.html#L10)
- Iterable（1 つずつ取り出せるもの） — [sampler.ts L18](../code/src-audio-sampler.ts.html#L18)
- Promise.all（約束をまとめて待つ） — [sampler.ts L18](../code/src-audio-sampler.ts.html#L18)
- べき乗 `**` — [sampler.ts L44](../code/src-audio-sampler.ts.html#L44)
- メソッドの連鎖 — [sampler.ts L44](../code/src-audio-sampler.ts.html#L44)
- find と findIndex — [regions.ts L40](../code/src-audio-regions.ts.html#L40)（ほかに [rank.ts L11](../code/src-game-rank.ts.html#L11)）
- コメント `//` と `/** */` — [perspective.ts L1](../code/src-render-perspective.ts.html#L1)
- Math の関数 — [perspective.ts L34](../code/src-render-perspective.ts.html#L34)
- 文字列の引用符 — [highway.ts L54](../code/src-render-highway.ts.html#L54)
- 剰余 `%` — [highway.ts L54](../code/src-render-highway.ts.html#L54)
- let と for — [highway.ts L87](../code/src-render-highway.ts.html#L87)
- 比較 `===` と論理演算子 — [highway.ts L87](../code/src-render-highway.ts.html#L87)
- for...of と continue — [highway.ts L127](../code/src-render-highway.ts.html#L127)
- String() と padStart — [highway.ts L261](../code/src-render-highway.ts.html#L261)
- `%` と、数をそのまま条件に使う書き方 — [stats.ts L1](../code/src-game-stats.ts.html#L1)
- Number() で文字列を数に直す — [SettingsPanel.tsx L14](../code/src-ui-SettingsPanel.tsx.html#L14)

## TypeScript の型

- 型注釈 `: 型` — [App.tsx L22](../code/src-ui-App.tsx.html#L22)（ほかに [perspective.ts L13](../code/src-render-perspective.ts.html#L13)）
- 型の別名 type と合併型 `|` — [App.tsx L22](../code/src-ui-App.tsx.html#L22)
- ジェネリクス（型引数 `<T>`） — [App.tsx L28](../code/src-ui-App.tsx.html#L28)（ほかに [Play.tsx L24](../code/src-ui-Play.tsx.html#L24)）
- Partial（全部を省略可能にした型） — [App.tsx L46](../code/src-ui-App.tsx.html#L46)
- interface と readonly — [storage.ts L3](../code/src-storage.ts.html#L3)
- 引数と戻り値の型 — [storage.ts L31](../code/src-storage.ts.html#L31)
- 型アサーション `as` — [storage.ts L35](../code/src-storage.ts.html#L35)（ほかに [validate.ts L23](../code/src-song-validate.ts.html#L23)）
- Record 型 — [storage.ts L35](../code/src-storage.ts.html#L35)
- as const と配列の要素の型 — [types.ts L1](../code/src-song-types.ts.html#L1)
- タプル型 — [types.ts L10](../code/src-song-types.ts.html#L10)
- interface の継承 `extends` — [types.ts L42](../code/src-song-types.ts.html#L42)
- 数のリテラル型 — [types.ts L47](../code/src-song-types.ts.html#L47)
- `import type` — [load.ts L1](../code/src-song-load.ts.html#L1)（ほかに [Play.tsx L1](../code/src-ui-Play.tsx.html#L1)、[highway.ts L1](../code/src-render-highway.ts.html#L1)）
- unknown 型 — [load.ts L5](../code/src-song-load.ts.html#L5)
- 型ガード `x is T` — [validate.ts L4](../code/src-song-validate.ts.html#L4)
- 実行時の型の確認 `typeof` と `===` / `!==` — [validate.ts L4](../code/src-song-validate.ts.html#L4)
- 関数の型 — [SongSelect.tsx L8](../code/src-ui-SongSelect.tsx.html#L8)（ほかに [Play.tsx L10](../code/src-ui-Play.tsx.html#L10)、[scheduler.ts L3](../code/src-audio-scheduler.ts.html#L3)）
- kind で見分ける合併型 — [Play.tsx L19](../code/src-ui-Play.tsx.html#L19)
- unknown と instanceof — [Play.tsx L43](../code/src-ui-Play.tsx.html#L43)
- private とコンストラクタ引数のプロパティ — [engine.ts L49](../code/src-game-engine.ts.html#L49)
- Pick — [keys.ts L16](../code/src-game-keys.ts.html#L16)
- その場で書くオブジェクトの型 — [session.ts L163](../code/src-game-session.ts.html#L163)
- function による関数の宣言と戻り値の型 — [perspective.ts L34](../code/src-render-perspective.ts.html#L34)
- ジェネリクスの制約 `extends` と `keyof`、`T[K]` — [SettingsPanel.tsx L11](../code/src-ui-SettingsPanel.tsx.html#L11)

## React（画面の部品）

- JSX — [main.tsx L8](../code/src-main.tsx.html#L8)
- 関数コンポーネントと props — [App.tsx L28](../code/src-ui-App.tsx.html#L28)
- useState — [App.tsx L28](../code/src-ui-App.tsx.html#L28)
- useEffect — [App.tsx L36](../code/src-ui-App.tsx.html#L36)
- useCallback — [App.tsx L46](../code/src-ui-App.tsx.html#L46)
- key（部品の見分け札） — [App.tsx L75](../code/src-ui-App.tsx.html#L75)
- JSX でのイベントの受け取り — [SongSelect.tsx L71](../code/src-ui-SongSelect.tsx.html#L71)
- JSX の中での条件付きの表示 `&&` — [SongSelect.tsx L88](../code/src-ui-SongSelect.tsx.html#L88)
- useRef — [Play.tsx L24](../code/src-ui-Play.tsx.html#L24)
- JSX の中での条件分岐 — [Play.tsx L185](../code/src-ui-Play.tsx.html#L185)
- 制御された入力欄（value と onChange） — [SettingsPanel.tsx L14](../code/src-ui-SettingsPanel.tsx.html#L14)

## ブラウザの機能

- `import.meta.env.BASE_URL` — [load.ts L3](../code/src-song-load.ts.html#L3)
- requestAnimationFrame — [Play.tsx L68](../code/src-ui-Play.tsx.html#L68)
- イベントリスナーの登録と解除 — [Play.tsx L161](../code/src-ui-Play.tsx.html#L161)
- Float32Array — [regions.ts L52](../code/src-audio-regions.ts.html#L52)
- setTimeout と clearTimeout — [Calibrate.tsx L41](../code/src-ui-Calibrate.tsx.html#L41)

## Canvas 2D（絵を描く）

- Canvas 2D — [highway.ts L74](../code/src-render-highway.ts.html#L74)
- Canvas 2D のグラデーションと色の書き方 — [highway.ts L87](../code/src-render-highway.ts.html#L87)
- Canvas 2D の save / restore と影 — [highway.ts L192](../code/src-render-highway.ts.html#L192)
- Canvas 2D の文字 — [highway.ts L192](../code/src-render-highway.ts.html#L192)
- Canvas 2D の globalAlpha と楕円 — [highway.ts L223](../code/src-render-highway.ts.html#L223)
- Canvas 2D の変形 translate と scale — [highway.ts L261](../code/src-render-highway.ts.html#L261)

## Python

- ドキュメント文字列 — [fetch_sources.py L1](../code/tools-fetch_sources.py.html#L1)
- Python の基本（import・def・型注釈・字下げ） — [fetch_sources.py L10](../code/tools-fetch_sources.py.html#L10)
- `from __future__ import annotations` — [fetch_sources.py L10](../code/tools-fetch_sources.py.html#L10)
- パスの組み立て（`Path` と `/`） — [fetch_sources.py L21](../code/tools-fetch_sources.py.html#L21)
- 正規表現と生文字列 `r"…"` — [fetch_sources.py L26](../code/tools-fetch_sources.py.html#L26)
- リストと辞書 — [fetch_sources.py L32](../code/tools-fetch_sources.py.html#L32)
- `raise` による例外 — [fetch_sources.py L32](../code/tools-fetch_sources.py.html#L32)
- f 文字列 — [fetch_sources.py L32](../code/tools-fetch_sources.py.html#L32)
- `not` — [fetch_sources.py L32](../code/tools-fetch_sources.py.html#L32)
- キーワード引数 — [fetch_sources.py L42](../code/tools-fetch_sources.py.html#L42)
- with 文 — [fetch_sources.py L42](../code/tools-fetch_sources.py.html#L42)
- `None` と条件式 `A if 条件 else B` — [fetch_sources.py L50](../code/tools-fetch_sources.py.html#L50)
- 負の添字 — [fetch_sources.py L55](../code/tools-fetch_sources.py.html#L55)
- タプル — [fetch_sources.py L55](../code/tools-fetch_sources.py.html#L55)
- `or` で既定値を入れる — [fetch_sources.py L55](../code/tools-fetch_sources.py.html#L55)（ほかに [score.py L46](../code/tools-score.py.html#L46)）
- 辞書内包表記 — [fetch_sources.py L70](../code/tools-fetch_sources.py.html#L70)
- `if __name__ == "__main__":` — [fetch_sources.py L101](../code/tools-fetch_sources.py.html#L101)
- 取り出さないグループ `(?:…)` — [score.py L21](../code/tools-score.py.html#L21)
- @dataclass — [score.py L26](../code/tools-score.py.html#L26)
- コメント `#` — [score.py L26](../code/tools-score.py.html#L26)
- `in` による所属の判定 — [score.py L42](../code/tools-score.py.html#L42)
- Python の class と self — [score.py L46](../code/tools-score.py.html#L46)
- 数の書き方 `500_000` と `1e6` — [score.py L46](../code/tools-score.py.html#L46)
- 変数への型注釈と、名前の先頭の `_` — [score.py L46](../code/tools-score.py.html#L46)
- enumerate とタプルの分解 — [score.py L46](../code/tools-score.py.html#L46)
- `continue` — [score.py L46](../code/tools-score.py.html#L46)
- 二分探索 `bisect.bisect_right` — [score.py L69](../code/tools-score.py.html#L69)
- リスト内包表記 — [score.py L92](../code/tools-score.py.html#L92)
- 整数の割り算 `//` — [score.py L92](../code/tools-score.py.html#L92)
- `is` — [score.py L104](../code/tools-score.py.html#L104)
- 割り算の余り `%`（負の数のとき） — [score.py L104](../code/tools-score.py.html#L104)
- `while` — [score.py L122](../code/tools-score.py.html#L122)
- 刻み付きの `range` と `.extend` — [score.py L122](../code/tools-score.py.html#L122)
- 使わない変数 `_` — [score.py L153](../code/tools-score.py.html#L153)
- 引数の既定値 — [score.py L168](../code/tools-score.py.html#L168)
- 辞書の安全な取り出し `.setdefault` と `.get` — [score.py L168](../code/tools-score.py.html#L168)
- `.pop(0)` — [score.py L168](../code/tools-score.py.html#L168)
- lambda（名前の無い小さな関数） — [score.py L168](../code/tools-score.py.html#L168)
- 集合とスライス — [score.py L168](../code/tools-score.py.html#L168)
- ジェネレータ式 — [score.py L168](../code/tools-score.py.html#L168)
- `max(…, default=0)` — [score.py L168](../code/tools-score.py.html#L168)
- `elif` — [score.py L168](../code/tools-score.py.html#L168)
- 長さを決めないタプルの型 `tuple[int, ...]` — [chart.py L47](../code/tools-chart.py.html#L47)
- `@property` — [chart.py L47](../code/tools-chart.py.html#L47)
- dataclass の項目の既定値 — [chart.py L74](../code/tools-chart.py.html#L74)
- 物の識別番号 `id(n)` — [chart.py L86](../code/tools-chart.py.html#L86)
- 入れ子のタプルの分解 — [chart.py L86](../code/tools-chart.py.html#L86)
- 基準を指定した最大・最小 — [chart.py L86](../code/tools-chart.py.html#L86)
- `break` — [chart.py L115](../code/tools-chart.py.html#L115)
- リストの連結 — [chart.py L125](../code/tools-chart.py.html#L125)
- 逆向きの range — [chart.py L137](../code/tools-chart.py.html#L137)
- 添字を指定した書き換え — [chart.py L156](../code/tools-chart.py.html#L156)
- 集合の内包表記 — [chart.py L172](../code/tools-chart.py.html#L172)
- 無限大 `float("inf")` — [chart.py L172](../code/tools-chart.py.html#L172)
- `all(…)` と `abs(…)` — [chart.py L205](../code/tools-chart.py.html#L205)
- リストのくり返し `[x] * n` — [chart.py L226](../code/tools-chart.py.html#L226)
- 条件式の連鎖 — [chart.py L226](../code/tools-chart.py.html#L226)
- 集合の書き方 `{lane}` — [chart.py L226](../code/tools-chart.py.html#L226)
- 桁を指定した四捨五入 `round(x, 3)` — [chart.py L266](../code/tools-chart.py.html#L266)
- `int(…)` で整数にする — [chart.py L276](../code/tools-chart.py.html#L276)
- かっこの中の改行 — [chart.py L310](../code/tools-chart.py.html#L310)
- 比較の連鎖 — [chart.py L310](../code/tools-chart.py.html#L310)
- 辞書の合体 `|` — [build_songs.py L72](../code/tools-build_songs.py.html#L72)
- f 文字列の書式指定 — [build_songs.py L72](../code/tools-build_songs.py.html#L72)
- 文字列をつなぐ `join` — [build_songs.py L72](../code/tools-build_songs.py.html#L72)
- コマンドに付けた引数 `sys.argv` — [build_songs.py L97](../code/tools-build_songs.py.html#L97)
- 文字列の分割と空白の除去 — [build_samples.py L43](../code/tools-build_samples.py.html#L43)
- 正規表現で全部探す `findall` — [build_samples.py L43](../code/tools-build_samples.py.html#L43)
- 辞書の書き換え `.update` — [build_samples.py L43](../code/tools-build_samples.py.html#L43)
- 外のプログラムを動かす `subprocess.run` — [build_samples.py L72](../code/tools-build_samples.py.html#L72)
- エラーの出力先 `sys.stderr` — [build_samples.py L85](../code/tools-build_samples.py.html#L85)
- フォルダの中を探す `glob` とファイルの大きさ — [build_samples.py L85](../code/tools-build_samples.py.html#L85)
