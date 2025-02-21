from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ReservationSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Reservation


@extend_schema(tags=['Бронирование'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ReservationViewSet(BaseViewSet):
    """CRUD для бронирований"""
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    @extend_schema(
        summary="Получить список бронирований",
        description="Возвращает список всех существующих бронирований.",
        responses=UniversalSchemas.list_schema(ReservationSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новое бронирование",
        description="Создает новое бронирование с предоставленными данными.",
        request=ReservationSerializer,
        responses=UniversalSchemas.create_schema(ReservationSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали бронирования",
        description="Возвращает детали конкретного бронирования по его ID.",
        responses=UniversalSchemas.retrieve_schema(ReservationSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить бронирование",
        description="Полностью обновляет существующее бронирование по его ID.",
        request=ReservationSerializer,
        responses=UniversalSchemas.update_schema(ReservationSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить бронирование",
        description="Частично обновляет существующее бронирование по его ID.",
        request=ReservationSerializer,
        responses=UniversalSchemas.partial_update_schema(ReservationSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить бронирование",
        description="Удаление бронирований запрещено.",
        responses=UniversalSchemas.destroy_schema(ReservationSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление бронирований запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
