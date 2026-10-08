---
src: src/storage.ts
commit: eb9c698
scope: 全文
lines: 119
---

設定・自己ベスト・最後に選んだ曲と難易度を、ブラウザの中の小さな保存場所（`localStorage`）に書き込み、次に開いたときに読み戻すファイルです。読み戻した値は型と範囲を 1 つずつ確かめ、壊れていれば既定値に戻します。

## このファイルが担うもの

- 設定の形（`Settings`、L3-15）と既定値（`DEFAULT_SETTINGS`、L17-25）を決める。ゲームのどこで設定を使うときも、この形を参照します。
- 3 種類のデータの読み書き。

  | データ | 保存のキー | 読む | 書く |
  |---|---|---|---|
  | 設定 | `syncadence.v2.settings` | `loadSettings`（L66） | `saveSettings`（L70） |
  | 自己ベスト | `syncadence.v2.best` | `loadBest`（L80） | `recordBest`（L91） |
  | 最後に選んだ曲と難易度 | `syncadence.v2.last` | `loadSelection`（L113） | `saveSelection`（L117） |

- 読み戻した値の検査（`sanitizeSettings`、`loadBest` の中、`sanitizeSelection`）。`localStorage` の中身は利用者が開発者ツールで書き換えられますし、古い版のゲームが別の形で保存したものが残っているかもしれません。そのまま使わず、1 項目ずつ確かめます。
- 保存できない環境（プライベートモードなど）でも、例外を出さずに動き続ける（L49-64）。

## 呼ぶ・呼ばれる

| 向き | 相手 | 何のために |
|---|---|---|
| 呼ばれる | `src/ui/App.tsx`（L31-33、L45、L55、L65-67） | 起動時の読み込みと、変わるたびの保存 |
| 型を貸す | `src/ui/SongSelect.tsx`、`src/ui/Play.tsx`、`src/ui/Result.tsx`、`src/ui/Calibrate.tsx`、`src/ui/SettingsPanel.tsx`、`src/game/engine.ts` | `Settings` の形 |
| 呼ばれる | `src/ui/SongSelect.tsx` の L69・L95・L134 | `bestKey` で自己ベストの表を引く |
| 呼ぶ | `src/song/types.ts` の `DIFFICULTIES` | 難易度として正しい文字列かを確かめる |
| 呼ぶ | ブラウザの `window.localStorage`、`JSON` | 文字列としての保存と、文字列とデータの変換 |
| 試される | `src/storage.test.ts`（解説キット外） | 保存して読み戻せるか、壊れた JSON や `localStorage` の例外で既定値になるか |

## このファイルで初めて出てくる文法

- L3 `export interface Settings { readonly approachSeconds: number; … }` — interface と readonly
- L4 `/** … */` — ドキュメントコメント
- L31 `function clamp(value: unknown, …): number` — 引数と戻り値の型
- L32 `typeof value === "number"` — 値の種類を調べる `typeof`
- L36 `raw as Record<string, unknown>` — 型の言い張り `as` と Record 型
- L50-55 `try { … } catch { … }` — 例外の受け止め
- L74 `Readonly<Record<string, number>>` — 項目を書き換えられない型
- L85 `(entry): entry is [string, number] =>` — 型ガード（文法の索引の『型ガード `x is T`』）とタプル型（『タプル型』）
- L92-93 `best[key]`、`{ ...best, [key]: score }` — 角括弧での項目の読み書き
- L108 `/^[a-z0-9-]{1,64}$/.test(…)` — 正規表現

## 読みどころ

- `sanitizeSettings`（L35-47）。1 項目ずつ「種類が合っているか」「範囲に収まっているか」を確かめ、外れたら既定値にする。この範囲が、設定の画面で選べる範囲の元になっています。
- `read` / `write`（L49-64）。`localStorage` と JSON の失敗をすべてここで受け止め、ほかの関数は失敗を気にせずに済む。
- `recordBest`（L91-96）。前より高いときだけ新しい表を作って保存し、それ以外は元の表をそのまま返す。

## 落とし穴

- **範囲の数値が複数のファイルに書いてあります。** 補正の範囲 ±300 ms は L40-41 のほかに、`src/ui/SettingsPanel.tsx` の L49-53・L61-65、`src/ui/Result.tsx` の L74、`src/ui/Calibrate.tsx` の L115 にも別々に書かれています。範囲を変えるときは全部を直す必要があります。
- **曲 ID の形の決まり（L108）は `src/song/validate.ts` の L3 `SONG_ID` と同じ正規表現を書き写したものです。** 片方だけ変えると、保存した曲 ID が読み戻せなくなるか、一覧に無い形の ID を受け付けることになります。

---

@@ 1-2

`DIFFICULTIES` は 4 つの難易度の名前を並べた配列 `["easy", "normal", "hard", "expert"]`、`Difficulty` はそのどれか 1 つの文字列という型です（`src/song/types.ts` の L1-2）。L109 で、読み戻した難易度が正しい名前かを確かめるのに使います。

@@ 3-16

> **文法: interface と readonly**
>
> `interface 名前 { 項目: 型; … }` は、オブジェクトの形（どんな名前の項目を持ち、それぞれがどんな種類の値か）に名前を付ける書き方です。`src/ui/App.tsx` の L22 の `type 名前 = { … }` とほぼ同じことができます。このコードでは、オブジェクトの形には主に `interface`、合併型 `|` などそれ以外には `type` を使っています。
>
> ```ts
> interface Settings {
>   readonly approachSeconds: number;   // 数の項目
>   readonly keysound: boolean;         // 真偽の項目
> }
> ```
>
> 項目の前の `readonly` は「作ったあとで書き換えない」という印です。`settings.volume = 0.5;` と書くと型の検査でエラーになります。値を変えたいときは、スプレッド構文（文法の索引の『スプレッド構文 `...`』）で新しいオブジェクトを作ります（`src/ui/SettingsPanel.tsx` の L12）。
>
> `readonly` も型と同じく、TypeScript が書いた時点で確かめるだけの印で、実行中に書き換えを止める仕組みではありません。
>
> `interface B extends A { … }` と書くと、A の項目をすべて持ったうえで項目を足した形になります（`src/song/types.ts` の L43）。

> **文法: ドキュメントコメント `/** */`**
>
> `//` から行末までと、`/*` から `*/` までは、実行に関係しないコメントです。`/**` で始めたコメントを項目や関数の直前に置くと、エディタ（VS Code など）がその説明を覚えていて、別のファイルでその名前にマウスを乗せたときに表示してくれます。ここでは `Settings` の各項目の意味を書くのに使っています。

設定の 7 項目と、ゲームの中での効き方です。

| 項目 | 単位 | 効く場所 | 意味 |
|---|---|---|---|
| `approachSeconds` | 秒 | `src/render/highway.ts`、`src/game/engine.ts` の L88・L206 | ノーツが奥に現れてから判定線に届くまでの時間。小さいほど速く流れる |
| `inputOffsetMs` | ミリ秒 | `src/game/engine.ts` の L124 | 押した時刻から差し引いてから判定する。正なら、遅めに押しても合う |
| `visualOffsetMs` | ミリ秒 | `src/game/engine.ts` の L204 | 描画に使う曲の位置から差し引く。正なら、ノーツが遅れて判定線に届く |
| `keysound` | — | `src/game/engine.ts` の L59-63、L129-134 | オンにすると、ノーツに結び付いた音を自動では鳴らさず、叩けたときだけ鳴らす |
| `volume` | 0〜1 | `src/game/engine.ts` の L57 | 音量 |
| `rate` | 倍 | `src/game/engine.ts`、`src/game/session.ts` など | 再生の速さ。0.5 なら半分の速さ |
| `autoplay` | — | `src/game/engine.ts` ほか | ゲームが自分で叩く見本。自己ベストに残さない |

`volume`・`rate`・`autoplay` にはコメントがありません。

2 つの補正は、ブラウザが教えてくれない遅れ（OS の音の処理や Bluetooth イヤホンなど）と、その人の押す癖を利用者が埋めるためのものです（`docs/design.md` の 5.4 節）。入力の補正は `src/ui/Calibrate.tsx` で測って入れることもできます。

@@ 17-30

`DEFAULT_SETTINGS` は、何も保存されていないときや、保存された値が壊れていたときに使う設定です。`: Settings` と型を書いているので、項目が 1 つでも足りなかったり、名前を打ち間違えたりすると、型の検査でエラーになります。

| 項目 | 既定値 |
|---|---|
| ノーツの速さ | 1.6 秒で判定線に届く |
| 2 つの補正 | 0 ms |
| キー音 | オフ（曲の音はすべて自動で鳴る） |
| 音量 | 0.8 |
| 速さ | 1（もとの速さ） |
| オートプレイ | オフ |

L27-29 は `localStorage` に保存するときの名前（キー）です。`localStorage` は同じサイトのすべてのページで共有されるので、ほかのプログラムの保存と混ざらないよう、ゲーム名と版（`v2`）を頭に付けています。

@@ 31-34

> **文法: 引数と戻り値の型**
>
> 関数の引数にも `名前: 型` で型を書きます。`)` の後ろの `: number` は「この関数は数を返す」という戻り値の型です。`: void` は「何も返さない」です（L58）。
>
> L31 の `value: unknown` の `unknown` は「何の値か分からない」型です（`src/ui/App.tsx` の『instanceof』の囲み）。確かめるまでは数として計算することも、項目を読むこともできません。

> **文法: typeof**
>
> `typeof 値` は、その値の種類を `"number"`、`"string"`、`"boolean"`、`"object"`、`"undefined"`、`"function"` などの文字列で返します。`typeof value === "number"` は「`value` は数か」です。TypeScript はこの比較を見て、`&&` の右側では `value` を数として扱わせてくれます（型の絞り込み）。
>
> `A && B` は「A が偽ならそこで偽、A が真なら B の結果」です。左が偽なら右は実行されないので、左で種類を確かめてから右でその種類として使う、という書き方ができます。`||` は逆に「A が真ならそこで真、偽なら B」です。
>
> `typeof null` は歴史的な事情で `"object"` になります。そのため L36 では `typeof raw === "object" && raw !== null` と 2 つ並べて、本物のオブジェクトだけを通しています。

`clamp(value, lo, hi, fallback)` は「`value` が普通の数なら `lo` 以上 `hi` 以下に収めて返す。数でなければ `fallback` を返す」関数です。L32 の式を評価の順に分けると次のとおりです。

1. `typeof value === "number"` — 数か。文字列の `"1.6"` や `null` はここで落ちる
2. `Number.isFinite(value)` — 普通の数か。JavaScript の数には「数ではない」を表す `NaN` と、無限大 `Infinity` があり、どちらも `typeof` では `"number"` になる。`Number.isFinite` は両方とも偽にする
3. 両方真なら `Math.min(hi, Math.max(lo, value))` — まず `lo` より小さければ `lo` に引き上げ、次に `hi` より大きければ `hi` に引き下げる
4. どちらかが偽なら `fallback`

たとえば `clamp(9, 0.6, 4, 1.6)` は 4、`clamp("x", 0.6, 4, 1.6)` は 1.6 です。

@@ 35-48

> **文法: 型の言い張り as**
>
> `値 as 型` は、TypeScript に「この値はこの型だとみなして」と言い張る書き方です。実行時には何もしません。確かめずに言い張るので、間違っていれば後で壊れます。ここでは直前の `typeof raw === "object" && raw !== null` で「オブジェクトである」ことまでは確かめたうえで、項目を読めるようにするために使っています。

> **文法: Record 型**
>
> `Record<キーの型, 値の型>` は「キーが キーの型、値が 値の型 の項目を、いくつでも持つオブジェクト」という型です。`Record<string, unknown>` は「どんな名前の項目でも読んでよいが、その中身は分からない」という意味になります。
>
> キーの型に合併型を渡すと、その全部をキーに持つ型になります。`Record<Difficulty, number>` は `easy`・`normal`・`hard`・`expert` の 4 つの項目をすべて持ち、どれも数です（`src/song/types.ts` の L44）。
>
> `Readonly<型>` で包むと、その全項目に `readonly` を付けた型になります（L74）。

`sanitizeSettings(raw)` は、`localStorage` から読み戻した何か分からない値 `raw` から、正しい形の設定を作り直す関数です。

L36 で、`raw` がオブジェクトならそれを、そうでなければ（`null`、数、文字列、壊れた JSON から `read` が返した `null` など）空のオブジェクト `{}` を `obj` にします。空のオブジェクトから項目を読むと `undefined` が返り、L39-45 ですべて既定値になります。

L37 の `d` は `DEFAULT_SETTINGS` の短い別名です。

L38-46 は、7 項目を 1 つずつ確かめて新しいオブジェクトを作って返します。

| 項目 | 確かめ方 | 許す範囲 |
|---|---|---|
| `approachSeconds` | `clamp` | 0.6〜4 秒 |
| `inputOffsetMs`・`visualOffsetMs` | `clamp` | −300〜+300 ms |
| `keysound`・`autoplay` | `typeof … === "boolean"`（条件演算子、文法の索引の『条件演算子 `? :`』） | 真か偽 |
| `volume` | `clamp` | 0〜1 |
| `rate` | `clamp` | 0.5〜1 |

範囲の外の値は、既定値ではなく**範囲の端**に寄せます。`approachSeconds` が 10 なら 4 になります。種類が違う（数でない）ときだけ既定値です。

`obj` に余分な項目があっても、新しいオブジェクトには入りません。この関数が返すのは、L39-45 に書いた 7 項目だけです。

@@ 49-65

> **文法: try / catch**
>
> ```ts
> try {
>   失敗するかもしれない処理
> } catch {
>   失敗したときの処理
> }
> ```
>
> `try { }` の中で例外が投げられると（`src/main.tsx` の『例外を投げる throw』）、そこで中の処理をやめて `catch { }` へ飛びます。例外は外へ伝わらず、ここで受け止めたことになります。何も起きなければ `catch` の中は実行されません。
>
> 投げられたエラーを使いたいときは `catch (e) { … }` と名前を付けて受け取ります。ここでは中身を使わないので、`catch {` と名前を省いています。

`read(key)` は、保存された文字列を読んでデータに戻します。

1. `window.localStorage.getItem(key)` — キーで保存された文字列を読む。無ければ `null`
2. `text ? JSON.parse(text) : null` — 文字列があれば（空文字でも `null` でもなければ）、`JSON.parse` でデータに戻す。無ければ `null`
3. どこかで例外が出たら `null`

`localStorage` は、ブラウザがサイトごとに用意する小さな保存場所で、ページを閉じても消えません。ただし**文字列しか保存できない**ので、オブジェクトは JSON という文字列の形式に直して保存します。`JSON.stringify({ volume: 0.8 })` は文字列 `'{"volume":0.8}'` を、`JSON.parse` はその逆を返します。

ここで受け止める例外は 2 種類です。

- 保存場所が使えない環境では、`localStorage` を触っただけで例外になることがある（L62 のコメントのプライベートモードなど）
- 保存された文字列が JSON として壊れていると、`JSON.parse` が例外を出す

`write(key, value)` は逆に、`JSON.stringify` で文字列にして `setItem` で保存します。保存場所が満杯のときや使えないときは例外になりますが、受け止めて何もしません。コメント（L62）のとおり、保存できなくても、画面に出ている間は `App` が値を持っているので、その回のプレイの間は設定が効きます。

`read` が返す型が `unknown` なのは、保存された中身が何かは読むまで分からないからです。呼び出し側はかならず確かめてから使うことになります（L67、L81-82、L114）。

@@ 66-73

`loadSettings` は「読んで、確かめて、返す」を 1 行にしたものです。何も保存されていなければ `read` が `null` を返し、`sanitizeSettings(null)` は既定値と同じ設定を返します。

`saveSettings` は設定の全体を保存します。呼ぶのは `src/ui/App.tsx` の L55 だけで、設定が変わるたびに呼ばれます。

@@ 74-79

`BestScores` は自己ベストの表の型で、「キーが文字列、値が数」の項目をいくつでも持つ、書き換えないオブジェクトです（L35-48 の『Record 型』の囲み）。

表のキーは `bestKey(songId, difficulty)` で作ります。テンプレート文字列（文法の索引の『テンプレート文字列』）で曲 ID と難易度を `:` でつなぐので、`bestKey("fur-elise", "hard")` は `"fur-elise:hard"` です。曲と難易度の組ごとに 1 つのスコアを持ちます。

実際の表は、たとえば次のような形です。

```json
{ "fur-elise:hard": 912345, "clair-de-lune:easy": 998000 }
```

@@ 80-89

`loadBest` は、保存された自己ベストの表を読み、正しい項目だけを残した新しい表を返します。

L82 で、オブジェクトでなければ（何も保存されていない場合を含む）空の表 `{}` を返します。

L83-87 は内側から評価します。

1. `Object.entries(raw)` — オブジェクトを「`[キー, 値]` の 2 つ組の配列」に変える。`{ a: 1, b: "x" }` なら `[["a", 1], ["b", "x"]]`
2. `.filter(関数)` — 関数が真を返した要素だけを残した新しい配列を作る（文法の索引の『map・filter・reduce』）。ここでは「値（`entry[1]`、2 つ組の 2 番目）が普通の数」の組だけを残す
3. `Object.fromEntries(…)` — 2 つ組の配列をオブジェクトに戻す

L85 の `(entry): entry is [string, number] =>` は、`filter` に渡す関数の戻り値の型に `entry is [string, number]` と書いたものです。「この関数が真を返したら、`entry` は『文字列と数の 2 つ組』だ」と TypeScript に教える書き方で（文法の索引の『型ガード `x is T`』）、これによって `filter` の結果が「文字列と数の 2 つ組の配列」として扱われ、L83 の戻り値が `BestScores` の形に合うようになります。`[string, number]` は「1 番目が文字列、2 番目が数の、長さ 2 の配列」という型です（文法の索引の『タプル型』）。

キーのほうは確かめていないので、`"abc"` のような、曲と難易度の形になっていないキーも残ります。表を引くときは `bestKey` で作ったキーしか使わないので、余分なキーは読まれないだけです。

@@ 90-97

> **文法: 角括弧での項目の読み書き `obj[key]` と `{ [key]: 値 }`**
>
> オブジェクトの項目は `best.foo` のように `.` で読めますが、項目の名前が変数に入っているときは `best[key]` と角括弧で読みます。`key` が `"fur-elise:hard"` なら、`best["fur-elise:hard"]` と同じです（`:` を含む名前は `.` では書けません）。無い項目を読むと `undefined` です。
>
> オブジェクトを作るときに `{ [key]: score }` と書くと、項目の名前を変数 `key` の中身にできます。`{ key: score }` と書くと、`"key"` という名前の項目になってしまいます。

`recordBest(best, key, score)` は、今回のスコア `score` が自己ベストを超えたら新しい表を作って保存し、その表を返します。

1. L92 `(best[key] ?? -1) >= score` — いまの記録（無ければ −1）が今回のスコア以上なら、何もせずに元の表 `best` を返す。スコアは 0 以上なので、記録が無ければ 0 点でも必ず記録される。同点は書き換えない
2. L93 `{ ...best, [key]: score }` — 元の表を写した新しいオブジェクトを作り、`key` の項目だけ今回のスコアにする（文法の索引の『スプレッド構文 `...`』）
3. L94 保存する
4. L95 新しい表を返す

元の表 `best` を書き換えずに新しい表を返すのは、`src/ui/App.tsx` の L67 で、戻り値をそのまま `setBest` に渡すからです。React は「前と別のオブジェクトか」で変化を見分けます。記録を更新しなかったときに元の表を返すと、`setBest` に同じものが渡り、React は描き直しを省きます。

オートプレイのときにこの関数を呼ばないのは、呼び出し側（`src/ui/App.tsx` の L67）の役目です。

@@ 98-105

`LastSelection` は、選曲画面で最後に選んでいた曲と難易度です。`songId` が `string | null` なのは、初めて遊ぶ人にはまだ選んだ曲が無いからです。`null` のときは `src/ui/App.tsx` の L43 で一覧の先頭の曲を選びます。

`DEFAULT_SELECTION` は「曲は未選択、難易度は NORMAL」です。

@@ 106-112

> **文法: 正規表現**
>
> `/` と `/` で挟んだものは、文字列の形の決まりを書いた**正規表現**です。`.test(文字列)` で、その文字列が形に合うかを真偽で返します。
>
> `/^[a-z0-9-]{1,64}$/` を部品に分けると:
>
> | 部品 | 意味 |
> |---|---|
> | `^` | 文字列の先頭から |
> | `[a-z0-9-]` | 小文字の英字、数字、`-` のどれか 1 文字 |
> | `{1,64}` | 直前のものを 1〜64 回くり返す |
> | `$` | 文字列の最後まで |
>
> 全体で「小文字・数字・`-` だけでできた、1〜64 文字の文字列」です。`"fur-elise"` は合い、`"Fur Elise"`（大文字と空白）や `"../x"`（`.` と `/`）は合いません。

`sanitizeSelection(raw)` は、読み戻した値から正しい形の `LastSelection` を作ります。

- L107 は L36 と同じで、オブジェクトでなければ空のオブジェクトにします。
- L108 は、`songId` が文字列で、曲 ID の形に合っていればそのまま、そうでなければ `null` にします。曲 ID はあとで `songs/<ID>.json` というファイルの名前に使われるので（`src/song/load.ts` の L18）、`/` や `.` の混じった値を通さないようにしています。
- L109 は、`DIFFICULTIES.find((d) => d === obj.difficulty)` で、4 つの難易度の名前のうち `obj.difficulty` と同じものを探します。`.find(関数)` は、関数が真を返した最初の要素を返し、見つからなければ `undefined` を返します。見つからなければ `?? DEFAULT_SELECTION.difficulty` で `"normal"` にします（文法の索引の『オプショナルチェーン `?.` と `??`』）。

L109 の書き方は、確かめと型の絞り込みを一度に済ませています。`obj.difficulty` は `unknown` ですが、`find` が返すのは `DIFFICULTIES` の要素なので、結果は最初から `Difficulty` 型です。

この関数は曲 ID が**いまの曲の一覧にあるか**までは確かめません。一覧は読み込みが終わるまで分からないので、そこは `src/ui/App.tsx` の L43 が受け持ちます。

@@ 113-119

`loadSelection`・`saveSelection` は、設定の `loadSettings`・`saveSettings`（L66-72）と同じ形です。`saveSelection` は `src/ui/App.tsx` の L45 で、選んだ曲や難易度が変わるたびに呼ばれます。
