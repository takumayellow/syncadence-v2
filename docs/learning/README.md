# Syncadence を読む

ピアノの名曲を、楽譜から自動で作った譜面で叩くブラウザのリズムゲーム「Syncadence」を、楽譜のファイルが譜面になるまで（Python）と、ノーツ 1 つが流れてきて判定されるまで（TypeScript）の 2 本の筋でたどって読むための資料。本線の 30 ファイルを丸ごと写し、1 行ずつ解説を付けてある。TypeScript・React・Python の書き方を知らなくても読めるよう、出てきた書き方はその場で説明している。

読む対象はコミット **`eb9c698`**（`main`）。

## 何が入っているか

| ディレクトリ | 中身 |
|---|---|
| `notes/` | 章ごとの解説 |
| `source/` | 元ファイルの**丸ごとコピー**。1 バイトも変えていない |
| `guide/` | `source/` に対する 1 行ずつの解説。`@@ 12-20` で「この行範囲の話」と宣言する |
| `assets/shots/` | 解説に載せるスクリーンショット |
| `tools/shots/` | スクリーンショットを撮り直すスクリプト |

## 読む順序

1. `notes/01-overview.md` — 何をするプログラムで、どのファイルがどこを担うか
2. `notes/02-from-score.md` — 楽譜のファイルが、ゲームが読む譜面になるまで
3. `notes/03-one-note.md` — ノーツ 1 つが流れてきて、叩いて、判定が出るまで
4. `notes/04-timing.md` — 音と画面と入力の時刻をそろえる仕組み
5. コードをプレイの流れに沿って（`01-overview` の「読む順序」）
6. 知らない書き方が出てきたら `notes/05-syntax.md` で引く
7. `notes/06-knobs.md` — 難易度・判定の幅・見た目を決めている数値

## サイトを作る

```bash
pip install git+https://github.com/takumayellow/code-reading-kit
python -m learnkit check docs/learning
python -m learnkit build docs/learning
```

`docs/learning/site/index.html` を開けば読める。`site/` は生成物なので追跡しない。

元のコードが進んだら、`kit.toml` の `[source].commit` を上げて `check` を回すと、変わったファイルが落ちる。そのファイルだけ写し直して、解説の行範囲を直す。

## スクリーンショットを撮り直す

```bash
npm run dev
pip install playwright pillow && python -m playwright install chromium
python docs/learning/tools/shots/take_shots.py http://localhost:5173/
```

`assets/shots/` の 6 枚を上書きする。結果画面は、譜面のノーツを人が叩いたように時刻を揺らして（平均 +18 ms・標準偏差 22 ms）押して撮っている。
