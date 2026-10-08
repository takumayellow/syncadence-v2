# Syncadence

ピアノの名曲を、楽譜から作った譜面で叩くブラウザの音楽ゲーム。

鳴る音もノーツも同じ楽譜（Mutopia Project の Public Domain の版）から作るので、ノーツは必ず鳴っている音の上にあり、拍子どおりに並ぶ。高い音ほど右のレーンに来る。

遊ぶ: https://takumayellow.github.io/syncadence-v2/

## 遊び方

| 操作 | キー |
|---|---|
| EASY・NORMAL のレーン | `D` `F` `J` `K` |
| HARD・EXPERT のレーン | `S` `D` `F` `J` `K` `L` |
| 開始 | 何かキーを押す（F キー・Tab・Esc などブラウザが使うキーは除く）。画面のタップでもよい |
| 一時停止 / 再開 | `Esc` |
| 一時停止中 | `Enter` 再開、`R` やり直し、`Q` 選曲に戻る |
| スマートフォン | レーンをタップする |

音とノーツがずれて感じるときは、選曲画面の「タイミングを測る」でクリック音に合わせて叩くと、入力の補正が決まる。プレイ後の結果画面にも、押したタイミングの偏りと補正の提案が出る。

設定では、ノーツの速さ、テンポ（50〜100%。音の高さは変わらない）、叩いた音だけが鳴る「キー音」、オートプレイを選べる。

## 曲

| 曲 | 作曲者 | Mutopia | 浄書 |
|---|---|---|---|
| エリーゼのために | ベートーヴェン | [931](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931) | Stelios Samelis |
| ジムノペディ第1番 | サティ | [37](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37) | Evin Robertson |
| トロイメライ（子供の情景 第7曲） | シューマン | [504](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=504) | Ying-Chun Liu |
| 前奏曲 ホ短調 Op.28-4 | ショパン | [468](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=468) | Magnus Lewis-Smith |
| 平均律クラヴィーア曲集 第1巻 前奏曲 第1番 | J.S.バッハ | [5](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=5) | Tobias Erbsland |
| ジ・エンターテイナー | ジョプリン | [263](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263) | Chris Sawer |
| メイプル・リーフ・ラグ | ジョプリン | [23](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=23) | Chris Sawer |
| 山の魔王の宮殿にて（作曲者によるピアノ版） | グリーグ | [1888](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1888) | Coyau |
| アラベスク第1番 | ドビュッシー | [1777](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1777) | Keith OHara |
| 月の光（ベルガマスク組曲） | ドビュッシー | [1778](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1778) | Keith OHara |
| 練習曲 Op.10-12「革命」 | ショパン | [743](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=743) | Roland Goretzki |
| 幻想即興曲 Op.66 | ショパン | [1693](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1693) | Guy D. Lederfein |

## 開発

必要なもの: Node.js 22、Python 3.10 以上（音源を作り直すときは ffmpeg も）。

```sh
npm ci
npm run dev        # http://localhost:5173/
npm test           # 判定・同期・曲データの検査（Vitest）
npm run typecheck
npm run build      # dist/ に出力
```

譜面を作り直すとき:

```sh
pip install -r tools/requirements.txt
python tools/fetch_sources.py     # Mutopia から取得し、Public Domain であることを検査
python tools/build_samples.py     # ピアノ音源の flac を取得して mp3 にする（ffmpeg が要る）
python tools/build_songs.py       # public/songs/ を書き出す
python -m pytest tools/tests      # 譜面の性質を検査
```

曲を足すときは `tools/songs.json` に追加する。.ly のヘッダーに Public Domain の宣言が無い曲は、`fetch_sources.py` が取り込みを止める。

## 文書

- [docs/design.md](docs/design.md): 設計（楽譜から音と譜面を作る方式、譜面生成、同期、判定）
- [docs/research/](docs/research/README.md): 設計の前に行った調査（v1 の診断、既存の音楽ゲームの実装、自動作譜、ブラウザでの同期、素材の権利）
- [docs/play-existing-games.md](docs/play-existing-games.md): 比較のために既存のゲームを遊ぶ手順

## クレジットとライセンス

- ソースコード: MIT License（[LICENSE](LICENSE)）。
- 楽譜: [Mutopia Project](https://www.mutopiaproject.org/) で Public Domain として公開されている版を使っている。浄書者は上の表のとおり。`public/songs/` は、その MIDI と LilyPond ソースから作った。
- ピアノの音: FreePats の [Upright Piano KW](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html)（CC0 1.0）。Gonzalo と Roberto（zenvoid.org）が収録した。原典の説明とライセンスは `public/samples/kw/` にある。
