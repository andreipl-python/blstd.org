import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from booking.models import Area, Scenario, Room

pytestmark = pytest.mark.django_db

ADMIN_LOGIN = "admin"
ADMIN_PASSWORD = "66033017"

@pytest.fixture
def api_client():
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(username=ADMIN_LOGIN).exists():
        User.objects.create_superuser(username=ADMIN_LOGIN, password=ADMIN_PASSWORD, email="admin@example.com")
    client = APIClient()
    response = client.post('/api/token/', {'username': ADMIN_LOGIN, 'password': ADMIN_PASSWORD}, format='json')
    assert response.status_code == 200, f"Auth failed: {response.content}"
    assert 'access' in response.data, f"No access token in response: {response.content}"
    token = response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client

@pytest.fixture
def services():
    from booking.models import Service
    service1 = Service.objects.create(id=1, name="Service 1", active=True, price=100)
    service2 = Service.objects.create(id=2, name="Service 2", active=True, price=200)
    return [service1, service2]

@pytest.fixture
def area_with_scenarios(services):
    scenario1 = Scenario.objects.create(id=1, name="Сценарий 1")
    scenario2 = Scenario.objects.create(id=2, name="Сценарий 2")
    area = Area.objects.create(id=1, name="Тестовое помещение")
    area.scenario.set([scenario1, scenario2])
    # Привязываем сценарии к сервисам (если требуется бизнес-логикой)
    for service in services:
        service.scenario.set([scenario1, scenario2])
    return area, [scenario1, scenario2], services


@pytest.mark.parametrize("scenarios,expected_status,expected_error", [
    (["valid"], 201, None),
    (["invalid"], 400, "Можно выбрать только сценарии, назначенные у выбранного помещения."),
    ([], 201, None),  # Теперь пустой список допустим
])
def test_room_create_api(api_client, area_with_scenarios, scenarios, expected_status, expected_error):
    area, scenario_objs, services = area_with_scenarios
    valid_ids = [s.id for s in scenario_objs]
    invalid_id = max(valid_ids) + 100
    scenario_ids = {
        "valid": [valid_ids[0]],
        "invalid": [invalid_id],
        "empty": []
    }[scenarios[0] if scenarios else "empty"]

    payload = {
        "id": 100 if expected_status == 201 else 101 + valid_ids.index(valid_ids[0]) if scenario_ids else 102,
        "name": "API Test Room",
        "area": area.id,
        "scenario": scenario_ids,
        "hourstart": "09:00:00",
        "hourend": "18:00:00",
        "service": [services[0].id]
    }
    response = api_client.post("/api/rooms/", payload, format="json")
    assert response.status_code == expected_status, response.content
    if expected_error:
        assert expected_error in str(response.data), response.data
    else:
        assert response.data["name"] == "API Test Room"
        assert response.data["area"] == area.id
        assert set(response.data["scenario"]) == set(scenario_ids)
        assert set(response.data["service"]) == set([services[0].id])

    # Дополнительно: Room без scenario/service вообще
    payload_no_scenarios = {
        "id": 200,
        "name": "No Scenario Room",
        "area": area.id,
        "hourstart": "10:00:00",
        "hourend": "19:00:00"
    }
    response_no_scenarios = api_client.post("/api/rooms/", payload_no_scenarios, format="json")
    assert response_no_scenarios.status_code == 201
    assert response_no_scenarios.data["scenario"] == []
    assert response_no_scenarios.data["service"] == []

    # Room с пустыми списками явно
    payload_empty = {
        "id": 201,
        "name": "Empty Lists Room",
        "area": area.id,
        "hourstart": "11:00:00",
        "hourend": "20:00:00",
        "scenario": [],
        "service": []
    }
    response_empty = api_client.post("/api/rooms/", payload_empty, format="json")
    assert response_empty.status_code == 201
    assert response_empty.data["scenario"] == []
    assert response_empty.data["service"] == []


# Дополнительно: тест на обновление комнаты
@pytest.mark.django_db
def test_room_update_api(api_client, area_with_scenarios):
    area, scenarios, services = area_with_scenarios
    room = Room.objects.create(id=2, name="RoomUpd", area=area, hourstart="10:00", hourend="19:00")
    room.scenario.set([scenarios[0]])
    room.service.set([services[0].id])
    # Пробуем обновить на разрешённый сценарий и сервис
    payload = {"scenario": [scenarios[1].id], "service": [services[0].id]}
    response = api_client.patch(f"/api/rooms/{room.id}/", payload, format="json")
    assert response.status_code == 200
    assert response.data["scenario"] == [scenarios[1].id]
    # Пробуем обновить на неразрешённый сценарий
    payload_invalid = {"scenario": [scenarios[1].id + 100], "service": [services[0].id]}
    response = api_client.patch(f"/api/rooms/{room.id}/", payload_invalid, format="json")
    assert response.status_code == 400
    assert "Можно выбрать только сценарии" in str(response.data)
