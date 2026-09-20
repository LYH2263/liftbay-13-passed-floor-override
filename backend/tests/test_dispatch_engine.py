from app.services.dispatch_engine import CallRequest, CarState, pick_car, score_car


def _passed_vs_far_idle():
    # 同一组轿厢与呼梯：
    # 1 号车近处、同向上行但已越过呼梯层（7 楼已过 3 楼）
    # 2 号车远处、12 楼空闲
    cars = [
        CarState(1, 7, "up", load=1, capacity=10),
        CarState(2, 12, "idle", load=0, capacity=10),
    ]
    call = CallRequest(7, 3, "up", 1)
    return cars, call


def test_passed_penalty_lets_far_idle_win_by_default():
    cars, call = _passed_vs_far_idle()
    # 默认（开关关）：近处已过站车 100-4*5-15=65，远处空闲车 100-9*5+20=75
    best = pick_car(cars, call)
    assert best is not None
    assert best.car_id == 2


def test_allow_passed_pickup_lets_near_passed_car_win():
    cars, call = _passed_vs_far_idle()
    # 开关开：近处已过站车 100-4*5=80，不再扣分，胜过远处空闲车 75
    best = pick_car(cars, call, allow_passed_pickup=True)
    assert best is not None
    assert best.car_id == 1


def test_passed_penalty_score_diff_only():
    cars, call = _passed_vs_far_idle()
    near = cars[0]
    off = score_car(near, call, allow_passed_pickup=False)
    on = score_car(near, call, allow_passed_pickup=True)
    assert on.score - off.score == 15.0


def test_full_car_rejected_even_when_passed_pickup_allowed():
    car = CarState(1, 5, "idle", load=8, capacity=8)
    call = CallRequest(1, 5, "up", passengers=1)
    r = score_car(car, call, allow_passed_pickup=True)
    assert r.accepted is False
    assert "满员" in r.reason
    assert pick_car([car], call, allow_passed_pickup=True) is None


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
