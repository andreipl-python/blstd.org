from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ReservationStatusTypeSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import ReservationStatusType


@extend_schema(tags=['Статус бронирования'])
@extend_schema_view(
    destroy=extend_schema(exclude=True),
    update=extend_schema(exclude=True),
    partial_update=extend_schema(exclude=True),
    create=extend_schema(exclude=True)
)
class ReservationStatusTypeViewSet(BaseViewSet):
    """CRUD для типов статусов бронирования"""
    queryset = ReservationStatusType.objects.all()
    serializer_class = ReservationStatusTypeSerializer

    @extend_schema(
        summary="Получить список статусов бронирования",
        description="Возвращает список всех существующих статусов бронирования.",
        responses=UniversalSchemas.list_schema(ReservationStatusTypeSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавление нового статуса бронирования запрещено",
        description="Добавление нового статуса бронирования запрещено",
        request=ReservationStatusTypeSerializer,
        responses=UniversalSchemas.create_schema(ReservationStatusTypeSerializer, forbidden_create_object=True),
    )
    def create(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Добавление новых статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        summary="Получить детали статуса бронирования",
        description="Возвращает детали конкретного статуса бронирования по его ID.",
        responses=UniversalSchemas.retrieve_schema(ReservationStatusTypeSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Обновление статуса бронирования запрещено",
        description="Обновление статуса бронирования запрещено",
        request=ReservationStatusTypeSerializer,
        responses=UniversalSchemas.update_schema(ReservationStatusTypeSerializer, forbidden_update_object=True),
    )
    def update(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Обновление статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        summary="Частичное обновление статусов бронирования запрещено",
        description="Частичное обновление статусов бронирования запрещено",
        request=ReservationStatusTypeSerializer,
        responses=UniversalSchemas.partial_update_schema(ReservationStatusTypeSerializer, forbidden_update_object=True),
    )
    def partial_update(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Частичное обновление статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )

    @extend_schema(
        summary="Удаление статусов бронирования запрещено.",
        description="Удаление статусов бронирования запрещено.",
        responses=UniversalSchemas.destroy_schema(ReservationStatusTypeSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление статусов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
