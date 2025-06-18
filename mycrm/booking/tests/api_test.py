import pytest
from booking.models import Area
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    client = APIClient()
    return client

@pytest.fixture
def auth_client(api_client):
    user = User.objects.create_user(username='admin', password='66033017')
    response = api_client.post('/api/token/', {'username': 'admin', 'password': '66033017'})
    token = response.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client

@pytest.fixture
def area():
    return Area.objects.create(id=101, name="Тестовое помещение", description="Описание для теста")


@pytest.mark.django_db
class TestAreaAPI:
    def test_area_list(self, auth_client, area):
        response = auth_client.get('/api/areas/')
        assert response.status_code == 200
        assert any(a['id'] == area.id for a in response.data)

    def test_area_create(self, auth_client):
        data = {"id": 202, "name": "Новое помещение", "description": "Описание"}
        response = auth_client.post('/api/areas/', data)
        assert response.status_code == 201
        assert response.data['name'] == "Новое помещение"

    def test_area_retrieve(self, auth_client, area):
        response = auth_client.get(f'/api/areas/{area.id}/')
        assert response.status_code == 200
        assert response.data['id'] == area.id

    def test_area_update(self, auth_client, area):
        data = {"id": area.id, "name": "Измененное помещение", "description": "Новое описание"}
        response = auth_client.put(f'/api/areas/{area.id}/', data)
        assert response.status_code == 200
        assert response.data['name'] == "Измененное помещение"

    def test_area_partial_update(self, auth_client, area):
        data = {"description": "Частичное обновление"}
        response = auth_client.patch(f'/api/areas/{area.id}/', data)
        assert response.status_code == 200
        assert response.data['description'] == "Частичное обновление"

    def test_area_destroy_forbidden(self, auth_client, area):
        response = auth_client.delete(f'/api/areas/{area.id}/')
        assert response.status_code == 400
        assert "запрещено" in response.data['detail']
