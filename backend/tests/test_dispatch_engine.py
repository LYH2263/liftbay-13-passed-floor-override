from app.services.dispatch_engine import CallRequest, CarState, pick_car, score_car


def test_reject_when_full():
    car = CarState(1, 5, "idle", load=8, capacity=8)
    call = CallRequest(1, 5, "up", passengers=1)
    r = score_car(car, call)
    assert r.accepted is False
    assert "满员" in r.reason


def test_same_direction_beats_far_idle():
    cars = [
        CarState(1, 2, "up", load=1, capacity=10),
        CarState(2, 12, "idle", load=0, capacity=10),
    ]
    call = CallRequest(9, 4, "up", 1)
    best = pick_car(cars, call)
    assert best is not None
    assert best.car_id == 1


def test_closer_idle_wins_when_opposite():
    cars = [
        CarState(1, 10, "down", load=0, capacity=10),
        CarState(2, 3, "idle", load=0, capacity=10),
    ]
    call = CallRequest(3, 2, "up", 1)
    best = pick_car(cars, call)
    assert best is not None
    assert best.car_id == 2


# 同一组轿厢与同一呼梯，仅靠楼栋开关决定胜者：
# 呼梯 5F 上行；1 号车在 6F 上行（同向但已过站，最近），2 号车 11F 空闲，3 号车 18F 反向。
LOCKED_CARS = [
    CarState(1, 6, "up", load=1, capacity=10),
    CarState(2, 11, "idle", load=0, capacity=10),
    CarState(3, 18, "down", load=0, capacity=10),
]
LOCKED_CALL = CallRequest(7, 5, "up", 1)


def test_default_keeps_passed_penalty_far_idle_wins():
    # 默认（开关落库默认 False）：已过站扣 15 分，近处已过站车 80 分，远处空闲车 90 分
    best = pick_car(LOCKED_CARS, LOCKED_CALL)
    assert best is not None
    assert best.car_id == 2
    assert score_car(LOCKED_CARS[0], LOCKED_CALL).score == 80.0
    assert score_car(LOCKED_CARS[1], LOCKED_CALL).score == 90.0


def test_allow_passed_pickup_near_passed_car_wins():
    # 打开“允许已过站接驳”：不再扣那笔分，近处已过站车 95 分反超空闲车 90 分
    best = pick_car(LOCKED_CARS, LOCKED_CALL, allow_passed_pickup=True)
    assert best is not None
    assert best.car_id == 1
    assert score_car(LOCKED_CARS[0], LOCKED_CALL, allow_passed_pickup=True).score == 95.0


def test_full_rejection_unaffected_by_passed_switch():
    # 满员拒绝不读开关：开/关都拒绝
    full_cars = [
        CarState(1, 6, "up", load=10, capacity=10),
        CarState(2, 11, "idle", load=10, capacity=10),
    ]
    for flag in (False, True):
        assert pick_car(full_cars, LOCKED_CALL, allow_passed_pickup=flag) is None
        r = score_car(full_cars[0], LOCKED_CALL, allow_passed_pickup=flag)
        assert r.accepted is False
        assert "满员" in r.reason
