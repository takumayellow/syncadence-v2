---
src: src/audio/clock.ts
commit: 404da56
scope: 全文
lines: 68
---

「いまスピーカーから聞こえているのは曲の何秒目か」を、ブラウザの 2 つの時計の対応から求めるファイルです。

## このファイルが担うもの

ブラウザには時計が 2 つあります。

| 時計 | 単位 | 何の時刻か |
|---|---|---|
| `AudioContext` の `currentTime` | 秒 | 音を作る仕組みが**処理している**時刻。音の予約（「この時刻に鳴らせ」）はこの時計で書く |
| `performance.now()` | ミリ秒 | ページを開いてからの経過時間。キーを押した時刻（`event.timeStamp`）や画面を描く時刻はこの時計で測られる |

キーを押した時刻は `performance.now()` の時計で届き、音は `AudioContext` の時計で鳴ります。判定するには、2 つを同じ物差しに載せなければなりません。しかも、音は処理されてからスピーカーで鳴るまでに遅れがあります（数 ms〜数十 ms、Bluetooth では 100 ms を超えることもあります）。

このファイルは次のことをします。

- `sampleOffset`（L15-28）: 「**いま鳴っている**音の `AudioContext` 時刻」と `performance.now()` の差（ずれ）を 1 回測る。
- `SongClock.update`（L44-51）: そのずれを毎フレーム測り、細かい揺れをならして覚えておく。
- `SongClock.songTimeAt`（L58-62）: `performance.now()` の時刻を、その瞬間に聞こえていた**曲の位置（秒）**に直す。判定と描画が使う。
- `SongClock.contextTimeOf`（L65-67）: 逆に、曲の位置を「その音を鳴らす `AudioContext` 時刻」に直す。音の予約が使う。

## 呼ぶ・呼ばれる

| 向き | 相手 | 何のために |
|---|---|---|
| 呼ばれる | `src/game/engine.ts` | L89 で曲の開始時に `SongClock` を作る。L181 で毎フレーム `update`。L124・L187・L200 で `songTimeAt`（判定・終了判定・描画）。L65 で `contextTimeOf`（音の予約）。L102 で一時停止から戻るときに `reset` |
| 呼ばれる | `src/ui/Calibrate.tsx` | L46 で再生速度 1 の `SongClock` を作り、L65-66 でクリックに合わせて叩いた時刻を曲の位置に直す |
| 呼ばれる | `src/audio/audio.test.ts` | `ClockSource` の形の偽物を渡して、`sampleOffset` と `SongClock` を試す |
| 呼ぶ | ブラウザの `AudioContext` | `currentTime`・`baseLatency`・`outputLatency`・`getOutputTimestamp()` を読む |

## このファイルで初めて出てくる文法

- L5 `baseLatency?: number` — 無くてもよい欄 `?:`
- L7 `getOutputTimestamp?(): AudioTimestamp` — interface に書く関数の欄
- L16 `source.getOutputTimestamp?.()` — 関数が無ければ呼ばない `?.()`（文法の索引の『オプショナルチェーン `?.` と `??`』）
- L18-22 `&&` — 「かつ」でつないだ条件
- L37-41 中身が空のコンストラクタ `{}` と、引数の `readonly`（文法の索引の『private とコンストラクタ引数のプロパティ』）

## 読みどころ

- **ずれ（offset）という考え方。** 「聞こえている `AudioContext` 時刻 − `performance.now()` 秒」は、2 つの時計がどちらも同じ速さで進む限り一定です。だから 1 回測っておけば、任意の `performance.now()` の時刻に足すだけで、そのとき聞こえていた `AudioContext` 時刻が分かります（L60）。
- **測り方が 2 通りあること**（L16-27）。正確な `getOutputTimestamp()` が使えればそれを、壊れていれば遅れの申告値で代わりにします。
- **ならし方**（L46-50）。小さな揺れは少しずつ追い、25 ms を超える跳びにはすぐ合わせます。

## 落とし穴

- **ブラウザが申告しない遅れは、ここでは取れません。** OS の音の処理や Bluetooth の遅れの一部は `getOutputTimestamp()` にも `outputLatency` にも入らないことがあります（`docs/research/03-web-audio-timing.md` の 3 節）。残りは利用者が「入力の補正」「表示の補正」で埋めます（`engine.ts` の L124・L204）。
- **曲の位置は「聞こえている位置」で、`AudioContext` の現在時刻とは違います。** 音の予約には遅れを含まない `ctx.currentTime` から先を見るので、`engine.ts` の L183 は `songTimeAt` を使わずに計算しています。
- `songTimeAt` は、まだ一度もずれを測っていなければ、その場で測ります（L59）。読むだけに見えて中の状態を変えることがあります。

---

@@ 1-2

ファイル全体の説明のコメントです。「いま聞こえている曲の位置」を出すのが、このファイルの目的です。

@@ 3-9

> **文法: 無くてもよい欄 `?:` と、関数の欄**
>
> `readonly baseLatency?: number;` の `?` は、「この欄は無くてもよい」という印です。あれば数ですが、無ければ読んだときに `undefined` になります。
>
> `getOutputTimestamp?(): AudioTimestamp;` は、「`getOutputTimestamp` という**関数**の欄があってもよく、呼ぶと `AudioTimestamp` を返す」という書き方です。`()` の中が空なので引数はありません。

`ClockSource` は、このファイルが時計から読みたいものだけを並べた形です。

| 欄 | 中身 |
|---|---|
| `currentTime` | 音を処理している時刻（秒） |
| `baseLatency` | 音の仕組みの中で、音を作ってから OS に渡すまでの遅れ（秒） |
| `outputLatency` | OS に渡してから、出力の装置が鳴らし始めるまでの遅れの見積もり（秒） |
| `getOutputTimestamp()` | 「いま出力の装置が鳴らしている音の `AudioContext` 時刻」（`contextTime`、秒）と、「それが鳴った `performance.now()` の時刻」（`performanceTime`、ミリ秒）の組を返す |

ブラウザの `AudioContext` はこの 4 つを全部持っているので、`ClockSource` を受け取る所にそのまま渡せます（`engine.ts` の L89 の `ctx`）。TypeScript は「欄が揃っていれば同じ形とみなす」ので、`AudioContext` の側で `ClockSource` を名乗る必要はありません。

`AudioContext` そのものではなくこの形を受け取るのは、試験のときに `{ currentTime: 10, getOutputTimestamp: () => (…) }` のような偽物を渡せるようにするためです（`src/audio/audio.test.ts`）。後ろの 3 つを `?` にしているのは、古いブラウザには無い場合があるからです（Safari の `outputLatency` は 18.4 から。`docs/research/03-web-audio-timing.md` の 3 節）。

@@ 10-13

3 つの定数です。

| 名前 | 値 | 意味 |
|---|---|---|
| `MAX_TIMESTAMP_SKEW` | 0.5 秒 | `getOutputTimestamp()` の `contextTime` が `currentTime` からこれ以上離れていたら、値が壊れているとみなす |
| `JUMP_MS` | 25 ms | 測ったずれが、覚えているずれからこれ以上変わったら、ならさずにすぐ合わせる |
| `SMOOTHING` | 0.05 | ならすときに、新しく測った値をどれだけ取り入れるか（5%） |

@@ 14-28

`sampleOffset(source, nowMs)` は、「聞こえている `AudioContext` 時刻（秒）− `performance.now()`（秒）」を 1 回測って返します。`nowMs` は今の `performance.now()` の値です。

**1 つ目の測り方（L16-25）: `getOutputTimestamp()` を使う。**

L16 の `source.getOutputTimestamp?.()` は、関数があれば呼び、無ければ呼ばずに `undefined` にします（文法の索引の『オプショナルチェーン `?.` と `??`』）。

L17-23 の `if` は、次の 5 つの条件を `&&`（「かつ」。全部が真のときだけ真）でつないでいます。

1. 結果が返ってきた。
2. `contextTime` が数である。
3. `performanceTime` が数である。
4. `performanceTime` が 0 より大きい。鳴り始める前は 0 が返るブラウザがあります。
5. `contextTime` と `currentTime` の差が 0.5 秒以内である。

5 つ目の検査は、実際にあったブラウザの不具合への備えです。Safari 17 までは値の単位を取り違える不具合（WebKit Bug 264247）があり、iOS 15.1 では `currentTime` が 28.865 秒のときに `contextTime` が 0.001 秒になったという報告があります（`docs/research/03-web-audio-timing.md` の 3 節）。本来 2 つの差は出力の遅れ程度（多くて数百 ms）なので、0.5 秒も離れていれば壊れていると判断できます。

全部満たせば、L24 で `contextTime − performanceTime / 1000`（ミリ秒を秒に直して引く）を返します。

例えば `contextTime` が 10 秒、`performanceTime` が 5000 ms なら、ずれは 10 − 5 = 5 秒です。これは「`performance.now()` の秒に 5 を足せば、そのとき聞こえている `AudioContext` 時刻になる」という意味です。

**2 つ目の測り方（L26-27）: 遅れの申告値を使う。** 1 つ目が使えないときは、

```
ずれ = currentTime − (baseLatency + outputLatency) − nowMs / 1000
```

とします。「今処理している時刻から、スピーカーまでの遅れを引けば、今聞こえている時刻」という考え方です。`?? 0`（文法の索引の『オプショナルチェーン `?.` と `??`』）は、その欄が無いブラウザでは遅れを 0 とみなします。例えば `currentTime` が 10 秒、遅れの合計が 0.05 秒、`nowMs` が 5000 なら、ずれは 10 − 0.05 − 5 = 4.95 秒です。

@@ 29-42

`SongClock` は、1 回のプレイの「曲の位置」を出す時計です（`class` は文法の索引の『class と constructor』）。

- `offset`（L31）は、ならした後のずれ（秒）です。まだ測っていなければ `null`。
- コンストラクタ（L37-41）は 3 つの引数を受け取り、そのまま欄にします（文法の索引の『private とコンストラクタ引数のプロパティ』）。やることはそれだけなので、中身の `{}` は空です。`private` を付けていない `readonly startContextTime` は、外から読めるが書き換えられない欄になります。

| 引数 | 中身 |
|---|---|
| `source` | 時計（ふつうは `AudioContext`） |
| `startContextTime` | 曲の 0 秒の音を鳴らす `AudioContext` の時刻 |
| `rate` | 再生速度（0.5〜1）。0.5 なら曲の 1 秒が実際には 2 秒かかる |

`startContextTime` は `engine.ts` の L89 が決めます。

```
startContextTime = 今の currentTime + 0.15 − startSong / rate
```

`startSong` は 0 以下の曲の位置で、最初のノーツが奥から流れてくる時間と、さらに 0.8 秒（実時間）の間を足した分だけ曲の 0 秒より前から始めるためのものです（engine.ts の L88）。つまり曲の 0 秒は、開始の操作から少し先の時刻に置かれます。

@@ 43-52

`update(nowMs)` は毎フレーム呼ばれ（`engine.ts` の L181）、ずれを測り直して `offset` を更新します。

1. L45 今のずれを測る。
2. L46-47 まだ覚えていない（`null`）か、覚えている値から 25 ms より大きく変わっていれば、測った値をそのまま使う。
3. L48-49 そうでなければ、差の 5% だけ近づける。

3 のやり方を**指数移動平均**と呼びます。毎回「残りの差」が 95% に縮むので、測った値が一定なら、差は 20 フレームで 0.95 の 20 乗 ≒ 0.36 倍、60 フレーム（60 フレーム毎秒で約 1 秒）で 0.95 の 60 乗 ≒ 0.046 倍になり、約 1 秒で 95% ほど追いつきます。

ならす理由は、測るたびにずれが少しずつ揺れるからです。`currentTime` は 128 サンプルごとにまとめて進むので（48,000 Hz なら 128 ÷ 48,000 ≒ 2.7 ms ごと）、測る瞬間によって数 ms の揺れが出ます。そのまま使うとノーツの位置が毎フレームがたつきます。

一方、一時停止すると `currentTime` は止まりますが `performance.now()` は進み続けるので、再開するとずれが止めていた時間だけ一気に変わります。こうした 25 ms を超える跳びを 5% ずつ追うと、何秒も間違った位置を使うことになるので、すぐに合わせます。

@@ 53-56

`reset()` は覚えているずれを捨てます。`engine.ts` の `resume`（L102）が、一時停止から戻るときに呼びます。次の `update` か `songTimeAt` で測り直されます。

@@ 57-63

`songTimeAt(perfMs)` は、`performance.now()` の時刻 `perfMs` に聞こえていた曲の位置（秒）を返します。

1. L59 ずれをまだ測っていなければ、ここで測る。
2. L60 `heard = offset + perfMs / 1000`。そのとき聞こえていた `AudioContext` 時刻です。
3. L61 `(heard − startContextTime) × rate`。曲の 0 秒の時刻から何秒経ったかを、曲の秒に直します。再生速度 0.5 なら、実際の 2 秒が曲の 1 秒です。

例えば、ずれが 5 秒、`startContextTime` が 3 秒、`rate` が 1 のとき、`perfMs` が 5020 なら、聞こえている時刻は 5 + 5.02 = 10.02 秒、曲の位置は 10.02 − 3 = 7.02 秒です。

`perfMs` に、キーを押した時刻（`event.timeStamp`）を渡せば「押した瞬間に聞こえていた曲の位置」が、描画の時刻を渡せば「描く瞬間に聞こえている曲の位置」が求まります。`engine.ts` はこれを判定（L124）と描画（L200）に使います。

L60 の `this.offset ?? 0` は、L59 で測った後なので実際には `null` になりませんが、TypeScript にそれが伝わらないので 0 を補っています。

@@ 64-68

`contextTimeOf(songTime)` は `songTimeAt` の逆向きで、曲の位置 `songTime` の音を鳴らすべき `AudioContext` の時刻を返します。

```
startContextTime + songTime / rate
```

再生速度 0.5 なら、曲の 1 秒目の音は曲の始まりから実際に 2 秒後に鳴らします。こちらは「鳴らす時刻」なので、出力の遅れは足しません。予約した時刻に処理された音は、遅れの分だけ後で聞こえ、それは `songTimeAt` 側で遅れを引いた「聞こえている位置」とちょうど合います。`engine.ts` の L65 が、伴奏の音を予約するときに使います。
