# 02. 譜面の作り方

人手の作譜の慣行、自動作譜の研究、オンセット検出に基づく方法、楽譜に基づく方法を順に見て、v2 の方式を決める材料にする。

## 1. 人手の作譜の慣行

### 1.1 音に対応させる

osu!mania の Ranking criteria は全難易度に共通するガイドラインとして、ノーツは曲中の音に対応させるとしている。

> Every note should correlate to a sound present in the music.

易しくするためにこの対応を崩すことは例外として認めている。

### 1.2 拍の細分（snap）で難易度を付ける

osu! の譜面エディタで選べる細分は 1/1, 1/2, 1/3, 1/4, 1/5, 1/6, 1/7, 1/8, 1/9, 1/12, 1/16 の 11 種類である。よく使うのは 1/1, 1/2, 1/4 で、1 拍を 3 つや 6 つに割るワルツなどの曲には 1/3, 1/6 を使う。1/5, 1/7, 1/8, 1/9, 1/12, 1/16 は珍しく、曲がそう作られていない限り、1/5 や 1/16 のような細分はタイミング設定の誤りの兆候だとしている（1/16 はバズスライダーには使う）。

osu!mania の Ranking criteria は、難易度ごとに連続させない細分の目安をガイドラインとして示している（4/4 で 180 BPM 前後の曲を想定）。

| 難易度 | 連続させない細分 |
|---|---|
| Easy | 1/4 以上 |
| Normal | 1/6 以上 |
| Hard | 1/8 以上 |
| Insane | 1/8 の複雑な連続を 4 拍より長く続けない。1/6 以上のロングノーツの連続は避ける |
| Expert | 規定なし |

難易度の差は「どの細分まで使うか」で付けている。v1 は採用率と最小間隔（秒）で付けていたので、拍とは無関係な間隔が混ざった（`00-v1-diagnosis.md` の 3.1 節）。

### 1.3 譜面形式も格子に乗っている

StepMania の .sm は 1 小節を 4/8/12/16/24/32/48/64/192 行のいずれかで書く。BMS も小節を等分した位置でノーツを置く（`01-oss-rhythm-games.md` の 5 節）。人が作る譜面は、形式の段階で拍の格子に乗る。

出典:
- https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21mania
- https://osu.ppy.sh/wiki/en/Client/Beatmap_editor/Beat_snap_divisor
- https://github.com/stepmania/stepmania/wiki/sm

## 2. 自動作譜の研究

| 名前 | 対象 | 方式の要点 |
|---|---|---|
| Dance Dance Convolution (DDC) | StepMania | 「いつ置くか（step placement）」と「どれを選ぶか（step selection）」の 2 段に分ける。placement はスペクトログラムを入力にした CNN + RNN を難易度で条件付け, selection は条件付き LSTM |
| GenéLive! | 『ラブライブ！』のリズムゲーム（KLab） | DDC を基に, BPM と拍子から作る「beat guide」（小節頭 2, 他の拍 1, 拍でないフレーム 0）を BiLSTM に入れる。時間解像度の違う 4 本の畳み込みを並べる。作譜のコストを最大で半分にしたと報告 |
| TaikoNation | 太鼓の達人（学習データは osu!taiko の承認譜面） | 配置が曲中の出来事に対応したまとまった形になること（patterning）を重視し, 先の 4 タイムステップを同時に予測する |
| Beat Sage | Beat Saber | タイミングを決めるネットワークと, 各タイミングのブロック種別を決めるネットワークの 2 つ（報道による説明） |
| Mapperatorinator | osu! の全モード | スペクトログラムから譜面をイベント列（トークン）として生成・修正する。MIT |
| osumapper | osu!（mania 対応） | リズムを CNN / LSTM, 配置の流れを GAN で作る |

DDC のデータセットは StepMania のパックから作った Fraxtil（3 パック）と In The Groove（2 パック）である。

共通点は 2 つある。

- 「いつ置くか」と「何を置くか」を分けている（DDC, Beat Sage）。v1 も検出（いつ）とレーン割り当て（何を）を分けていた。
- 拍と小節の情報を入力に足すと良くなるという方向がある（GenéLive! の beat guide）。音響特徴だけでは拍の構造が譜面に出にくい。

どれも学習には大量の人手譜面が要る。v2 の規模（PD のピアノ曲 10 曲前後）で学習モデルを作る理由は薄い。

出典:
- https://arxiv.org/abs/1703.06891
- https://github.com/chrisdonahue/ddc
- https://arxiv.org/abs/2202.12823
- https://arxiv.org/abs/2107.12506
- https://beatsage.com/ / https://www.uploadvr.com/beat-sage-ai-beat-saber-custom/
- https://github.com/OliBomby/Mapperatorinator
- https://github.com/kotritrona/osumapper

## 3. オンセット検出に基づく方法

`librosa.onset.onset_detect` はオンセット強度の包絡から山を拾う。SuperFlux（Böck & Widmer, DAFx-13）はスペクトル差分に周波数方向の最大値フィルタを足してビブラートによる誤検出を抑える方式で、誤検出を最大 60% 減らしたと報告している。v1 はこの型の検出器を使った。

ピアノの採譜では、オンセットが最も見つけやすく、知覚上も重要な時点だとされる（Onsets and Frames: "the onset is both the easiest frame to identify and the most perceptually significant"）。同論文は MAPS の正解ラベルを作るとき、サステインペダルを音の長さの延長として扱っている。ペダルは音の終わりを不明確にするので、録音から音価やロングノーツの長さを取るのは難しい。

オンセット検出だけで作る方式の限界は v1 で確かめた（`00-v1-diagnosis.md`）。

- 時刻は正確（中央値約 6 ms）だが、どのオンセットが旋律かは分からない。
- 拍と小節の情報が無いので、間引くと間隔が不規則になる。
- 録音のルバートで拍の推定も外れる。

音源から MIDI を推定する basic-pitch（Spotify）のような採譜器を挟むと音高と声部の手掛かりは増える。ただし拍子と小節は推定し直しになり、誤りも残る。

出典:
- https://librosa.org/doc/0.10.2/generated/librosa.onset.onset_detect.html
- https://www.dafx.de/paper-archive/2013/papers/09.dafx2013_submission_12.pdf
- https://github.com/CPJKU/SuperFlux
- https://arxiv.org/abs/1710.11153
- https://github.com/spotify/basic-pitch

## 4. 音高の動きとレーン

音高の上下をレーンの左右に写す規則を定めた公式資料は、osu!mania と StepMania では見つからなかった。

Guitar Hero 型の譜面生成を扱った Tensor Hero（UC Berkeley の修了プロジェクト）は、正確なボタンではなく音高の輪郭（contour）を予測して割り当てている。上行する 3 音を上行する任意の 3 ボタンに割り当てても、体感の正確さは落ちないとしている。

v1 は前後 4 秒の窓の中での音高の順位でレーンを決めたので、同じ音が場所によって別のレーンに置かれ、連打回避でレーンがさらに動いた。輪郭（上がる・下がる・同じ）を保つことを優先し、同じ音の繰り返しは同じレーンに置く、という規則にすれば Tensor Hero の考え方と合う。

出典:
- https://www.ischool.berkeley.edu/sites/default/files/sproject_attachments/tensorhero_capstone.pdf

## 5. 楽譜に基づく方法

### 5.1 楽譜から譜面と音の両方を作る

PD の楽譜（`04-assets-and-licenses.md`）から、譜面と音声の両方を作る。

| 性質 | 理由 |
|---|---|
| 同期が構成上ずれない | ノーツの時刻と鳴らす音の時刻が同じ楽譜イベントから来る。検出や写像の誤差が入らない |
| 拍・小節・音価が分かる | 楽譜にそのまま書いてある。難易度を細分で付けられる（1.2 節） |
| 声部が分かる | 右手の旋律と左手の伴奏が別の譜表・声部に書かれている。旋律だけを easy に使える |
| テンポを変えても音程が変わらない | 遅くするときは音の発音時刻を変えて合成し直すだけで, 録音のタイムストレッチが要らない |
| キー音にできる | ノーツごとに鳴らす音が決まっているので, 押した音を鳴らせる（BMS と同じ考え方） |
| 出どころが明確 | 録音の権利を考えなくてよい。楽譜の版と音源サンプルのライセンスだけ確認すればよい |

失うものもある。演奏家のルバートや強弱の表現は楽譜に書かれた分しか出ず、合成ピアノの音は録音より平板になる。楽譜のテンポ指示（Andante など）を BPM に置き換える判断も要る。

### 5.2 代替: 楽譜と録音を DTW で対応付ける

録音を使い続けるなら、楽譜を録音の時間軸に写像する。synctoolbox（Müller ほか, JOSS 2021）は DTW による音楽同期の参照実装で、多重解像度の MrMsDTW と、高解像度の同期のための chroma onset 特徴（Ewert ほか, ICASSP 2009）を含む。

v1 は PR #34（public ブランチのコミット 1d85bf1）で、6 曲に chroma の DTW による「楽譜時間 → 音源時間」のアンカー表を加えた。コミットメッセージには、リピート展開の要否を曲ごとに指定する必要があること（`expandRepeats`）と、ネストした反復記号に対応していないことが書かれている。この版の上で測ったノーツとオンセットのずれは、DTW 対象の 4 曲（エリーゼ、月光、子犬のワルツ、ラ・カンパネラ）で中央値 45〜58 ms, p95 142〜237 ms だった（Issue #35 の「旧」）。判定幅の最上位（±20 ms 前後）より大きく、v1 は PR #36 で録音のオンセットだけを使う方式に切り替えた。`build_charts.py` の冒頭には、写像方式はテンポの揺れとリピートの扱いの違いで曲中にずれが積もるため使わない、と書かれている。

DTW の精度は特徴量と解像度で変わるので、この結果は v1 の実装での値である。録音を使う場合の選択肢としては残る。

出典:
- https://github.com/meinardmueller/synctoolbox
- v1 リポジトリ: public ブランチのコミット 1d85bf1, Issue #35, `scripts/build_charts.py`

## 6. v2 の方式（案）

楽譜から譜面と音を両方作る（5.1 節）。難易度は使う声部と細分で付ける。下の表は初期案で、曲ごとに調整する。osu!mania のガイドライン（1.2 節, 4/4 で 180 BPM 前後）は Easy で 1/2（8 分）、Normal で 1/4（16 分）の連続まで認めるので、v2 の easy と normal はそれより 1 段遅く、hard は同じ水準にしている。

| 難易度 | 使う音 | 連続させてよい最も細かい音価（4/4 の場合） |
|---|---|---|
| easy | 旋律のうち拍頭にある音 | 4 分音符 |
| normal | 旋律の音 | 8 分音符 |
| hard | 旋律 + 伴奏の拍頭（バス） | 16 分音符（連続は短く） |
| expert | 旋律 + 伴奏 | 制限なし |

- 3 連系の曲（月光 第 1 楽章など）は 8 分 → 3 連 8 分のように読み替える。
- レーンは旋律の輪郭を保つ。上行は右、下行は左、同じ音は同じレーン（4 節）。
- 和音を同時押しにするときは、和音の最高音と最低音を外側のレーンに置くなど、構成音と結び付ける。v1 の `(lane + 2) % 4` はやめる。
- ロングノーツは楽譜の音価から作る。ペダルによる響きは使わない。
