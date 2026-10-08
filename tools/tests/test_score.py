from score import Score, TempoMap, TimeSignature, read_pickup


def test_tempo_map_piecewise():
    tempo = TempoMap(480, [(0, 500_000), (960, 1_000_000)])
    assert tempo.seconds(960) == 1.0
    assert tempo.seconds(1440) == 2.0


def test_read_pickup_variants():
    assert read_pickup(r"\partial 8 e''16 dis", 384) == 192
    assert read_pickup(r"\partial 4. c4.", 384) == 576
    assert read_pickup(r"\partial 4*3 c4", 384) == 1152
    assert read_pickup("no pickup here", 384) == 0


def _score(pickup: int, numerator: int = 3, denominator: int = 4) -> Score:
    ts = TimeSignature(0, numerator, denominator)
    return Score(384, [], TempoMap(384, []), [ts], [], pickup, 384 * 12)


def test_metric_level_respects_pickup():
    score = _score(pickup=192)  # 8分の弱起
    assert score.metric_level(192) == 0
    assert score.metric_level(192 + 384) == 1
    assert score.metric_level(0) == 2
    assert score.bar_lines()[0] == 192


def test_compound_meter_beat_is_dotted_quarter():
    score = _score(pickup=0, numerator=6, denominator=8)
    assert score.metric_level(576) == 1
    assert score.metric_level(192) == 2
