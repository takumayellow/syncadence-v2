# 調査メモ

v2 の設計に入る前に行った調査の記録。各文書の出典は文書内の各節の末尾にある。

| 文書 | 内容 |
|---|---|
| [00-v1-diagnosis.md](00-v1-diagnosis.md) | v1 の譜面が曲に合っていないと感じた原因。時刻の精度は十分で、拍子・格子が無いこと、旋律を追わないこと、レーンが音高と無関係なことが原因だった |
| [01-oss-rhythm-games.md](01-oss-rhythm-games.md) | osu!, ITGmania, Bemuse などの時計と同期、入力時刻、判定幅、譜面形式をソースコードで比べた |
| [02-chart-generation.md](02-chart-generation.md) | 人手の作譜の慣行、自動作譜の研究、オンセット検出と楽譜に基づく方法を比べ、楽譜から譜面と音を両方作る案を出した |
| [03-web-audio-timing.md](03-web-audio-timing.md) | ブラウザで音・描画・入力を同じ時間軸に載せる方法（`getOutputTimestamp`, `event.timeStamp`, iOS の制限）と v2 の同期設計案 |
| [04-assets-and-licenses.md](04-assets-and-licenses.md) | 楽譜データ（Mutopia の Public Domain 12 曲）とピアノ音源（FreePats Upright Piano KW, CC0）の権利の確認 |

既存のゲームを実際に遊んで比べる手順は [../play-existing-games.md](../play-existing-games.md) にある。
