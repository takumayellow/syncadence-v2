---
src: src/ui/landscape.ts
commit: 404da56
scope: 全文
lines: 62
---

スマホで遊ぶときに、画面をタップしたら全画面に入り、横向きに固定する仕組みと、「指で触る端末か」「それを縦に持っているか」をたずねる CSS の条件を置いたファイルです。

## このファイルが担うもの

- **条件の文字列を 1 か所に置く。** 「指で触る端末」（`TOUCH_QUERY`、L4）と「それを縦に持っている」（`PORTRAIT_TOUCH_QUERY`、L7）を、プレイ画面（`src/ui/Play.tsx`）と横向きの案内の CSS（`src/styles/rotate.css`、解説キット外）が同じ条件で使います。
- **このタップで全画面に入るかを決める。** `wantsFullscreen`（L20-23）は、受け取った値だけから答えを決める小さな関数です。ノーツを叩くタップでは入りません。
- **タップを見張って全画面に入る。** `useLandscapeFullscreen`（L42-62）は、`src/ui/App.tsx` の L36 で 1 回だけ呼ばれ、ページ全体のタップを見張ります。全画面に入れたら、横向きに固定します（L28-34）。

パソコン（マウスとキーボード）では何もしません。全画面にすると画面の大きさが急に変わるうえ、ウィンドウで遊ぶほうが自然だからです。

## 呼ぶ・呼ばれる

| 向き | 相手 | 何のために |
|---|---|---|
| 呼ばれる | `src/ui/App.tsx` の L36 | `useLandscapeFullscreen()` を 1 回だけ呼んで、タップの見張りを取り付ける |
| 読まれる | `src/ui/Play.tsx` の L10 | `TOUCH_QUERY`（キーの名前を出すか）と `PORTRAIT_TOUCH_QUERY`（縦に持ち直したら止める） |
| 呼ばれる | `src/ui/landscape.test.ts`（解説キット外） | `wantsFullscreen` の試験 |
| 呼ぶ | ブラウザの `matchMedia` / `requestFullscreen` / `screen.orientation.lock` | 端末の種類をたずねる、全画面に入る、横向きに固定する |

## このファイルで初めて出てくる文法

- L4 `"(hover: none) and (pointer: coarse)"` — CSS のメディアクエリと、それをたずねる `matchMedia`
- L25 `ScreenOrientation & { lock?: … }` — 交差型 `&`
- L49-57 `.requestFullscreen(…).then(…).catch(…).finally(…)` — 全画面と、Promise の `finally`

## 読みどころ

- L22 の「キャンバスのタップでは入らない」。全画面に切り替わると画面の大きさが変わり、レーンの位置も描き直されます。ノーツを叩いた瞬間にそれが起きると、次のノーツを叩く位置がずれます。そこで、ボタンや重ね表示など、キャンバス以外のタップで入ります。READY の重ね表示のタップはキャンバスに届くので（`src/ui/Play.tsx` の L148-151）、選曲画面の PLAY ボタン（`src/ui/SongSelect.tsx` の L155）など、プレイを始める前のボタンが、全画面に入る主なきっかけになります。
- L47 の `pending`。全画面を頼んでから入れるまでの間に、もう一度タップしても 2 回目は頼みません。

## 落とし穴

- **iPhone では全画面にも横向きの固定にもなりません。** iPhone の Safari は、動画以外の要素の全画面に対応しておらず、`document.fullscreenEnabled` が真になりません（L21 で `false` を返します）。横向きの固定 `lock` もありません。iPhone では、縦に持ったときの案内（`src/ui/RotateHint.tsx`）だけが働きます。
- **全画面はタップの中でしか頼めません。** ページを開いただけで全画面にすることはできないので、最初の 1 回はどこかをタップしてもらう必要があります。戻る操作などで全画面が外れたときも、次のタップでまた入ります。
- **横に戻しても、プレイは止まったままです。** 縦に持ち直すとプレイ画面が一時停止しますが（`src/ui/Play.tsx` の L165-169）、横に戻したときに勝手には再開しません。PAUSE の重ね表示の「続ける」を押してもらいます。

---

@@ 1-7

L1 は React のフック `useEffect` を取り込みます。L42-62 の `useLandscapeFullscreen` の中で、タップの見張りを取り付けるのに使います。

> **文法: CSS のメディアクエリと matchMedia**
>
> `"(hover: none) and (pointer: coarse)"` は、CSS で「この条件の端末のときだけ、この見た目にする」と書くときの条件（メディアクエリ）です。
>
> - `hover: none` — マウスのように「指さしたまま重ねておく（ホバーする）」手段が無い
> - `pointer: coarse` — 指のように、指す位置が粗い
> - `orientation: portrait` — 画面が横より縦に長い（縦に持っている）
>
> `and` でつなぐと「全部に合う」になります。JavaScript からは `window.matchMedia("条件")` でたずねられ、返ってきた物の `.matches` が、いまその条件に合っているかの真偽です（L44）。
>
> 返ってきた物は、条件に合う・合わないが変わったときに `change` という出来事で知らせてもくれます。縦に持ち直したのを知るのに使っています（`src/ui/Play.tsx` の L166, L178）。

L4 の `TOUCH_QUERY` は「マウスが無く、指で触る端末」、つまりスマホやタブレットです。L7 の `PORTRAIT_TOUCH_QUERY` は、その条件の後ろに ` and (orientation: portrait)` を足した「指で触る端末を縦に持っている」です。テンプレート文字列 `` `${TOUCH_QUERY} and …` ``（文法の索引の『テンプレート文字列』）で、L4 の文字列をそのまま埋め込んでいるので、L4 を書き換えれば L7 も一緒に変わります。

同じ条件が CSS の側にも 2 か所あります。横向きの案内を出す `src/styles/rotate.css` の `@media (hover: none) and (pointer: coarse) and (orientation: portrait)` と、キーの名前とタップの案内を出し分ける `src/styles/base.css` です。CSS は JavaScript の変数を読めないので、そちらには文字列を書き写し、「`src/ui/landscape.ts` と同じ条件」とコメントを添えています。

@@ 8-23

L9-12 の `interface FullscreenState` は、`wantsFullscreen` が受け取る値の形です。ブラウザの `document` が持っている項目のうち、使う 2 つだけを書いています。

- `fullscreenEnabled` — このページで全画面が使えるか
- `fullscreenElement` — いま全画面になっている要素。全画面でなければ `null`

本物の `document` もこの 2 つを持っているので、L47 では `document` をそのまま渡せます。一方、試験（`src/ui/landscape.test.ts`）では、`{ fullscreenEnabled: true, fullscreenElement: null }` のような 2 項目だけの値を渡して、ブラウザ無しで確かめられます。受け取る形を必要な分だけに絞っておくと、こうして試しやすくなります。

`wantsFullscreen(doc, target)` は、「このタップで全画面に入るか」を答えます。

1. L21 — 全画面が使えない、または、もう全画面になっているなら `false`
2. L22 — タップした先（`target`）がキャンバス（`<canvas>`、レーンを描いている所）でなければ `true`

L22 の `target` は「タップした先」ですが、型は `EventTarget | null` です。`EventTarget` は「出来事を受け取れる物」という広い型で、要素だけでなく `window` なども含むため、要素の名前 `tagName` を持っているとは限りません。そこで `as Element | null`（文法の索引の『型アサーション `as`』）で要素とみなし、`?.tagName`（文法の索引の『オプショナルチェーン `?.` と `??`』）で名前を読みます。`target` が `null` なら `?.` の結果は `undefined` になり、`"CANVAS"` と等しくないので `true` です。

`tagName` は要素の名前を大文字で返します。`<canvas>` なら `"CANVAS"`、`<button>` なら `"BUTTON"` です。

@@ 24-34

> **文法: 交差型 `&`**
>
> `A & B` は、「`A` の項目と `B` の項目を両方持っている」型です。合併型 `A | B`（どちらか一方）と対になります。
>
> ```ts
> type LockableOrientation = ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> };
> ```
>
> は、「ブラウザの `ScreenOrientation` の項目に加えて、省略できる `lock` という関数を持つ」型です。

`screen.orientation` は、画面の向きを表すブラウザの物です。この中の `lock("landscape")` を呼ぶと、端末を縦に持っても画面が横向きのまま固定されます。ところが、`lock` に対応しているのは Android の Chrome などに限られるため、TypeScript が持っているブラウザの型の一覧には `lock` が載っていません（このプロジェクトの TypeScript 5.8 では、`ScreenOrientation` に `unlock` はあっても `lock` はありません）。L25 は、`lock` を「あるかもしれない関数」として足した型を自分で作っています。

L28-34 の `lockLandscape` は、横向きに固定します。

- L30 — `screen.orientation` を L25 の型とみなし、`?.lock?.("landscape")` で呼ぶ。`screen.orientation` が無い、または `lock` が無い端末では、`?.` のところで止まって何もしない
- L29, L31-33 — `try` / `catch`（文法の索引の『try / catch』）。`lock` は、全画面でないときや固定できない端末では失敗を返すので、それを受け止めて何もしない

固定できなくても困りません。縦に持てば「横向きにしてください」の案内が出るからです。

`lockLandscape` は `export` していないので、このファイルの中だけで使う関数です。L51 で、全画面に入れた後に呼ばれます。

@@ 35-62

> **文法: 全画面 requestFullscreen と Promise の finally**
>
> `要素.requestFullscreen()` は、その要素を画面いっぱいに広げ、ブラウザのアドレスバーなどを隠すよう頼む命令です。`document.documentElement`（ページ全体の `<html>` 要素）に頼むと、ページ全体が全画面になります。
>
> - 頼めるのは、**人がタップやキー入力をした直後の処理の中だけ**です。ページを開いた瞬間に勝手に全画面にされないよう、ブラウザが決めています。
> - 結果は Promise で返ります（文法の索引の『async / await と Promise』）。全画面に入れたら `.then(…)` の関数が、断られたら `.catch(…)` の関数が呼ばれます。
> - `.finally(…)` の関数は、入れても断られても**最後に必ず**呼ばれます。どちらの場合にもする後始末を 1 か所に書けます。
>
> 引数の `{ navigationUI: "hide" }` は、「全画面の間はブラウザの操作部分を隠したい」という希望です。希望なので、ブラウザによっては従いません。

`useLandscapeFullscreen()` は、タップを見張って全画面に入る仕組みを、ページに 1 回だけ取り付けるフックです。`useEffect`（文法の索引の『useEffect』）の依存の並びが `[]`（L61）なので、`App` が最初に描かれたときに 1 回だけ取り付き、画面が消えるときに外れます。

L44 は、指で触る端末でなければ何も取り付けずに戻ります。後片付けの関数も返さないので、パソコンでは何も起きません。

L46-58 の `onPointerUp` は、ページのどこかで指を離すたびに呼ばれます（L59 で `window` に登録）。最初の L47 で、次のどれかに当たれば何もせずに戻ります。

- `pending` — 前に頼んだ全画面の返事を、まだ待っている
- `e.pointerType === "mouse"` — マウスで押した。マウスのボタンを離したことは、ブラウザが「人の操作」と認めないので、頼んでも断られる
- `!wantsFullscreen(document, e.target)` — 全画面が使えない、もう全画面、またはキャンバスのタップ（L20-23）

どれにも当たらなければ、L48 で `pending` を立ててから L49-57 で全画面を頼みます。

1. L49-50 — ページ全体に全画面を頼む
2. L51 — 入れたら `lockLandscape`（L28）で横向きに固定する
3. L52-54 — 断られたら、何もせずにそのまま遊んでもらう
4. L55-57 — どちらの場合も、最後に `pending` を下ろす。次のタップでまた頼めるようにする

`pointerdown`（押した瞬間）ではなく `pointerup`（離した瞬間）で頼むのは、指で触った場合、ブラウザが「人の操作」と認めるのが指を離したときだからです。

L60 は後片付けで、L59 で登録したのと同じ `onPointerUp` を外します（`src/ui/Play.tsx` の『イベントリスナーの登録と解除』）。開発中の `StrictMode` では「取り付け → 後片付け → 取り付け」と 2 回走りますが、後片付けで外しているので、見張りが 2 重になることはありません。
