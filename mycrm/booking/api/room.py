from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .api_serializers import RoomSerializer
from .schema_helpers import UniversalSchemas
from .settings import BaseViewSet
from ..models import Room


@extend_schema(tags=['Комната'])
@extend_schema_view(destroy=extend_schema(exclude=True))
class RoomViewSet(BaseViewSet):
    """CRUD для комнаты"""
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    @extend_schema(
        summary="Получить список комнат",
        description="Возвращает список всех существующих комнат.",
        responses=UniversalSchemas.list_schema(RoomSerializer),
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Создать новую комнату",
        description="Создает новую комнату с предоставленными данными.",
        request=RoomSerializer,
        responses=UniversalSchemas.create_schema(RoomSerializer),
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        summary="Получить детали комнаты",
        description="Возвращает детали конкретной комнаты по её ID.",
        responses=UniversalSchemas.retrieve_schema(RoomSerializer),
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Полностью обновить комнату",
        description="Полностью обновляет существующую комнату по её ID.",
        request=RoomSerializer,
        responses=UniversalSchemas.update_schema(RoomSerializer),
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Частично обновить комнату",
        description="Частично обновляет существующую комнату по её ID.",
        request=RoomSerializer,
        responses=UniversalSchemas.partial_update_schema(RoomSerializer),
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Удалить комнату",
        description="Удаление комнаты запрещено.",
        responses=UniversalSchemas.destroy_schema(RoomSerializer),
    )
    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Удаление комнаты запрещено"},
            code=status.HTTP_400_BAD_REQUEST
        )
