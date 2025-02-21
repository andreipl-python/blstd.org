from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import ReservationTypeSerializer
from .schema_helpers import UniversalChemas
from .settings import BaseViewSet
from ..models import ReservationType


@extend_schema(tags=['Тип бронирования'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class ReservationTypeViewSet(BaseViewSet):
    """CRUD для типов бронирования"""
    queryset = ReservationType.objects.all()
    serializer_class = ReservationTypeSerializer

    @extend_schema(
        summary="Получить список типов бронирования",
        description="Возвращает список всех существующих типов бронирования.",
        responses=UniversalChemas.list_schema(ReservationTypeSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Добавить новый тип бронирования",
        description="Создает новый тип бронирования с предоставленными данными.",
        request=ReservationTypeSerializer,
        responses=UniversalChemas.create_schema(ReservationTypeSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали типа бронирования",
        description="Возвращает детали конкретного типа бронирования по его ID.",
        responses=UniversalChemas.retrieve_schema(ReservationTypeSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить тип бронирования",
        description="Полностью обновляет существующий тип бронирования по его ID.",
        request=ReservationTypeSerializer,
        responses=UniversalChemas.update_schema(ReservationTypeSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить тип бронирования",
        description="Частично обновляет существующий тип бронирования по его ID.",
        request=ReservationTypeSerializer,
        responses=UniversalChemas.partial_update_schema(ReservationTypeSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить тип бронирования",
        description="Удаление типов бронирования запрещено.",
        responses=UniversalChemas.destroy_schema(ReservationTypeSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление типов бронирования запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
