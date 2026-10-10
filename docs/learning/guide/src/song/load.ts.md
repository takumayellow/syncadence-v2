---
src: src/song/load.ts
commit: 404da56
scope: 全文
lines: 19
---

サーバーに置いた曲一覧と曲データの JSON を、ブラウザからネット越しに取ってきて、形を確かめてから渡すファイルです。

## このファイルが担うもの

- 曲一覧 `songs/index.json` を取ってくる `loadIndex`（L12-14）。
- 曲 ID を受け取り、その曲のデータ `songs/<id>.json` を取ってくる `loadSong`（L16-19）。
- 2 つが共通で使う「JSON を 1 つ取ってくる」部品 `fetchJson`（L6-10）。

取ってきた中身が本当に正しい形かは自分では調べず、`src/song/validate.ts` の `parseIndex` / `parseSong` に任せます。このファイルの役目は「どこから取ってくるか」と「通信の失敗を分かりやすいエラーにすること」です。

## 呼ぶ・呼ばれる

| 向き | 相手 | 何のために |
|---|---|---|
| 呼ばれる | `src/ui/App.tsx`（L3 で取り込み、L39 で `loadIndex()`） | 起動時に選曲画面の一覧を読む |
| 呼ばれる | `src/ui/Play.tsx`（L7 で取り込み、L49 で `loadSong(songId)`） | プレイ画面を開いたときに、選んだ曲のデータを読む |
| 呼ぶ | `src/song/validate.ts` の `parseIndex`・`parseSong`・`SONG_ID` | 中身の検査と、曲 ID の形の検査 |
| 呼ぶ | ブラウザの `fetch` | ネット越しにファイルを取ってくる |
| 読む | `public/songs/index.json`・`public/songs/<id>.json` | `tools/build_songs.py` が書き出したファイル |

## このファイルで初めて出てくる文法

- L1 `import type { … }` — 型だけを取り込む
- L4 `import.meta.env.BASE_URL` — ビルド道具 Vite が埋め込む値
- L6 `async function`・`Promise<unknown>`・L7 `await` — 非同期の関数
- L6 `unknown` — 中身の分からない値の型
- L8 `throw new Error(…)` — エラーを投げる

## 読みどころ

- `fetchJson`（L6-10）。通信の結果を確かめ、失敗なら HTTP の状態番号の入ったエラーにします。
- `loadSong` の L17。ファイル名を組み立てる**前に**曲 ID の形を確かめています。

## 落とし穴

- **`fetchJson` は形を確かめない値を返します**（戻り値の型が `unknown`）。そのまま使うと危ないことを型で示していて、必ず `parseIndex` / `parseSong` を通してから使う作りになっています。
- 失敗はすべて `throw`（エラーを投げる）で知らせます。呼び出し側で受け止めないと、読み込みに失敗したことが画面に出ません。`App.tsx` と `Play.tsx` はそれぞれ受け止めて、エラーの文を画面に出しています（Play.tsx の L61-63）。

---

@@ 1-2

> **文法: `import type`**
>
> `import type { Song, SongSummary } from "./types";` は、**型だけ**を取り込む書き方です（`import` そのものは文法の索引の『import と export』）。型は実行時には消えるので、こう書いておくとブラウザ向けに変換したコードからこの行は丸ごと消えます。
>
> L2 のように、値と型を混ぜて取り込みたいときは、`{ DIFFICULTIES, type Song }` のように名前の前に `type` を付けます（`src/song/validate.ts` の L1）。

`"./types"` の `./` は「このファイルと同じフォルダの」という意味で、`src/song/types.ts` を指します（拡張子 `.ts` は省きます）。L2 で取り込む 3 つは `src/song/validate.ts` にあります。

@@ 3-4

> **文法: `import.meta.env.BASE_URL`**
>
> `import.meta` は「このファイル自身についての情報」を持つ特別な値です。その中の `env` には、このプロジェクトのビルド道具 **Vite** が、ビルドのときに設定値を埋め込みます。`BASE_URL` は「このアプリがサーバーのどの場所に置かれるか」を表す文字列です。

このプロジェクトでは `vite.config.ts` で `base: "./"` と設定しているので、`BASE` は `"./"` になります。ページの置き場所からの相対パスで JSON を探すので、アプリを GitHub Pages の `https://<ユーザー名>.github.io/<リポジトリ名>/` のような深い場所に置いても、`songs/index.json` をその隣から取ってこられます。

`const`（定数。一度入れた値を入れ直さない変数）なので、`BASE` はファイルを読み込んだときに 1 回だけ決まります。

@@ 5-10

> **文法: async / await と Promise**
>
> ネット越しにファイルを取ってくるのには時間がかかります。その間ブラウザ全体を止めて待つと、画面が固まってしまいます。そこで JavaScript では「**あとで結果が届く約束**」を表す値 **Promise**（プロミス）を使います。
>
> - `fetch(url)` は、通信を始めるとすぐに Promise を返します。結果（`Response`）は通信が終わってから届きます。
> - `async function` と書いた関数の中では、`await 約束` と書くと、**その約束の結果が届くまでこの関数の続きを一時停止**し、届いた結果をその場の値として使えます。止まっている間も、ブラウザは画面の描画や他の処理を続けます。
> - `async` を付けた関数は、それ自身も必ず Promise を返します。`return x` と書くと「あとで `x` が届く約束」を返したことになります。
>
> 戻り値の型 `Promise<unknown>` は「あとで `unknown` 型の値が届く約束」です。`< >` の中に型を書いて「何の約束か」「何を入れる箱か」を指定する書き方を**型引数**と呼びます（`Record<Difficulty, string>` も同じ形です）。
>
> 約束が失敗した（エラーで終わった）ときは、`await` の所でそのエラーが投げられます。

> **文法: unknown 型**
>
> `unknown` は「**中身が何か分からない**値」の型です。どんな値でも入りますが、そのままでは `.title` のように欄を読むことも、数として計算することもできません。使う前に「これは本当にオブジェクトか」「数か」を確かめる必要があり、確かめるまで TypeScript が使わせてくれません。外から来た信用できない値に付けるのに向いた型です。

> **文法: throw と Error**
>
> `throw new Error("文")` は、その場で処理を打ち切り、**エラーを投げる**書き方です。`Error` はエラーを表すオブジェクトで、`new` はそれを作る記号です（`new` の詳細は文法の索引の『class と constructor』）。投げられたエラーは、呼び出し元をさかのぼって、`try / catch`（文法の索引の『try / catch』）や Promise の `.catch(…)` で受け止められるまで伝わります。

`fetchJson` は、パスを受け取って JSON を 1 つ取ってくる関数です。評価される順に書くと次のとおりです。

1. L7 `` `${BASE}${path}` ``（文法の索引の『テンプレート文字列』）で `./songs/index.json` のような URL を作る。
2. `fetch(…)` で通信を始め、`await` でサーバーの返事（`Response`）が届くまで待つ。
3. L8 `response.ok` は、HTTP の状態番号が 200〜299（成功）のとき真になります。ファイルが無い（404）などで偽なら、`response.status`（その番号）を入れたエラーを投げます。`fetch` 自体は 404 でも失敗扱いにしないので、この確認が要ります。
4. L9 `response.json()` は、届いた中身の文字列を JSON として読み、JavaScript の値に直す約束を返します。`async` 関数の中で約束を `return` すると、その約束の結果がそのまま `fetchJson` の結果になります。

`if (…) throw …;` のように、`if` の後の文が 1 つだけなら `{ }` を省けます。

ネットにつながらないなどで通信そのものができなかったときは、2 の `fetch` がエラーで終わり、`await` の所でそのまま投げられます。中身が JSON として読めないときは、4 でエラーになります。

@@ 11-14

`loadIndex` は曲一覧を取ってきます。`await fetchJson("songs/index.json")` で中身が届くのを待ち、それを `parseIndex`（`src/song/validate.ts` の L39）に渡します。`parseIndex` は形がおかしければエラーを投げ、正しければ `SongSummary` の配列として返します。

戻り値の型 `Promise<SongSummary[]>` は「あとで `SongSummary` の配列が届く約束」です。呼び出し側の `src/ui/App.tsx` の L39 は `loadIndex()` が返す約束に、結果が届いたら一覧を画面に入れる処理をつないでいます。

@@ 15-19

`loadSong` は曲 1 つ分のデータを取ってきます。

1. L17 `SONG_ID.test(id)` で、曲 ID が英小文字・数字・`-` だけの 1〜64 文字かを確かめます。`SONG_ID` は**正規表現**（文字列の形を表すパターン。`src/song/validate.ts` の L3 で説明します）で、`.test(文字列)` は形に合えば真を返します。合わなければエラーを投げます。
2. `songs/${id}.json` を取ってきて、
3. `parseSong(中身, id)`（`src/song/validate.ts` の L54）で形を確かめます。2 番目の引数に ID を渡すのは、取ってきたファイルの中の `id` 欄が、頼んだ ID と同じかも確かめるためです（validate.ts の L57）。

1 の確認を**ファイル名を組み立てる前に**しているのが大事な点です。`id` は画面の操作から来る値で、もし `../` や `?` のような文字が混ざると、`songs/` の外のファイルや別の URL を指してしまう恐れがあります。英小文字・数字・`-` だけに絞れば、必ず `songs/` の中の `.json` ファイルを指します。
