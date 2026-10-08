# 04. 素材と権利

v2 は楽譜から譜面と音を作る（`02-chart-generation.md` の 5.1 節）。必要な素材は楽譜データとピアノの音源サンプルの 2 つである。それぞれの候補と権利の確認結果をまとめる。

## 1. 権利の層

楽曲を使うときの権利は層に分かれる。録音を使わなければ、確認するのは楽曲・楽譜データ・音源サンプルの 3 つになる。

| 層 | 権利者 | v1（録音） | v2（楽譜から合成） |
|---|---|---|---|
| 楽曲（作曲） | 作曲者 | 保護期間満了の曲に限定 | 同じ |
| 楽譜データ | 浄書・入力した人 | 使わない | 確認が要る（2 節） |
| 録音 | レコード製作者 | 確認が要る | 使わない |
| 演奏 | 実演家 | 確認が要る | 使わない |
| 音源サンプル | サンプルを録った人 | 使わない | 確認が要る（3 節） |

### 1.1 作曲

著作権法第 51 条により、著作権は著作者の死後 70 年を経過するまで存続する。2 節の作曲者の没年は 1750〜1925 年で、最も遅いサティ（1925 年没）でも 1995 年末に満了している。

連合国民の著作物には戦時加算がある（連合国及び連合国民の著作権の特例に関する法律 第 4 条）。1941 年 12 月 8 日から平和条約の発効の前日までの期間が保護期間に足される。フランス・米国の作曲者（ドビュッシー、サティ、ジョプリン）はこれに当たり得るが、加算は約 10 年分なので、いずれも満了している。

出典:
- 著作権法: https://laws.e-gov.go.jp/law/345AC0000000048
- 連合国及び連合国民の著作権の特例に関する法律: https://laws.e-gov.go.jp/law/327AC0000000302

### 1.2 録音を使う場合の難しさ（v1 の経験）

- 著作権法第 101 条により、レコード製作者の権利は発行から 70 年、実演家の権利は実演から 70 年存続する。作曲者が古くても、録音が新しければ保護される。
- Wikimedia Commons の説明では、米国の 1972 年以前の録音は Music Modernization Act（CLASSICS Act）により最長 2067 年 2 月 15 日まで保護され、実演家の権利も別にある。
- v1 は録音ごとに Commons のファイルと SHA-1 を照合し、照合できない 4 曲を外した（`00-v1-diagnosis.md` の 6 節）。曲を増やすたびにこの確認が要る。

楽譜から合成する方式なら、この層はまるごと不要になる。

出典:
- https://laws.e-gov.go.jp/law/345AC0000000048
- https://commons.wikimedia.org/wiki/Commons:Licensing

## 2. 楽譜データ: Mutopia Project

Mutopia Project は LilyPond 形式の楽譜を配布している。曲ごとにライセンスが付いており、Public Domain のほか CC 系のものもある。下の 12 曲は、各曲のページと .ly のヘッダーの両方で、ライセンスが Public Domain であることを確かめた。

| ID | 曲 | 作曲者（没年） | .ly のパス（`https://www.mutopiaproject.org/ftp/` 以下） |
|---|---|---|---|
| 931 | エリーゼのために WoO 59 | ベートーヴェン（1827） | `BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.ly` |
| 37 | ジムノペディ第 1 番 | サティ（1925） | `SatieE/gymnopedie_1/gymnopedie_1.ly` |
| 263 | ジ・エンターテイナー | ジョプリン（1917） | `JoplinS/entertainer/entertainer.ly` |
| 23 | メイプル・リーフ・ラグ | ジョプリン（1917） | `JoplinS/maple/maple.ly` |
| 5 | 平均律 I 前奏曲 1 番 BWV 846 | バッハ（1750） | `BachJS/BWV846/wtk1-prelude1/wtk1-prelude1.ly` |
| 1778 | 月の光（ベルガマスク組曲 L 75） | ドビュッシー（1918） | `DebussyC/L75/debussy_Ste_Bergamesq_Clair/debussy_Ste_Bergamesq_Clair.ly` |
| 1777 | アラベスク第 1 番 L 66 | ドビュッシー（1918） | `DebussyC/L66/debussy_Arabesque_1/debussy_Arabesque_1.ly` |
| 1693 | 幻想即興曲 Op. 66 | ショパン（1849） | `ChopinFF/O66/chopin_fantaisie-impromptu/chopin_fantaisie-impromptu.ly` |
| 1888 | 山の魔王の宮殿にて Op. 46-4（ピアノ版） | グリーグ（1907） | `GriegE/O46/Dans_l_antre_du_roi_de_la_montagne/Dans_l_antre_du_roi_de_la_montagne.ly` |
| 504 | トロイメライ Op. 15-7 | シューマン（1856） | `SchumannR/O15/SchumannOp15No07/SchumannOp15No07.ly` |
| 468 | 前奏曲 Op. 28-4 | ショパン（1849） | `ChopinFF/O28/Chop-28-4/Chop-28-4.ly` |
| 743 | 練習曲 Op. 10-12 | ショパン（1849） | `ChopinFF/O10/op-10-12-wfi/op-10-12-wfi.ly` |

曲のページは `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=<ID>` である。没年は Wikipedia の要約 API（`https://en.wikipedia.org/api/rest_v1/page/summary/<名前>`）で確かめた。

取り込みは `tools/fetch_sources.py` が行う。.ly のヘッダーに `license = "Public Domain"`（古い版では `copyright = "Public Domain"`）が無い曲は失敗させる。12 曲すべてがこの検査を通っており、結果は浄書者名・確認日・SHA-256 とともに `sources/mutopia/<id>/meta.json` に残している。

Mutopia は .ly と一緒に、LilyPond が書き出した MIDI も配っている。v2 はこの MIDI を読んで時刻付きの音の列にし、.ly からは弱起（`\partial`）の長さだけを読む。MIDI は譜表ごとにトラックが分かれているので、平均音高の高い側の半分のトラックを右手（旋律の候補）、残りを左手（低音）として扱う。

出典:
- https://www.mutopiaproject.org/
- 各曲: `https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=<ID>`（上の表の ID）
- https://www.mutopiaproject.org/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.ly
- https://www.mutopiaproject.org/ftp/SatieE/gymnopedie_1/gymnopedie_1.ly

## 3. ピアノの音源サンプル: FreePats Upright Piano KW

| 項目 | 内容 |
|---|---|
| ライセンス | CC0 1.0 |
| 版 | 2022-02-21 |
| 楽器 | カワイのアップライトピアノ（機種は記載なし）。Inma Martínez de Miguel 宅の居間にあるもの |
| 収録 | 2017 年 1 月, Gonzalo と Roberto（zenvoid.org）が Zoom H1 で収録, Roberto が編集 |
| 配布形式 | SFZ + FLAC（32 MiB）, SFZ + WAV, SF2。ステレオ, ベロシティ 2 層 |
| サンプル数 | .sfz から参照される .flac は 66 個 |
| ベロシティ層 | vL（`hivel=80`）30 個, vH（`lovel=81`）36 個 |
| 音域 | A0〜C8 を 3 半音ごと。vH には B0〜B7 も加わり, A2 と C4 が無い |
| ループ | 4 つのグループすべてが `loop_mode` を指定する。A0〜F#4 の領域（両層）は `loop_continuous`、A4 以上は `no_loop`（FreePats のページの "Bass notes contain loops"） |

3 半音ごとのサンプルなので、間の音は再生速度を変えて作る（SFZ の音域割り当てと同じ）。Web Audio では `AudioBufferSourceNode.playbackRate` か `detune` を使う。移調は多くが ±1 半音で、vH の A2・C4 の欠けを埋める F#2vH（鍵 41〜45）と B3vH（鍵 58〜61）だけが最大 3 半音になる。

CC0 なのでクレジットは義務ではないが、v2 のクレジット画面には出す。

出典:
- https://github.com/freepats/upright-piano-KW
- https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html#UprightKW

## 4. ゲームの素材（効果音・フォント・画像）

判定音や UI の素材は、自作するか CC0 のものに限る。既存ゲームの素材（スキン、効果音、譜面）は流用しない。

`01-oss-rhythm-games.md` で読んだ既存ゲームのうち、ソースのライセンスは MIT（osu!, Etterna）、GPL-3.0（ITGmania, Phira など）、AGPL-3.0（Bemuse）と様々で、Friday Night Funkin' のようにソースとアセットでライセンスが分かれるものもある（`01-oss-rhythm-games.md` の 1 節）。v2 はコードも素材も直接取り込まず、設計を参考にするだけにする。

## 5. まとめ

| 素材 | 候補 | 権利の確認 | 残る作業 |
|---|---|---|---|
| 楽曲 | 2 節の 12 曲 | 作曲者の没年から満了を確認 | なし |
| 楽譜データ | Mutopia（Public Domain の版） | 曲のページで確認。.ly ヘッダーは 2 曲のみ確認 | 取り込み時にヘッダーを検査 |
| 音源 | FreePats Upright Piano KW（CC0 1.0） | 確認済み | クレジット画面への記載 |
| 録音 | 使わない | 不要 | なし |
