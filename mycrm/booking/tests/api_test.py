import pytest
from booking.models import Specialist, Client, Reservation
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
def specialist():
    return Specialist.objects.create(name="Иван Иванов", active=True)


@pytest.fixture
def client_obj():
    return Client.objects.create(name="Петр Петров", phone="1234567890", email="petr@example.com")


@pytest.fixture
def reservation(client_obj, specialist):
    return Reservation.objects.create(
        datetimestart="2025-02-01T10:00:00",
        datetimeend="2025-02-01T12:00:00",
        client=client_obj,
        specialist=specialist
    )


@pytest.mark.django_db
class TestSpecialistAPI:

    def test_create_specialist(self, auth_client):
        url = "/api/specialists/"
        data = {"name": "Дмитрий Дмитриев", "active": True}
        response = auth_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert "id" in response.data
        assert response.data["name"] == "Дмитрий Дмитриев"

    def test_get_specialist(self, auth_client, specialist):
        url = f"/api/specialists/{specialist.id}/"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == specialist.name


@pytest.mark.django_db
class TestClientAPI:

    def test_create_client(self, auth_client):
        url = "/api/clients/"
        data = {"name": "Олег Олегов", "phone": "9876543210", "email": "oleg@example.com"}
        response = auth_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert "id" in response.data
        assert response.data["name"] == "Олег Олегов"

    def test_get_client(self, auth_client, client_obj):
        url = f"/api/clients/{client_obj.id}/"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == client_obj.name


@pytest.mark.django_db
class TestReservationAPI:

    def test_create_reservation(self, auth_client, client_obj, specialist):
        url = "/api/reservations/"
        data = {
            "datetimestart": "2025-02-02T10:00:00",
            "datetimeend": "2025-02-02T12:00:00",
            "client": client_obj.id,
            "specialist": specialist.id
        }
        response = auth_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert "id" in response.data
        assert response.data["client"] == client_obj.id

    def test_get_reservation(self, auth_client, reservation):
        url = f"/api/reservations/{reservation.id}/"
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["datetimestart"] == reservation.datetimestart
