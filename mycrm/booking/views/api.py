from rest_framework import viewsets, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..models import Reservation, Client, Service
from ..serializers import ReservationSerializer, ClientSerializer, ServiceSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    """CRUD для бронирований"""
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    authentication_classes = [JWTAuthentication]  # Используем JWT для аутентификации
    permission_classes = [permissions.IsAuthenticated]  # Доступ только для авторизованных пользователей


class ClientViewSet(viewsets.ModelViewSet):
    """CRUD для клиентов"""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]


class ServiceViewSet(viewsets.ModelViewSet):
    """CRUD для услуг"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
